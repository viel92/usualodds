import { ContextualModelInput, ContextualPrediction } from './index';

/**
 * Modèle spécialisé pour l'impact des conditions météorologiques
 * Excelle dans la prédiction quand les conditions météo sont difficiles
 */
export class WeatherImpactModel {
  private readonly modelName = 'weather_impact';

  async predict(input: ContextualModelInput): Promise<ContextualPrediction> {
    const { context, baseFeatures } = input;
    const weather = context.weather;

    if (!weather) {
      return this.createNullPrediction('No weather data available');
    }

    // Calculer applicabilité basée sur sévérité météo
    const applicability = this.calculateApplicability(weather);
    
    if (applicability < 0.3) {
      return this.createNullPrediction('Weather conditions not severe enough');
    }

    // Analyser l'impact spécifique de chaque condition météo
    const impacts = this.analyzeWeatherImpacts(weather);
    
    // Calculer ajustement de probabilité
    const contextAdjustment = this.calculateProbabilityAdjustment(impacts, weather);
    
    // Estimer confiance basée sur données historiques météo
    const confidence = this.calculateConfidence(weather, impacts);

    // Générer raisonnement explicite
    const reasoning = this.generateReasoning(weather, impacts, contextAdjustment);

    return {
      modelName: this.modelName,
      applicability,
      probability: 0.5 + contextAdjustment, // Probability relative à la base
      confidence,
      contextAdjustment,
      reasoning,
      features: {
        temperature_impact: impacts.temperatureImpact,
        precipitation_impact: impacts.precipitationImpact,
        wind_impact: impacts.windImpact,
        visibility_impact: impacts.visibilityImpact,
        combined_weather_severity: weather.impactScore,
        playing_style_adjustment: impacts.playingStyleAdjustment
      }
    };
  }

  private calculateApplicability(weather: any): number {
    let severity = 0;

    // Impact température
    const tempDeviation = Math.abs(weather.temperature - 15); // 15°C = optimal
    if (tempDeviation > 10) severity += 0.3;
    else if (tempDeviation > 5) severity += 0.2;

    // Impact précipitations
    if (weather.precipitation > 5) severity += 0.4;
    else if (weather.precipitation > 0) severity += 0.2;

    // Impact vent
    if (weather.windSpeed > 20) severity += 0.3;
    else if (weather.windSpeed > 10) severity += 0.15;

    // Conditions extrêmes
    if (weather.condition.includes('thunderstorm')) severity += 0.5;
    else if (weather.condition.includes('heavy')) severity += 0.3;
    else if (weather.condition.includes('snow')) severity += 0.4;

    return Math.min(1, severity);
  }

  private analyzeWeatherImpacts(weather: any) {
    const impacts = {
      temperatureImpact: 0,
      precipitationImpact: 0,
      windImpact: 0,
      visibilityImpact: 0,
      playingStyleAdjustment: 0
    };

    // Impact température sur performance physique
    if (weather.temperature < 5) {
      impacts.temperatureImpact = -0.15; // Froid extrême réduit la qualité
    } else if (weather.temperature > 30) {
      impacts.temperatureImpact = -0.12; // Chaleur excessive fatigue
    } else if (weather.temperature < 10) {
      impacts.temperatureImpact = -0.05; // Froid modéré
    }

    // Impact précipitations sur contrôle ballon
    if (weather.precipitation > 10) {
      impacts.precipitationImpact = -0.20; // Pluie intense = moins de technique
    } else if (weather.precipitation > 3) {
      impacts.precipitationImpact = -0.10; // Pluie modérée
    } else if (weather.precipitation > 0) {
      impacts.precipitationImpact = -0.05; // Pluie légère
    }

    // Impact vent sur passes longues et centres
    if (weather.windSpeed > 25) {
      impacts.windImpact = -0.15; // Vent très fort perturbe le jeu aérien
    } else if (weather.windSpeed > 15) {
      impacts.windImpact = -0.08; // Vent fort
    } else if (weather.windSpeed > 10) {
      impacts.windImpact = -0.03; // Vent modéré
    }

    // Ajustement style de jeu
    // Conditions difficiles favorisent le jeu direct vs technique
    const totalWeatherSeverity = Math.abs(impacts.temperatureImpact) + 
                                Math.abs(impacts.precipitationImpact) + 
                                Math.abs(impacts.windImpact);

    if (totalWeatherSeverity > 0.2) {
      impacts.playingStyleAdjustment = -0.05; // Moins de football technique
    }

    return impacts;
  }

  private calculateProbabilityAdjustment(impacts: any, weather: any): number {
    // Combiner tous les impacts négatifs
    let totalNegativeImpact = impacts.temperatureImpact + 
                             impacts.precipitationImpact + 
                             impacts.windImpact + 
                             impacts.playingStyleAdjustment;

    // Les conditions difficiles tendent à :
    // 1. Réduire le nombre total de buts (moins de technique)
    // 2. Favoriser les équipes physiques vs techniques
    // 3. Augmenter l'imprévisibilité

    let adjustment = totalNegativeImpact * 0.7; // Impact global sur la probabilité

    // Ajustements spécifiques selon type de temps
    if (weather.condition.includes('snow')) {
      adjustment -= 0.08; // La neige réduit significativement la qualité
    }
    
    if (weather.condition.includes('fog')) {
      adjustment -= 0.05; // Le brouillard affecte la visibilité
    }

    // Limite l'ajustement pour éviter les prédictions extrêmes
    return Math.max(-0.25, Math.min(0.05, adjustment));
  }

  private calculateConfidence(weather: any, impacts: any): number {
    // Base confiance sur la sévérité - plus c'est sévère, plus on est confiant dans l'impact
    let confidence = weather.impactScore * 0.8;

    // Bonus confiance pour conditions extrêmes bien documentées
    if (weather.precipitation > 10) confidence += 0.15;
    if (weather.temperature < 0 || weather.temperature > 35) confidence += 0.1;
    if (weather.windSpeed > 30) confidence += 0.1;

    // Réduire confiance si conditions mixtes/ambiguës
    const totalImpacts = Object.values(impacts).length;
    const significantImpacts = Object.values(impacts).filter(v => Math.abs(v as number) > 0.05).length;
    
    if (significantImpacts < totalImpacts * 0.5) {
      confidence *= 0.8; // Moins confiant si impacts mixtes
    }

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  private generateReasoning(weather: any, impacts: any, adjustment: number): string {
    const reasons: string[] = [];

    // Analyser chaque facteur météo significatif
    if (Math.abs(impacts.temperatureImpact) > 0.05) {
      if (weather.temperature < 5) {
        reasons.push(`Froid extrême (${weather.temperature}°C) réduit la qualité technique`);
      } else if (weather.temperature > 30) {
        reasons.push(`Chaleur excessive (${weather.temperature}°C) augmente la fatigue`);
      }
    }

    if (Math.abs(impacts.precipitationImpact) > 0.05) {
      if (weather.precipitation > 10) {
        reasons.push(`Pluie intense (${weather.precipitation}mm) complique le contrôle ballon`);
      } else if (weather.precipitation > 3) {
        reasons.push(`Pluie modérée (${weather.precipitation}mm) affecte la technique`);
      }
    }

    if (Math.abs(impacts.windImpact) > 0.05) {
      reasons.push(`Vent fort (${weather.windSpeed} km/h) perturbe passes longues et centres`);
    }

    if (weather.condition.includes('snow')) {
      reasons.push('Conditions neigeuses créent un terrain imprévisible');
    }

    if (weather.condition.includes('thunderstorm')) {
      reasons.push('Orage potentiel peut interrompre ou affecter le match');
    }

    // Conclusion globale
    const impact = adjustment > 0 ? 'augmente' : 'réduit';
    const severity = Math.abs(adjustment) > 0.15 ? 'significativement' : 'modérément';
    
    reasons.push(`Impact météo ${severity} ${impact} la prévisibilité du résultat`);

    return reasons.join('. ');
  }

  private createNullPrediction(reason: string): ContextualPrediction {
    return {
      modelName: this.modelName,
      applicability: 0,
      probability: 0.5,
      confidence: 0,
      contextAdjustment: 0,
      reasoning: reason,
      features: {}
    };
  }
}