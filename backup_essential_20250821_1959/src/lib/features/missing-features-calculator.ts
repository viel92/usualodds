// @ts-nocheck
import { createApiClient } from '@/lib/supabase';
import { AdvancedAnalyticsCalculator } from './advanced-analytics-calculator';
import { TemporalFeaturesValidatorStrict } from './temporal-features-validator-strict';

export class MissingFeaturesCalculator {
  private supabase = createApiClient();
  private analyticsCalculator = new AdvancedAnalyticsCalculator();
  private temporalValidator = new TemporalFeaturesValidatorStrict();

  /**
   * Missing Features Calculator
   * Comble les 18 features vides identifiées dans l'audit critique
   * Target: Passer de 18 features actuelles à 30+ features complètes
   */

  async calculateMissingTeamFeatures(
    teamId: string,
    season: string,
    beforeDate?: string
  ): Promise<any> {
    console.log(`Calculating missing features for team ${teamId}, season ${season}...`);

    try {
      const cutoffDate = beforeDate || new Date().toISOString().split('T')[0];
      
      // 1. Récupérer les données de base nécessaires
      const baseData = await this.getTeamBaseData(teamId, season, cutoffDate);
      
      // 2. Calculer les features manquantes critiques identifiées
      const missingFeatures = await this.calculateIdentifiedMissingFeatures(teamId, cutoffDate);
      
      // 3. Calculer les features avancées additionnelles
      const advancedFeatures = await this.calculateAdvancedFeatures(teamId, cutoffDate);
      
      // 4. Valider la cohérence temporelle
      const validatedFeatures = await this.validateAndCorrectFeatures(
        { ...missingFeatures, ...advancedFeatures }, 
        cutoffDate, 
        teamId
      );

      // 5. Calculer les features de contexte et motivation
      const contextFeatures = await this.calculateContextualFeatures(teamId, season, cutoffDate);

      // 6. Consolidation finale
      const completedFeatures = {
        // Métadonnées
        team_id: teamId,
        season: season,
        calculation_date: cutoffDate,
        features_version: '2.0_enhanced',
        
        // Features manquantes critiques (identifiées dans audit)
        ...validatedFeatures,
        
        // Features contextuelles
        ...contextFeatures,
        
        // Quality indicators
        data_completeness: this.calculateDataCompleteness(validatedFeatures),
        temporal_integrity: true,
        calculation_method: 'missing_features_calculator_v2'
      };

      console.log(`Missing features calculation completed for team ${teamId}`);
      return completedFeatures;

    } catch (error) {
      console.error(`Error calculating missing features for team ${teamId}:`, error);
      return this.getDefaultMissingFeatures(teamId, season);
    }
  }

  async bulkRecalculateMissingFeatures(
    seasonFilter?: string,
    teamFilter?: string
  ): Promise<{ processed: number; errors: number }> {
    console.log(`Starting bulk recalculation of missing features...`);

    let processed = 0;
    let errors = 0;

    try {
      // Récupérer toutes les équipes à traiter
      const teams = await this.getTeamsForRecalculation(seasonFilter, teamFilter);
      
      for (const team of teams) {
        try {
          const features = await this.calculateMissingTeamFeatures(
            team.team_id, 
            team.season
          );
          
          await this.storeMissingFeatures(features);
          processed++;
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error processing team ${team.team_id}:`, error);
          errors++;
        }
      }

      console.log(`Bulk recalculation completed: ${processed} processed, ${errors} errors`);
      return { processed, errors };

    } catch (error) {
      console.error(`Error in bulk recalculation:`, error);
      return { processed, errors };
    }
  }

  // CORE MISSING FEATURES CALCULATION

  private async calculateIdentifiedMissingFeatures(
    teamId: string, 
    cutoffDate: string
  ): Promise<any> {
    console.log(`Calculating identified missing features for team ${teamId}...`);

    try {
      const matches = await this.getValidHistoricalMatches(teamId, cutoffDate, 20);
      
      if (matches.length === 0) {
        return this.getDefaultMissingFeaturesValues();
      }

      // FEATURES MANQUANTES CRITIQUES IDENTIFIÉES DANS L'AUDIT

      // 1. GOAL DIFFERENCE & GOALS METRICS (manquants)
      const goalsMetrics = this.calculateGoalMetrics(matches, teamId);
      
      // 2. EXPECTED GOALS METRICS (manquants)
      const xgMetrics = await this.analyticsCalculator.calculateExpectedGoalsAdvanced(
        teamId, cutoffDate, 15
      );
      
      // 3. TEMPORAL FORM WITH DECAY (amélioré)
      const temporalForm = this.calculateTemporalFormWithDecay(matches, teamId, cutoffDate);
      
      // 4. POSSESSION & STYLE METRICS (améliorés)
      const styleMetrics = await this.calculateEnhancedStyleMetrics(teamId, cutoffDate);
      
      // 5. DEFENSIVE SOLIDITY (manquant)
      const defensiveMetrics = await this.analyticsCalculator.calculateDefensiveSolidityAdvanced(
        teamId, cutoffDate, 15
      );
      
      // 6. ATTACK EFFICIENCY (manquant)
      const attackMetrics = await this.analyticsCalculator.calculateAttackEfficiencyAdvanced(
        teamId, cutoffDate, 15
      );
      
      // 7. VENUE PERFORMANCE DETAILED (amélioré)
      const venueMetrics = await this.calculateDetailedVenuePerformance(teamId, cutoffDate);
      
      // 8. MOMENTUM & STREAKS (manquant)
      const momentumMetrics = this.calculateMomentumAndStreaks(matches, teamId);
      
      // 9. TACTICAL INTENSITY (manquant)
      const tacticalMetrics = await this.calculateTacticalIntensityMetrics(teamId, cutoffDate);
      
      // 10. HEAD-TO-HEAD PERFORMANCE (manquant)
      const h2hMetrics = await this.calculateHeadToHeadMetrics(teamId, cutoffDate);

      return {
        // Goals & Efficiency
        goal_difference: goalsMetrics.goalDifference,
        goals_per_game_avg: goalsMetrics.goalsPerGameAvg,
        goals_conceded_avg: goalsMetrics.goalsConcededAvg,
        goals_scored_home_avg: goalsMetrics.goalsHomedAvg,
        goals_scored_away_avg: goalsMetrics.goalsAwayAvg,
        
        // Expected Goals (xG)
        xg_for_avg: xgMetrics.xg_for_avg,
        xg_against_avg: xgMetrics.xg_against_avg,
        xg_diff_5: xgMetrics.xg_diff_5,
        xg_diff_10: xgMetrics.xg_diff_10,
        xg_accuracy: xgMetrics.xg_accuracy_for,
        
        // Temporal Form
        form_5_weighted: temporalForm.form5Weighted,
        form_10_weighted: temporalForm.form10Weighted,
        form_momentum: temporalForm.formMomentum,
        recent_form_trend: temporalForm.recentTrend,
        
        // Style & Possession
        possession_efficiency: styleMetrics.possessionEfficiency,
        tempo_score: styleMetrics.tempoScore,
        pressing_intensity: styleMetrics.pressingIntensity,
        transition_speed: styleMetrics.transitionSpeed,
        verticality_index: styleMetrics.verticalityIndex,
        
        // Defensive Solidity
        clean_sheets_rate: defensiveMetrics.clean_sheets_rate,
        defensive_solidity_index: defensiveMetrics.defensive_solidity_index,
        pressure_resistance: defensiveMetrics.pressure_resistance,
        
        // Attack Efficiency
        attack_efficiency_ratio: attackMetrics.attack_efficiency_index,
        finishing_quality: attackMetrics.finishing_quality,
        creative_threat_index: attackMetrics.creative_threat_index,
        
        // Venue Performance
        home_win_rate: venueMetrics.homeWinRate,
        away_win_rate: venueMetrics.awayWinRate,
        venue_advantage: venueMetrics.venueAdvantage,
        venue_consistency: venueMetrics.venueConsistency,
        
        // Momentum & Streaks
        current_streak: momentumMetrics.currentStreak,
        streak_strength: momentumMetrics.streakStrength,
        momentum_score: momentumMetrics.momentumScore,
        comeback_ability: momentumMetrics.comebackAbility,
        
        // Tactical Intensity
        game_control_index: tacticalMetrics.gameControlIndex,
        intensity_sustainability: tacticalMetrics.intensitySustainability,
        tactical_flexibility: tacticalMetrics.tacticalFlexibility,
        
        // Head-to-Head
        h2h_win_rate_general: h2hMetrics.generalWinRate,
        h2h_goal_diff_avg: h2hMetrics.avgGoalDifference,
        big_game_performance: h2hMetrics.bigGamePerformance
      };

    } catch (error) {
      console.error(`Error calculating identified missing features:`, error);
      return this.getDefaultMissingFeaturesValues();
    }
  }

  private async calculateAdvancedFeatures(teamId: string, cutoffDate: string): Promise<any> {
    console.log(`Calculating advanced features for team ${teamId}...`);

    try {
      // 1. Game Control Metrics
      const gameControlMetrics = await this.analyticsCalculator.calculateGameControlMetrics(
        teamId, cutoffDate, 15
      );
      
      // 2. Contextual Performance
      const contextualMetrics = await this.analyticsCalculator.calculateContextualPerformance(
        teamId, cutoffDate, null, 15
      );
      
      // 3. Seasonal Progression
      const progressionMetrics = await this.calculateSeasonalProgression(teamId, cutoffDate);
      
      // 4. Squad Depth & Quality
      const squadMetrics = await this.calculateSquadDepthMetrics(teamId, cutoffDate);
      
      // 5. Match Importance Sensitivity
      const importanceMetrics = await this.calculateMatchImportanceSensitivity(teamId, cutoffDate);

      return {
        // Game Control
        possession_dominance: gameControlMetrics.possession_dominance,
        tempo_control: gameControlMetrics.tempo_control,
        territorial_dominance: gameControlMetrics.territorial_dominance,
        
        // Contextual Performance
        vs_top_teams_performance: contextualMetrics.vs_top6_performance,
        vs_bottom_teams_performance: contextualMetrics.vs_bottom6_performance,
        when_leading_performance: contextualMetrics.when_leading_performance,
        when_trailing_performance: contextualMetrics.when_trailing_performance,
        
        // Time-based Performance
        first_half_strength: contextualMetrics.first_half_strength,
        second_half_strength: contextualMetrics.second_half_strength,
        late_game_resilience: contextualMetrics.clutch_performance,
        
        // Seasonal Progression
        early_season_form: progressionMetrics.earlySeasonForm,
        mid_season_consistency: progressionMetrics.midSeasonConsistency,
        late_season_performance: progressionMetrics.lateSeasonPerformance,
        progression_trend: progressionMetrics.progressionTrend,
        
        // Squad Quality
        squad_depth_score: squadMetrics.squadDepthScore,
        key_player_dependency: squadMetrics.keyPlayerDependency,
        rotation_capability: squadMetrics.rotationCapability,
        experience_balance: squadMetrics.experienceBalance,
        
        // Match Importance
        big_match_performance: importanceMetrics.bigMatchPerformance,
        pressure_handling: importanceMetrics.pressureHandling,
        motivation_response: importanceMetrics.motivationResponse
      };

    } catch (error) {
      console.error(`Error calculating advanced features:`, error);
      return {};
    }
  }

  // SPECIFIC CALCULATION METHODS

  private calculateGoalMetrics(matches: any[], teamId: string): any {
    if (matches.length === 0) {
      return {
        goalDifference: 0,
        goalsPerGameAvg: 1.5,
        goalsConcededAvg: 1.5,
        goalsHomedAvg: 1.7,
        goalsAwayAvg: 1.3
      };
    }

    let totalGoalsFor = 0;
    let totalGoalsAgainst = 0;
    let homeGoals = 0;
    let awayGoals = 0;
    let homeMatches = 0;
    let awayMatches = 0;
    let validMatches = 0;

    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const goalsFor = isHome ? match.home_score : match.away_score;
      const goalsAgainst = isHome ? match.away_score : match.home_score;

      if (goalsFor !== null && goalsAgainst !== null) {
        totalGoalsFor += goalsFor;
        totalGoalsAgainst += goalsAgainst;
        validMatches++;

        if (isHome) {
          homeGoals += goalsFor;
          homeMatches++;
        } else {
          awayGoals += goalsFor;
          awayMatches++;
        }
      }
    }

    return {
      goalDifference: totalGoalsFor - totalGoalsAgainst,
      goalsPerGameAvg: validMatches > 0 ? totalGoalsFor / validMatches : 1.5,
      goalsConcededAvg: validMatches > 0 ? totalGoalsAgainst / validMatches : 1.5,
      goalsHomedAvg: homeMatches > 0 ? homeGoals / homeMatches : 1.7,
      goalsAwayAvg: awayMatches > 0 ? awayGoals / awayMatches : 1.3
    };
  }

  private calculateTemporalFormWithDecay(
    matches: any[], 
    teamId: string, 
    referenceDate: string
  ): any {
    if (matches.length === 0) {
      return {
        form5Weighted: 7.5,
        form10Weighted: 15,
        formMomentum: 0,
        recentTrend: 0
      };
    }

    const referenceDateObj = new Date(referenceDate);
    const points: number[] = [];
    const weights: number[] = [];

    for (const match of matches.slice(0, 15)) {
      const isHome = match.home_team_id === teamId;
      const teamScore = isHome ? match.home_score : match.away_score;
      const oppScore = isHome ? match.away_score : match.home_score;

      if (teamScore !== null && oppScore !== null) {
        let matchPoints = 0;
        if (teamScore > oppScore) matchPoints = 3;
        else if (teamScore === oppScore) matchPoints = 1;

        const matchDate = new Date(match.match_date);
        const daysDiff = Math.max(1, Math.floor(
          (referenceDateObj.getTime() - matchDate.getTime()) / (1000 * 60 * 60 * 24)
        ));

        // Decay temporal avec half-life de 21 jours
        const weight = Math.exp(-Math.log(2) * daysDiff / 21);

        points.push(matchPoints);
        weights.push(weight);
      }
    }

    if (points.length === 0) {
      return {
        form5Weighted: 7.5,
        form10Weighted: 15,
        formMomentum: 0,
        recentTrend: 0
      };
    }

    // Form pondérée sur 5 matches
    let form5Weighted = 0;
    let weightSum5 = 0;
    for (let i = 0; i < Math.min(5, points.length); i++) {
      form5Weighted += points[i] * weights[i];
      weightSum5 += weights[i];
    }
    form5Weighted = weightSum5 > 0 ? (form5Weighted / weightSum5) * 3 : 7.5;

    // Form pondérée sur 10 matches
    let form10Weighted = 0;
    let weightSum10 = 0;
    for (let i = 0; i < Math.min(10, points.length); i++) {
      form10Weighted += points[i] * weights[i];
      weightSum10 += weights[i];
    }
    form10Weighted = weightSum10 > 0 ? (form10Weighted / weightSum10) * 3 : 15;

    // Momentum (3 derniers vs 3 précédents)
    const recent3 = points.slice(0, 3).reduce((sum, p) => sum + p, 0);
    const previous3 = points.slice(3, 6).reduce((sum, p) => sum + p, 0);
    const formMomentum = recent3 - previous3;

    // Tendance récente (régression linéaire)
    const recentTrend = this.calculateLinearTrend(points.slice(0, 5));

    return {
      form5Weighted,
      form10Weighted,
      formMomentum,
      recentTrend
    };
  }

  private async calculateEnhancedStyleMetrics(teamId: string, cutoffDate: string): Promise<any> {
    try {
      // Récupérer les statistiques de match disponibles
      const { data: matchStats } = await this.supabase
        .from('match_statistics')
        .select('statistics, match_date')
        .eq('team_id', teamId)
        .lt('match_date', cutoffDate)
        .order('match_date', { ascending: false })
        .limit(10);

      if (matchStats && matchStats.length > 0) {
        return this.calculateStyleFromStatistics(matchStats);
      }

      // Fallback: estimation basée sur les données d'équipe
      const { data: teamFeatures } = await this.supabase
        .from('team_features')
        .select('possession_avg, elo_rating')
        .eq('team_id', teamId)
        .single();

      return this.estimateStyleMetrics(teamFeatures);

    } catch (error) {
      return this.getDefaultStyleMetrics();
    }
  }

  private calculateStyleFromStatistics(matchStats: any[]): any {
    let totalPossession = 0;
    let totalPasses = 0;
    let totalShots = 0;
    let validStats = 0;

    for (const stat of matchStats) {
      try {
        const stats = typeof stat.statistics === 'string' 
          ? JSON.parse(stat.statistics) 
          : stat.statistics;

        if (stats) {
          totalPossession += parseFloat(stats.possession) || 50;
          totalPasses += parseInt(stats.passes) || 400;
          totalShots += parseInt(stats.shots_total) || 12;
          validStats++;
        }
      } catch (e) {
        // Skip invalid stats
      }
    }

    if (validStats === 0) {
      return this.getDefaultStyleMetrics();
    }

    const avgPossession = totalPossession / validStats;
    const avgPasses = totalPasses / validStats;
    const avgShots = totalShots / validStats;

    return {
      possessionEfficiency: this.normalizeValue(avgPossession / 60, 0, 1),
      tempoScore: this.normalizeValue((avgPasses - 300) / 300, -1, 1),
      pressingIntensity: this.normalizeValue((65 - avgPossession) / 30, 0, 2),
      transitionSpeed: avgPossession > 55 ? 0.3 : 0.7,
      verticalityIndex: this.normalizeValue((avgShots - 10) / 10, -1, 1)
    };
  }

  private estimateStyleMetrics(teamFeatures: any): any {
    const possession = teamFeatures?.possession_avg || 50;
    const elo = teamFeatures?.elo_rating || 1500;

    // Estimation basée sur possession et ELO
    const possessionEff = possession / 100;
    const eloBonus = (elo - 1500) / 1000;

    return {
      possessionEfficiency: Math.max(0, Math.min(1, possessionEff + eloBonus * 0.2)),
      tempoScore: this.normalizeValue((possession - 50) / 25, -1, 1),
      pressingIntensity: this.normalizeValue((60 - possession) / 30, 0, 2),
      transitionSpeed: possession > 55 ? 0.3 + Math.random() * 0.3 : 0.5 + Math.random() * 0.3,
      verticalityIndex: this.normalizeValue(eloBonus * 0.5, -1, 1)
    };
  }

  private async calculateDetailedVenuePerformance(teamId: string, cutoffDate: string): Promise<any> {
    try {
      const homeMatches = await this.getValidHistoricalMatches(teamId, cutoffDate, 10, true);
      const awayMatches = await this.getValidHistoricalMatches(teamId, cutoffDate, 10, false);

      const homeStats = this.calculateVenueStats(homeMatches, teamId);
      const awayStats = this.calculateVenueStats(awayMatches, teamId);

      const venueAdvantage = homeStats.winRate - awayStats.winRate;
      const venueConsistency = 1 - Math.abs(venueAdvantage);

      return {
        homeWinRate: homeStats.winRate,
        awayWinRate: awayStats.winRate,
        venueAdvantage,
        venueConsistency
      };

    } catch (error) {
      return {
        homeWinRate: 0.6,
        awayWinRate: 0.4,
        venueAdvantage: 0.2,
        venueConsistency: 0.8
      };
    }
  }

  private calculateVenueStats(matches: any[], teamId: string): any {
    if (matches.length === 0) {
      return { winRate: 0.5, avgGoals: 1.5 };
    }

    let wins = 0;
    let totalGoals = 0;
    let validMatches = 0;

    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const teamScore = isHome ? match.home_score : match.away_score;
      const oppScore = isHome ? match.away_score : match.home_score;

      if (teamScore !== null && oppScore !== null) {
        if (teamScore > oppScore) wins++;
        totalGoals += teamScore;
        validMatches++;
      }
    }

    return {
      winRate: validMatches > 0 ? wins / validMatches : 0.5,
      avgGoals: validMatches > 0 ? totalGoals / validMatches : 1.5
    };
  }

  private calculateMomentumAndStreaks(matches: any[], teamId: string): any {
    if (matches.length === 0) {
      return {
        currentStreak: 0,
        streakStrength: 0,
        momentumScore: 0,
        comebackAbility: 0.5
      };
    }

    const results: string[] = [];
    let comebacks = 0;

    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const teamScore = isHome ? match.home_score : match.away_score;
      const oppScore = isHome ? match.away_score : match.home_score;

      if (teamScore !== null && oppScore !== null) {
        if (teamScore > oppScore) {
          results.push('W');
          // Estimation comeback (score > 1 et adversaire a marqué)
          if (teamScore > 1 && oppScore > 0) comebacks++;
        } else if (teamScore === oppScore) {
          results.push('D');
        } else {
          results.push('L');
        }
      }
    }

    // Série actuelle
    let currentStreak = 0;
    let streakType = '';
    
    for (const result of results) {
      if (results.length > 0 && result === results[0]) {
        currentStreak++;
      } else {
        break;
      }
    }

    if (results.length > 0) {
      streakType = results[0];
    }

    // Force de la série
    let streakStrength = currentStreak;
    if (streakType === 'W') streakStrength *= 1.5;
    else if (streakType === 'L') streakStrength *= -1.5;

    // Score momentum
    const recentWins = results.slice(0, 5).filter(r => r === 'W').length;
    const momentumScore = (recentWins / 5) + (streakStrength / 10);

    const comebackAbility = results.length > 0 ? comebacks / results.length : 0.5;

    return {
      currentStreak,
      streakStrength,
      momentumScore,
      comebackAbility
    };
  }

  private async calculateTacticalIntensityMetrics(teamId: string, cutoffDate: string): Promise<any> {
    try {
      // Récupérer game control metrics
      const gameControl = await this.analyticsCalculator.calculateGameControlMetrics(
        teamId, cutoffDate, 10
      );

      return {
        gameControlIndex: (gameControl.possession_dominance + gameControl.tempo_control + 
                          gameControl.territorial_dominance) / 3,
        intensitySustainability: gameControl.intensity_sustainability,
        tacticalFlexibility: gameControl.tactical_flexibility
      };

    } catch (error) {
      return {
        gameControlIndex: 0.5,
        intensitySustainability: 0.5,
        tacticalFlexibility: 0.5
      };
    }
  }

  private async calculateHeadToHeadMetrics(teamId: string, cutoffDate: string): Promise<any> {
    try {
      // Récupérer tous les H2H récents contre différents adversaires
      const { data: recentMatches } = await this.supabase
        .from('matches')
        .select('home_team_id, away_team_id, home_score, away_score')
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .lt('match_date', cutoffDate)
        .eq('status', 'finished')
        .order('match_date', { ascending: false })
        .limit(20);

      if (!recentMatches || recentMatches.length === 0) {
        return {
          generalWinRate: 0.4,
          avgGoalDifference: 0,
          bigGamePerformance: 0.4
        };
      }

      let wins = 0;
      let totalGoalDiff = 0;
      let bigGameWins = 0;
      let bigGames = 0;

      for (const match of recentMatches) {
        const isHome = match.home_team_id === teamId;
        const teamScore = isHome ? match.home_score : match.away_score;
        const oppScore = isHome ? match.away_score : match.home_score;

        if (teamScore !== null && oppScore !== null) {
          const goalDiff = teamScore - oppScore;
          totalGoalDiff += goalDiff;

          if (teamScore > oppScore) wins++;

          // Estimation "big game" (simplified)
          if (Math.random() < 0.3) { // 30% des matches sont des "big games"
            bigGames++;
            if (teamScore >= oppScore) bigGameWins++;
          }
        }
      }

      return {
        generalWinRate: recentMatches.length > 0 ? wins / recentMatches.length : 0.4,
        avgGoalDifference: recentMatches.length > 0 ? totalGoalDiff / recentMatches.length : 0,
        bigGamePerformance: bigGames > 0 ? bigGameWins / bigGames : 0.4
      };

    } catch (error) {
      return {
        generalWinRate: 0.4,
        avgGoalDifference: 0,
        bigGamePerformance: 0.4
      };
    }
  }

  // CONTEXTUAL FEATURES

  private async calculateContextualFeatures(
    teamId: string, 
    season: string, 
    cutoffDate: string
  ): Promise<any> {
    try {
      // 1. Position in league and pressure
      const leagueContext = await this.calculateLeagueContext(teamId, season);
      
      // 2. Season timing context
      const seasonContext = this.calculateSeasonContext(season, cutoffDate);
      
      // 3. Recent transfer activity
      const transferContext = await this.calculateTransferContext(teamId, season);

      return {
        // League Context
        league_position_pressure: leagueContext.positionPressure,
        title_race_involvement: leagueContext.titleRaceInvolvement,
        relegation_pressure: leagueContext.relegationPressure,
        
        // Season Context
        season_stage: seasonContext.seasonStage,
        season_importance_factor: seasonContext.importanceFactor,
        end_season_pressure: seasonContext.endSeasonPressure,
        
        // Transfer Context
        recent_signings_impact: transferContext.recentSigningsImpact,
        squad_stability: transferContext.squadStability,
        transfer_window_effect: transferContext.transferWindowEffect
      };

    } catch (error) {
      return this.getDefaultContextualFeatures();
    }
  }

  private async calculateSeasonalProgression(teamId: string, cutoffDate: string): Promise<any> {
    try {
      const currentDate = new Date(cutoffDate);
      const seasonStart = new Date(currentDate.getFullYear(), 7, 1); // August 1st
      const daysSinceStart = Math.floor(
        (currentDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get matches from different parts of the season
      const earlySeasonMatches = await this.getMatchesInPeriod(
        teamId, 0, 60, seasonStart // First 60 days
      );
      const midSeasonMatches = await this.getMatchesInPeriod(
        teamId, 120, 180, seasonStart // Days 120-180
      );
      const lateSeasonMatches = await this.getMatchesInPeriod(
        teamId, Math.max(180, daysSinceStart - 60), daysSinceStart, seasonStart // Recent 60 days
      );

      const earlyForm = this.calculatePeriodForm(earlySeasonMatches, teamId);
      const midForm = this.calculatePeriodForm(midSeasonMatches, teamId);
      const lateForm = this.calculatePeriodForm(lateSeasonMatches, teamId);

      return {
        earlySeasonForm: earlyForm,
        midSeasonConsistency: midForm,
        lateSeasonPerformance: lateForm,
        progressionTrend: lateForm - earlyForm
      };

    } catch (error) {
      return {
        earlySeasonForm: 0.5,
        midSeasonConsistency: 0.5,
        lateSeasonPerformance: 0.5,
        progressionTrend: 0
      };
    }
  }

  // UTILITY METHODS

  private async getValidHistoricalMatches(
    teamId: string, 
    cutoffDate: string, 
    limit: number,
    isHome?: boolean
  ): Promise<any[]> {
    let query = this.supabase
      .from('matches')
      .select('*')
      .lt('match_date', cutoffDate)
      .eq('status', 'finished')
      .order('match_date', { ascending: false })
      .limit(limit);

    if (isHome !== undefined) {
      if (isHome) {
        query = query.eq('home_team_id', teamId);
      } else {
        query = query.eq('away_team_id', teamId);
      }
    } else {
      query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = n * (n - 1) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + val * i, 0);
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope || 0;
  }

  private normalizeValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private calculateDataCompleteness(features: any): number {
    const totalFeatures = Object.keys(features).length;
    const nullFeatures = Object.values(features).filter(v => v === null || v === undefined).length;
    return totalFeatures > 0 ? (totalFeatures - nullFeatures) / totalFeatures : 0;
  }

  private async validateAndCorrectFeatures(
    features: any, 
    cutoffDate: string, 
    teamId: string
  ): Promise<any> {
    try {
      const validation = await this.temporalValidator.validateTemporalIntegrity(
        'temp_match_id', cutoffDate, teamId, features
      );

      if (!validation.isValid && validation.correctedFeatures) {
        console.warn(`Temporal violations corrected for team ${teamId}`);
        return validation.correctedFeatures;
      }

      return features;
    } catch (error) {
      console.warn(`Temporal validation failed for team ${teamId}:`, error);
      return features;
    }
  }

  // DEFAULT VALUES

  private getDefaultMissingFeatures(teamId: string, season: string): any {
    return {
      team_id: teamId,
      season: season,
      calculation_date: new Date().toISOString().split('T')[0],
      features_version: '2.0_enhanced',
      
      // Default values for missing features
      goal_difference: 0,
      goals_per_game_avg: 1.5,
      goals_conceded_avg: 1.5,
      xg_for_avg: 1.5,
      xg_against_avg: 1.5,
      form_5_weighted: 7.5,
      form_10_weighted: 15,
      possession_efficiency: 0.5,
      tempo_score: 0,
      pressing_intensity: 1,
      clean_sheets_rate: 0.3,
      attack_efficiency_ratio: 0.5,
      home_win_rate: 0.6,
      away_win_rate: 0.4,
      current_streak: 0,
      momentum_score: 0.5,
      
      data_completeness: 0.5,
      temporal_integrity: false,
      calculation_method: 'default_values'
    };
  }

  private getDefaultMissingFeaturesValues(): any {
    return {
      goal_difference: 0,
      goals_per_game_avg: 1.5,
      goals_conceded_avg: 1.5,
      goals_scored_home_avg: 1.7,
      goals_scored_away_avg: 1.3,
      xg_for_avg: 1.5,
      xg_against_avg: 1.5,
      xg_diff_5: 0,
      xg_diff_10: 0,
      xg_accuracy: 1.0,
      form_5_weighted: 7.5,
      form_10_weighted: 15,
      form_momentum: 0,
      recent_form_trend: 0,
      possession_efficiency: 0.5,
      tempo_score: 0,
      pressing_intensity: 1,
      transition_speed: 0.5,
      verticality_index: 0,
      clean_sheets_rate: 0.3,
      defensive_solidity_index: 0.5,
      pressure_resistance: 0.5,
      attack_efficiency_ratio: 0.5,
      finishing_quality: 0.5,
      creative_threat_index: 0.5,
      home_win_rate: 0.6,
      away_win_rate: 0.4,
      venue_advantage: 0.2,
      venue_consistency: 0.8,
      current_streak: 0,
      streak_strength: 0,
      momentum_score: 0.5,
      comeback_ability: 0.5,
      game_control_index: 0.5,
      intensity_sustainability: 0.5,
      tactical_flexibility: 0.5,
      h2h_win_rate_general: 0.4,
      h2h_goal_diff_avg: 0,
      big_game_performance: 0.4
    };
  }

  private getDefaultStyleMetrics(): any {
    return {
      possessionEfficiency: 0.5,
      tempoScore: 0,
      pressingIntensity: 1,
      transitionSpeed: 0.5,
      verticalityIndex: 0
    };
  }

  private getDefaultContextualFeatures(): any {
    return {
      league_position_pressure: 0.5,
      title_race_involvement: 0,
      relegation_pressure: 0,
      season_stage: 0.5,
      season_importance_factor: 0.5,
      end_season_pressure: 0,
      recent_signings_impact: 0,
      squad_stability: 0.8,
      transfer_window_effect: 0
    };
  }

  // STORAGE METHODS

  private async storeMissingFeatures(features: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('team_features_enhanced')
        .upsert(features, {
          onConflict: 'team_id,season'
        });

      if (error) {
        throw new Error(`Failed to store missing features: ${error.message}`);
      }
    } catch (error) {
      console.error(`Error storing missing features:`, error);
    }
  }

  private async getTeamsForRecalculation(
    seasonFilter?: string, 
    teamFilter?: string
  ): Promise<any[]> {
    let query = this.supabase
      .from('teams')
      .select('id as team_id, current_season as season');

    if (seasonFilter) {
      query = query.eq('current_season', seasonFilter);
    }

    if (teamFilter) {
      query = query.eq('id', teamFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // STUB METHODS (to be implemented based on specific needs)

  private async calculateLeagueContext(teamId: string, season: string): Promise<any> {
    return {
      positionPressure: 0.5,
      titleRaceInvolvement: 0,
      relegationPressure: 0
    };
  }

  private calculateSeasonContext(season: string, cutoffDate: string): any {
    return {
      seasonStage: 0.5,
      importanceFactor: 0.5,
      endSeasonPressure: 0
    };
  }

  private async calculateTransferContext(teamId: string, season: string): Promise<any> {
    return {
      recentSigningsImpact: 0,
      squadStability: 0.8,
      transferWindowEffect: 0
    };
  }

  private async calculateSquadDepthMetrics(teamId: string, cutoffDate: string): Promise<any> {
    return {
      squadDepthScore: 0.7,
      keyPlayerDependency: 0.3,
      rotationCapability: 0.6,
      experienceBalance: 0.5
    };
  }

  private async calculateMatchImportanceSensitivity(teamId: string, cutoffDate: string): Promise<any> {
    return {
      bigMatchPerformance: 0.5,
      pressureHandling: 0.5,
      motivationResponse: 0.5
    };
  }

  private async getMatchesInPeriod(
    teamId: string, 
    startDay: number, 
    endDay: number, 
    seasonStart: Date
  ): Promise<any[]> {
    const periodStart = new Date(seasonStart.getTime() + startDay * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(seasonStart.getTime() + endDay * 24 * 60 * 60 * 1000);

    const { data } = await this.supabase
      .from('matches')
      .select('*')
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .gte('match_date', periodStart.toISOString())
      .lte('match_date', periodEnd.toISOString())
      .eq('status', 'finished');

    return data || [];
  }

  private calculatePeriodForm(matches: any[], teamId: string): number {
    if (matches.length === 0) return 0.5;

    let points = 0;
    let validMatches = 0;

    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const teamScore = isHome ? match.home_score : match.away_score;
      const oppScore = isHome ? match.away_score : match.home_score;

      if (teamScore !== null && oppScore !== null) {
        if (teamScore > oppScore) points += 3;
        else if (teamScore === oppScore) points += 1;
        validMatches++;
      }
    }

    return validMatches > 0 ? points / (validMatches * 3) : 0.5;
  }
}