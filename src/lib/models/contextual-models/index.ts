// Modèles contextuels spécialisés pour différentes situations de match
// Chaque modèle excelle dans un contexte particulier et est activé selon les conditions

export { WeatherImpactModel } from './weather-impact-model';
export { BigGameModel } from './big-game-model';
export { FatigueModel } from './fatigue-model';
export { FormStreakModel } from './form-streak-model';
export { NewSigningModel } from './new-signing-model';
export { InjuryImpactModel } from './injury-impact-model';

// Factory pattern pour instancier le bon modèle selon le contexte
import { WeatherImpactModel } from './weather-impact-model';
import { BigGameModel } from './big-game-model';
import { FatigueModel } from './fatigue-model';
import { FormStreakModel } from './form-streak-model';
import { NewSigningModel } from './new-signing-model';
import { InjuryImpactModel } from './injury-impact-model';

export interface ContextualModelInput {
  matchId: string;
  window: string;
  context: MatchContext;
  baseFeatures: Record<string, number>;
}

export interface MatchContext {
  weather?: {
    temperature: number;
    precipitation: number;
    windSpeed: number;
    condition: string;
    impactScore: number;
  };
  rivalry?: {
    isRivalry: boolean;
    rivalryLevel: number;
    type: string;
    emotionalIntensity: number;
  };
  importance?: {
    homeImportance: number;
    awayImportance: number;
    seasonPhase: string;
  };
  fatigue?: {
    homeMatchesSince: number;
    awayMatchesSince: number;
    homeUCLRecent: boolean;
    awayUCLRecent: boolean;
  };
  form?: {
    homeFormRating: number;
    awayFormRating: number;
    homeStreak: number;
    awayStreak: number;
  };
  injuries?: {
    homeKeyPlayersOut: number;
    awayKeyPlayersOut: number;
    homeImpactScore: number;
    awayImpactScore: number;
  };
  transfers?: {
    homeNewSignings: number;
    awayNewSignings: number;
    homeIntegrationRating: number;
    awayIntegrationRating: number;
  };
}

export interface ContextualPrediction {
  modelName: string;
  applicability: number; // 0-1, pertinence du modèle pour ce contexte
  probability: number;
  confidence: number;
  contextAdjustment: number; // Ajustement par rapport à la base
  reasoning: string;
  features: Record<string, number>;
}

export class ContextualModelFactory {
  private models: Map<string, any> = new Map();

  constructor() {
    this.initializeModels();
  }

  private initializeModels(): void {
    this.models.set('weather', new WeatherImpactModel());
    this.models.set('big_game', new BigGameModel());
    this.models.set('fatigue', new FatigueModel());
    this.models.set('form_streak', new FormStreakModel());
    this.models.set('new_signing', new NewSigningModel());
    this.models.set('injury_impact', new InjuryImpactModel());
  }

  /**
   * Détermine quels modèles contextuels sont applicables et les exécute
   */
  async getApplicableModels(
    input: ContextualModelInput
  ): Promise<ContextualPrediction[]> {
    const predictions: ContextualPrediction[] = [];
    const { context } = input;

    // WeatherImpactModel - activé si conditions météo difficiles
    if (context.weather && context.weather.impactScore > 0.3) {
      const model = this.models.get('weather');
      const prediction = await model.predict(input);
      if (prediction.applicability > 0.5) {
        predictions.push(prediction);
      }
    }

    // BigGameModel - activé pour rivalités et matches importants
    if ((context.rivalry && context.rivalry.rivalryLevel > 0.6) ||
        (context.importance && Math.max(context.importance.homeImportance, context.importance.awayImportance) > 0.7)) {
      const model = this.models.get('big_game');
      const prediction = await model.predict(input);
      if (prediction.applicability > 0.5) {
        predictions.push(prediction);
      }
    }

    // FatigueModel - activé si congestion de calendrier
    if (context.fatigue && 
        (context.fatigue.homeMatchesSince < 4 || context.fatigue.awayMatchesSince < 4 ||
         context.fatigue.homeUCLRecent || context.fatigue.awayUCLRecent)) {
      const model = this.models.get('fatigue');
      const prediction = await model.predict(input);
      if (prediction.applicability > 0.5) {
        predictions.push(prediction);
      }
    }

    // FormStreakModel - activé si formes extrêmes ou streaks importantes
    if (context.form) {
      const formDiff = Math.abs(context.form.homeFormRating - context.form.awayFormRating);
      const hasStreak = Math.abs(context.form.homeStreak) > 3 || Math.abs(context.form.awayStreak) > 3;
      
      if (formDiff > 0.3 || hasStreak) {
        const model = this.models.get('form_streak');
        const prediction = await model.predict(input);
        if (prediction.applicability > 0.5) {
          predictions.push(prediction);
        }
      }
    }

    // NewSigningModel - activé si nouvelles recrues importantes
    if (context.transfers && 
        (context.transfers.homeNewSignings > 0 || context.transfers.awayNewSignings > 0)) {
      const model = this.models.get('new_signing');
      const prediction = await model.predict(input);
      if (prediction.applicability > 0.5) {
        predictions.push(prediction);
      }
    }

    // InjuryImpactModel - activé si absences importantes
    if (context.injuries && 
        (context.injuries.homeImpactScore > 0.4 || context.injuries.awayImpactScore > 0.4)) {
      const model = this.models.get('injury_impact');
      const prediction = await model.predict(input);
      if (prediction.applicability > 0.5) {
        predictions.push(prediction);
      }
    }

    return predictions.sort((a, b) => b.applicability - a.applicability);
  }

  /**
   * Combine les prédictions contextuelles avec pondération par applicabilité
   */
  combineContextualPredictions(
    predictions: ContextualPrediction[],
    baseProbability: number
  ): {
    adjustedProbability: number;
    confidence: number;
    contextFactors: string[];
    totalAdjustment: number;
  } {
    if (predictions.length === 0) {
      return {
        adjustedProbability: baseProbability,
        confidence: 0.5,
        contextFactors: [],
        totalAdjustment: 0
      };
    }

    let weightedAdjustment = 0;
    let totalApplicability = 0;
    let combinedConfidence = 0;
    const contextFactors: string[] = [];

    for (const prediction of predictions) {
      const weight = prediction.applicability;
      weightedAdjustment += prediction.contextAdjustment * weight;
      totalApplicability += weight;
      combinedConfidence += prediction.confidence * weight;
      contextFactors.push(`${prediction.modelName}(${(prediction.applicability * 100).toFixed(0)}%)`);
    }

    // Normaliser
    if (totalApplicability > 0) {
      weightedAdjustment /= totalApplicability;
      combinedConfidence /= totalApplicability;
    }

    // Appliquer l'ajustement contextuel à la probabilité de base
    const adjustedProbability = Math.max(0.01, Math.min(0.99, 
      baseProbability + weightedAdjustment
    ));

    return {
      adjustedProbability,
      confidence: Math.min(1, combinedConfidence),
      contextFactors,
      totalAdjustment: weightedAdjustment
    };
  }
}

export const contextualModelFactory = new ContextualModelFactory();