import { createClient } from '@/lib/supabase';
import { WindowType, Match } from '@/types/database';

interface PredictionError {
  matchId: string;
  window: WindowType;
  market: string;
  predicted: number;
  actual: number;
  error: number;
  errorType: 'over_confident' | 'under_confident' | 'wrong_direction' | 'calibration_error';
  confidence: number;
  context: MatchContext;
}

interface MatchContext {
  isHome: boolean;
  league: string;
  isDerivyGame: boolean;
  hasWeatherImpact: boolean;
  hasKeyAbsences: boolean;
  daysSinceLastMatch: number;
  matchImportance: 'low' | 'medium' | 'high' | 'critical';
  seasonPhase: 'early' | 'mid' | 'late' | 'playoff';
}

interface LearningInsight {
  pattern: string;
  frequency: number;
  impact: number;
  confidence: number;
  actionable: boolean;
  description: string;
  suggestedFeatures: string[];
  modelAdjustment: Record<string, number>;
}

export class PostMatchAnalyzer {
  private supabase = createClient();
  private analysisDelay = 2 * 60 * 60 * 1000; // 2 heures après le match

  async analyzeFinishedMatches(): Promise<void> {
    console.log('Starting post-match analysis...');

    try {
      // Récupérer les matchs terminés il y a plus de 2h sans analyse
      const cutoffTime = new Date(Date.now() - this.analysisDelay);
      const { data: finishedMatches } = await this.supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!home_team_id(*),
          away_team:teams!away_team_id(*),
          season:seasons(*)
        `)
        .eq('status', 'finished')
        .lt('updated_at', cutoffTime.toISOString())
        .is('analysis_completed', null);

      if (!finishedMatches || finishedMatches.length === 0) {
        console.log('No matches ready for analysis');
        return;
      }

      console.log(`Analyzing ${finishedMatches.length} finished matches...`);

      for (const match of finishedMatches) {
        await this.analyzeMatch(match);
        
        // Marquer comme analysé
        await this.supabase
          .from('matches')
          .update({ analysis_completed: new Date().toISOString() })
          .eq('id', match.id);
          
        // Délai pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Générer les insights d'apprentissage
      await this.generateLearningInsights();

      console.log('Post-match analysis completed');
    } catch (error) {
      console.error('Error in post-match analysis:', error);
      throw error;
    }
  }

  private async analyzeMatch(match: Match): Promise<void> {
    try {
      console.log(`Analyzing match: ${match.home_team?.name} vs ${match.away_team?.name}`);

      // Récupérer les prédictions pour toutes les fenêtres
      const { data: predictions } = await this.supabase
        .from('market_probs')
        .select('*')
        .eq('match_id', match.id);

      if (!predictions || predictions.length === 0) {
        console.warn(`No predictions found for match ${match.id}`);
        return;
      }

      // Calculer les résultats réels
      const actualResults = this.calculateActualResults(match);
      
      // Analyser chaque prédiction
      const errors: PredictionError[] = [];
      
      for (const prediction of predictions) {
        const matchErrors = await this.analyzePredictionWindow(
          match,
          prediction,
          actualResults
        );
        errors.push(...matchErrors);
      }

      // Stocker les erreurs pour apprentissage
      await this.storePredictionErrors(errors);

      // Analyser les patterns d'erreur
      await this.analyzeErrorPatterns(match, errors);

    } catch (error) {
      console.error(`Error analyzing match ${match.id}:`, error);
    }
  }

  private calculateActualResults(match: Match): Record<string, number> {
    const homeScore = match.home_score || 0;
    const awayScore = match.away_score || 0;
    const totalGoals = homeScore + awayScore;

    return {
      'home_win': homeScore > awayScore ? 1 : 0,
      'draw': homeScore === awayScore ? 1 : 0,
      'away_win': awayScore > homeScore ? 1 : 0,
      'over_05': totalGoals > 0.5 ? 1 : 0,
      'over_15': totalGoals > 1.5 ? 1 : 0,
      'over_25': totalGoals > 2.5 ? 1 : 0,
      'over_35': totalGoals > 3.5 ? 1 : 0,
      'btts': (homeScore > 0 && awayScore > 0) ? 1 : 0,
      'home_first': homeScore > 0 ? 1 : 0, // Simplifié - faudrait les événements
      'away_first': awayScore > 0 ? 1 : 0,
      'total_goals': totalGoals
    };
  }

  private async analyzePredictionWindow(
    match: Match,
    prediction: any,
    actualResults: Record<string, number>
  ): Promise<PredictionError[]> {
    const errors: PredictionError[] = [];
    const context = await this.extractMatchContext(match);

    // Analyser 1X2
    const markets = [
      { name: 'home_win', predicted: prediction.p_home, actual: actualResults.home_win },
      { name: 'draw', predicted: prediction.p_draw, actual: actualResults.draw },
      { name: 'away_win', predicted: prediction.p_away, actual: actualResults.away_win }
    ];

    // Analyser Over/Under si disponible
    if (prediction.p_over_25) {
      markets.push({
        name: 'over_25',
        predicted: prediction.p_over_25,
        actual: actualResults.over_25
      });
    }

    for (const market of markets) {
      if (market.predicted != null) {
        const error = this.calculatePredictionError(
          market.predicted,
          market.actual,
          context
        );

        errors.push({
          matchId: match.id,
          window: prediction.window,
          market: market.name,
          predicted: market.predicted,
          actual: market.actual,
          error: error.magnitude,
          errorType: error.type,
          confidence: this.calculateConfidence(market.predicted),
          context
        });
      }
    }

    return errors;
  }

  private calculatePredictionError(
    predicted: number,
    actual: number,
    context: MatchContext
  ): { magnitude: number; type: PredictionError['errorType'] } {
    const error = Math.abs(predicted - actual);
    const brierScore = Math.pow(predicted - actual, 2);

    let errorType: PredictionError['errorType'];

    if (actual === 1 && predicted < 0.3) {
      errorType = 'under_confident';
    } else if (actual === 0 && predicted > 0.7) {
      errorType = 'over_confident';
    } else if ((actual === 1 && predicted < 0.5) || (actual === 0 && predicted > 0.5)) {
      errorType = 'wrong_direction';
    } else {
      errorType = 'calibration_error';
    }

    return {
      magnitude: brierScore,
      type: errorType
    };
  }

  private calculateConfidence(probability: number): number {
    // Distance du centre (0.5) normalisée
    return Math.abs(probability - 0.5) * 2;
  }

  private async extractMatchContext(match: Match): Promise<MatchContext> {
    // Déterminer si c'est un derby/match important
    const isDerby = await this.isDerbyMatch(match);
    
    // Vérifier l'importance du match
    const importance = await this.calculateMatchImportance(match);
    
    // Phase de saison
    const seasonPhase = this.getSeasonPhase(match.match_date);

    return {
      isHome: true, // Sera ajusté selon l'équipe analysée
      league: match.season?.league_id || 'unknown',
      isDerivyGame: isDerby,
      hasWeatherImpact: await this.hasWeatherImpact(match),
      hasKeyAbsences: await this.hasKeyAbsences(match),
      daysSinceLastMatch: 7, // À calculer avec les données historiques
      matchImportance: importance,
      seasonPhase
    };
  }

  private async isDerbyMatch(match: Match): Promise<boolean> {
    // Logique simplifiée - à améliorer avec données géographiques
    const homeTeam = match.home_team?.name || '';
    const awayTeam = match.away_team?.name || '';
    
    // Quelques derbys connus
    const derbys = [
      ['Manchester United', 'Manchester City'],
      ['Arsenal', 'Tottenham'],
      ['Liverpool', 'Everton'],
      ['Barcelona', 'Real Madrid'],
      ['Milan', 'Inter'],
      ['Bayern Munich', 'Borussia Dortmund']
    ];

    return derbys.some(([team1, team2]) => 
      (homeTeam.includes(team1) && awayTeam.includes(team2)) ||
      (homeTeam.includes(team2) && awayTeam.includes(team1))
    );
  }

  private async calculateMatchImportance(match: Match): Promise<MatchContext['matchImportance']> {
    // Logique simplifiée basée sur la période et position (à améliorer)
    const seasonPhase = this.getSeasonPhase(match.match_date);
    
    if (seasonPhase === 'playoff') return 'critical';
    if (seasonPhase === 'late') return 'high';
    if (seasonPhase === 'mid') return 'medium';
    return 'low';
  }

  private getSeasonPhase(matchDate: string): MatchContext['seasonPhase'] {
    const date = new Date(matchDate);
    const month = date.getMonth() + 1;

    if (month >= 8 && month <= 10) return 'early';
    if (month >= 11 || month <= 2) return 'mid';
    if (month >= 3 && month <= 5) return 'late';
    return 'playoff';
  }

  private async hasWeatherImpact(match: Match): Promise<boolean> {
    // Vérifier les conditions météo extrêmes
    if (match.weather_temp && (match.weather_temp < 5 || match.weather_temp > 35)) {
      return true;
    }
    if (match.weather_wind && match.weather_wind > 20) {
      return true;
    }
    return match.weather_condition?.includes('rain') || 
           match.weather_condition?.includes('snow') || false;
  }

  private async hasKeyAbsences(match: Match): Promise<boolean> {
    // À implémenter avec les données d'absences/blessures
    // Pour l'instant, logique simplifiée
    return Math.random() < 0.3; // 30% de chance d'absence importante
  }

  private async storePredictionErrors(errors: PredictionError[]): Promise<void> {
    if (errors.length === 0) return;

    // Stocker dans une table dédiée aux erreurs d'apprentissage
    const { error } = await this.supabase
      .from('prediction_errors')
      .insert(errors.map(err => ({
        match_id: err.matchId,
        window: err.window,
        market: err.market,
        predicted_prob: err.predicted,
        actual_result: err.actual,
        brier_score: err.error,
        error_type: err.errorType,
        confidence: err.confidence,
        context: err.context,
        analyzed_at: new Date().toISOString()
      })));

    if (error) {
      console.error('Error storing prediction errors:', error);
    }
  }

  private async analyzeErrorPatterns(match: Match, errors: PredictionError[]): Promise<void> {
    // Analyser les patterns par type d'erreur
    const errorsByType = errors.reduce((acc, error) => {
      if (!acc[error.errorType]) acc[error.errorType] = [];
      acc[error.errorType].push(error);
      return acc;
    }, {} as Record<string, PredictionError[]>);

    // Analyser les patterns par fenêtre
    const errorsByWindow = errors.reduce((acc, error) => {
      if (!acc[error.window]) acc[error.window] = [];
      acc[error.window].push(error);
      return acc;
    }, {} as Record<WindowType, PredictionError[]>);

    // Stocker l'analyse des patterns
    await this.supabase
      .from('error_patterns')
      .insert({
        match_id: match.id,
        error_distribution: errorsByType,
        window_performance: errorsByWindow,
        total_errors: errors.length,
        avg_brier_score: errors.reduce((sum, e) => sum + e.error, 0) / errors.length,
        analyzed_at: new Date().toISOString()
      });
  }

  private async generateLearningInsights(): Promise<LearningInsight[]> {
    console.log('Generating learning insights...');

    // Analyser les erreurs des 30 derniers jours
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: recentErrors } = await this.supabase
      .from('prediction_errors')
      .select('*')
      .gte('analyzed_at', thirtyDaysAgo.toISOString());

    if (!recentErrors || recentErrors.length === 0) {
      return [];
    }

    const insights: LearningInsight[] = [];

    // Insight 1: Performance par fenêtre
    const windowPerformance = await this.analyzeWindowPerformance(recentErrors);
    if (windowPerformance) insights.push(windowPerformance);

    // Insight 2: Impact météo
    const weatherInsight = await this.analyzeWeatherImpact(recentErrors);
    if (weatherInsight) insights.push(weatherInsight);

    // Insight 3: Performance sur derbys
    const derbyInsight = await this.analyzeDerbyPerformance(recentErrors);
    if (derbyInsight) insights.push(derbyInsight);

    // Insight 4: Calibration par niveau de confiance
    const calibrationInsight = await this.analyzeCalibration(recentErrors);
    if (calibrationInsight) insights.push(calibrationInsight);

    // Stocker les insights
    await this.supabase
      .from('learning_insights')
      .insert(insights.map(insight => ({
        ...insight,
        generated_at: new Date().toISOString()
      })));

    console.log(`Generated ${insights.length} learning insights`);
    return insights;
  }

  private async analyzeWindowPerformance(errors: any[]): Promise<LearningInsight | null> {
    const windowStats = errors.reduce((acc, error) => {
      if (!acc[error.window]) {
        acc[error.window] = { count: 0, totalError: 0 };
      }
      acc[error.window].count++;
      acc[error.window].totalError += error.brier_score;
      return acc;
    }, {} as Record<string, { count: number; totalError: number }>);

    const windowPerformance = Object.entries(windowStats).map(([window, stats]) => ({
      window,
      avgError: stats.totalError / stats.count,
      count: stats.count
    })).sort((a, b) => a.avgError - b.avgError);

    if (windowPerformance.length < 2) return null;

    const bestWindow = windowPerformance[0];
    const worstWindow = windowPerformance[windowPerformance.length - 1];
    
    return {
      pattern: 'window_performance',
      frequency: errors.length,
      impact: worstWindow.avgError - bestWindow.avgError,
      confidence: 0.8,
      actionable: true,
      description: `La fenêtre ${bestWindow.window} performe mieux (${bestWindow.avgError.toFixed(3)}) que ${worstWindow.window} (${worstWindow.avgError.toFixed(3)})`,
      suggestedFeatures: [`${bestWindow.window}_weight_increase`, `${worstWindow.window}_uncertainty_boost`],
      modelAdjustment: {
        [`${bestWindow.window}_confidence`]: 0.1,
        [`${worstWindow.window}_confidence`]: -0.1
      }
    };
  }

  private async analyzeWeatherImpact(errors: any[]): Promise<LearningInsight | null> {
    const weatherErrors = errors.filter(e => e.context?.hasWeatherImpact);
    const normalErrors = errors.filter(e => !e.context?.hasWeatherImpact);

    if (weatherErrors.length < 10 || normalErrors.length < 10) return null;

    const weatherAvgError = weatherErrors.reduce((sum, e) => sum + e.brier_score, 0) / weatherErrors.length;
    const normalAvgError = normalErrors.reduce((sum, e) => sum + e.brier_score, 0) / normalErrors.length;

    const impact = weatherAvgError - normalAvgError;

    if (Math.abs(impact) < 0.01) return null;

    return {
      pattern: 'weather_impact',
      frequency: weatherErrors.length,
      impact: Math.abs(impact),
      confidence: 0.7,
      actionable: true,
      description: impact > 0 
        ? `Conditions météo dégradent prédictions (+${impact.toFixed(3)} Brier Score)`
        : `Conditions météo améliorent prédictions (${impact.toFixed(3)} Brier Score)`,
      suggestedFeatures: ['weather_interaction_features', 'weather_uncertainty_boost'],
      modelAdjustment: {
        'weather_weight': impact > 0 ? 0.2 : -0.1
      }
    };
  }

  private async analyzeDerbyPerformance(errors: any[]): Promise<LearningInsight | null> {
    const derbyErrors = errors.filter(e => e.context?.isDerivyGame);
    const normalErrors = errors.filter(e => !e.context?.isDerivyGame);

    if (derbyErrors.length < 5) return null;

    const derbyAvgError = derbyErrors.reduce((sum, e) => sum + e.brier_score, 0) / derbyErrors.length;
    const normalAvgError = normalErrors.reduce((sum, e) => sum + e.brier_score, 0) / normalErrors.length;

    const impact = derbyAvgError - normalAvgError;

    return {
      pattern: 'derby_performance',
      frequency: derbyErrors.length,
      impact: Math.abs(impact),
      confidence: 0.6,
      actionable: true,
      description: impact > 0 
        ? `Derbys plus difficiles à prédire (+${impact.toFixed(3)} Brier Score)`
        : `Derbys mieux prédits (${impact.toFixed(3)} Brier Score)`,
      suggestedFeatures: ['derby_volatility_feature', 'rivalry_intensity_score'],
      modelAdjustment: {
        'derby_uncertainty': impact > 0 ? 0.3 : -0.1
      }
    };
  }

  private async analyzeCalibration(errors: any[]): Promise<LearningInsight | null> {
    // Analyser la calibration par niveau de confiance
    const confidenceBins = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const calibrationData = [];

    for (let i = 0; i < confidenceBins.length - 1; i++) {
      const binErrors = errors.filter(e => 
        e.confidence >= confidenceBins[i] && e.confidence < confidenceBins[i + 1]
      );

      if (binErrors.length > 0) {
        const avgPredicted = binErrors.reduce((sum, e) => sum + e.predicted_prob, 0) / binErrors.length;
        const actualRate = binErrors.reduce((sum, e) => sum + e.actual_result, 0) / binErrors.length;
        
        calibrationData.push({
          confidenceRange: `${confidenceBins[i]}-${confidenceBins[i + 1]}`,
          avgPredicted,
          actualRate,
          count: binErrors.length,
          calibrationError: Math.abs(avgPredicted - actualRate)
        });
      }
    }

    const overallCalibrationError = calibrationData.reduce((sum, bin) => 
      sum + bin.calibrationError * bin.count, 0
    ) / errors.length;

    return {
      pattern: 'calibration_quality',
      frequency: errors.length,
      impact: overallCalibrationError,
      confidence: 0.9,
      actionable: true,
      description: `Erreur de calibration globale: ${overallCalibrationError.toFixed(3)}`,
      suggestedFeatures: ['calibration_temperature_scaling', 'platt_scaling'],
      modelAdjustment: {
        'calibration_adjustment': overallCalibrationError > 0.05 ? 0.2 : 0
      }
    };
  }
}

export const postMatchAnalyzer = new PostMatchAnalyzer();