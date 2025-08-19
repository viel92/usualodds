// @ts-nocheck
import { ContextualModelInput, ContextualPrediction } from './index';

/**
 * Modèle spécialisé pour l'impact des nouvelles recrues
 * Excelle quand il y a des transferts récents significatifs
 */
export class NewSigningModel {
  private readonly modelName = 'new_signing';

  async predict(input: ContextualModelInput): Promise<ContextualPrediction> {
    const { context, baseFeatures } = input;
    const transfers = context.transfers;

    if (!transfers) {
      return this.createNullPrediction('No transfer data available');
    }

    // Analyser l'impact des nouvelles recrues
    const transferAnalysis = this.analyzeNewSignings(transfers);
    
    const applicability = this.calculateApplicability(transferAnalysis);
    
    if (applicability < 0.3) {
      return this.createNullPrediction('No significant new signings impact');
    }

    // Analyser intégration et chimie d'équipe
    const integrationAnalysis = this.analyzeIntegration(transferAnalysis, transfers);
    
    // Calculer ajustement basé sur impact positif/négatif des recrues
    const contextAdjustment = this.calculateSigningAdjustment(transferAnalysis, integrationAnalysis);
    
    const confidence = this.calculateSigningConfidence(transferAnalysis, integrationAnalysis);
    const reasoning = this.generateSigningReasoning(transferAnalysis, integrationAnalysis, contextAdjustment);

    return {
      modelName: this.modelName,
      applicability,
      probability: 0.5 + contextAdjustment,
      confidence,
      contextAdjustment,
      reasoning,
      features: {
        home_new_signings: transferAnalysis.homeSigningsImpact,
        away_new_signings: transferAnalysis.awaySigningsImpact,
        home_integration_level: integrationAnalysis.homeIntegration,
        away_integration_level: integrationAnalysis.awayIntegration,
        tactical_disruption: integrationAnalysis.tacticalDisruption,
        chemistry_factor: integrationAnalysis.chemistryFactor,
        signing_quality_differential: transferAnalysis.qualityDifferential
      }
    };
  }

  private analyzeNewSignings(transfers: any) {
    const homeSignings = transfers.homeNewSignings || 0;
    const awaySignings = transfers.awayNewSignings || 0;

    // Calculer impact potentiel basé sur nombre et qualité (simulé)
    const homeSigningsImpact = this.calculateSigningImpact(homeSignings);
    const awaySigningsImpact = this.calculateSigningImpact(awaySignings);

    // Différentiel de qualité des recrues
    const qualityDifferential = homeSigningsImpact - awaySigningsImpact;

    // Analyser timing des transferts (récent vs début saison)
    const transferTiming = this.analyzeTransferTiming();

    return {
      homeSignings,
      awaySignings,
      homeSigningsImpact,
      awaySigningsImpact,
      qualityDifferential,
      transferTiming
    };
  }

  private calculateSigningImpact(numSignings: number): number {
    // Impact simulé basé sur nombre (en réalité, dépendrait de qualité/poste)
    if (numSignings === 0) return 0;
    
    // Courbe logarithmique: premières recrues plus impactantes
    let impact = Math.log(numSignings + 1) * 0.3;
    
    // Simulation qualité (en réalité, analyserait profil joueurs)
    const randomQuality = 0.5 + (Math.random() - 0.5) * 0.4; // 0.3-0.7
    impact *= randomQuality;
    
    return Math.min(0.8, impact);
  }

  private analyzeTransferTiming(): 'pre_season' | 'early_season' | 'mid_season' | 'late_window' {
    const currentMonth = new Date().getMonth() + 1;
    
    // Périodes typiques de transferts
    if ([7, 8].includes(currentMonth)) return 'pre_season'; // Juillet-Août
    if ([9, 10].includes(currentMonth)) return 'early_season'; // Sept-Oct
    if ([1].includes(currentMonth)) return 'mid_season'; // Janvier
    return 'late_window'; // Autres
  }

  private analyzeIntegration(transferAnalysis: any, transfers: any) {
    // Niveau d'intégration basé sur données disponibles
    const homeIntegration = transfers.homeIntegrationRating || this.estimateIntegration(
      transferAnalysis.homeSignings,
      transferAnalysis.transferTiming
    );
    
    const awayIntegration = transfers.awayIntegrationRating || this.estimateIntegration(
      transferAnalysis.awaySignings,
      transferAnalysis.transferTiming
    );

    // Disruption tactique (trop de changements perturbent)
    const tacticalDisruption = this.calculateTacticalDisruption(
      transferAnalysis.homeSignings,
      transferAnalysis.awaySignings
    );

    // Facteur chimie d'équipe
    const chemistryFactor = this.calculateChemistryFactor(
      homeIntegration,
      awayIntegration,
      tacticalDisruption
    );

    return {
      homeIntegration,
      awayIntegration,
      tacticalDisruption,
      chemistryFactor
    };
  }

  private estimateIntegration(numSignings: number, timing: string): number {
    let integration = 0.5; // Base neutre

    // Moins de recrues = meilleure intégration
    if (numSignings <= 2) integration += 0.2;
    else if (numSignings > 5) integration -= 0.3;

    // Timing influence intégration
    switch (timing) {
      case 'pre_season':
        integration += 0.3; // Temps pour s'adapter
        break;
      case 'early_season':
        integration += 0.1;
        break;
      case 'mid_season':
        integration -= 0.1; // Moins de temps
        break;
      case 'late_window':
        integration -= 0.2; // Très peu de temps
        break;
    }

    return Math.max(0, Math.min(1, integration));
  }

  private calculateTacticalDisruption(homeSignings: number, awaySignings: number): number {
    // Plus de recrues = plus de disruption potentielle
    const totalSignings = homeSignings + awaySignings;
    
    let disruption = 0;
    if (totalSignings > 8) disruption = 0.6; // Beaucoup de changements
    else if (totalSignings > 5) disruption = 0.4;
    else if (totalSignings > 3) disruption = 0.2;

    return disruption;
  }

  private calculateChemistryFactor(homeInt: number, awayInt: number, disruption: number): number {
    // Bonne intégration améliore chimie, disruption la détériore
    const avgIntegration = (homeInt + awayInt) / 2;
    return avgIntegration - disruption;
  }

  private calculateApplicability(analysis: any): number {
    let applicability = 0;

    // Applicable si nouvelles recrues significatives
    const totalImpact = Math.abs(analysis.homeSigningsImpact) + Math.abs(analysis.awaySigningsImpact);
    applicability += Math.min(0.6, totalImpact);

    // Plus applicable si différentiel marqué
    if (Math.abs(analysis.qualityDifferential) > 0.2) {
      applicability += 0.3;
    }

    // Plus applicable en début de saison (intégration critique)
    if (['pre_season', 'early_season'].includes(analysis.transferTiming)) {
      applicability += 0.2;
    }

    return Math.min(1, applicability);
  }

  private calculateSigningAdjustment(transferAnalysis: any, integrationAnalysis: any): number {
    let adjustment = 0;

    // 1. Impact direct des recrues (différentiel qualité)
    adjustment += transferAnalysis.qualityDifferential * 0.3;

    // 2. Ajustement intégration
    const integrationDiff = integrationAnalysis.homeIntegration - integrationAnalysis.awayIntegration;
    adjustment += integrationDiff * 0.15;

    // 3. Pénalité disruption tactique
    if (integrationAnalysis.tacticalDisruption > 0.4) {
      adjustment -= integrationAnalysis.tacticalDisruption * 0.1;
    }

    // 4. Bonus/malus chimie d'équipe
    if (integrationAnalysis.chemistryFactor < -0.2) {
      adjustment -= 0.05; // Mauvaise chimie pénalise globalement
    } else if (integrationAnalysis.chemistryFactor > 0.3) {
      adjustment += 0.03; // Bonne chimie léger bonus
    }

    // 5. Ajustement temporel
    switch (transferAnalysis.transferTiming) {
      case 'late_window':
        adjustment -= 0.05; // Recrues tardives moins efficaces immédiatement
        break;
      case 'mid_season':
        adjustment -= 0.03; // Janvier compliqué
        break;
    }

    // Limiter ajustement
    return Math.max(-0.2, Math.min(0.2, adjustment));
  }

  private calculateSigningConfidence(transferAnalysis: any, integrationAnalysis: any): number {
    let confidence = 0.5;

    // Plus confiant si impact des recrues clair
    if (Math.abs(transferAnalysis.qualityDifferential) > 0.3) {
      confidence += 0.2;
    }

    // Plus confiant si situation d'intégration claire
    const integrationDiff = Math.abs(integrationAnalysis.homeIntegration - integrationAnalysis.awayIntegration);
    if (integrationDiff > 0.3) {
      confidence += 0.15;
    }

    // Moins confiant si trop de disruption (imprévisible)
    if (integrationAnalysis.tacticalDisruption > 0.5) {
      confidence -= 0.2;
    }

    // Plus confiant en début de saison (effets plus prévisibles)
    if (transferAnalysis.transferTiming === 'pre_season') {
      confidence += 0.15;
    } else if (transferAnalysis.transferTiming === 'late_window') {
      confidence -= 0.1; // Effets moins prévisibles
    }

    return Math.max(0.3, Math.min(0.85, confidence));
  }

  private generateSigningReasoning(transferAnalysis: any, integrationAnalysis: any, adjustment: number): string {
    const reasons: string[] = [];

    // Analyser recrues
    if (transferAnalysis.homeSignings > 0 || transferAnalysis.awaySignings > 0) {
      reasons.push(`Nouvelles recrues: ${transferAnalysis.homeSignings} (domicile), ${transferAnalysis.awaySignings} (visiteur)`);
    }

    // Impact qualité
    if (Math.abs(transferAnalysis.qualityDifferential) > 0.2) {
      const favoredTeam = transferAnalysis.qualityDifferential > 0 ? 'domicile' : 'visiteur';
      reasons.push(`Avantage qualité des recrues pour l'équipe ${favoredTeam}`);
    }

    // Intégration
    if (integrationAnalysis.homeIntegration > 0.7 || integrationAnalysis.awayIntegration > 0.7) {
      reasons.push('Bonne intégration des nouvelles recrues observée');
    } else if (integrationAnalysis.homeIntegration < 0.4 || integrationAnalysis.awayIntegration < 0.4) {
      reasons.push('Difficultés d\'intégration possibles pour nouvelles recrues');
    }

    // Disruption
    if (integrationAnalysis.tacticalDisruption > 0.4) {
      reasons.push('Nombreux changements peuvent perturber automatismes tactiques');
    }

    // Timing
    switch (transferAnalysis.transferTiming) {
      case 'pre_season':
        reasons.push('Recrues pré-saison ont eu temps de s\'adapter');
        break;
      case 'late_window':
        reasons.push('Transferts tardifs limitent temps d\'adaptation');
        break;
      case 'mid_season':
        reasons.push('Recrues mercato hivernal en phase d\'intégration');
        break;
    }

    // Chimie d'équipe
    if (integrationAnalysis.chemistryFactor < -0.2) {
      reasons.push('Impact négatif potentiel sur cohésion d\'équipe');
    } else if (integrationAnalysis.chemistryFactor > 0.3) {
      reasons.push('Amélioration de la chimie d\'équipe attendue');
    }

    // Conclusion
    if (Math.abs(adjustment) > 0.05) {
      const direction = adjustment > 0 ? 'favorise domicile' : 'favorise visiteur';
      reasons.push(`Impact nouvelles recrues ${direction}`);
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