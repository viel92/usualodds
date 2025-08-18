import { createClient } from '@/lib/supabase';
import { WindowType } from '@/types/database';
import { temporalValidator } from './temporal-validator';

interface FeatureEvolution {
  featureName: string;
  currentImportance: number;
  historicalImportance: number[];
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  lastPerformanceScore: number;
  createdAt: string;
  evolutionReason: string;
}

interface AdaptiveFeatureConfig {
  enableAutoCreation: boolean;
  enableAutoRemoval: boolean;
  importanceThreshold: number;
  performanceThreshold: number;
  evolutionTrackingDays: number;
}

interface FeatureInteraction {
  feature1: string;
  feature2: string;
  interactionStrength: number;
  synergistic: boolean; // true if features work better together
  discoveredAt: string;
  validationScore: number;
}

export class AdaptiveFeaturesBuilder {
  private supabase = createClient();
  private config: AdaptiveFeatureConfig = {
    enableAutoCreation: true,
    enableAutoRemoval: false, // Conservative pour montante
    importanceThreshold: 0.001,
    performanceThreshold: 0.8,
    evolutionTrackingDays: 30
  };

  /**
   * Construit des features adaptatives basées sur l'apprentissage des erreurs
   */
  async buildAdaptiveFeatures(
    matchId: string,
    window: WindowType,
    decisionTime: Date
  ): Promise<{
    features: Record<string, any>;
    newFeatures: string[];
    deprecatedFeatures: string[];
    interactions: FeatureInteraction[];
    temporalValidation: any;
  }> {
    console.log(`Building adaptive features for match ${matchId} at window ${window}`);

    try {
      // 1. VALIDATION TEMPORELLE CRITIQUE
      const temporalValidation = await temporalValidator.validateTemporalConstraints(
        matchId,
        window,
        decisionTime
      );

      if (!temporalValidation.isValid && window === 'T1') {
        throw new Error('❌ ERREUR CRITIQUE: Violations temporelles détectées pour décision montante');
      }

      // 2. Récupérer features de base
      const baseFeatures = await this.getBaseFeatures(matchId, window);

      // 3. Générer features adaptatives basées sur insights d'apprentissage
      const adaptiveFeatures = await this.generateAdaptiveFeatures(matchId, window);

      // 4. Détecter et appliquer interactions de features
      const featureInteractions = await this.detectFeatureInteractions(matchId, window);

      // 5. Évoluer features basées sur performance historique
      const evolvedFeatures = await this.evolveFeatures(baseFeatures, adaptiveFeatures);

      // 6. Appliquer des ajustements contextuels
      const contextualFeatures = await this.applyContextualAdjustments(
        evolvedFeatures,
        matchId,
        window
      );

      // 7. Filtrer features obsolètes ou peu performantes
      const {
        features: finalFeatures,
        removed: deprecatedFeatures
      } = await this.filterUnderperformingFeatures(contextualFeatures, window);

      // 8. Tracking de l'évolution des features
      await this.trackFeatureEvolution(finalFeatures, matchId, window);

      // 9. Identifier nouvelles features créées
      const newFeatures = Object.keys(adaptiveFeatures);

      return {
        features: finalFeatures,
        newFeatures,
        deprecatedFeatures,
        interactions: featureInteractions,
        temporalValidation
      };

    } catch (error) {
      console.error('Error building adaptive features:', error);
      throw error;
    }
  }

  private async getBaseFeatures(matchId: string, window: WindowType): Promise<Record<string, any>> {
    const features: Record<string, any> = {};

    // Features équipe
    const { data: teamFeatures } = await this.supabase
      .from('features_match_team')
      .select('*')
      .eq('match_id', matchId)
      .eq('window', window);

    if (teamFeatures) {
      teamFeatures.forEach((tf, index) => {
        const prefix = tf.is_home ? 'home_' : 'away_';
        Object.entries(tf).forEach(([key, value]) => {
          if (key !== 'id' && key !== 'match_id' && key !== 'team_id' && 
              key !== 'window' && key !== 'created_at' && value !== null) {
            features[`${prefix}${key}`] = value;
          }
        });
      });
    }

    // Features joueur (agrégées par équipe)
    const { data: playerFeatures } = await this.supabase
      .from('features_player_match')
      .select('*')
      .eq('match_id', matchId)
      .eq('window', window);

    if (playerFeatures) {
      // Agréger features joueurs par équipe
      const teamPlayerFeatures = this.aggregatePlayerFeatures(playerFeatures);
      Object.assign(features, teamPlayerFeatures);
    }

    return features;
  }

  private async generateAdaptiveFeatures(
    matchId: string,
    window: WindowType
  ): Promise<Record<string, any>> {
    const adaptiveFeatures: Record<string, any> = {};

    // 1. Features basées sur insights d'apprentissage récents
    const insights = await this.getRecentLearningInsights();
    
    for (const insight of insights) {
      if (insight.actionable && insight.suggested_features) {
        for (const suggestedFeature of insight.suggested_features) {
          const featureValue = await this.computeInsightBasedFeature(
            suggestedFeature,
            matchId,
            insight
          );
          if (featureValue !== null) {
            adaptiveFeatures[`adaptive_${suggestedFeature}`] = featureValue;
          }
        }
      }
    }

    // 2. Features d'interaction automatiquement découvertes
    const discoveredInteractions = await this.discoverNewFeatureInteractions(matchId, window);
    Object.assign(adaptiveFeatures, discoveredInteractions);

    // 3. Features de correction d'erreur
    const errorCorrectionFeatures = await this.generateErrorCorrectionFeatures(matchId, window);
    Object.assign(adaptiveFeatures, errorCorrectionFeatures);

    // 4. Features saisonnières et temporelles adaptatives
    const temporalFeatures = await this.generateTemporalAdaptiveFeatures(matchId);
    Object.assign(adaptiveFeatures, temporalFeatures);

    return adaptiveFeatures;
  }

  private async getRecentLearningInsights(): Promise<any[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: insights } = await this.supabase
      .from('learning_insights')
      .select('*')
      .eq('actionable', true)
      .gte('generated_at', thirtyDaysAgo.toISOString())
      .order('impact', { ascending: false })
      .limit(10);

    return insights || [];
  }

  private async computeInsightBasedFeature(
    featureName: string,
    matchId: string,
    insight: any
  ): Promise<number | null> {
    // Calculer features basées sur les insights d'apprentissage
    
    switch (featureName) {
      case 'weather_interaction_features':
        return this.computeWeatherInteractionFeature(matchId);
        
      case 'derby_volatility_feature':
        return this.computeDerbyVolatilityFeature(matchId);
        
      case 'calibration_temperature_scaling':
        return this.computeCalibrationFeature(matchId, insight);
        
      case 'form_momentum_feature':
        return this.computeFormMomentumFeature(matchId);
        
      case 'fatigue_compound_feature':
        return this.computeFatigueCompoundFeature(matchId);
        
      default:
        return null;
    }
  }

  private async computeWeatherInteractionFeature(matchId: string): Promise<number> {
    const { data: match } = await this.supabase
      .from('matches')
      .select('weather_temp, weather_wind, weather_condition')
      .eq('id', matchId)
      .single();

    if (!match) return 0;

    let weatherImpact = 0;
    
    // Température extrême
    if (match.weather_temp) {
      if (match.weather_temp < 5) weatherImpact += 0.3;
      if (match.weather_temp > 30) weatherImpact += 0.2;
    }
    
    // Vent fort
    if (match.weather_wind && match.weather_wind > 20) {
      weatherImpact += 0.4;
    }
    
    // Conditions adverses
    if (match.weather_condition?.includes('rain')) weatherImpact += 0.3;
    if (match.weather_condition?.includes('snow')) weatherImpact += 0.5;
    
    return Math.min(weatherImpact, 1.0);
  }

  private async computeDerbyVolatilityFeature(matchId: string): Promise<number> {
    const { data: match } = await this.supabase
      .from('matches')
      .select(`
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name)
      `)
      .eq('id', matchId)
      .single();

    if (!match) return 0;

    // Logic simplifiée pour détecter les derbys
    const homeTeam = match.home_team?.name || '';
    const awayTeam = match.away_team?.name || '';
    
    const derbyKeywords = [
      ['Manchester United', 'Manchester City'],
      ['Arsenal', 'Tottenham'],
      ['Liverpool', 'Everton'],
      ['Real Madrid', 'Barcelona'],
      ['Milan', 'Inter']
    ];

    const isDerby = derbyKeywords.some(([team1, team2]) =>
      (homeTeam.includes(team1) && awayTeam.includes(team2)) ||
      (homeTeam.includes(team2) && awayTeam.includes(team1))
    );

    return isDerby ? 0.8 : 0.0;
  }

  private async computeCalibrationFeature(matchId: string, insight: any): Promise<number> {
    // Feature pour corriger la calibration basée sur insights
    const impact = insight.impact || 0;
    return Math.min(impact * 2, 1.0); // Amplifier l'impact pour correction
  }

  private async computeFormMomentumFeature(matchId: string): Promise<number> {
    // Calculer momentum de forme (non juste points, mais tendance)
    const { data: teamFeatures } = await this.supabase
      .from('features_match_team')
      .select('form_5_points, form_10_points, team_id')
      .eq('match_id', matchId);

    if (!teamFeatures || teamFeatures.length === 0) return 0;

    let avgMomentum = 0;
    for (const tf of teamFeatures) {
      if (tf.form_5_points !== null && tf.form_10_points !== null) {
        // Momentum = différence entre forme récente et forme long terme
        const momentum = (tf.form_5_points / 5) - (tf.form_10_points / 10);
        avgMomentum += momentum;
      }
    }

    return avgMomentum / teamFeatures.length;
  }

  private async computeFatigueCompoundFeature(matchId: string): Promise<number> {
    // Feature composite de fatigue
    const { data: teamFeatures } = await this.supabase
      .from('features_match_team')
      .select('days_rest, congestion_index, ucl_within_3d')
      .eq('match_id', matchId);

    if (!teamFeatures || teamFeatures.length === 0) return 0;

    let avgFatigue = 0;
    for (const tf of teamFeatures) {
      let fatigue = 0;
      
      if (tf.days_rest !== null) {
        fatigue += Math.max(0, (7 - tf.days_rest) / 7); // Fatigue si <7 jours repos
      }
      
      if (tf.congestion_index !== null) {
        fatigue += tf.congestion_index;
      }
      
      if (tf.ucl_within_3d) {
        fatigue += 0.3; // Bonus fatigue si UCL récent
      }
      
      avgFatigue += Math.min(fatigue, 1.0);
    }

    return avgFatigue / teamFeatures.length;
  }

  private aggregatePlayerFeatures(playerFeatures: any[]): Record<string, any> {
    const aggregated: Record<string, any> = {};
    
    // Grouper par équipe
    const teamGroups = playerFeatures.reduce((acc, pf) => {
      if (!acc[pf.team_id]) acc[pf.team_id] = [];
      acc[pf.team_id].push(pf);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(teamGroups).forEach(([teamId, players], index) => {
      const prefix = index === 0 ? 'home_' : 'away_';
      
      // Agréger features numériques
      const avgXG = players.reduce((sum, p) => sum + (p.xg_per_90 || 0), 0) / players.length;
      const avgXA = players.reduce((sum, p) => sum + (p.xa_per_90 || 0), 0) / players.length;
      const avgMinutes = players.reduce((sum, p) => sum + (p.minutes_expected || 0), 0) / players.length;
      
      aggregated[`${prefix}avg_xg_per_90`] = avgXG;
      aggregated[`${prefix}avg_xa_per_90`] = avgXA;
      aggregated[`${prefix}avg_minutes_expected`] = avgMinutes;
      
      // Compter roles spéciaux
      aggregated[`${prefix}penalty_takers`] = players.filter(p => p.penalty_taker).length;
      aggregated[`${prefix}corner_takers`] = players.filter(p => p.corner_taker).length;
      
      // Feature de profondeur d'effectif
      aggregated[`${prefix}squad_depth`] = players.filter(p => (p.minutes_expected || 0) > 20).length;
    });

    return aggregated;
  }

  private async discoverNewFeatureInteractions(
    matchId: string,
    window: WindowType
  ): Promise<Record<string, any>> {
    // Découvrir automatiquement de nouvelles interactions entre features
    const interactions: Record<string, any> = {};
    
    // Exemple: interaction météo × style de jeu
    const weatherFeature = await this.computeWeatherInteractionFeature(matchId);
    const { data: teamFeatures } = await this.supabase
      .from('features_match_team')
      .select('possession_style, pressing_style')
      .eq('match_id', matchId)
      .eq('window', window);

    if (teamFeatures && teamFeatures.length > 0) {
      teamFeatures.forEach((tf, index) => {
        const prefix = index === 0 ? 'home_' : 'away_';
        
        // Interaction météo × possession
        if (tf.possession_style !== null) {
          interactions[`${prefix}weather_possession_interaction`] = 
            weatherFeature * Math.abs(tf.possession_style);
        }
        
        // Interaction météo × pressing
        if (tf.pressing_style !== null) {
          interactions[`${prefix}weather_pressing_interaction`] = 
            weatherFeature * Math.abs(tf.pressing_style);
        }
      });
    }

    return interactions;
  }

  private async generateErrorCorrectionFeatures(
    matchId: string,
    window: WindowType
  ): Promise<Record<string, any>> {
    const corrections: Record<string, any> = {};

    // Récupérer erreurs récentes pour ce type de contexte
    const { data: match } = await this.supabase
      .from('matches')
      .select(`
        home_team:teams!home_team_id(id),
        away_team:teams!away_team_id(id),
        season:seasons(*)
      `)
      .eq('id', matchId)
      .single();

    if (!match) return corrections;

    // Rechercher erreurs similaires dans le passé
    const { data: similarErrors } = await this.supabase
      .from('prediction_errors')
      .select('error_type, context, brier_score')
      .eq('window', window)
      .gte('analyzed_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    if (similarErrors && similarErrors.length > 0) {
      // Analyser patterns d'erreur pour ce contexte
      const errorsByType = similarErrors.reduce((acc, error) => {
        if (!acc[error.error_type]) acc[error.error_type] = [];
        acc[error.error_type].push(error);
        return acc;
      }, {} as Record<string, any[]>);

      // Créer features de correction
      Object.entries(errorsByType).forEach(([errorType, errors]) => {
        const avgError = errors.reduce((sum, e) => sum + e.brier_score, 0) / errors.length;
        corrections[`error_correction_${errorType}`] = Math.min(avgError * 2, 1.0);
      });
    }

    return corrections;
  }

  private async generateTemporalAdaptiveFeatures(matchId: string): Promise<Record<string, any>> {
    const temporal: Record<string, any> = {};

    const { data: match } = await this.supabase
      .from('matches')
      .select('match_date, season:seasons(*)')
      .eq('id', matchId)
      .single();

    if (!match) return temporal;

    const matchDate = new Date(match.match_date);
    const dayOfWeek = matchDate.getDay();
    const month = matchDate.getMonth() + 1;
    const hour = matchDate.getHours();

    // Features temporelles adaptatives
    temporal['is_weekend'] = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;
    temporal['is_midweek'] = dayOfWeek >= 2 && dayOfWeek <= 4 ? 1 : 0;
    temporal['is_evening_kickoff'] = hour >= 18 ? 1 : 0;
    temporal['season_intensity'] = this.calculateSeasonIntensity(month);
    temporal['fixture_congestion_period'] = this.isFixtureCongestionPeriod(month) ? 1 : 0;

    return temporal;
  }

  private calculateSeasonIntensity(month: number): number {
    // Intensité de saison basée sur période
    if (month >= 11 || month <= 2) return 1.0; // Période intense hiver
    if (month >= 3 && month <= 5) return 0.8; // Fin de saison
    if (month >= 8 && month <= 10) return 0.6; // Début de saison
    return 0.3; // Été/pause
  }

  private isFixtureCongestionPeriod(month: number): boolean {
    // Périodes typiques de congestion
    return month === 12 || month === 1 || month === 4; // Noël, Janvier, fin saison
  }

  private async detectFeatureInteractions(
    matchId: string,
    window: WindowType
  ): Promise<FeatureInteraction[]> {
    // Pour l'instant, retourner interactions prédéfinies découvertes
    // Dans une implémentation avancée, utiliser correlation analysis
    
    return [
      {
        feature1: 'weather_interaction_features',
        feature2: 'pressing_style',
        interactionStrength: 0.15,
        synergistic: false, // Météo adverse réduit efficacité pressing
        discoveredAt: new Date().toISOString(),
        validationScore: 0.7
      },
      {
        feature1: 'derby_volatility_feature',
        feature2: 'form_momentum_feature',
        interactionStrength: 0.25,
        synergistic: true, // Derbys amplifient momentum
        discoveredAt: new Date().toISOString(),
        validationScore: 0.8
      }
    ];
  }

  private async evolveFeatures(
    baseFeatures: Record<string, any>,
    adaptiveFeatures: Record<string, any>
  ): Promise<Record<string, any>> {
    // Combiner features de base et adaptatives avec poids évolutifs
    const evolved = { ...baseFeatures };

    // Appliquer poids adaptatifs basés sur performance historique
    const adaptiveWeights = await this.getAdaptiveWeights();

    Object.entries(adaptiveFeatures).forEach(([key, value]) => {
      const weight = adaptiveWeights[key] || 1.0;
      evolved[key] = value * weight;
    });

    return evolved;
  }

  private async getAdaptiveWeights(): Promise<Record<string, number>> {
    // Récupérer poids adaptatifs depuis la table
    const { data: params } = await this.supabase
      .from('adaptive_model_params')
      .select('param_name, param_value')
      .eq('param_type', 'weight')
      .eq('model_component', 'adaptive_features');

    const weights: Record<string, number> = {};
    if (params) {
      params.forEach(param => {
        weights[param.param_name] = param.param_value;
      });
    }

    return weights;
  }

  private async applyContextualAdjustments(
    features: Record<string, any>,
    matchId: string,
    window: WindowType
  ): Promise<Record<string, any>> {
    // Ajustements contextuels basés sur apprentissage
    const adjusted = { ...features };

    // Exemple: ajuster selon historique de performance du window
    const windowPerformance = await this.getWindowPerformance(window);
    
    if (windowPerformance && windowPerformance.avgBrierScore > 0.25) {
      // Si performance du window est faible, augmenter incertitude
      Object.keys(adjusted).forEach(key => {
        if (typeof adjusted[key] === 'number' && Math.abs(adjusted[key]) > 0.5) {
          adjusted[key] *= 0.9; // Réduire confiance
        }
      });
    }

    return adjusted;
  }

  private async getWindowPerformance(window: WindowType): Promise<any> {
    const { data: errors } = await this.supabase
      .from('prediction_errors')
      .select('brier_score')
      .eq('window', window)
      .gte('analyzed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!errors || errors.length === 0) return null;

    const avgBrierScore = errors.reduce((sum, e) => sum + e.brier_score, 0) / errors.length;
    return { avgBrierScore, sampleSize: errors.length };
  }

  private async filterUnderperformingFeatures(
    features: Record<string, any>,
    window: WindowType
  ): Promise<{ features: Record<string, any>; removed: string[] }> {
    if (!this.config.enableAutoRemoval) {
      return { features, removed: [] };
    }

    const filtered = { ...features };
    const removed: string[] = [];

    // Récupérer features avec faible importance
    const { data: lowImportanceFeatures } = await this.supabase
      .from('feature_importance_tracking')
      .select('feature_name')
      .eq('window', window)
      .lt('importance_score', this.config.importanceThreshold)
      .gte('measured_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (lowImportanceFeatures) {
      lowImportanceFeatures.forEach(item => {
        if (filtered[item.feature_name] !== undefined) {
          delete filtered[item.feature_name];
          removed.push(item.feature_name);
        }
      });
    }

    return { features: filtered, removed };
  }

  private async trackFeatureEvolution(
    features: Record<string, any>,
    matchId: string,
    window: WindowType
  ): Promise<void> {
    // Tracker l'évolution des features pour apprentissage futur
    const evolution: FeatureEvolution[] = [];

    Object.entries(features).forEach(([featureName, value]) => {
      if (typeof value === 'number') {
        evolution.push({
          featureName,
          currentImportance: Math.abs(value),
          historicalImportance: [], // À remplir avec données historiques
          trend: 'stable', // À calculer
          lastPerformanceScore: 0, // À calculer post-match
          createdAt: new Date().toISOString(),
          evolutionReason: 'adaptive_generation'
        });
      }
    });

    // Stocker pour analysis future
    if (evolution.length > 0) {
      await this.supabase
        .from('data_quality_checks')
        .insert({
          check_type: 'feature_evolution',
          table_name: 'features',
          check_name: 'adaptive_tracking',
          status: 'passed',
          details: {
            match_id: matchId,
            window,
            evolution,
            feature_count: evolution.length
          },
          checked_at: new Date().toISOString()
        });
    }
  }
}

export const adaptiveFeaturesBuilder = new AdaptiveFeaturesBuilder();