import { BaseCollector } from '../collectors/base-collector';
import { WindowType } from '@/types/database';
import { adaptiveEnsemble } from '../models/adaptive-ensemble';
import { contextualModelFactory } from '../models/contextual-models';

interface BacktestPeriod {
  startDate: Date;
  endDate: Date;
  season: string;
  matchweekStart: number;
  matchweekEnd: number;
}

interface BacktestConfiguration {
  model: 'ensemble' | 'contextual' | 'baseline';
  window: WindowType;
  markets: string[];
  minConfidence?: number;
  maxMatches?: number;
  excludeContexts?: string[];
}

interface BacktestResult {
  period: BacktestPeriod;
  config: BacktestConfiguration;
  metrics: BacktestMetrics;
  predictions: BacktestPrediction[];
  performance: WindowPerformance[];
  summary: BacktestSummary;
}

interface BacktestMetrics {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  brierScore: number;
  logLoss: number;
  calibrationError: number;
  sharpeRatio: number;
  maxDrawdown: number;
  roi: number;
  coverage: number; // % matches où prédiction possible
}

interface BacktestPrediction {
  matchId: string;
  matchDate: Date;
  homeTeam: string;
  awayTeam: string;
  window: WindowType;
  market: string;
  predicted: number;
  confidence: number;
  actual: number;
  result: 'correct' | 'incorrect';
  error: number;
  contextFactors: string[];
  modelContributions?: Record<string, number>;
}

interface WindowPerformance {
  window: WindowType;
  predictions: number;
  accuracy: number;
  brierScore: number;
  avgConfidence: number;
  improvementVsPrevious?: number;
}

interface BacktestSummary {
  bestWindow: WindowType;
  worstWindow: WindowType;
  significantContexts: string[];
  modelReliability: number;
  temporalConsistency: number;
  recommendations: string[];
}

export class TemporalValidationEngine extends BaseCollector {

  /**
   * Exécute backtesting walk-forward par saison
   * Respecte ordre chronologique strict et fenêtres temporelles
   */
  async walkForwardBacktest(
    periods: BacktestPeriod[],
    config: BacktestConfiguration
  ): Promise<BacktestResult[]> {
    console.log(`🔄 Starting walk-forward backtest across ${periods.length} periods...`);

    const results: BacktestResult[] = [];

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      console.log(`\n📊 Backtesting period: ${period.season} (${period.startDate.toISOString().split('T')[0]} to ${period.endDate.toISOString().split('T')[0]})`);

      try {
        // 1. Récupérer matches de test pour cette période
        const testMatches = await this.getTestMatches(period, config);
        
        if (testMatches.length === 0) {
          console.warn(`No test matches found for period ${period.season}`);
          continue;
        }

        console.log(`Found ${testMatches.length} test matches`);

        // 2. Pour chaque match, simuler prédiction temporelle
        const predictions: BacktestPrediction[] = [];
        
        for (const match of testMatches) {
          try {
            const prediction = await this.simulateTemporalPrediction(match, config, period);
            if (prediction) {
              predictions.push(prediction);
            }
          } catch (error) {
            console.warn(`Failed to simulate prediction for match ${match.id}:`, error);
          }
        }

        // 3. Calculer métriques pour cette période
        const metrics = this.calculateBacktestMetrics(predictions);
        const windowPerformance = this.analyzeWindowPerformance(predictions);
        const summary = this.generateBacktestSummary(predictions, windowPerformance);

        const result: BacktestResult = {
          period,
          config,
          metrics,
          predictions,
          performance: windowPerformance,
          summary
        };

        results.push(result);
        
        // 4. Stocker résultats pour analyse
        await this.storeBacktestResults(result);

        console.log(`✅ Period ${period.season} completed: ${predictions.length} predictions, ${(metrics.accuracy * 100).toFixed(1)}% accuracy`);

      } catch (error) {
        console.error(`❌ Backtest failed for period ${period.season}:`, error);
      }
    }

    console.log(`\n🏁 Walk-forward backtest completed: ${results.length} periods processed`);
    return results;
  }

  /**
   * Simule prédiction temporelle comme en production
   * Respecte strictement les fenêtres temporelles
   */
  private async simulateTemporalPrediction(
    match: any,
    config: BacktestConfiguration,
    period: BacktestPeriod
  ): Promise<BacktestPrediction | null> {
    const matchDate = new Date(match.match_date);
    
    // Calculer moment de prédiction selon fenêtre
    const predictionTime = this.calculatePredictionTime(matchDate, config.window);
    
    // Vérifier que temps de prédiction dans période backtesting
    if (predictionTime < period.startDate || predictionTime > period.endDate) {
      return null;
    }

    try {
      // Simuler collecte de données disponibles au moment de prédiction
      const availableData = await this.getHistoricalDataAtTime(match.id, predictionTime, config.window);
      
      if (!availableData.sufficient) {
        return null; // Pas assez de données pour prédiction fiable
      }

      // Générer prédiction selon type de modèle
      let prediction: any;
      let contextFactors: string[] = [];
      let modelContributions: Record<string, number> = {};

      switch (config.model) {
        case 'ensemble':
          prediction = await this.simulateEnsemblePrediction(match, config.window, availableData);
          modelContributions = prediction.modelContributions || {};
          break;
          
        case 'contextual':
          const contextualResult = await this.simulateContextualPrediction(match, config.window, availableData);
          prediction = contextualResult.prediction;
          contextFactors = contextualResult.contextFactors;
          break;
          
        case 'baseline':
          prediction = await this.simulateBaselinePrediction(match, availableData);
          break;
          
        default:
          throw new Error(`Unknown model type: ${config.model}`);
      }

      // Vérifier seuil de confiance
      if (config.minConfidence && prediction.confidence < config.minConfidence) {
        return null;
      }

      // Récupérer résultat réel
      const actualResult = await this.getActualResult(match.id, config.markets[0] || '1X2');
      
      if (actualResult === null) {
        return null; // Match pas encore terminé ou données incomplètes
      }

      // Calculer erreur et résultat
      const error = Math.abs(prediction.probability - actualResult);
      const result = error < 0.5 ? 'correct' : 'incorrect'; // Simplification

      return {
        matchId: match.id,
        matchDate,
        homeTeam: match.home_team.name,
        awayTeam: match.away_team.name,
        window: config.window,
        market: config.markets[0] || '1X2',
        predicted: prediction.probability,
        confidence: prediction.confidence,
        actual: actualResult,
        result,
        error,
        contextFactors,
        modelContributions
      };

    } catch (error) {
      console.warn(`Simulation failed for match ${match.id}:`, error);
      return null;
    }
  }

  private calculatePredictionTime(matchDate: Date, window: WindowType): Date {
    const matchTime = matchDate.getTime();
    
    switch (window) {
      case 'T24':
        return new Date(matchTime - 24 * 60 * 60 * 1000);
      case 'T6':
        return new Date(matchTime - 6 * 60 * 60 * 1000);
      case 'T1':
        return new Date(matchTime - 1 * 60 * 60 * 1000);
      case 'T30':
        return new Date(matchTime - 30 * 60 * 1000);
      default:
        throw new Error(`Invalid window: ${window}`);
    }
  }

  private async getHistoricalDataAtTime(
    matchId: string,
    predictionTime: Date,
    window: WindowType
  ): Promise<{ sufficient: boolean; data: any }> {
    // Simuler disponibilité des données au moment de prédiction
    // En réalité, interrogerait données historiques avec timestamp < predictionTime
    
    try {
      // Vérifier données de base
      const { data: basicData } = await this.supabase
        .from('matches')
        .select(`
          id, match_date, 
          home_team:teams!home_team_id(name),
          away_team:teams!away_team_id(name)
        `)
        .eq('id', matchId)
        .single();

      if (!basicData) return { sufficient: false, data: null };

      // Simuler collecte données enrichies selon fenêtre
      const enrichedData: any = { basic: basicData };

      // Météo disponible si T-24h ou plus tard
      if (['T24', 'T6', 'T1', 'T30'].includes(window)) {
        enrichedData.weather = await this.getSimulatedWeatherData(matchId, window);
      }

      // Lineups probables si T-6h ou plus tard
      if (['T6', 'T1', 'T30'].includes(window)) {
        enrichedData.probableLineups = await this.getSimulatedLineupsData(matchId, window);
      }

      // Contexte enrichi disponible progressivement
      if (['T1', 'T30'].includes(window)) {
        enrichedData.context = await this.getSimulatedContextData(matchId, window);
      }

      return { 
        sufficient: true, 
        data: enrichedData 
      };

    } catch (error) {
      return { sufficient: false, data: null };
    }
  }

  private calculateBacktestMetrics(predictions: BacktestPrediction[]): BacktestMetrics {
    if (predictions.length === 0) {
      return this.getEmptyMetrics();
    }

    const correct = predictions.filter(p => p.result === 'correct').length;
    const total = predictions.length;
    
    // Accuracy
    const accuracy = correct / total;

    // Brier Score
    const brierScore = predictions.reduce((sum, p) => sum + Math.pow(p.error, 2), 0) / total;

    // Log Loss
    const logLoss = predictions.reduce((sum, p) => {
      const prob = Math.max(0.001, Math.min(0.999, p.predicted));
      return sum - (p.actual * Math.log(prob) + (1 - p.actual) * Math.log(1 - prob));
    }, 0) / total;

    // Expected Calibration Error
    const calibrationError = this.calculateCalibrationError(predictions);

    // Simuler métriques financières (ROI, Sharpe, Drawdown)
    const financialMetrics = this.calculateFinancialMetrics(predictions);

    return {
      totalPredictions: total,
      correctPredictions: correct,
      accuracy,
      brierScore,
      logLoss,
      calibrationError,
      sharpeRatio: financialMetrics.sharpeRatio,
      maxDrawdown: financialMetrics.maxDrawdown,
      roi: financialMetrics.roi,
      coverage: 1.0 // Simplification: toutes prédictions utilisées
    };
  }

  private calculateCalibrationError(predictions: BacktestPrediction[]): number {
    const bins = 10;
    const binSize = 1.0 / bins;
    let totalError = 0;

    for (let i = 0; i < bins; i++) {
      const binLower = i * binSize;
      const binUpper = (i + 1) * binSize;
      
      const binPredictions = predictions.filter(p => 
        p.predicted >= binLower && p.predicted < binUpper
      );

      if (binPredictions.length === 0) continue;

      const avgPredicted = binPredictions.reduce((sum, p) => sum + p.predicted, 0) / binPredictions.length;
      const avgActual = binPredictions.reduce((sum, p) => sum + p.actual, 0) / binPredictions.length;

      totalError += Math.abs(avgPredicted - avgActual) * (binPredictions.length / predictions.length);
    }

    return totalError;
  }

  private calculateFinancialMetrics(predictions: BacktestPrediction[]) {
    // Simuler stratégie de pari simple pour metrics financières
    let bankroll = 1000; // Bankroll initial
    const returns: number[] = [];
    let peakBankroll = bankroll;
    let maxDrawdown = 0;

    for (const prediction of predictions) {
      // Stratégie simplifiée : parier si confiance > 0.6
      if (prediction.confidence > 0.6) {
        const stake = bankroll * 0.02; // 2% bankroll
        const odds = 1 / prediction.predicted; // Odds inverses simplifiées
        
        if (prediction.result === 'correct') {
          const profit = stake * (odds - 1);
          bankroll += profit;
          returns.push(profit / stake);
        } else {
          bankroll -= stake;
          returns.push(-1);
        }

        // Tracking drawdown
        if (bankroll > peakBankroll) {
          peakBankroll = bankroll;
        } else {
          const currentDrawdown = (peakBankroll - bankroll) / peakBankroll;
          maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
        }
      }
    }

    // ROI
    const roi = (bankroll - 1000) / 1000;

    // Sharpe Ratio approximation
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const returnStd = returns.length > 1 ? Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
    ) : 0;
    const sharpeRatio = returnStd > 0 ? avgReturn / returnStd : 0;

    return { roi, sharpeRatio, maxDrawdown };
  }

  private analyzeWindowPerformance(predictions: BacktestPrediction[]): WindowPerformance[] {
    const windows: WindowType[] = ['T24', 'T6', 'T1', 'T30'];
    const performance: WindowPerformance[] = [];

    let previousAccuracy = 0;

    for (const window of windows) {
      const windowPredictions = predictions.filter(p => p.window === window);
      
      if (windowPredictions.length === 0) {
        continue;
      }

      const correct = windowPredictions.filter(p => p.result === 'correct').length;
      const accuracy = correct / windowPredictions.length;
      
      const brierScore = windowPredictions.reduce((sum, p) => sum + Math.pow(p.error, 2), 0) / windowPredictions.length;
      
      const avgConfidence = windowPredictions.reduce((sum, p) => sum + p.confidence, 0) / windowPredictions.length;

      const improvementVsPrevious = previousAccuracy > 0 ? accuracy - previousAccuracy : undefined;

      performance.push({
        window,
        predictions: windowPredictions.length,
        accuracy,
        brierScore,
        avgConfidence,
        improvementVsPrevious
      });

      previousAccuracy = accuracy;
    }

    return performance;
  }

  private generateBacktestSummary(predictions: BacktestPrediction[], windowPerformance: WindowPerformance[]): BacktestSummary {
    // Meilleure/pire fenêtre
    const sortedWindows = windowPerformance.sort((a, b) => b.accuracy - a.accuracy);
    const bestWindow = sortedWindows[0]?.window || 'T1';
    const worstWindow = sortedWindows[sortedWindows.length - 1]?.window || 'T24';

    // Contextes significatifs
    const contextCounts: Record<string, number> = {};
    predictions.forEach(p => {
      p.contextFactors.forEach(factor => {
        contextCounts[factor] = (contextCounts[factor] || 0) + 1;
      });
    });
    
    const significantContexts = Object.entries(contextCounts)
      .filter(([_, count]) => count >= predictions.length * 0.1)
      .map(([factor, _]) => factor)
      .slice(0, 5);

    // Fiabilité modèle (cohérence predictions)
    const confidenceAccuracyCorr = this.calculateConfidenceAccuracyCorrelation(predictions);
    const modelReliability = Math.max(0, confidenceAccuracyCorr);

    // Consistance temporelle
    const temporalConsistency = this.calculateTemporalConsistency(windowPerformance);

    // Recommandations
    const recommendations = this.generateRecommendations(windowPerformance, predictions, modelReliability);

    return {
      bestWindow,
      worstWindow,
      significantContexts,
      modelReliability,
      temporalConsistency,
      recommendations
    };
  }

  // Helper methods pour simulation et métriques
  private async getTestMatches(period: BacktestPeriod, config: BacktestConfiguration) {
    const { data: matches } = await this.supabase
      .from('matches')
      .select(`
        id, match_date, status,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name)
      `)
      .eq('status', 'finished')
      .gte('match_date', period.startDate.toISOString())
      .lte('match_date', period.endDate.toISOString())
      .order('match_date')
      .limit(config.maxMatches || 1000);

    return matches || [];
  }

  private async simulateEnsemblePrediction(match: any, window: WindowType, data: any) {
    // Simuler prédiction ensemble avec données historiques
    return {
      probability: 0.45 + Math.random() * 0.1, // Simulation
      confidence: 0.6 + Math.random() * 0.3,
      modelContributions: {
        'poisson': 0.2,
        'dixon_coles': 0.25,
        'elo_rating': 0.2,
        'form_based': 0.15,
        'weather_adjusted': 0.2
      }
    };
  }

  private async simulateContextualPrediction(match: any, window: WindowType, data: any) {
    // Simuler prédictions contextuelles
    return {
      prediction: {
        probability: 0.5 + (Math.random() - 0.5) * 0.3,
        confidence: 0.5 + Math.random() * 0.4
      },
      contextFactors: ['weather_impact(80%)', 'rivalry_match(90%)']
    };
  }

  private async simulateBaselinePrediction(match: any, data: any) {
    // Modèle baseline simple
    return {
      probability: 0.5, // Toujours 50/50
      confidence: 0.5
    };
  }

  private async getActualResult(matchId: string, market: string): Promise<number | null> {
    // Récupérer résultat réel (simulé)
    // En réalité, interrogerait table des résultats
    return Math.random() > 0.5 ? 1 : 0; // Simulation binaire
  }

  // Simulation données enrichies
  private async getSimulatedWeatherData(matchId: string, window: WindowType) {
    return { temperature: 15, precipitation: 0, condition: 'clear' };
  }

  private async getSimulatedLineupsData(matchId: string, window: WindowType) {
    return { homeLineup: [], awayLineup: [], confidence: 0.7 };
  }

  private async getSimulatedContextData(matchId: string, window: WindowType) {
    return { rivalry: false, importance: 0.5 };
  }

  private getEmptyMetrics(): BacktestMetrics {
    return {
      totalPredictions: 0,
      correctPredictions: 0,
      accuracy: 0,
      brierScore: 0.25,
      logLoss: 0.693,
      calibrationError: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      roi: 0,
      coverage: 0
    };
  }

  private calculateConfidenceAccuracyCorrelation(predictions: BacktestPrediction[]): number {
    // Calculer corrélation entre confiance prédite et accuracy réelle
    // Simplification : retourner valeur simulée
    return 0.3 + Math.random() * 0.4; // 0.3-0.7
  }

  private calculateTemporalConsistency(performance: WindowPerformance[]): number {
    // Mesurer consistance performance entre fenêtres
    if (performance.length < 2) return 1;
    
    const accuracies = performance.map(p => p.accuracy);
    const stdDev = Math.sqrt(
      accuracies.reduce((sum, acc) => sum + Math.pow(acc - accuracies.reduce((a, b) => a + b) / accuracies.length, 2), 0) / accuracies.length
    );
    
    return Math.max(0, 1 - stdDev * 2); // Plus stdDev faible = plus consistant
  }

  private generateRecommendations(
    windowPerformance: WindowPerformance[],
    predictions: BacktestPrediction[],
    modelReliability: number
  ): string[] {
    const recommendations: string[] = [];

    // Analyse fenêtres
    const bestWindow = windowPerformance.sort((a, b) => b.accuracy - a.accuracy)[0];
    if (bestWindow && bestWindow.accuracy > 0.6) {
      recommendations.push(`Privilégier fenêtre ${bestWindow.window} (${(bestWindow.accuracy * 100).toFixed(1)}% accuracy)`);
    }

    // Analyse fiabilité
    if (modelReliability < 0.3) {
      recommendations.push('Calibrer confiance du modèle (faible corrélation confiance-accuracy)');
    } else if (modelReliability > 0.7) {
      recommendations.push('Confiance du modèle bien calibrée');
    }

    // Analyse performance
    const avgAccuracy = predictions.reduce((sum, p) => sum + (p.result === 'correct' ? 1 : 0), 0) / predictions.length;
    if (avgAccuracy < 0.5) {
      recommendations.push('Performance sous baseline - réviser features et modèle');
    } else if (avgAccuracy > 0.65) {
      recommendations.push('Performance excellente - considérer augmenter stakes');
    }

    return recommendations;
  }

  private async storeBacktestResults(result: BacktestResult): Promise<void> {
    // Stocker résultats backtest en base
    const { error } = await this.supabase
      .from('backtest_results')
      .insert({
        season: result.period.season,
        model_type: result.config.model,
        window: result.config.window,
        total_predictions: result.metrics.totalPredictions,
        accuracy: result.metrics.accuracy,
        brier_score: result.metrics.brierScore,
        roi: result.metrics.roi,
        sharpe_ratio: result.metrics.sharpeRatio,
        max_drawdown: result.metrics.maxDrawdown,
        best_window: result.summary.bestWindow,
        model_reliability: result.summary.modelReliability,
        recommendations: result.summary.recommendations,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Failed to store backtest results:', error);
    }
  }
}

export const temporalValidationEngine = new TemporalValidationEngine();