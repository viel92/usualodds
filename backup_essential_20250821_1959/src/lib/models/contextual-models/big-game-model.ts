// @ts-nocheck
import { ContextualModelInput, ContextualPrediction } from './index';

/**
 * Modèle spécialisé pour les grands matchs (derbies, matchs à enjeux, playoffs)
 * Excelle dans la prédiction des matchs avec forte intensité émotionnelle
 */
export class BigGameModel {
  private readonly modelName = 'big_game';

  async predict(input: ContextualModelInput): Promise<ContextualPrediction> {
    const { context, baseFeatures } = input;
    
    // Analyser si c'est un "grand match"
    const bigGameAnalysis = this.analyzeBigGameContext(context);
    
    if (bigGameAnalysis.isBigGame < 0.5) {
      return this.createNullPrediction('Not classified as a big game');
    }

    const applicability = bigGameAnalysis.isBigGame;
    
    // Analyser les facteurs psychologiques spécifiques
    const psychFactors = this.analyzePsychologicalFactors(context, bigGameAnalysis);
    
    // Calculer ajustement de probabilité
    const contextAdjustment = this.calculateBigGameAdjustment(psychFactors, bigGameAnalysis);
    
    // Confiance basée sur historique grands matchs
    const confidence = this.calculateBigGameConfidence(bigGameAnalysis, psychFactors);
    
    // Raisonnement détaillé
    const reasoning = this.generateBigGameReasoning(bigGameAnalysis, psychFactors, contextAdjustment);

    return {
      modelName: this.modelName,
      applicability,
      probability: 0.5 + contextAdjustment,
      confidence,
      contextAdjustment,
      reasoning,
      features: {
        rivalry_intensity: bigGameAnalysis.rivalryIntensity,
        match_importance: bigGameAnalysis.matchImportance,
        emotional_factor: psychFactors.emotionalIntensity,
        pressure_level: psychFactors.pressureLevel,
        unpredictability_factor: psychFactors.unpredictabilityFactor,
        motivation_differential: psychFactors.motivationDifferential,
        home_advantage_boost: psychFactors.homeAdvantageBoost
      }
    };
  }

  private analyzeBigGameContext(context: any) {
    let isBigGame = 0;
    let rivalryIntensity = 0;
    let matchImportance = 0;
    const factors: string[] = [];

    // Analyser rivalité
    if (context.rivalry) {
      rivalryIntensity = context.rivalry.rivalryLevel || 0;
      
      if (context.rivalry.isRivalry) {
        isBigGame += rivalryIntensity * 0.6; // La rivalité est le facteur principal
        
        switch (context.rivalry.type) {
          case 'derby':
            factors.push('Derby local');
            isBigGame += 0.2;
            break;
          case 'title_race':
            factors.push('Course au titre');
            isBigGame += 0.25;
            break;
          case 'relegation':
            factors.push('Combat relégation');
            isBigGame += 0.2;
            break;
          case 'historical':
            factors.push('Rivalité historique');
            isBigGame += 0.15;
            break;
        }
      }
    }

    // Analyser importance du match
    if (context.importance) {
      const maxImportance = Math.max(
        context.importance.homeImportance || 0,
        context.importance.awayImportance || 0
      );
      matchImportance = maxImportance;
      
      if (maxImportance > 0.8) {
        isBigGame += 0.3;
        factors.push('Enjeux très élevés');
      } else if (maxImportance > 0.6) {
        isBigGame += 0.2;
        factors.push('Enjeux importants');
      }

      // Phase de saison critique
      if (context.importance.seasonPhase === 'final_stretch') {
        isBigGame += 0.15;
        factors.push('Phase finale de saison');
      } else if (context.importance.seasonPhase === 'crucial') {
        isBigGame += 0.1;
        factors.push('Période cruciale');
      }
    }

    return {
      isBigGame: Math.min(1, isBigGame),
      rivalryIntensity,
      matchImportance,
      factors
    };
  }

  private analyzePsychologicalFactors(context: any, bigGameAnalysis: any) {
    const factors = {
      emotionalIntensity: 0,
      pressureLevel: 0,
      unpredictabilityFactor: 0,
      motivationDifferential: 0,
      homeAdvantageBoost: 0
    };

    // Intensité émotionnelle basée sur rivalité et enjeux
    factors.emotionalIntensity = (bigGameAnalysis.rivalryIntensity * 0.6) + 
                                (bigGameAnalysis.matchImportance * 0.4);

    // Niveau de pression - augmente avec les enjeux
    factors.pressureLevel = bigGameAnalysis.matchImportance;
    
    if (context.rivalry?.type === 'title_race') {
      factors.pressureLevel += 0.2;
    }
    if (context.rivalry?.type === 'relegation') {
      factors.pressureLevel += 0.25; // Pression maximum pour éviter relégation
    }

    // Facteur d'imprévisibilité - les grands matchs sont plus aléatoires
    factors.unpredictabilityFactor = factors.emotionalIntensity * 0.8;
    
    // Plus le match est grand, plus il y a de surprises possibles
    if (bigGameAnalysis.isBigGame > 0.8) {
      factors.unpredictabilityFactor += 0.15;
    }

    // Différentiel de motivation (peut favoriser outsider)
    const importanceDiff = Math.abs(
      (context.importance?.homeImportance || 0.5) - 
      (context.importance?.awayImportance || 0.5)
    );
    factors.motivationDifferential = importanceDiff;

    // Boost avantage domicile pour grands matchs
    if (bigGameAnalysis.isBigGame > 0.6) {
      factors.homeAdvantageBoost = bigGameAnalysis.isBigGame * 0.1;
      
      // Bonus pour derbies (supporters plus passionnés)
      if (context.rivalry?.type === 'derby') {
        factors.homeAdvantageBoost += 0.05;
      }
    }

    return factors;
  }

  private calculateBigGameAdjustment(psychFactors: any, bigGameAnalysis: any): number {
    let adjustment = 0;

    // 1. Boost avantage domicile
    adjustment += psychFactors.homeAdvantageBoost;

    // 2. Impact de l'imprévisibilité (réduit les certitudes)
    // Plus c'est imprévisible, plus on se rapproche de 50/50
    const unpredictabilityReduction = psychFactors.unpredictabilityFactor * 0.1;
    
    // Si la probabilité de base favorise fortement une équipe, on la réduit
    // Ceci sera appliqué de manière directionnelle par l'appelant
    adjustment -= unpredictabilityReduction;

    // 3. Impact différentiel de motivation
    // L'équipe la plus motivée peut surperformer
    if (psychFactors.motivationDifferential > 0.2) {
      // Cet ajustement sera appliqué en faveur de l'équipe la plus motivée
      adjustment += psychFactors.motivationDifferential * 0.1;
    }

    // 4. Facteur "upset" - possibilité de surprise dans grands matchs
    if (bigGameAnalysis.isBigGame > 0.7 && psychFactors.emotionalIntensity > 0.6) {
      // Légère augmentation des chances de l'outsider
      adjustment += 0.03;
    }

    // Limiter l'ajustement
    return Math.max(-0.15, Math.min(0.15, adjustment));
  }

  private calculateBigGameConfidence(bigGameAnalysis: any, psychFactors: any): number {
    let confidence = 0.6; // Base raisonnablement confiante

    // Plus confiant si facteurs clairs et bien définis
    if (bigGameAnalysis.rivalryIntensity > 0.8) {
      confidence += 0.15; // Rivalités intenses sont prévisibles dans leur imprévisibilité
    }

    if (psychFactors.pressureLevel > 0.8) {
      confidence += 0.1; // Pression extrême a des effets documentés
    }

    // Moins confiant si trop d'imprévisibilité
    if (psychFactors.unpredictabilityFactor > 0.7) {
      confidence -= 0.2; // Très imprévisible = moins confiant
    }

    // Moins confiant si motivations très déséquilibrées (peut créer surprises)
    if (psychFactors.motivationDifferential > 0.4) {
      confidence -= 0.15;
    }

    return Math.max(0.4, Math.min(0.9, confidence));
  }

  private generateBigGameReasoning(
    bigGameAnalysis: any, 
    psychFactors: any, 
    adjustment: number
  ): string {
    const reasons: string[] = [];

    // Identifier le type de grand match
    if (bigGameAnalysis.factors.length > 0) {
      reasons.push(`Grand match identifié: ${bigGameAnalysis.factors.join(', ')}`);
    }

    // Facteurs psychologiques
    if (psychFactors.emotionalIntensity > 0.6) {
      reasons.push(`Intensité émotionnelle élevée (${(psychFactors.emotionalIntensity * 100).toFixed(0)}%) augmente l'imprévisibilité`);
    }

    if (psychFactors.pressureLevel > 0.7) {
      reasons.push(`Pression intense peut affecter les performances habituelles`);
    }

    if (psychFactors.homeAdvantageBoost > 0.05) {
      reasons.push(`Avantage domicile amplifié par l'atmosphère du grand match`);
    }

    if (psychFactors.unpredictabilityFactor > 0.5) {
      reasons.push('Facteur surprise élevé typique des grands matchs');
    }

    if (psychFactors.motivationDifferential > 0.3) {
      reasons.push('Différence de motivation significative entre les équipes');
    }

    // Conclusion basée sur l'ajustement
    if (Math.abs(adjustment) > 0.05) {
      const direction = adjustment > 0 ? 'favorise' : 'pénalise';
      const intensity = Math.abs(adjustment) > 0.1 ? 'fortement' : 'légèrement';
      reasons.push(`Le contexte "grand match" ${intensity} ${direction} l'équipe domicile`);
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