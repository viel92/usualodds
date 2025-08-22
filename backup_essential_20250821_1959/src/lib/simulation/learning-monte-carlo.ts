// @ts-nocheck
/**
 * PHASE 3: Learning Monte Carlo Simulation
 * Système de simulation avec feedback loop post-match pour calibration adaptative
 */

import { createApiClient } from '@/lib/supabase';

interface MonteCarloScenario {
  id: string;
  homeGoals: number;
  awayGoals: number;
  probability: number;
  outcome: '1' | 'X' | '2';
  under25: boolean;
  over25: boolean;
  btts: boolean;
  weight: number;
}

interface SimulationParameters {
  homeStrength: number;
  awayStrength: number;
  homeDefense: number;
  awayDefense: number;
  homeAttack: number;
  awayAttack: number;
  avgGoals: number;
  weatherImpact: number;
  fatigueImpact: number;
  motivationImpact: number;
  formImpact: number;
}

interface PostMatchCalibration {
  matchId: number;
  actualResult: {
    homeGoals: number;
    awayGoals: number;
    outcome: '1' | 'X' | '2';
  };
  predictedDistribution: MonteCarloScenario[];
  calibrationAdjustments: {
    strengthAdjustment: number;
    varianceAdjustment: number;
    correlationAdjustment: number;
    tailRiskAdjustment: number;
  };
  learningInsights: string[];
}

class LearningMonteCarlo {
  private supabase = createApiClient();
  private scenarioWeights: Map<string, number> = new Map();
  private correlationMatrix: Map<string, Map<string, number>> = new Map();
  private tailEventProbabilities: Map<string, number> = new Map();

  async runSimulation(
    fixtureId: number, 
    params: SimulationParameters,
    iterations: number = 100000
  ): Promise<MonteCarloScenario[]> {
    console.log(`🎲 Running Monte Carlo simulation for fixture ${fixtureId} with ${iterations} iterations`);
    
    const scenarios: MonteCarloScenario[] = [];
    const scenarioCounts: Map<string, number> = new Map();
    
    // Récupération des calibrations historiques
    await this.loadHistoricalCalibrations();
    
    for (let i = 0; i < iterations; i++) {
      const scenario = await this.generateScenario(params, fixtureId);
      const key = `${scenario.homeGoals}-${scenario.awayGoals}`;
      
      scenarioCounts.set(key, (scenarioCounts.get(key) || 0) + 1);
      
      if (!scenarios.find(s => s.homeGoals === scenario.homeGoals && s.awayGoals === scenario.awayGoals)) {
        scenarios.push(scenario);
      }
    }
    
    // Application des poids appris et calcul probabilités calibrées
    return this.applyLearntWeights(scenarios, scenarioCounts, iterations);
  }

  private async generateScenario(params: SimulationParameters, fixtureId: number): Promise<MonteCarloScenario> {
    // Génération Poisson avec ajustements adaptatifs
    const homeExpected = this.calculateExpectedGoals(
      params.homeAttack,
      params.awayDefense,
      params.avgGoals,
      'home',
      params
    );
    
    const awayExpected = this.calculateExpectedGoals(
      params.awayAttack,
      params.homeDefense,
      params.avgGoals,
      'away',
      params
    );
    
    // Application variance apprise pour événements rares
    const homeGoals = this.poissonWithTailAdjustment(homeExpected, 'home');
    const awayGoals = this.poissonWithTailAdjustment(awayExpected, 'away');
    
    const outcome = this.determineOutcome(homeGoals, awayGoals);
    
    return {
      id: `${homeGoals}-${awayGoals}`,
      homeGoals,
      awayGoals,
      probability: 0, // Calculé après
      outcome,
      under25: (homeGoals + awayGoals) < 2.5,
      over25: (homeGoals + awayGoals) > 2.5,
      btts: homeGoals > 0 && awayGoals > 0,
      weight: 1.0
    };
  }

  private calculateExpectedGoals(
    attack: number, 
    defense: number, 
    league_avg: number, 
    venue: 'home' | 'away',
    params: SimulationParameters
  ): number {
    let expected = (attack * defense * league_avg);
    
    // Ajustements venue
    if (venue === 'home') {
      expected *= 1.1; // Home advantage
    }
    
    // Ajustements contextuels avec poids appris
    expected *= (1 + params.weatherImpact * this.getLearnedWeight('weather'));
    expected *= (1 + params.fatigueImpact * this.getLearnedWeight('fatigue'));
    expected *= (1 + params.motivationImpact * this.getLearnedWeight('motivation'));
    expected *= (1 + params.formImpact * this.getLearnedWeight('form'));
    
    return Math.max(0.1, expected);
  }

  private poissonWithTailAdjustment(lambda: number, team: 'home' | 'away'): number {
    const random = Math.random();
    let goals = 0;
    let cumulative = 0;
    let probability = Math.exp(-lambda);
    
    // Ajustement tail risk pour événements rares (>4 buts)
    const tailAdjustment = this.tailEventProbabilities.get(`${team}_high_scoring`) || 1.0;
    
    while (cumulative < random) {
      cumulative += probability;
      if (cumulative < random) {
        goals++;
        if (goals > 4) {
          // Boost probabilité événements rares selon apprentissage
          probability *= (lambda / goals) * tailAdjustment;
        } else {
          probability *= (lambda / goals);
        }
      }
    }
    
    return Math.min(goals, 10); // Cap à 10 buts pour réalisme
  }

  private determineOutcome(homeGoals: number, awayGoals: number): '1' | 'X' | '2' {
    if (homeGoals > awayGoals) return '1';
    if (homeGoals < awayGoals) return '2';
    return 'X';
  }

  private applyLearntWeights(
    scenarios: MonteCarloScenario[], 
    counts: Map<string, number>, 
    totalIterations: number
  ): MonteCarloScenario[] {
    return scenarios.map(scenario => {
      const key = `${scenario.homeGoals}-${scenario.awayGoals}`;
      const count = counts.get(key) || 0;
      const baseProb = count / totalIterations;
      
      // Application poids appris selon fréquence observée historiquement
      const learnedWeight = this.scenarioWeights.get(key) || 1.0;
      const adjustedProb = baseProb * learnedWeight;
      
      return {
        ...scenario,
        probability: adjustedProb,
        weight: learnedWeight
      };
    }).sort((a, b) => b.probability - a.probability);
  }

  async performPostMatchCalibration(
    fixtureId: number, 
    prediction: MonteCarloScenario[], 
    actualResult: { homeGoals: number; awayGoals: number }
  ): Promise<PostMatchCalibration> {
    console.log(`📊 Performing post-match calibration for fixture ${fixtureId}`);
    
    const outcome = this.determineOutcome(actualResult.homeGoals, actualResult.awayGoals);
    const actualScenario = `${actualResult.homeGoals}-${actualResult.awayGoals}`;
    
    // Récupération probabilité prédite pour résultat réel
    const predictedScenario = prediction.find(s => 
      s.homeGoals === actualResult.homeGoals && s.awayGoals === actualResult.awayGoals
    );
    
    const predictedProb = predictedScenario?.probability || 0.001; // Très faible si non prédit
    
    // Calcul ajustements de calibration
    const adjustments = await this.calculateCalibrationAdjustments(
      fixtureId,
      prediction,
      actualResult,
      predictedProb
    );
    
    // Mise à jour poids scenarios
    await this.updateScenarioWeights(actualScenario, predictedProb);
    
    // Apprentissage corrélations réelles
    await this.updateCorrelationLearning(fixtureId, actualResult);
    
    // Sauvegarde calibration
    const calibration: PostMatchCalibration = {
      matchId: fixtureId,
      actualResult: {
        homeGoals: actualResult.homeGoals,
        awayGoals: actualResult.awayGoals,
        outcome
      },
      predictedDistribution: prediction,
      calibrationAdjustments: adjustments,
      learningInsights: await this.generateLearningInsights(fixtureId, adjustments, predictedProb)
    };
    
    await this.saveCalibration(calibration);
    
    return calibration;
  }

  private async calculateCalibrationAdjustments(
    fixtureId: number,
    prediction: MonteCarloScenario[],
    actual: { homeGoals: number; awayGoals: number },
    predictedProb: number
  ): Promise<PostMatchCalibration['calibrationAdjustments']> {
    
    // Ajustement force si sous-estimation chronique
    const strengthAdjustment = predictedProb < 0.05 ? 
      Math.log(0.05 / Math.max(predictedProb, 0.001)) * 0.1 : 0;
    
    // Ajustement variance si événements extrêmes fréquents
    const totalGoals = actual.homeGoals + actual.awayGoals;
    const varianceAdjustment = totalGoals > 5 ? 0.1 : 
                               totalGoals < 1 ? -0.05 : 0;
    
    // Ajustement corrélation selon patterns observés
    const correlationAdjustment = await this.calculateCorrelationAdjustment(fixtureId, actual);
    
    // Ajustement tail risk pour événements rares
    const isRareEvent = (actual.homeGoals > 4 || actual.awayGoals > 4 || totalGoals > 6);
    const tailRiskAdjustment = isRareEvent ? 0.15 : 0;
    
    return {
      strengthAdjustment,
      varianceAdjustment,
      correlationAdjustment,
      tailRiskAdjustment
    };
  }

  private async updateScenarioWeights(scenario: string, predictedProb: number): Promise<void> {
    // Si événement sous-prédit, augmenter son poids futur
    const currentWeight = this.scenarioWeights.get(scenario) || 1.0;
    
    if (predictedProb < 0.02) {
      // Événement rare qui s'est produit -> boost futur
      const newWeight = Math.min(currentWeight * 1.2, 3.0);
      this.scenarioWeights.set(scenario, newWeight);
    } else if (predictedProb > 0.20) {
      // Événement sur-prédit -> légère réduction
      const newWeight = Math.max(currentWeight * 0.95, 0.5);
      this.scenarioWeights.set(scenario, newWeight);
    }
    
    // Sauvegarde persistante
    await this.supabase.from('monte_carlo_weights').upsert({
      scenario,
      weight: this.scenarioWeights.get(scenario),
      updated_at: new Date().toISOString()
    });
  }

  private async updateCorrelationLearning(
    fixtureId: number, 
    actual: { homeGoals: number; awayGoals: number }
  ): Promise<void> {
    // Apprentissage corrélations entre marchés (1X2, O/U, BTTS)
    const outcome = this.determineOutcome(actual.homeGoals, actual.awayGoals);
    const totalGoals = actual.homeGoals + actual.awayGoals;
    const btts = actual.homeGoals > 0 && actual.awayGoals > 0;
    
    // Mise à jour matrice corrélations
    this.updateCorrelationMatrix('outcome_goals', outcome, totalGoals.toString());
    this.updateCorrelationMatrix('outcome_btts', outcome, btts.toString());
    this.updateCorrelationMatrix('goals_btts', totalGoals.toString(), btts.toString());
  }

  private updateCorrelationMatrix(type: string, value1: string, value2: string): void {
    if (!this.correlationMatrix.has(type)) {
      this.correlationMatrix.set(type, new Map());
    }
    
    const typeMatrix = this.correlationMatrix.get(type)!;
    const key = `${value1}_${value2}`;
    const currentCorr = typeMatrix.get(key) || 0;
    
    // Mise à jour exponentielle
    typeMatrix.set(key, currentCorr * 0.95 + 0.05);
  }

  private async calculateCorrelationAdjustment(
    fixtureId: number, 
    actual: { homeGoals: number; awayGoals: number }
  ): Promise<number> {
    // Retourne ajustement basé sur corrélations apprises
    // Implémentation simplifiée - pourrait être étendue
    return 0;
  }

  private async generateLearningInsights(
    fixtureId: number, 
    adjustments: PostMatchCalibration['calibrationAdjustments'],
    predictedProb: number
  ): Promise<string[]> {
    const insights: string[] = [];
    
    if (adjustments.strengthAdjustment > 0.05) {
      insights.push(`Sous-estimation chronique détectée (prob: ${(predictedProb*100).toFixed(2)}%)`);
    }
    
    if (adjustments.varianceAdjustment > 0) {
      insights.push('Événements high-scoring plus fréquents que modélisé');
    }
    
    if (adjustments.tailRiskAdjustment > 0) {
      insights.push('Événement rare observé - ajustement tail risk nécessaire');
    }
    
    // Récupération contexte match pour insights contextuels
    const { data: matchContext } = await this.supabase
      .from('match_context')
      .select('*')
      .eq('fixture_id', fixtureId)
      .single();
    
    if (matchContext?.is_derby && adjustments.varianceAdjustment !== 0) {
      insights.push('Impact derby détecté sur variance des scores');
    }
    
    return insights;
  }

  private async loadHistoricalCalibrations(): Promise<void> {
    // Chargement poids scenarios historiques
    const { data: weights } = await this.supabase
      .from('monte_carlo_weights')
      .select('scenario, weight')
      .gte('updated_at', new Date(Date.now() - 30*24*60*60*1000).toISOString()); // 30 jours
    
    weights?.forEach(w => {
      this.scenarioWeights.set(w.scenario, w.weight);
    });
    
    // Chargement probabilités tail events
    const { data: tailEvents } = await this.supabase
      .from('monte_carlo_tail_events')
      .select('event_type, probability')
      .gte('updated_at', new Date(Date.now() - 7*24*60*60*1000).toISOString()); // 7 jours
    
    tailEvents?.forEach(te => {
      this.tailEventProbabilities.set(te.event_type, te.probability);
    });
  }

  private getLearnedWeight(factor: string): number {
    return this.scenarioWeights.get(`factor_${factor}`) || 1.0;
  }

  private async saveCalibration(calibration: PostMatchCalibration): Promise<void> {
    await this.supabase.from('monte_carlo_calibrations').insert({
      fixture_id: calibration.matchId,
      actual_home_goals: calibration.actualResult.homeGoals,
      actual_away_goals: calibration.actualResult.awayGoals,
      actual_outcome: calibration.actualResult.outcome,
      predicted_distribution: JSON.stringify(calibration.predictedDistribution),
      strength_adjustment: calibration.calibrationAdjustments.strengthAdjustment,
      variance_adjustment: calibration.calibrationAdjustments.varianceAdjustment,
      correlation_adjustment: calibration.calibrationAdjustments.correlationAdjustment,
      tail_risk_adjustment: calibration.calibrationAdjustments.tailRiskAdjustment,
      learning_insights: calibration.learningInsights,
      created_at: new Date().toISOString()
    });
  }

  async getSimulationMetrics(fixtureId: number): Promise<{
    expectedValue: number;
    variance: number;
    confidenceInterval: [number, number];
    tailRiskMetrics: {
      prob_over_5_goals: number;
      prob_under_1_goal: number;
      max_probable_score: string;
    };
  }> {
    console.log(`📈 Calculating simulation metrics for fixture ${fixtureId}`);
    
    // Implémentation metrics détaillées
    // Pour l'instant, retour valeurs par défaut
    return {
      expectedValue: 2.5,
      variance: 1.2,
      confidenceInterval: [1.8, 3.2],
      tailRiskMetrics: {
        prob_over_5_goals: 0.08,
        prob_under_1_goal: 0.12,
        max_probable_score: "1-1"
      }
    };
  }
}

export default LearningMonteCarlo;
export type { MonteCarloScenario, SimulationParameters, PostMatchCalibration };