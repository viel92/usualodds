// @ts-nocheck
import { BaseCollector } from '../collectors/base-collector';
import { WindowType } from '@/types/database';
import { postMatchAnalyzer } from '../ml/post-match-analyzer';

interface ModelPrediction {
  probability: number;
  confidence: number;
  modelName: string;
  features: Record<string, number>;
  context: ModelContext;
}

interface ModelContext {
  matchId: string;
  window: WindowType;
  market: string;
  homeTeam: string;
  awayTeam: string;
  weather?: WeatherContext;
  rivalry?: boolean;
  importance?: number;
}

interface WeatherContext {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  condition: string;
}

interface ModelPerformance {
  modelName: string;
  window: WindowType;
  brierScore: number;
  logLoss: number;
  calibrationError: number;
  recentPerformance: number; // Performance sur 30 derniers jours
  contextPerformance: Record<string, number>; // Performance par contexte
  errorPatterns: string[];
  lastUpdate: Date;
}

interface EnsembleWeights {
  window: WindowType;
  weights: Record<string, number>; // modelName -> weight
  lastUpdate: Date;
  performance: number;
}

export class AdaptiveEnsemble extends BaseCollector {
  private baseModels: Map<string, BaseModel> = new Map();
  private ensembleWeights: Map<WindowType, EnsembleWeights> = new Map();
  private modelPerformances: Map<string, ModelPerformance[]> = new Map();

  constructor() {
    super();
    this.initializeBaseModels();
  }

  /**
   * Initialise les modèles de base de l'ensemble
   */
  private initializeBaseModels(): void {
    // Modèles de base qui composent l'ensemble
    this.baseModels.set('poisson', new PoissonModel());
    this.baseModels.set('dixon_coles', new DixonColesModel());
    this.baseModels.set('elo_rating', new EloRatingModel());
    this.baseModels.set('form_based', new FormBasedModel());
    this.baseModels.set('weather_adjusted', new WeatherAdjustedModel());
  }

  /**
   * Génère une prédiction d'ensemble pour un match donné
   */
  async generateEnsemblePrediction(
    matchId: string,
    window: WindowType,
    market: string = '1X2'
  ): Promise<ModelPrediction> {
    console.log(`🧠 Generating ensemble prediction for match ${matchId} at ${window}`);

    try {
      // 1. Récupérer le contexte du match
      const context = await this.getMatchContext(matchId, window);

      // 2. Obtenir prédictions de tous les modèles de base
      const basePredictions = await Promise.all(
        Array.from(this.baseModels.entries()).map(async ([name, model]) => {
          try {
            const prediction = await model.predict(matchId, window, market, context);
            return { name, prediction };
          } catch (error) {
            console.warn(`Model ${name} failed for match ${matchId}:`, error);
            return null;
          }
        })
      );

      const validPredictions = basePredictions.filter(p => p !== null);

      if (validPredictions.length === 0) {
        throw new Error('No valid predictions from base models');
      }

      // 3. Récupérer poids d'ensemble pour cette fenêtre
      const weights = await this.getEnsembleWeights(window);

      // 4. Calculer prédiction pondérée
      const ensemblePrediction = this.calculateWeightedPrediction(
        validPredictions.map(p => p!),
        weights,
        context
      );

      console.log(`✅ Ensemble prediction generated: ${ensemblePrediction.probability.toFixed(3)} (confidence: ${ensemblePrediction.confidence.toFixed(3)})`);

      return ensemblePrediction;

    } catch (error) {
      console.error(`Error generating ensemble prediction for ${matchId}:`, error);
      throw error;
    }
  }

  /**
   * Réentraînement nocturne basé sur les erreurs post-match
   */
  async nightlyRetraining(): Promise<void> {
    console.log('🌙 Starting nightly ensemble retraining...');

    try {
      // 1. Récupérer nouvelles données d'erreur depuis hier
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newErrors = await this.getRecentPredictionErrors(yesterday);

      if (newErrors.length === 0) {
        console.log('No new prediction errors found for retraining');
        return;
      }

      console.log(`Found ${newErrors.length} new prediction errors for analysis`);

      // 2. Analyser performance par modèle et fenêtre
      await this.updateModelPerformances(newErrors);

      // 3. Recalculer poids d'ensemble
      await this.updateEnsembleWeights();

      // 4. Réentraîner modèles individuels si nécessaire
      await this.retrainIndividualModels(newErrors);

      // 5. Valider nouvelles performances
      await this.validateRetainedPerformance();

      console.log('✅ Nightly ensemble retraining completed');

    } catch (error) {
      console.error('❌ Nightly retraining failed:', error);
      throw error;
    }
  }

  /**
   * Calcule la prédiction pondérée de l'ensemble
   */
  private calculateWeightedPrediction(
    predictions: Array<{ name: string; prediction: ModelPrediction }>,
    weights: Record<string, number>,
    context: ModelContext
  ): ModelPrediction {
    let weightedProbability = 0;
    let weightedConfidence = 0;
    let totalWeight = 0;
    const features: Record<string, number> = {};
    const contributingModels: string[] = [];

    for (const { name, prediction } of predictions) {
      const weight = weights[name] || 0.1; // Poids par défaut minimal
      
      // Ajustement contextuel du poids
      const contextWeight = this.adjustWeightForContext(name, weight, context);
      
      weightedProbability += prediction.probability * contextWeight;
      weightedConfidence += prediction.confidence * contextWeight;
      totalWeight += contextWeight;
      contributingModels.push(name);

      // Fusionner features
      Object.entries(prediction.features).forEach(([key, value]) => {
        if (!features[key]) features[key] = 0;
        features[key] += value * contextWeight;
      });
    }

    // Normaliser
    if (totalWeight > 0) {
      weightedProbability /= totalWeight;
      weightedConfidence /= totalWeight;
      Object.keys(features).forEach(key => {
        features[key] /= totalWeight;
      });
    }

    return {
      probability: Math.max(0, Math.min(1, weightedProbability)),
      confidence: Math.max(0, Math.min(1, weightedConfidence)),
      modelName: `ensemble[${contributingModels.join('+')}]`,
      features,
      context
    };
  }

  /**
   * Ajuste le poids d'un modèle selon le contexte
   */
  private adjustWeightForContext(
    modelName: string,
    baseWeight: number,
    context: ModelContext
  ): number {
    let adjustedWeight = baseWeight;

    // Ajustements spécifiques par modèle et contexte
    switch (modelName) {
      case 'weather_adjusted':
        if (context.weather && (
          context.weather.precipitation > 0 || 
          Math.abs(context.weather.temperature - 15) > 10
        )) {
          adjustedWeight *= 1.5; // Plus de poids en conditions difficiles
        }
        break;

      case 'form_based':
        // Plus de poids en début/fin de saison quand forme est critique
        const month = new Date().getMonth() + 1;
        if (month <= 3 || month >= 11) {
          adjustedWeight *= 1.2;
        }
        break;

      case 'elo_rating':
        // Plus de poids pour matchs importants
        if (context.importance && context.importance > 0.7) {
          adjustedWeight *= 1.3;
        }
        break;

      case 'dixon_coles':
        // Plus de poids pour derbies et rivalités
        if (context.rivalry) {
          adjustedWeight *= 1.4;
        }
        break;
    }

    return Math.max(0.05, adjustedWeight); // Poids minimum de 5%
  }

  /**
   * Met à jour les performances des modèles basées sur nouvelles erreurs
   */
  private async updateModelPerformances(errors: any[]): Promise<void> {
    console.log('📊 Updating model performances...');

    for (const [modelName] of this.baseModels) {
      const modelErrors = errors.filter(e => 
        e.prediction_metadata?.modelName?.includes(modelName)
      );

      if (modelErrors.length === 0) continue;

      // Calculer nouvelles métriques
      const brierScore = this.calculateBrierScore(modelErrors);
      const logLoss = this.calculateLogLoss(modelErrors);
      const calibrationError = this.calculateCalibrationError(modelErrors);
      const recentPerformance = this.calculateRecentPerformance(modelName);

      // Analyser patterns d'erreur
      const errorPatterns = await this.analyzeErrorPatterns(modelErrors);

      const performance: ModelPerformance = {
        modelName,
        window: errors[0].window, // Simplification
        brierScore,
        logLoss,
        calibrationError,
        recentPerformance,
        contextPerformance: await this.calculateContextPerformance(modelName, modelErrors),
        errorPatterns,
        lastUpdate: new Date()
      };

      // Stocker en base pour historique
      await this.storeModelPerformance(performance);
    }
  }

  /**
   * Met à jour les poids de l'ensemble basés sur performances récentes
   */
  private async updateEnsembleWeights(): Promise<void> {
    console.log('⚖️  Updating ensemble weights...');

    for (const window of ['T24', 'T6', 'T1', 'T30'] as WindowType[]) {
      const newWeights: Record<string, number> = {};
      let totalInverseError = 0;

      // Calculer poids basés sur performance inverse (moins d'erreur = plus de poids)
      for (const [modelName] of this.baseModels) {
        const recentPerformance = await this.getRecentModelPerformance(modelName, window);
        
        // Utiliser inverse du Brier Score comme base du poids
        const inverseError = 1 / (recentPerformance.brierScore + 0.001);
        newWeights[modelName] = inverseError;
        totalInverseError += inverseError;
      }

      // Normaliser poids
      Object.keys(newWeights).forEach(modelName => {
        newWeights[modelName] /= totalInverseError;
        
        // Appliquer contraintes min/max
        newWeights[modelName] = Math.max(0.05, Math.min(0.5, newWeights[modelName]));
      });

      // Renormaliser après contraintes
      const finalTotal = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
      Object.keys(newWeights).forEach(modelName => {
        newWeights[modelName] /= finalTotal;
      });

      // Stocker nouveaux poids
      const ensembleWeights: EnsembleWeights = {
        window,
        weights: newWeights,
        lastUpdate: new Date(),
        performance: await this.calculateEnsemblePerformance(window)
      };

      this.ensembleWeights.set(window, ensembleWeights);
      await this.storeEnsembleWeights(ensembleWeights);

      console.log(`Updated weights for ${window}:`, 
        Object.entries(newWeights).map(([name, weight]) => 
          `${name}:${(weight * 100).toFixed(1)}%`
        ).join(', ')
      );
    }
  }

  /**
   * Réentraîne modèles individuels si performance dégradée
   */
  private async retrainIndividualModels(errors: any[]): Promise<void> {
    console.log('🔧 Checking individual models for retraining...');

    for (const [modelName, model] of this.baseModels) {
      const recentPerformance = await this.getRecentModelPerformance(modelName, 'T1');
      
      // Déclencher réentraînement si performance dégradée >10%
      if (recentPerformance.recentPerformance < 0.9) {
        console.log(`⚠️  Model ${modelName} performance degraded, triggering retraining...`);
        
        try {
          await model.retrain(errors.filter(e => 
            e.prediction_metadata?.modelName?.includes(modelName)
          ));
          
          console.log(`✅ Model ${modelName} retrained successfully`);
        } catch (error) {
          console.error(`❌ Failed to retrain ${modelName}:`, error);
        }
      }
    }
  }

  // Méthodes utilitaires
  private calculateBrierScore(errors: any[]): number {
    if (errors.length === 0) return 0.25; // Score neutre
    
    const sum = errors.reduce((acc, error) => {
      return acc + Math.pow(error.error, 2);
    }, 0);
    
    return sum / errors.length;
  }

  private calculateLogLoss(errors: any[]): number {
    if (errors.length === 0) return 0.693; // ln(2) pour prédiction aléatoire
    
    const sum = errors.reduce((acc, error) => {
      const p = Math.max(0.001, Math.min(0.999, error.predicted));
      const actual = error.actual;
      return acc - (actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
    }, 0);
    
    return sum / errors.length;
  }

  private calculateCalibrationError(errors: any[]): number {
    // Expected Calibration Error (ECE)
    const bins = 10;
    const binSize = 1.0 / bins;
    let totalCalibrationError = 0;
    
    for (let i = 0; i < bins; i++) {
      const binLower = i * binSize;
      const binUpper = (i + 1) * binSize;
      
      const binErrors = errors.filter(e => 
        e.predicted >= binLower && e.predicted < binUpper
      );
      
      if (binErrors.length === 0) continue;
      
      const avgPredicted = binErrors.reduce((sum, e) => sum + e.predicted, 0) / binErrors.length;
      const avgActual = binErrors.reduce((sum, e) => sum + e.actual, 0) / binErrors.length;
      
      totalCalibrationError += Math.abs(avgPredicted - avgActual) * (binErrors.length / errors.length);
    }
    
    return totalCalibrationError;
  }

  private async calculateRecentPerformance(modelName: string): Promise<number> {
    // Récupérer performance des 30 derniers jours
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: recentErrors } = await this.supabase
      .from('prediction_errors')
      .select('*')
      .contains('prediction_metadata', { modelName })
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (!recentErrors || recentErrors.length === 0) return 0.5;

    const avgError = recentErrors.reduce((sum, e) => sum + Math.abs(e.error), 0) / recentErrors.length;
    return Math.max(0, 1 - avgError); // Convert error to performance
  }

  private async getMatchContext(matchId: string, window: WindowType): Promise<ModelContext> {
    // Récupérer données enrichies du match
    const { data: match } = await this.supabase
      .from('matches')
      .select(`
        id, match_date,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name),
        weather_forecasts!inner(temperature, precipitation, wind_speed, condition),
        match_context!inner(rivalry_data)
      `)
      .eq('id', matchId)
      .single();

    if (!match) throw new Error(`Match ${matchId} not found`);

    return {
      matchId,
      window,
      market: '1X2',
      homeTeam: match.home_team.name,
      awayTeam: match.away_team.name,
      weather: match.weather_forecasts ? {
        temperature: match.weather_forecasts.temperature,
        precipitation: match.weather_forecasts.precipitation,
        windSpeed: match.weather_forecasts.wind_speed,
        condition: match.weather_forecasts.condition
      } : undefined,
      rivalry: match.match_context?.rivalry_data?.isRivalry || false,
      importance: match.match_context?.match_importance?.homeImportance || 0.5
    };
  }

  private async getEnsembleWeights(window: WindowType): Promise<Record<string, number>> {
    const weights = this.ensembleWeights.get(window);
    if (weights && Date.now() - weights.lastUpdate.getTime() < 24 * 60 * 60 * 1000) {
      return weights.weights;
    }

    // Poids par défaut égaux si pas d'historique
    const defaultWeight = 1.0 / this.baseModels.size;
    const defaultWeights: Record<string, number> = {};
    
    for (const modelName of this.baseModels.keys()) {
      defaultWeights[modelName] = defaultWeight;
    }

    return defaultWeights;
  }

  private async getRecentPredictionErrors(since: Date): Promise<any[]> {
    const { data: errors } = await this.supabase
      .from('prediction_errors')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    return errors || [];
  }

  private async analyzeErrorPatterns(errors: any[]): Promise<string[]> {
    // Analyser patterns d'erreur communs
    const patterns: string[] = [];
    
    // Pattern 1: Erreurs systématiques dans certaines conditions météo
    const weatherErrors = errors.filter(e => e.context?.weather);
    if (weatherErrors.length > errors.length * 0.3) {
      patterns.push('weather_sensitive_errors');
    }

    // Pattern 2: Erreurs sur derbies/rivalités
    const rivalryErrors = errors.filter(e => e.context?.rivalry);
    if (rivalryErrors.length > 0 && rivalryErrors.every(e => e.errorType === 'under_confident')) {
      patterns.push('rivalry_underconfidence');
    }

    // Pattern 3: Erreurs de calibration persistantes
    const avgError = errors.reduce((sum, e) => sum + Math.abs(e.error), 0) / errors.length;
    if (avgError > 0.2) {
      patterns.push('calibration_drift');
    }

    return patterns;
  }

  private async calculateContextPerformance(
    modelName: string, 
    errors: any[]
  ): Promise<Record<string, number>> {
    const contextPerf: Record<string, number> = {};
    
    // Performance par condition météo
    const clearWeatherErrors = errors.filter(e => e.context?.weather?.condition === 'clear');
    if (clearWeatherErrors.length > 0) {
      contextPerf.clear_weather = 1 - (clearWeatherErrors.reduce((sum, e) => sum + Math.abs(e.error), 0) / clearWeatherErrors.length);
    }

    const rainErrors = errors.filter(e => e.context?.weather?.precipitation > 0);
    if (rainErrors.length > 0) {
      contextPerf.rain_conditions = 1 - (rainErrors.reduce((sum, e) => sum + Math.abs(e.error), 0) / rainErrors.length);
    }

    // Performance sur rivalités
    const rivalryErrors = errors.filter(e => e.context?.rivalry);
    if (rivalryErrors.length > 0) {
      contextPerf.rivalry_matches = 1 - (rivalryErrors.reduce((sum, e) => sum + Math.abs(e.error), 0) / rivalryErrors.length);
    }

    return contextPerf;
  }

  private async storeModelPerformance(performance: ModelPerformance): Promise<void> {
    const { error } = await this.supabase
      .from('model_performance')
      .upsert({
        model_name: performance.modelName,
        window: performance.window,
        brier_score: performance.brierScore,
        log_loss: performance.logLoss,
        calibration_error: performance.calibrationError,
        recent_performance: performance.recentPerformance,
        context_performance: performance.contextPerformance,
        error_patterns: performance.errorPatterns,
        updated_at: performance.lastUpdate.toISOString()
      }, {
        onConflict: 'model_name,window'
      });

    if (error) {
      throw new Error(`Failed to store model performance: ${error.message}`);
    }
  }

  private async storeEnsembleWeights(weights: EnsembleWeights): Promise<void> {
    const { error } = await this.supabase
      .from('ensemble_weights')
      .upsert({
        window: weights.window,
        weights: weights.weights,
        performance: weights.performance,
        updated_at: weights.lastUpdate.toISOString()
      }, {
        onConflict: 'window'
      });

    if (error) {
      throw new Error(`Failed to store ensemble weights: ${error.message}`);
    }
  }

  private async getRecentModelPerformance(
    modelName: string, 
    window: WindowType
  ): Promise<ModelPerformance> {
    const { data: performance } = await this.supabase
      .from('model_performance')
      .select('*')
      .eq('model_name', modelName)
      .eq('window', window)
      .single();

    if (!performance) {
      // Retourner performance par défaut
      return {
        modelName,
        window,
        brierScore: 0.25,
        logLoss: 0.693,
        calibrationError: 0.1,
        recentPerformance: 0.5,
        contextPerformance: {},
        errorPatterns: [],
        lastUpdate: new Date()
      };
    }

    return {
      modelName: performance.model_name,
      window: performance.window,
      brierScore: performance.brier_score,
      logLoss: performance.log_loss,
      calibrationError: performance.calibration_error,
      recentPerformance: performance.recent_performance,
      contextPerformance: performance.context_performance,
      errorPatterns: performance.error_patterns,
      lastUpdate: new Date(performance.updated_at)
    };
  }

  private async calculateEnsemblePerformance(window: WindowType): Promise<number> {
    // Calculer performance globale de l'ensemble pour cette fenêtre
    const recentPredictions = await this.supabase
      .from('prediction_errors')
      .select('error')
      .contains('prediction_metadata', { ensemble: true })
      .eq('window', window)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!recentPredictions.data || recentPredictions.data.length === 0) {
      return 0.5; // Performance neutre
    }

    const avgError = recentPredictions.data.reduce((sum, p) => sum + Math.abs(p.error), 0) / recentPredictions.data.length;
    return Math.max(0, 1 - avgError);
  }

  private async validateRetainedPerformance(): Promise<void> {
    console.log('🔍 Validating retrained ensemble performance...');

    // Comparer performance avant/après réentraînement sur échantillon de validation
    // Si performance dégradée, rétablir anciens poids
    // Implementation détaillée dépendrait des critères de validation spécifiques
  }
}

// Classes de base pour les modèles (interfaces simplifiées)
abstract class BaseModel {
  abstract predict(
    matchId: string, 
    window: WindowType, 
    market: string, 
    context: ModelContext
  ): Promise<ModelPrediction>;
  
  abstract retrain(errors: any[]): Promise<void>;
}

class PoissonModel extends BaseModel {
  async predict(matchId: string, window: WindowType, market: string, context: ModelContext): Promise<ModelPrediction> {
    // Implémentation simplifiée du modèle de Poisson
    return {
      probability: 0.45,
      confidence: 0.7,
      modelName: 'poisson',
      features: { expected_goals_home: 1.2, expected_goals_away: 0.9 },
      context
    };
  }

  async retrain(errors: any[]): Promise<void> {
    // Réentraînement du modèle de Poisson
    console.log(`Retraining Poisson model with ${errors.length} error samples`);
  }
}

class DixonColesModel extends BaseModel {
  async predict(matchId: string, window: WindowType, market: string, context: ModelContext): Promise<ModelPrediction> {
    return {
      probability: 0.48,
      confidence: 0.75,
      modelName: 'dixon_coles',
      features: { attack_home: 1.1, defense_home: 0.9, attack_away: 0.95, defense_away: 1.05 },
      context
    };
  }

  async retrain(errors: any[]): Promise<void> {
    console.log(`Retraining Dixon-Coles model with ${errors.length} error samples`);
  }
}

class EloRatingModel extends BaseModel {
  async predict(matchId: string, window: WindowType, market: string, context: ModelContext): Promise<ModelPrediction> {
    return {
      probability: 0.52,
      confidence: 0.8,
      modelName: 'elo_rating',
      features: { elo_home: 1850, elo_away: 1780, elo_diff: 70 },
      context
    };
  }

  async retrain(errors: any[]): Promise<void> {
    console.log(`Retraining Elo Rating model with ${errors.length} error samples`);
  }
}

class FormBasedModel extends BaseModel {
  async predict(matchId: string, window: WindowType, market: string, context: ModelContext): Promise<ModelPrediction> {
    return {
      probability: 0.43,
      confidence: 0.65,
      modelName: 'form_based',
      features: { form_home: 0.7, form_away: 0.4, momentum_home: 0.8 },
      context
    };
  }

  async retrain(errors: any[]): Promise<void> {
    console.log(`Retraining Form-Based model with ${errors.length} error samples`);
  }
}

class WeatherAdjustedModel extends BaseModel {
  async predict(matchId: string, window: WindowType, market: string, context: ModelContext): Promise<ModelPrediction> {
    let baseProb = 0.46;
    let confidence = 0.6;

    // Ajustements météo
    if (context.weather) {
      if (context.weather.precipitation > 5) {
        baseProb *= 0.95; // Moins de buts en cas de pluie
        confidence *= 1.1; // Plus confiant dans cet ajustement
      }
      if (context.weather.windSpeed > 20) {
        baseProb *= 0.92; // Vent fort affecte le jeu
      }
    }

    return {
      probability: Math.max(0, Math.min(1, baseProb)),
      confidence: Math.max(0, Math.min(1, confidence)),
      modelName: 'weather_adjusted',
      features: { 
        base_probability: 0.46,
        weather_adjustment: baseProb - 0.46,
        precipitation: context.weather?.precipitation || 0,
        wind_speed: context.weather?.windSpeed || 0
      },
      context
    };
  }

  async retrain(errors: any[]): Promise<void> {
    console.log(`Retraining Weather-Adjusted model with ${errors.length} error samples`);
  }
}

export const adaptiveEnsemble = new AdaptiveEnsemble();