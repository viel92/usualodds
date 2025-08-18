import { createClient } from '@/lib/supabase';
import { WindowType } from '@/types/database';

interface TemporalGuard {
  cutoffTime: Date;
  window: WindowType;
  allowedDataSources: string[];
  restrictedFields: string[];
}

interface ValidationResult {
  isValid: boolean;
  violations: TemporalViolation[];
  warning: string[];
  featureCount: number;
  validFeatureCount: number;
}

interface TemporalViolation {
  featureName: string;
  violationType: 'future_data' | 'restricted_source' | 'suspicious_timing';
  timestamp: string;
  cutoffTime: string;
  severity: 'critical' | 'warning';
  description: string;
}

export class TemporalValidator {
  private supabase = createClient();

  /**
   * Valide qu'aucune feature ne viole les contraintes temporelles
   * Critère essentiel : DÉCISION MONTANTE uniquement basée sur données T-1h
   */
  async validateTemporalConstraints(
    matchId: string,
    window: WindowType,
    decisionTime: Date
  ): Promise<ValidationResult> {
    console.log(`Validating temporal constraints for match ${matchId} at window ${window}`);

    const guard = this.createTemporalGuard(window, decisionTime);
    const violations: TemporalViolation[] = [];
    const warnings: string[] = [];

    try {
      // 1. Valider les features équipe
      const teamViolations = await this.validateTeamFeatures(matchId, guard);
      violations.push(...teamViolations);

      // 2. Valider les features joueur
      const playerViolations = await this.validatePlayerFeatures(matchId, guard);
      violations.push(...playerViolations);

      // 3. Valider les données de matchs (lineups, météo, etc.)
      const matchViolations = await this.validateMatchData(matchId, guard);
      violations.push(...matchViolations);

      // 4. Valider les odds (snapshots avant cutoff uniquement)
      const oddsViolations = await this.validateOddsData(matchId, guard);
      violations.push(...oddsViolations);

      // 5. Détecter les patterns suspects
      const suspiciousPatterns = await this.detectSuspiciousPatterns(matchId, guard);
      violations.push(...suspiciousPatterns);

      // Calculer le résultat
      const totalFeatures = await this.countTotalFeatures(matchId, window);
      const criticalViolations = violations.filter(v => v.severity === 'critical');
      const isValid = criticalViolations.length === 0;

      if (!isValid) {
        warnings.push(`🚨 CRITIQUE: ${criticalViolations.length} violations temporelles détectées`);
        warnings.push('❌ DÉCISION MONTANTE COMPROMISE - Ne pas utiliser ces features');
      }

      if (violations.length > 0 && isValid) {
        warnings.push(`⚠️ ${violations.length} avertissements temporels (non-critiques)`);
      }

      return {
        isValid,
        violations,
        warning: warnings,
        featureCount: totalFeatures,
        validFeatureCount: totalFeatures - criticalViolations.length
      };

    } catch (error) {
      console.error('Error validating temporal constraints:', error);
      throw error;
    }
  }

  private createTemporalGuard(window: WindowType, decisionTime: Date): TemporalGuard {
    let cutoffTime: Date;
    let allowedDataSources: string[];
    let restrictedFields: string[];

    switch (window) {
      case 'T1': // DÉCISION MONTANTE - cutoff strict T-1h
        cutoffTime = new Date(decisionTime.getTime() - 60 * 60 * 1000);
        allowedDataSources = [
          'matches', 'teams', 'players', 'player_match_stats',
          'features_match_team', 'features_player_match',
          'odds_snapshots', 'seasons', 'leagues'
        ];
        restrictedFields = [
          'lineups_official', 'live_stats', 'minute_by_minute',
          'halftime_stats', 'final_stats', 'match_events'
        ];
        break;

      case 'T30': // Publication finale uniquement
        cutoffTime = new Date(decisionTime.getTime() - 30 * 60 * 1000);
        allowedDataSources = [
          'matches', 'teams', 'players', 'lineups_official'
        ];
        restrictedFields = ['live_stats', 'minute_by_minute'];
        break;

      case 'T6':
        cutoffTime = new Date(decisionTime.getTime() - 6 * 60 * 60 * 1000);
        allowedDataSources = [
          'matches', 'teams', 'players', 'player_match_stats',
          'features_match_team', 'features_player_match', 'odds_snapshots'
        ];
        restrictedFields = ['lineups_official', 'live_stats'];
        break;

      case 'T24':
        cutoffTime = new Date(decisionTime.getTime() - 24 * 60 * 60 * 1000);
        allowedDataSources = [
          'matches', 'teams', 'players', 'player_match_stats',
          'features_match_team', 'features_player_match', 'odds_snapshots'
        ];
        restrictedFields = ['lineups_official', 'lineups_probable'];
        break;

      default:
        throw new Error(`Invalid window: ${window}`);
    }

    return {
      cutoffTime,
      window,
      allowedDataSources,
      restrictedFields
    };
  }

  private async validateTeamFeatures(
    matchId: string,
    guard: TemporalGuard
  ): Promise<TemporalViolation[]> {
    const violations: TemporalViolation[] = [];

    const { data: teamFeatures } = await this.supabase
      .from('features_match_team')
      .select('*')
      .eq('match_id', matchId)
      .eq('window', guard.window);

    if (!teamFeatures) return violations;

    for (const feature of teamFeatures) {
      // Vérifier que les features ont été créées avant le cutoff
      const createdAt = new Date(feature.created_at);
      if (createdAt > guard.cutoffTime) {
        violations.push({
          featureName: `team_features_${feature.team_id}`,
          violationType: 'future_data',
          timestamp: feature.created_at,
          cutoffTime: guard.cutoffTime.toISOString(),
          severity: guard.window === 'T1' ? 'critical' : 'warning',
          description: `Features équipe créées après cutoff ${guard.window}`
        });
      }

      // Vérifier les données de forme récente
      if (feature.form_5_points !== null) {
        const formViolation = await this.validateFormData(
          feature.team_id,
          matchId,
          guard.cutoffTime,
          5
        );
        if (formViolation) violations.push(formViolation);
      }
    }

    return violations;
  }

  private async validatePlayerFeatures(
    matchId: string,
    guard: TemporalGuard
  ): Promise<TemporalViolation[]> {
    const violations: TemporalViolation[] = [];

    const { data: playerFeatures } = await this.supabase
      .from('features_player_match')
      .select('*')
      .eq('match_id', matchId)
      .eq('window', guard.window);

    if (!playerFeatures) return violations;

    for (const feature of playerFeatures) {
      // Vérifier timestamp de création
      const createdAt = new Date(feature.created_at);
      if (createdAt > guard.cutoffTime) {
        violations.push({
          featureName: `player_features_${feature.player_id}`,
          violationType: 'future_data',
          timestamp: feature.created_at,
          cutoffTime: guard.cutoffTime.toISOString(),
          severity: guard.window === 'T1' ? 'critical' : 'warning',
          description: `Features joueur créées après cutoff ${guard.window}`
        });
      }

      // Vérifier la probabilité de titularisation (suspecte si trop précise pour T-1h)
      if (guard.window === 'T1' && feature.starter_probability > 0.95) {
        violations.push({
          featureName: `starter_probability_${feature.player_id}`,
          violationType: 'suspicious_timing',
          timestamp: feature.created_at,
          cutoffTime: guard.cutoffTime.toISOString(),
          severity: 'warning',
          description: 'Probabilité titularisation suspicieusement précise pour T-1h'
        });
      }
    }

    return violations;
  }

  private async validateMatchData(
    matchId: string,
    guard: TemporalGuard
  ): Promise<TemporalViolation[]> {
    const violations: TemporalViolation[] = [];

    const { data: match } = await this.supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!match) return violations;

    // Vérifier mise à jour du match
    const updatedAt = new Date(match.updated_at);
    if (updatedAt > guard.cutoffTime && guard.window === 'T1') {
      violations.push({
        featureName: 'match_data',
        violationType: 'future_data',
        timestamp: match.updated_at,
        cutoffTime: guard.cutoffTime.toISOString(),
        severity: 'critical',
        description: 'Données match mises à jour après cutoff T-1h'
      });
    }

    // Vérifier données météo (OK si prévue, pas OK si temps réel)
    if (match.weather_condition && guard.window === 'T1') {
      // Simple heuristique : si météo trop précise, suspect
      if (match.weather_temp && Math.round(match.weather_temp) !== match.weather_temp) {
        violations.push({
          featureName: 'weather_data',
          violationType: 'suspicious_timing',
          timestamp: match.updated_at,
          cutoffTime: guard.cutoffTime.toISOString(),
          severity: 'warning',
          description: 'Données météo suspicieusement précises (temps réel?)'
        });
      }
    }

    return violations;
  }

  private async validateOddsData(
    matchId: string,
    guard: TemporalGuard
  ): Promise<TemporalViolation[]> {
    const violations: TemporalViolation[] = [];

    const { data: odds } = await this.supabase
      .from('odds_snapshots')
      .select('*')
      .eq('match_id', matchId)
      .eq('window', guard.window);

    if (!odds) return violations;

    for (const oddsSnapshot of odds) {
      const capturedAt = new Date(oddsSnapshot.captured_at);
      
      if (capturedAt > guard.cutoffTime) {
        violations.push({
          featureName: `odds_${oddsSnapshot.bookmaker}`,
          violationType: 'future_data',
          timestamp: oddsSnapshot.captured_at,
          cutoffTime: guard.cutoffTime.toISOString(),
          severity: guard.window === 'T1' ? 'critical' : 'warning',
          description: `Cotes ${oddsSnapshot.bookmaker} capturées après cutoff`
        });
      }
    }

    return violations;
  }

  private async validateFormData(
    teamId: string,
    matchId: string,
    cutoffTime: Date,
    numberOfMatches: number
  ): Promise<TemporalViolation | null> {
    // Vérifier que les matchs utilisés pour calculer la forme sont antérieurs au cutoff
    const { data: match } = await this.supabase
      .from('matches')
      .select('match_date')
      .eq('id', matchId)
      .single();

    if (!match) return null;

    const { data: recentMatches } = await this.supabase
      .from('matches')
      .select('match_date, updated_at')
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .lt('match_date', match.match_date)
      .eq('status', 'finished')
      .order('match_date', { ascending: false })
      .limit(numberOfMatches);

    if (!recentMatches) return null;

    // Vérifier qu'aucun match de forme n'a été mis à jour après cutoff
    for (const recentMatch of recentMatches) {
      const updatedAt = new Date(recentMatch.updated_at);
      if (updatedAt > cutoffTime) {
        return {
          featureName: `form_data_${teamId}`,
          violationType: 'future_data',
          timestamp: recentMatch.updated_at,
          cutoffTime: cutoffTime.toISOString(),
          severity: 'critical',
          description: `Match utilisé pour forme mis à jour après cutoff`
        };
      }
    }

    return null;
  }

  private async detectSuspiciousPatterns(
    matchId: string,
    guard: TemporalGuard
  ): Promise<TemporalViolation[]> {
    const violations: TemporalViolation[] = [];

    // Pattern 1: Trop de features créées exactement au cutoff (suspect)
    const { data: featuresAroundCutoff } = await this.supabase
      .from('features_match_team')
      .select('created_at')
      .eq('match_id', matchId)
      .eq('window', guard.window)
      .gte('created_at', new Date(guard.cutoffTime.getTime() - 5 * 60 * 1000).toISOString())
      .lte('created_at', new Date(guard.cutoffTime.getTime() + 5 * 60 * 1000).toISOString());

    if (featuresAroundCutoff && featuresAroundCutoff.length > 5) {
      violations.push({
        featureName: 'bulk_feature_creation',
        violationType: 'suspicious_timing',
        timestamp: guard.cutoffTime.toISOString(),
        cutoffTime: guard.cutoffTime.toISOString(),
        severity: 'warning',
        description: 'Création groupée de features autour du cutoff (suspect)'
      });
    }

    // Pattern 2: Features avec valeurs "trop parfaites" pour la fenêtre
    if (guard.window === 'T1') {
      const { data: playerFeatures } = await this.supabase
        .from('features_player_match')
        .select('starter_probability, minutes_expected')
        .eq('match_id', matchId)
        .eq('window', guard.window);

      if (playerFeatures) {
        const perfectPredictions = playerFeatures.filter(f => 
          f.starter_probability === 1.0 || f.starter_probability === 0.0 ||
          f.minutes_expected === 90 || f.minutes_expected === 0
        );

        if (perfectPredictions.length > playerFeatures.length * 0.3) {
          violations.push({
            featureName: 'perfect_predictions',
            violationType: 'suspicious_timing',
            timestamp: new Date().toISOString(),
            cutoffTime: guard.cutoffTime.toISOString(),
            severity: 'warning',
            description: 'Trop de prédictions "parfaites" pour T-1h (lineups officielles?)'
          });
        }
      }
    }

    return violations;
  }

  private async countTotalFeatures(matchId: string, window: WindowType): Promise<number> {
    const [teamFeatures, playerFeatures] = await Promise.all([
      this.supabase
        .from('features_match_team')
        .select('id', { count: 'exact' })
        .eq('match_id', matchId)
        .eq('window', window),
      this.supabase
        .from('features_player_match')
        .select('id', { count: 'exact' })
        .eq('match_id', matchId)
        .eq('window', window)
    ]);

    return (teamFeatures.count || 0) + (playerFeatures.count || 0);
  }

  /**
   * Fonction critique : vérifie qu'une décision montante est temporellement valide
   */
  async validateMontanteDecision(
    matchId: string,
    decisionTime: Date
  ): Promise<{ canProceed: boolean; reason?: string; violations: TemporalViolation[] }> {
    console.log(`🔍 VALIDATION CRITIQUE MONTANTE - Match ${matchId}`);

    const validation = await this.validateTemporalConstraints(matchId, 'T1', decisionTime);

    const criticalViolations = validation.violations.filter(v => v.severity === 'critical');

    if (criticalViolations.length > 0) {
      return {
        canProceed: false,
        reason: `${criticalViolations.length} violations temporelles critiques détectées. Données postérieures à T-1h détectées.`,
        violations: criticalViolations
      };
    }

    // Vérifications supplémentaires pour montante
    const { data: match } = await this.supabase
      .from('matches')
      .select('match_date')
      .eq('id', matchId)
      .single();

    if (match) {
      const matchTime = new Date(match.match_date);
      const timeUntilMatch = matchTime.getTime() - decisionTime.getTime();
      const hoursUntilMatch = timeUntilMatch / (1000 * 60 * 60);

      if (hoursUntilMatch < 1) {
        return {
          canProceed: false,
          reason: 'Moins d\'1h avant le match - fenêtre de décision fermée',
          violations: []
        };
      }

      if (hoursUntilMatch > 2) {
        return {
          canProceed: false,
          reason: 'Plus de 2h avant le match - pas encore dans la fenêtre T-1h',
          violations: []
        };
      }
    }

    console.log(`✅ VALIDATION MONTANTE RÉUSSIE - ${validation.validFeatureCount}/${validation.featureCount} features valides`);

    return {
      canProceed: true,
      violations: validation.violations
    };
  }

  /**
   * Log des violations pour audit et apprentissage
   */
  async logTemporalViolation(violation: TemporalViolation, matchId: string): Promise<void> {
    await this.supabase
      .from('data_quality_checks')
      .insert({
        check_type: 'temporal_validation',
        table_name: 'features',
        check_name: violation.violationType,
        status: violation.severity === 'critical' ? 'failed' : 'warning',
        details: {
          match_id: matchId,
          feature_name: violation.featureName,
          violation: violation,
          detected_at: new Date().toISOString()
        },
        checked_at: new Date().toISOString()
      });
  }
}

export const temporalValidator = new TemporalValidator();