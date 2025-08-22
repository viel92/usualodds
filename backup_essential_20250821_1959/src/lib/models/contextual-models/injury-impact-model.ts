// @ts-nocheck
import { ContextualModelInput, ContextualPrediction } from './index';

/**
 * Modèle spécialisé pour l'impact des blessures de joueurs clés
 * Excelle quand il y a des absences importantes qui affectent l'équilibre des équipes
 */
export class InjuryImpactModel {
  private readonly modelName = 'injury_impact';

  async predict(input: ContextualModelInput): Promise<ContextualPrediction> {
    const { context, baseFeatures } = input;
    const injuries = context.injuries;

    if (!injuries) {
      return this.createNullPrediction('No injury data available');
    }

    // Analyser l'impact des absences
    const injuryAnalysis = this.analyzeInjuryImpact(injuries);
    
    const applicability = this.calculateApplicability(injuryAnalysis);
    
    if (applicability < 0.3) {
      return this.createNullPrediction('No significant injury impact detected');
    }

    // Analyser effets systémiques et adaptations tactiques
    const tacticalAnalysis = this.analyzeTacticalAdaptations(injuryAnalysis);
    
    // Calculer ajustement basé sur différentiel d'impact
    const contextAdjustment = this.calculateInjuryAdjustment(injuryAnalysis, tacticalAnalysis);
    
    const confidence = this.calculateInjuryConfidence(injuryAnalysis, tacticalAnalysis);
    const reasoning = this.generateInjuryReasoning(injuryAnalysis, tacticalAnalysis, contextAdjustment);

    return {
      modelName: this.modelName,
      applicability,
      probability: 0.5 + contextAdjustment,
      confidence,
      contextAdjustment,
      reasoning,
      features: {
        home_key_players_out: injuryAnalysis.homeKeyPlayersOut,
        away_key_players_out: injuryAnalysis.awayKeyPlayersOut,
        home_impact_score: injuryAnalysis.homeImpactScore,
        away_impact_score: injuryAnalysis.awayImpactScore,
        tactical_disruption: tacticalAnalysis.tacticalDisruption,
        depth_quality_factor: tacticalAnalysis.depthQualityFactor,
        positional_weakness: tacticalAnalysis.positionalWeakness,
        adaptation_difficulty: tacticalAnalysis.adaptationDifficulty
      }
    };
  }

  private analyzeInjuryImpact(injuries: any) {
    const homeKeyPlayersOut = injuries.homeKeyPlayersOut || 0;
    const awayKeyPlayersOut = injuries.awayKeyPlayersOut || 0;
    const homeImpactScore = injuries.homeImpactScore || 0;
    const awayImpactScore = injuries.awayImpactScore || 0;

    // Analyser types d'absences (simulé - en réalité basé sur postes/importance)
    const homeInjuryProfile = this.analyzeInjuryProfile(homeKeyPlayersOut, homeImpactScore);
    const awayInjuryProfile = this.analyzeInjuryProfile(awayKeyPlayersOut, awayImpactScore);

    // Calculer différentiel d'impact
    const impactDifferential = homeImpactScore - awayImpactScore;

    return {
      homeKeyPlayersOut,
      awayKeyPlayersOut,
      homeImpactScore,
      awayImpactScore,
      homeInjuryProfile,
      awayInjuryProfile,
      impactDifferential
    };
  }

  private analyzeInjuryProfile(playersOut: number, impactScore: number) {
    // Profil simulé des absences
    const profile = {
      severity: 'low', // low, medium, high, critical
      affectedPositions: [] as string[],
      leadershipImpact: 0, // Impact sur leadership/expérience
      creativeImpact: 0, // Impact sur créativité/passes clés
      defensiveImpact: 0, // Impact défensif
      goalThreatImpact: 0 // Impact offensif
    };

    // Déterminer sévérité basée sur score d'impact
    if (impactScore >= 0.7) profile.severity = 'critical';
    else if (impactScore >= 0.5) profile.severity = 'high';
    else if (impactScore >= 0.3) profile.severity = 'medium';

    // Simuler postes affectés (en réalité, analyserait données réelles)
    const positions = ['GK', 'DEF', 'MID', 'ATT'];
    const numPositions = Math.min(playersOut, Math.floor(impactScore * 4) + 1);
    profile.affectedPositions = positions.slice(0, numPositions);

    // Simuler impacts spécifiques
    profile.leadershipImpact = Math.min(impactScore * 1.2, 1);
    profile.creativeImpact = Math.min(impactScore * 0.9, 1);
    profile.defensiveImpact = profile.affectedPositions.includes('DEF') ? impactScore : 0;
    profile.goalThreatImpact = profile.affectedPositions.includes('ATT') ? impactScore : 0;

    return profile;
  }

  private analyzeTacticalAdaptations(injuryAnalysis: any) {
    // Disruption tactique causée par absences
    let tacticalDisruption = 0;
    
    // Plus d'absences = plus de disruption
    const totalPlayersOut = injuryAnalysis.homeKeyPlayersOut + injuryAnalysis.awayKeyPlayersOut;
    tacticalDisruption += Math.min(totalPlayersOut * 0.15, 0.8);

    // Impact positionnel spécifique
    let positionalWeakness = 0;
    const homeProfile = injuryAnalysis.homeInjuryProfile;
    const awayProfile = injuryAnalysis.awayInjuryProfile;

    // Gardien absent = impact majeur
    if (homeProfile.affectedPositions.includes('GK')) positionalWeakness += 0.3;
    if (awayProfile.affectedPositions.includes('GK')) positionalWeakness -= 0.3;

    // Défense décimée = vulnérabilité
    if (homeProfile.defensiveImpact > 0.5) positionalWeakness += 0.2;
    if (awayProfile.defensiveImpact > 0.5) positionalWeakness -= 0.2;

    // Attaque affaiblie = moins de menace
    if (homeProfile.goalThreatImpact > 0.5) positionalWeakness += 0.15;
    if (awayProfile.goalThreatImpact > 0.5) positionalWeakness -= 0.15;

    // Facteur qualité des remplaçants (simulé)
    const depthQualityFactor = this.estimateSquadDepth(injuryAnalysis);

    // Difficulté d'adaptation tactique
    const adaptationDifficulty = this.calculateAdaptationDifficulty(
      injuryAnalysis,
      tacticalDisruption
    );

    return {
      tacticalDisruption,
      positionalWeakness,
      depthQualityFactor,
      adaptationDifficulty
    };
  }

  private estimateSquadDepth(injuryAnalysis: any): number {
    // Simuler qualité des remplaçants (en réalité, analyserait effectif)
    let depthFactor = 0;

    // Équipes avec beaucoup d'absences mais faible impact = bonne profondeur
    if (injuryAnalysis.homeKeyPlayersOut > 2 && injuryAnalysis.homeImpactScore < 0.4) {
      depthFactor += 0.2; // Bonne profondeur domicile
    }
    if (injuryAnalysis.awayKeyPlayersOut > 2 && injuryAnalysis.awayImpactScore < 0.4) {
      depthFactor -= 0.2; // Bonne profondeur visiteur
    }

    // Impact élevé avec peu d'absences = dépendance aux stars
    if (injuryAnalysis.homeKeyPlayersOut <= 2 && injuryAnalysis.homeImpactScore > 0.6) {
      depthFactor -= 0.15; // Faible profondeur domicile
    }
    if (injuryAnalysis.awayKeyPlayersOut <= 2 && injuryAnalysis.awayImpactScore > 0.6) {
      depthFactor += 0.15; // Faible profondeur visiteur
    }

    return depthFactor;
  }

  private calculateAdaptationDifficulty(injuryAnalysis: any, disruption: number): number {
    let difficulty = disruption * 0.5; // Base sur disruption

    // Leadership absent = plus difficile à compenser
    const avgLeadershipImpact = (
      injuryAnalysis.homeInjuryProfile.leadershipImpact +
      injuryAnalysis.awayInjuryProfile.leadershipImpact
    ) / 2;
    difficulty += avgLeadershipImpact * 0.3;

    // Créativité absente = schémas tactiques perturbés
    const avgCreativeImpact = (
      injuryAnalysis.homeInjuryProfile.creativeImpact +
      injuryAnalysis.awayInjuryProfile.creativeImpact
    ) / 2;
    difficulty += avgCreativeImpact * 0.25;

    return Math.min(difficulty, 1);
  }

  private calculateApplicability(injuryAnalysis: any): number {
    let applicability = 0;

    // Applicable si impact significatif
    const maxImpact = Math.max(injuryAnalysis.homeImpactScore, injuryAnalysis.awayImpactScore);
    applicability += maxImpact * 0.6;

    // Plus applicable si différentiel important
    if (Math.abs(injuryAnalysis.impactDifferential) > 0.3) {
      applicability += 0.3;
    }

    // Plus applicable si absences critiques
    const homeProfile = injuryAnalysis.homeInjuryProfile;
    const awayProfile = injuryAnalysis.awayInjuryProfile;
    
    if (homeProfile.severity === 'critical' || awayProfile.severity === 'critical') {
      applicability += 0.4;
    } else if (homeProfile.severity === 'high' || awayProfile.severity === 'high') {
      applicability += 0.2;
    }

    return Math.min(1, applicability);
  }

  private calculateInjuryAdjustment(injuryAnalysis: any, tacticalAnalysis: any): number {
    let adjustment = 0;

    // 1. Ajustement basé sur différentiel d'impact
    adjustment += injuryAnalysis.impactDifferential * 0.25;

    // 2. Impact positionnel
    adjustment += tacticalAnalysis.positionalWeakness * 0.2;

    // 3. Facteur profondeur effectif
    adjustment += tacticalAnalysis.depthQualityFactor * 0.15;

    // 4. Pénalité disruption tactique générale
    if (tacticalAnalysis.tacticalDisruption > 0.5) {
      adjustment -= 0.05; // Match globalement moins prévisible
    }

    // 5. Difficulté adaptation (favorise équipe moins perturbée)
    if (tacticalAnalysis.adaptationDifficulty > 0.6) {
      // Favoriser équipe avec moins d'absences critiques
      if (injuryAnalysis.homeImpactScore > injuryAnalysis.awayImpactScore) {
        adjustment -= 0.08;
      } else {
        adjustment += 0.08;
      }
    }

    // Cas spéciaux : gardien absent
    const homeProfile = injuryAnalysis.homeInjuryProfile;
    const awayProfile = injuryAnalysis.awayInjuryProfile;
    
    if (homeProfile.affectedPositions.includes('GK')) adjustment -= 0.15;
    if (awayProfile.affectedPositions.includes('GK')) adjustment += 0.15;

    // Limiter ajustement
    return Math.max(-0.3, Math.min(0.3, adjustment));
  }

  private calculateInjuryConfidence(injuryAnalysis: any, tacticalAnalysis: any): number {
    let confidence = 0.6;

    // Plus confiant si impact clair et différentiel important
    if (Math.abs(injuryAnalysis.impactDifferential) > 0.4) {
      confidence += 0.2;
    }

    // Plus confiant pour absences de gardien (impact très prévisible)
    const homeProfile = injuryAnalysis.homeInjuryProfile;
    const awayProfile = injuryAnalysis.awayInjuryProfile;
    
    if (homeProfile.affectedPositions.includes('GK') || awayProfile.affectedPositions.includes('GK')) {
      confidence += 0.15;
    }

    // Plus confiant si une seule équipe très affectée
    const impactGap = Math.abs(injuryAnalysis.homeImpactScore - injuryAnalysis.awayImpactScore);
    if (impactGap > 0.5) confidence += 0.1;

    // Moins confiant si trop de disruption (imprévisible)
    if (tacticalAnalysis.tacticalDisruption > 0.7) {
      confidence -= 0.2;
    }

    // Moins confiant si adaptation très difficile (incertitude tactique)
    if (tacticalAnalysis.adaptationDifficulty > 0.8) {
      confidence -= 0.15;
    }

    return Math.max(0.4, Math.min(0.9, confidence));
  }

  private generateInjuryReasoning(injuryAnalysis: any, tacticalAnalysis: any, adjustment: number): string {
    const reasons: string[] = [];

    // État des absences
    if (injuryAnalysis.homeKeyPlayersOut > 0 || injuryAnalysis.awayKeyPlayersOut > 0) {
      reasons.push(`Joueurs clés absents: ${injuryAnalysis.homeKeyPlayersOut} (domicile), ${injuryAnalysis.awayKeyPlayersOut} (visiteur)`);
    }

    // Sévérité
    const homeProfile = injuryAnalysis.homeInjuryProfile;
    const awayProfile = injuryAnalysis.awayInjuryProfile;
    
    if (homeProfile.severity === 'critical') {
      reasons.push('Absences critiques pour l\'équipe domicile');
    } else if (awayProfile.severity === 'critical') {
      reasons.push('Absences critiques pour l\'équipe visiteur');
    }

    // Postes affectés
    if (homeProfile.affectedPositions.includes('GK')) {
      reasons.push('Gardien titulaire absent (domicile) - impact majeur attendu');
    }
    if (awayProfile.affectedPositions.includes('GK')) {
      reasons.push('Gardien titulaire absent (visiteur) - impact majeur attendu');
    }

    // Impact spécifique
    if (homeProfile.defensiveImpact > 0.6) {
      reasons.push('Défense domicile affaiblie par absences');
    }
    if (awayProfile.defensiveImpact > 0.6) {
      reasons.push('Défense visiteur affaiblie par absences');
    }

    if (homeProfile.goalThreatImpact > 0.6) {
      reasons.push('Potentiel offensif domicile réduit');
    }
    if (awayProfile.goalThreatImpact > 0.6) {
      reasons.push('Potentiel offensif visiteur réduit');
    }

    // Disruption tactique
    if (tacticalAnalysis.tacticalDisruption > 0.5) {
      reasons.push('Adaptations tactiques nécessaires perturbent automatismes');
    }

    // Profondeur effectif
    if (Math.abs(tacticalAnalysis.depthQualityFactor) > 0.15) {
      const betterDepth = tacticalAnalysis.depthQualityFactor > 0 ? 'domicile' : 'visiteur';
      reasons.push(`Meilleure profondeur d'effectif pour l'équipe ${betterDepth}`);
    }

    // Leadership/créativité
    if (homeProfile.leadershipImpact > 0.6 || awayProfile.leadershipImpact > 0.6) {
      reasons.push('Absence de leaders d\'équipe complique organisation');
    }

    // Conclusion
    if (Math.abs(adjustment) > 0.1) {
      const direction = adjustment > 0 ? 'favorise domicile' : 'favorise visiteur';
      const intensity = Math.abs(adjustment) > 0.2 ? 'fortement' : 'modérément';
      reasons.push(`Impact blessures ${intensity} ${direction}`);
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