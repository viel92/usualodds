// @ts-nocheck
import { ContextualModelInput, ContextualPrediction } from './index';

/**
 * Modèle spécialisé pour l'analyse de la forme et des séries
 * Excelle quand il y a des différences marquées de forme ou des séries importantes
 */
export class FormStreakModel {
  private readonly modelName = 'form_streak';

  async predict(input: ContextualModelInput): Promise<ContextualPrediction> {
    const { context, baseFeatures } = input;
    const form = context.form;

    if (!form) {
      return this.createNullPrediction('No form data available');
    }

    // Analyser la forme et les séries
    const formAnalysis = this.analyzeFormAndStreaks(form);
    
    // Calculer applicabilité - pertinent si différence de forme ou séries importantes
    const applicability = this.calculateApplicability(formAnalysis);
    
    if (applicability < 0.4) {
      return this.createNullPrediction('No significant form differences or streaks');
    }

    // Analyser momentum et tendances psychologiques
    const momentum = this.analyzeMomentum(formAnalysis);
    
    // Calculer ajustement de probabilité
    const contextAdjustment = this.calculateFormAdjustment(formAnalysis, momentum);
    
    // Confiance basée sur clarté des tendances
    const confidence = this.calculateFormConfidence(formAnalysis, momentum);
    
    const reasoning = this.generateFormReasoning(formAnalysis, momentum, contextAdjustment);

    return {
      modelName: this.modelName,
      applicability,
      probability: 0.5 + contextAdjustment,
      confidence,
      contextAdjustment,
      reasoning,
      features: {
        form_differential: formAnalysis.formDifferential,
        home_streak_power: formAnalysis.homeStreakPower,
        away_streak_power: formAnalysis.awayStreakPower,
        momentum_factor: momentum.momentumFactor,
        confidence_differential: momentum.confidenceDifferential,
        streak_sustainability: momentum.streakSustainability,
        form_trajectory: momentum.formTrajectory
      }
    };
  }

  private analyzeFormAndStreaks(form: any) {
    // Analyser forme récente (rating 0-1)
    const homeForm = form.homeFormRating || 0.5;
    const awayForm = form.awayFormRating || 0.5;
    const formDifferential = homeForm - awayForm;

    // Analyser séries (positives/négatives)
    const homeStreak = form.homeStreak || 0; // +N victoires, -N défaites
    const awayStreak = form.awayStreak || 0;

    // Calculer "puissance" des séries
    const homeStreakPower = this.calculateStreakPower(homeStreak, homeForm);
    const awayStreakPower = this.calculateStreakPower(awayStreak, awayForm);

    // Identifier tendances (en hausse/baisse)
    const homeTrend = this.analyzeTrend(homeForm, homeStreak);
    const awayTrend = this.analyzeTrend(awayForm, awayStreak);

    return {
      homeForm,
      awayForm,
      formDifferential,
      homeStreak,
      awayStreak,
      homeStreakPower,
      awayStreakPower,
      homeTrend,
      awayTrend
    };
  }

  private calculateStreakPower(streak: number, form: number): number {
    // Puissance d'une série combine longueur et contexte de forme
    const baseStrength = Math.min(Math.abs(streak) / 5, 1); // Max à 5 matchs
    const formMultiplier = streak > 0 ? form : (1 - form); // Série positive profite de bonne forme
    
    return baseStrength * formMultiplier * Math.sign(streak);
  }

  private analyzeTrend(form: number, streak: number): 'rising' | 'declining' | 'stable' {
    // Analyser si équipe en progression, déclin ou stable
    
    // Si série positive longue + bonne forme = rising
    if (streak >= 3 && form > 0.6) return 'rising';
    
    // Si série négative + mauvaise forme = declining  
    if (streak <= -3 && form < 0.4) return 'declining';
    
    // Si forme très bonne mais pas de série = peut être rising
    if (form > 0.75) return 'rising';
    
    // Si forme très mauvaise = declining
    if (form < 0.25) return 'declining';
    
    return 'stable';
  }

  private calculateApplicability(analysis: any): number {
    let applicability = 0;

    // Applicable si différence de forme significative
    const formDiffAbs = Math.abs(analysis.formDifferential);
    if (formDiffAbs > 0.3) applicability += 0.4;
    else if (formDiffAbs > 0.2) applicability += 0.3;
    else if (formDiffAbs > 0.15) applicability += 0.2;

    // Applicable si séries importantes
    const maxStreakPower = Math.max(
      Math.abs(analysis.homeStreakPower),
      Math.abs(analysis.awayStreakPower)
    );
    applicability += Math.min(0.5, maxStreakPower);

    // Applicable si tendances opposées claires
    if ((analysis.homeTrend === 'rising' && analysis.awayTrend === 'declining') ||
        (analysis.homeTrend === 'declining' && analysis.awayTrend === 'rising')) {
      applicability += 0.3;
    }

    return Math.min(1, applicability);
  }

  private analyzeMomentum(analysis: any) {
    // Momentum global (qui a le vent en poupe)
    let momentumFactor = analysis.formDifferential; // Base sur différence de forme
    
    // Ajuster selon séries
    const streakDifferential = analysis.homeStreakPower - analysis.awayStreakPower;
    momentumFactor += streakDifferential * 0.3;

    // Différentiel de confiance (équipe en forme est plus confiante)
    let confidenceDifferential = 0;
    if (analysis.homeForm > 0.7) confidenceDifferential += 0.2;
    if (analysis.awayForm > 0.7) confidenceDifferential -= 0.2;
    if (analysis.homeForm < 0.3) confidenceDifferential -= 0.2;
    if (analysis.awayForm < 0.3) confidenceDifferential += 0.2;

    // Soutenabilité des séries (longues séries finissent par se terminer)
    let streakSustainability = 1.0;
    
    // Séries très longues deviennent fragiles
    if (Math.abs(analysis.homeStreak) > 6) {
      streakSustainability -= 0.2; // Série domicile peut casser
    }
    if (Math.abs(analysis.awayStreak) > 6) {
      streakSustainability -= 0.2; // Série visiteur peut casser
    }

    // Trajectoire de forme (tendance récente)
    let formTrajectory = 0;
    if (analysis.homeTrend === 'rising') formTrajectory += 0.15;
    if (analysis.homeTrend === 'declining') formTrajectory -= 0.15;
    if (analysis.awayTrend === 'rising') formTrajectory -= 0.15;
    if (analysis.awayTrend === 'declining') formTrajectory += 0.15;

    return {
      momentumFactor,
      confidenceDifferential,
      streakSustainability,
      formTrajectory
    };
  }

  private calculateFormAdjustment(analysis: any, momentum: any): number {
    let adjustment = 0;

    // 1. Ajustement basé sur différence de forme
    adjustment += analysis.formDifferential * 0.2;

    // 2. Ajustement momentum (équipe qui monte vs qui descend)
    adjustment += momentum.momentumFactor * 0.15;

    // 3. Ajustement confiance
    adjustment += momentum.confidenceDifferential;

    // 4. Ajustement trajectoire
    adjustment += momentum.formTrajectory;

    // 5. Correction série non-soutenable
    if (momentum.streakSustainability < 0.8) {
      // Si équipe domicile en longue série positive, réduire ses chances (retour terre)
      if (analysis.homeStreak > 6) {
        adjustment -= 0.05;
      }
      // Si équipe domicile en longue série négative, elle peut rebondir
      if (analysis.homeStreak < -6) {
        adjustment += 0.03;
      }
    }

    // Cas spéciaux : confrontation forme extrême vs forme extrême
    if (analysis.homeForm > 0.8 && analysis.awayForm < 0.2) {
      adjustment += 0.1; // Amplifie l'avantage forme
    } else if (analysis.homeForm < 0.2 && analysis.awayForm > 0.8) {
      adjustment -= 0.1;
    }

    // Limiter l'ajustement
    return Math.max(-0.25, Math.min(0.25, adjustment));
  }

  private calculateFormConfidence(analysis: any, momentum: any): number {
    let confidence = 0.6; // Base

    // Plus confiant si différences de forme claires
    const formDiffAbs = Math.abs(analysis.formDifferential);
    if (formDiffAbs > 0.4) confidence += 0.2;
    else if (formDiffAbs > 0.25) confidence += 0.15;

    // Plus confiant si séries significatives
    const maxStreakPower = Math.max(
      Math.abs(analysis.homeStreakPower),
      Math.abs(analysis.awayStreakPower)
    );
    confidence += Math.min(0.2, maxStreakPower * 0.4);

    // Plus confiant si tendances claires et cohérentes
    if (Math.abs(momentum.formTrajectory) > 0.2) {
      confidence += 0.1;
    }

    // Moins confiant si séries très longues (peuvent casser)
    if (momentum.streakSustainability < 0.7) {
      confidence -= 0.15;
    }

    // Moins confiant si formes extrêmes (régression vers moyenne)
    if (analysis.homeForm > 0.9 || analysis.homeForm < 0.1 ||
        analysis.awayForm > 0.9 || analysis.awayForm < 0.1) {
      confidence -= 0.1;
    }

    return Math.max(0.4, Math.min(0.9, confidence));
  }

  private generateFormReasoning(analysis: any, momentum: any, adjustment: number): string {
    const reasons: string[] = [];

    // Analyse forme
    const homeFormDesc = this.describeForm(analysis.homeForm);
    const awayFormDesc = this.describeForm(analysis.awayForm);
    
    if (Math.abs(analysis.formDifferential) > 0.2) {
      reasons.push(`Différence de forme marquée: ${homeFormDesc} (domicile) vs ${awayFormDesc} (visiteur)`);
    }

    // Analyse séries
    if (Math.abs(analysis.homeStreak) >= 3) {
      const streakDesc = analysis.homeStreak > 0 ? 
        `série de ${analysis.homeStreak} victoires` : 
        `série de ${Math.abs(analysis.homeStreak)} défaites`;
      reasons.push(`Équipe domicile en ${streakDesc}`);
    }

    if (Math.abs(analysis.awayStreak) >= 3) {
      const streakDesc = analysis.awayStreak > 0 ? 
        `série de ${analysis.awayStreak} victoires` : 
        `série de ${Math.abs(analysis.awayStreak)} défaites`;
      reasons.push(`Équipe visiteur en ${streakDesc}`);
    }

    // Momentum
    if (Math.abs(momentum.momentumFactor) > 0.2) {
      const team = momentum.momentumFactor > 0 ? 'domicile' : 'visiteur';
      reasons.push(`Momentum favorable à l'équipe ${team}`);
    }

    // Tendances
    if (analysis.homeTrend !== 'stable' || analysis.awayTrend !== 'stable') {
      const homeTrendDesc = this.describeTrend(analysis.homeTrend);
      const awayTrendDesc = this.describeTrend(analysis.awayTrend);
      reasons.push(`Tendances: domicile ${homeTrendDesc}, visiteur ${awayTrendDesc}`);
    }

    // Soutenabilité
    if (momentum.streakSustainability < 0.8) {
      reasons.push('Séries longues statistiquement fragiles (possibilité de rupture)');
    }

    // Conclusion
    if (Math.abs(adjustment) > 0.05) {
      const direction = adjustment > 0 ? 'favorise domicile' : 'favorise visiteur';
      const intensity = Math.abs(adjustment) > 0.15 ? 'fortement' : 'modérément';
      reasons.push(`Analyse forme/série ${intensity} ${direction}`);
    }

    return reasons.join('. ');
  }

  private describeForm(form: number): string {
    if (form >= 0.8) return 'excellente';
    if (form >= 0.65) return 'bonne';
    if (form >= 0.5) return 'correcte';
    if (form >= 0.35) return 'médiocre';
    return 'mauvaise';
  }

  private describeTrend(trend: string): string {
    switch (trend) {
      case 'rising': return 'en progression';
      case 'declining': return 'en déclin';
      default: return 'stable';
    }
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