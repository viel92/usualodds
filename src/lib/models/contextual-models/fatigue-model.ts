import { ContextualModelInput, ContextualPrediction } from './index';

/**
 * Modèle spécialisé pour l'impact de la fatigue et congestion du calendrier
 * Excelle quand les équipes jouent avec peu de repos ou après compétitions européennes
 */
export class FatigueModel {
  private readonly modelName = 'fatigue';

  async predict(input: ContextualModelInput): Promise<ContextualPrediction> {
    const { context, baseFeatures } = input;
    const fatigue = context.fatigue;

    if (!fatigue) {
      return this.createNullPrediction('No fatigue data available');
    }

    // Analyser niveaux de fatigue des deux équipes
    const fatigueAnalysis = this.analyzeFatigueLevel(fatigue);
    
    // Calculer applicabilité - modèle pertinent si au moins une équipe fatiguée
    const applicability = Math.max(fatigueAnalysis.homeFatigueLevel, fatigueAnalysis.awayFatigueLevel);
    
    if (applicability < 0.4) {
      return this.createNullPrediction('Neither team shows significant fatigue');
    }

    // Calculer l'impact différentiel de la fatigue
    const fatigueImpact = this.calculateFatigueImpact(fatigueAnalysis);
    
    // Ajustement de probabilité basé sur qui est plus fatigué
    const contextAdjustment = this.calculateProbabilityAdjustment(fatigueImpact);
    
    // Confiance basée sur clarté de la différence de fatigue
    const confidence = this.calculateFatigueConfidence(fatigueAnalysis, fatigueImpact);
    
    const reasoning = this.generateFatigueReasoning(fatigueAnalysis, fatigueImpact, contextAdjustment);

    return {
      modelName: this.modelName,
      applicability,
      probability: 0.5 + contextAdjustment,
      confidence,
      contextAdjustment,
      reasoning,
      features: {
        home_fatigue_level: fatigueAnalysis.homeFatigueLevel,
        away_fatigue_level: fatigueAnalysis.awayFatigueLevel,
        fatigue_differential: fatigueImpact.fatigueDifferential,
        home_recovery_time: fatigueAnalysis.homeRecoveryTime,
        away_recovery_time: fatigueAnalysis.awayRecoveryTime,
        european_competition_factor: fatigueImpact.europeanFactor
      }
    };
  }

  private analyzeFatigueLevel(fatigue: any) {
    // Analyser fatigue équipe domicile
    const homeRecoveryTime = fatigue.homeMatchesSince || 7; // Jours depuis dernier match
    let homeFatigueLevel = this.calculateBaseFatigueFromRecovery(homeRecoveryTime);
    
    // Bonus fatigue si match européen récent
    if (fatigue.homeUCLRecent) {
      homeFatigueLevel += 0.3; // UCL ajoute fatigue significative
    }

    // Analyser fatigue équipe extérieur
    const awayRecoveryTime = fatigue.awayMatchesSince || 7;
    let awayFatigueLevel = this.calculateBaseFatigueFromRecovery(awayRecoveryTime);
    
    if (fatigue.awayUCLRecent) {
      awayFatigueLevel += 0.3;
    }

    // Facteurs supplémentaires de fatigue
    const additionalFactors = this.analyzeAdditionalFatigueFactors(fatigue);

    return {
      homeFatigueLevel: Math.min(1, homeFatigueLevel + additionalFactors.home),
      awayFatigueLevel: Math.min(1, awayFatigueLevel + additionalFactors.away),
      homeRecoveryTime,
      awayRecoveryTime,
      europeanCompetition: fatigue.homeUCLRecent || fatigue.awayUCLRecent
    };
  }

  private calculateBaseFatigueFromRecovery(recoveryTime: number): number {
    // Courbe de fatigue selon temps de récupération
    if (recoveryTime <= 2) return 0.8; // Très fatigué (< 48h)
    if (recoveryTime <= 3) return 0.6; // Fatigué (72h)
    if (recoveryTime <= 4) return 0.4; // Modérément fatigué
    if (recoveryTime <= 5) return 0.2; // Légèrement fatigué
    return 0; // Bien reposé (>5 jours)
  }

  private analyzeAdditionalFatigueFactors(fatigue: any) {
    const factors = { home: 0, away: 0 };

    // Voyages longs (simulé - dans vraie implémentation, calculer distances)
    // Pour équipe extérieur, voyage automatique
    factors.away += 0.05; // Fatigue de voyage de base

    // Périodes de congestion (plusieurs matchs rapprochés)
    if (fatigue.homeMatchesSince <= 3 && fatigue.homeMatchesSince > 0) {
      // Simuler qu'il y a eu plusieurs matchs rapprochés récemment
      factors.home += 0.15; // Congestion calendrier
    }

    if (fatigue.awayMatchesSince <= 3 && fatigue.awayMatchesSince > 0) {
      factors.away += 0.15;
    }

    // Facteur international (simulé)
    // En réalité, on vérifierait si joueurs clés reviennent de sélection
    const currentMonth = new Date().getMonth() + 1;
    if ([3, 6, 9, 11].includes(currentMonth)) { // Mois typiques de trêves internationales
      factors.home += 0.1;
      factors.away += 0.1;
    }

    return factors;
  }

  private calculateFatigueImpact(analysis: any) {
    const fatigueDifferential = analysis.homeFatigueLevel - analysis.awayFatigueLevel;
    
    // Effets de la fatigue sur performance
    const effects = {
      fatigueDifferential,
      europeanFactor: 0,
      intensityReduction: 0,
      injuryRisk: 0
    };

    // Impact compétitions européennes (plus de déplacements, niveau plus élevé)
    if (analysis.europeanCompetition) {
      effects.europeanFactor = 0.2;
      effects.intensityReduction = 0.15;
      effects.injuryRisk = 0.1;
    }

    // Plus de fatigue = moins d'intensité globale du match
    const avgFatigue = (analysis.homeFatigueLevel + analysis.awayFatigueLevel) / 2;
    effects.intensityReduction = avgFatigue * 0.3;

    return effects;
  }

  private calculateProbabilityAdjustment(impact: any): number {
    // L'équipe moins fatiguée a un avantage
    let adjustment = 0;

    // Avantage basé sur différentiel de fatigue
    if (Math.abs(impact.fatigueDifferential) > 0.2) {
      // Si équipe domicile plus fatiguée (différentiel positif), favoriser visiteur
      adjustment = -impact.fatigueDifferential * 0.15;
    }

    // Réduction générale d'intensité peut favoriser équipe moins technique mais plus physique
    // Cet effet est subtil et dépend des styles de jeu (simplifié ici)
    if (impact.intensityReduction > 0.2) {
      adjustment -= 0.02; // Légère réduction de l'avantage technique
    }

    // Limiter l'ajustement
    return Math.max(-0.2, Math.min(0.2, adjustment));
  }

  private calculateFatigueConfidence(analysis: any, impact: any): number {
    let confidence = 0.5;

    // Plus confiant si différence de fatigue claire
    const fatigueDiff = Math.abs(impact.fatigueDifferential);
    if (fatigueDiff > 0.4) {
      confidence += 0.25; // Différence marquée
    } else if (fatigueDiff > 0.2) {
      confidence += 0.15; // Différence notable
    }

    // Plus confiant si facteur européen impliqué (effet bien documenté)
    if (analysis.europeanCompetition) {
      confidence += 0.2;
    }

    // Plus confiant si fatigue extrême (< 48h récupération)
    if (analysis.homeFatigueLevel > 0.7 || analysis.awayFatigueLevel > 0.7) {
      confidence += 0.15;
    }

    return Math.max(0.3, Math.min(0.85, confidence));
  }

  private generateFatigueReasoning(analysis: any, impact: any, adjustment: number): string {
    const reasons: string[] = [];

    // Analyser situation de chaque équipe
    if (analysis.homeFatigueLevel > 0.6) {
      const recoveryDesc = analysis.homeRecoveryTime <= 3 ? `seulement ${analysis.homeRecoveryTime} jours` : 'peu de temps';
      reasons.push(`Équipe domicile fatiguée (${recoveryDesc} de récupération)`);
    }

    if (analysis.awayFatigueLevel > 0.6) {
      const recoveryDesc = analysis.awayRecoveryTime <= 3 ? `seulement ${analysis.awayRecoveryTime} jours` : 'peu de temps';
      reasons.push(`Équipe visiteur fatiguée (${recoveryDesc} de récupération)`);
    }

    // Compétitions européennes
    if (analysis.europeanCompetition) {
      reasons.push('Fatigue supplémentaire due aux compétitions européennes récentes');
    }

    // Impact différentiel
    if (Math.abs(impact.fatigueDifferential) > 0.3) {
      const moreFatigued = impact.fatigueDifferential > 0 ? 'domicile' : 'visiteur';
      const lessFatigued = impact.fatigueDifferential > 0 ? 'visiteur' : 'domicile';
      reasons.push(`Avantage significatif à l'équipe ${lessFatigued} (moins fatiguée que ${moreFatigued})`);
    }

    // Effets sur le jeu
    if (impact.intensityReduction > 0.2) {
      reasons.push('Fatigue générale peut réduire l\'intensité et la qualité du match');
    }

    // Conclusion
    if (Math.abs(adjustment) > 0.05) {
      const direction = adjustment > 0 ? 'favorise domicile' : 'favorise visiteur';
      reasons.push(`Impact fatigue ${direction}`);
    }

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