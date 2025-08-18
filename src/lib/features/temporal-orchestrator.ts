import { createClient } from '@/lib/supabase';
import { WindowType } from '@/types/database';
import { temporalValidator } from './temporal-validator';
import { adaptiveFeaturesBuilder } from './adaptive-features';
import { FeatureOrchestrator } from './index';

interface TemporalPipeline {
  window: WindowType;
  scheduledTime: Date;
  actualTime: Date;
  features: Record<string, any>;
  validation: any;
  adaptiveFeatures: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'temporal_violation';
  processingTime: number;
}

interface MontanteDecisionContext {
  matchId: string;
  decisionTime: Date;
  features: Record<string, any>;
  temporalValidation: any;
  canProceedWithMontante: boolean;
  violations: any[];
  confidence: number;
  recommendedAction: 'proceed' | 'skip' | 'manual_review';
}

export class TemporalOrchestrator {
  private supabase = createClient();
  private baseOrchestrator = new FeatureOrchestrator();

  /**
   * Pipeline principal respectant contraintes temporelles pour montante
   */
  async executeTemporalPipeline(
    matchId: string,
    targetWindow: WindowType,
    scheduledTime?: Date
  ): Promise<TemporalPipeline> {
    const startTime = Date.now();
    const actualTime = new Date();
    const scheduled = scheduledTime || this.calculateScheduledTime(matchId, targetWindow);

    console.log(`🕐 Executing temporal pipeline for match ${matchId} at window ${targetWindow}`);

    try {
      const pipeline: TemporalPipeline = {
        window: targetWindow,
        scheduledTime: scheduled,
        actualTime,
        features: {},
        validation: null,
        adaptiveFeatures: [],
        status: 'running',
        processingTime: 0
      };

      // 1. VÉRIFICATION TIMING CRITIQUE
      if (!this.isWithinValidTimeWindow(actualTime, scheduled, targetWindow)) {
        pipeline.status = 'temporal_violation';
        pipeline.processingTime = Date.now() - startTime;
        
        await this.logTemporalViolation({
          matchId,
          window: targetWindow,
          scheduledTime: scheduled,
          actualTime,
          violation: 'execution_timing'
        });
        
        return pipeline;
      }

      // 2. VALIDATION TEMPORELLE PRÉALABLE
      const temporalValidation = await temporalValidator.validateTemporalConstraints(
        matchId,
        targetWindow,
        actualTime
      );

      pipeline.validation = temporalValidation;

      if (!temporalValidation.isValid && targetWindow === 'T1') {
        console.error('❌ ERREUR CRITIQUE: Violations temporelles pour décision montante');
        pipeline.status = 'temporal_violation';
        pipeline.processingTime = Date.now() - startTime;
        return pipeline;
      }

      // 3. CONSTRUCTION FEATURES DE BASE (si validation OK)
      if (temporalValidation.isValid || targetWindow !== 'T1') {
        await this.baseOrchestrator.buildAllFeatures(matchId, targetWindow);
      }

      // 4. CONSTRUCTION FEATURES ADAPTATIVES
      const adaptiveResult = await adaptiveFeaturesBuilder.buildAdaptiveFeatures(
        matchId,
        targetWindow,
        actualTime
      );

      pipeline.features = adaptiveResult.features;
      pipeline.adaptiveFeatures = adaptiveResult.newFeatures;

      // 5. VALIDATION FINALE POUR MONTANTE
      if (targetWindow === 'T1') {
        const montanteValidation = await temporalValidator.validateMontanteDecision(
          matchId,
          actualTime
        );

        if (!montanteValidation.canProceed) {
          console.warn(`⚠️ Montante decision blocked: ${montanteValidation.reason}`);
          pipeline.status = 'temporal_violation';
          pipeline.processingTime = Date.now() - startTime;
          return pipeline;
        }
      }

      // 6. STOCKAGE ET LOGGING
      await this.storePipelineResult(matchId, pipeline);
      
      pipeline.status = 'completed';
      pipeline.processingTime = Date.now() - startTime;

      console.log(`✅ Temporal pipeline completed in ${pipeline.processingTime}ms`);
      return pipeline;

    } catch (error) {
      console.error('Error in temporal pipeline:', error);
      
      const pipeline: TemporalPipeline = {
        window: targetWindow,
        scheduledTime: scheduled,
        actualTime,
        features: {},
        validation: null,
        adaptiveFeatures: [],
        status: 'failed',
        processingTime: Date.now() - startTime
      };

      await this.logPipelineError(matchId, pipeline, error);
      return pipeline;
    }
  }

  /**
   * Fonction critique pour décision montante avec validation complète
   */
  async prepareMontanteDecision(matchId: string): Promise<MontanteDecisionContext> {
    console.log(`🎯 PRÉPARATION DÉCISION MONTANTE - Match ${matchId}`);

    const decisionTime = new Date();

    try {
      // 1. PIPELINE T-1h AVEC VALIDATION STRICTE
      const pipeline = await this.executeTemporalPipeline(matchId, 'T1');

      if (pipeline.status === 'temporal_violation' || pipeline.status === 'failed') {
        return {
          matchId,
          decisionTime,
          features: {},
          temporalValidation: pipeline.validation,
          canProceedWithMontante: false,
          violations: pipeline.validation?.violations || [],
          confidence: 0,
          recommendedAction: 'skip'
        };
      }

      // 2. VALIDATION MONTANTE SPÉCIFIQUE
      const montanteValidation = await temporalValidator.validateMontanteDecision(
        matchId,
        decisionTime
      );

      // 3. CALCUL CONFIANCE BASÉ SUR QUALITÉ FEATURES
      const confidence = this.calculateFeatureConfidence(
        pipeline.features,
        pipeline.validation
      );

      // 4. DÉTERMINER RECOMMANDATION
      let recommendedAction: MontanteDecisionContext['recommendedAction'] = 'proceed';
      
      if (!montanteValidation.canProceed) {
        recommendedAction = 'skip';
      } else if (confidence < 0.7 || montanteValidation.violations.length > 3) {
        recommendedAction = 'manual_review';
      }

      // 5. LOG DÉCISION POUR AUDIT
      await this.logMontanteDecisionContext({
        matchId,
        decisionTime,
        canProceed: montanteValidation.canProceed,
        confidence,
        recommendedAction,
        featureCount: Object.keys(pipeline.features).length,
        violationCount: montanteValidation.violations.length
      });

      return {
        matchId,
        decisionTime,
        features: pipeline.features,
        temporalValidation: pipeline.validation,
        canProceedWithMontante: montanteValidation.canProceed,
        violations: montanteValidation.violations,
        confidence,
        recommendedAction
      };

    } catch (error) {
      console.error('Error preparing montante decision:', error);
      
      return {
        matchId,
        decisionTime,
        features: {},
        temporalValidation: null,
        canProceedWithMontante: false,
        violations: [],
        confidence: 0,
        recommendedAction: 'skip'
      };
    }
  }

  /**
   * Execution de tous les pipelines pour upcoming matches
   */
  async executeScheduledPipelines(): Promise<{
    executed: number;
    succeeded: number;
    failed: number;
    violations: number;
  }> {
    console.log('🕐 Executing scheduled temporal pipelines...');

    // Récupérer les matchs dans les prochaines 48h
    const { data: upcomingMatches } = await this.supabase
      .from('matches')
      .select('id, match_date')
      .eq('status', 'scheduled')
      .gte('match_date', new Date().toISOString())
      .lte('match_date', new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString())
      .order('match_date', { ascending: true });

    if (!upcomingMatches || upcomingMatches.length === 0) {
      return { executed: 0, succeeded: 0, failed: 0, violations: 0 };
    }

    let executed = 0;
    let succeeded = 0;
    let failed = 0;
    let violations = 0;

    const windows: WindowType[] = ['T24', 'T6', 'T1', 'T30'];

    for (const match of upcomingMatches) {
      for (const window of windows) {
        const scheduledTime = this.calculateScheduledTime(match.id, window, match.match_date);
        const now = new Date();

        // Exécuter seulement si c'est le bon moment
        if (this.shouldExecuteNow(now, scheduledTime, window)) {
          try {
            executed++;
            const pipeline = await this.executeTemporalPipeline(match.id, window, scheduledTime);
            
            if (pipeline.status === 'completed') {
              succeeded++;
            } else if (pipeline.status === 'temporal_violation') {
              violations++;
            } else {
              failed++;
            }

            // Délai entre executions pour éviter surcharge
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            failed++;
            console.error(`Error executing pipeline for match ${match.id} window ${window}:`, error);
          }
        }
      }
    }

    console.log(`✅ Scheduled pipelines: ${executed} executed, ${succeeded} succeeded, ${failed} failed, ${violations} violations`);
    
    return { executed, succeeded, failed, violations };
  }

  private calculateScheduledTime(
    matchId: string,
    window: WindowType,
    matchDate?: string
  ): Date {
    // Calculer le moment exact d'exécution selon la fenêtre
    
    if (matchDate) {
      const matchTime = new Date(matchDate);
      
      switch (window) {
        case 'T24':
          return new Date(matchTime.getTime() - 24 * 60 * 60 * 1000);
        case 'T6':
          return new Date(matchTime.getTime() - 6 * 60 * 60 * 1000);
        case 'T1':
          return new Date(matchTime.getTime() - 60 * 60 * 1000);
        case 'T30':
          return new Date(matchTime.getTime() - 30 * 60 * 1000);
      }
    }

    // Fallback: calculer depuis maintenant
    const now = new Date();
    switch (window) {
      case 'T24':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'T6':
        return new Date(now.getTime() + 6 * 60 * 60 * 1000);
      case 'T1':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'T30':
        return new Date(now.getTime() + 30 * 60 * 1000);
      default:
        return now;
    }
  }

  private isWithinValidTimeWindow(
    actualTime: Date,
    scheduledTime: Date,
    window: WindowType
  ): boolean {
    const diffMinutes = Math.abs(actualTime.getTime() - scheduledTime.getTime()) / (1000 * 60);
    
    // Tolérance selon la fenêtre
    const tolerance = {
      'T24': 120, // 2h de tolérance
      'T6': 30,   // 30min de tolérance
      'T1': 5,    // 5min de tolérance (CRITIQUE)
      'T30': 2    // 2min de tolérance (TRÈS CRITIQUE)
    };

    return diffMinutes <= tolerance[window];
  }

  private shouldExecuteNow(
    now: Date,
    scheduledTime: Date,
    window: WindowType
  ): boolean {
    const diffMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60);
    
    // Exécuter si on est dans la fenêtre d'exécution
    const executionWindow = {
      'T24': [-60, 60],  // 1h avant/après
      'T6': [-30, 30],   // 30min avant/après
      'T1': [-5, 5],     // 5min avant/après
      'T30': [-2, 2]     // 2min avant/après
    };

    const [minDiff, maxDiff] = executionWindow[window];
    return diffMinutes >= minDiff && diffMinutes <= maxDiff;
  }

  private calculateFeatureConfidence(
    features: Record<string, any>,
    validation: any
  ): number {
    let confidence = 1.0;

    // Réduire confiance selon violations
    if (validation?.violations) {
      const warningViolations = validation.violations.filter((v: any) => v.severity === 'warning');
      confidence -= warningViolations.length * 0.1;
    }

    // Réduire confiance si peu de features
    const featureCount = Object.keys(features).length;
    if (featureCount < 10) {
      confidence -= (10 - featureCount) * 0.05;
    }

    // Réduire confiance si features suspectes
    const suspiciousFeatures = Object.values(features).filter(v => 
      typeof v === 'number' && (v === 1.0 || v === 0.0)
    );
    
    if (suspiciousFeatures.length > featureCount * 0.3) {
      confidence -= 0.2; // Trop de valeurs "parfaites"
    }

    return Math.max(confidence, 0);
  }

  private async storePipelineResult(
    matchId: string,
    pipeline: TemporalPipeline
  ): Promise<void> {
    await this.supabase
      .from('data_quality_checks')
      .insert({
        check_type: 'temporal_pipeline',
        table_name: 'features',
        check_name: `pipeline_${pipeline.window}`,
        status: pipeline.status === 'completed' ? 'passed' : 'failed',
        details: {
          match_id: matchId,
          window: pipeline.window,
          scheduled_time: pipeline.scheduledTime.toISOString(),
          actual_time: pipeline.actualTime.toISOString(),
          processing_time: pipeline.processingTime,
          feature_count: Object.keys(pipeline.features).length,
          adaptive_features: pipeline.adaptiveFeatures,
          validation_summary: {
            valid: pipeline.validation?.isValid,
            violations: pipeline.validation?.violations?.length || 0
          }
        },
        checked_at: new Date().toISOString()
      });
  }

  private async logTemporalViolation(violation: {
    matchId: string;
    window: WindowType;
    scheduledTime: Date;
    actualTime: Date;
    violation: string;
  }): Promise<void> {
    await this.supabase
      .from('data_quality_checks')
      .insert({
        check_type: 'temporal_violation',
        table_name: 'pipeline',
        check_name: violation.violation,
        status: 'failed',
        details: {
          match_id: violation.matchId,
          window: violation.window,
          scheduled_time: violation.scheduledTime.toISOString(),
          actual_time: violation.actualTime.toISOString(),
          time_diff_minutes: Math.abs(
            violation.actualTime.getTime() - violation.scheduledTime.getTime()
          ) / (1000 * 60)
        },
        checked_at: new Date().toISOString()
      });
  }

  private async logMontanteDecisionContext(context: {
    matchId: string;
    decisionTime: Date;
    canProceed: boolean;
    confidence: number;
    recommendedAction: string;
    featureCount: number;
    violationCount: number;
  }): Promise<void> {
    await this.supabase
      .from('data_quality_checks')
      .insert({
        check_type: 'montante_decision',
        table_name: 'decision_log',
        check_name: 'decision_context',
        status: context.canProceed ? 'passed' : 'failed',
        details: context,
        checked_at: new Date().toISOString()
      });
  }

  private async logPipelineError(
    matchId: string,
    pipeline: TemporalPipeline,
    error: any
  ): Promise<void> {
    await this.supabase
      .from('data_quality_checks')
      .insert({
        check_type: 'pipeline_error',
        table_name: 'pipeline',
        check_name: 'execution_error',
        status: 'failed',
        details: {
          match_id: matchId,
          window: pipeline.window,
          error_message: error instanceof Error ? error.message : String(error),
          processing_time: pipeline.processingTime
        },
        checked_at: new Date().toISOString()
      });
  }
}

export const temporalOrchestrator = new TemporalOrchestrator();