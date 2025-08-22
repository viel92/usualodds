// @ts-nocheck
import { createApiClient } from '@/lib/supabase';

export class AdvancedAnalyticsCalculator {
  private supabase = createApiClient();

  /**
   * Advanced Analytics Calculator
   * Calcule des métriques sophistiquées pour améliorer la prédiction
   * Focus sur Expected Goals (xG), métriques défensives et efficacité offensive
   */

  async calculateExpectedGoalsAdvanced(
    teamId: string, 
    beforeDate: string, 
    matchesCount: number = 10
  ): Promise<any> {
    try {
      console.log(`Calculating advanced xG metrics for team ${teamId}...`);

      // Get match statistics with shots data
      const matchStats = await this.getMatchStatistics(teamId, beforeDate, matchesCount);
      const matches = await this.getTeamMatches(teamId, beforeDate, matchesCount);

      let xgMetrics = {
        xg_for_total: 0,
        xg_against_total: 0,
        xg_for_avg: 1.5,
        xg_against_avg: 1.5,
        xg_accuracy_for: 1.0,
        xg_accuracy_against: 1.0,
        shot_conversion_rate: 0.1,
        big_chances_created: 0,
        big_chances_missed: 0,
        xg_sequence_quality: 0.5,
        xg_per_shot: 0.15,
        defensive_xg_prevention: 0.5
      };

      if (matchStats.length > 0) {
        xgMetrics = this.calculateXgFromStatistics(matchStats, matches, teamId);
      } else {
        // Fallback: estimate from goals and match context
        xgMetrics = this.estimateXgFromGoalsAdvanced(matches, teamId);
      }

      console.log(`Advanced xG metrics calculated for team ${teamId}`);
      return xgMetrics;

    } catch (error) {
      console.error(`Error calculating advanced xG for team ${teamId}:`, error);
      return this.getDefaultXgMetrics();
    }
  }

  async calculateDefensiveSolidityAdvanced(
    teamId: string, 
    beforeDate: string, 
    matchesCount: number = 10
  ): Promise<any> {
    try {
      console.log(`Calculating advanced defensive metrics for team ${teamId}...`);

      const matches = await this.getTeamMatches(teamId, beforeDate, matchesCount);
      const matchStats = await this.getMatchStatistics(teamId, beforeDate, matchesCount);

      // Basic defensive metrics
      const basicDefense = this.calculateBasicDefensiveMetrics(matches, teamId);
      
      // Advanced defensive metrics
      const advancedDefense = matchStats.length > 0 
        ? this.calculateAdvancedDefensiveMetrics(matchStats, teamId)
        : this.estimateAdvancedDefensiveMetrics(matches, teamId);

      const consolidatedMetrics = {
        ...basicDefense,
        ...advancedDefense,
        
        // Composite defensive solidity index
        defensive_solidity_index: this.calculateDefensiveSolidityIndex(basicDefense, advancedDefense),
        
        // Pressure resistance
        pressure_resistance: this.calculatePressureResistance(matches, teamId),
        
        // Set piece defensive strength
        set_piece_defense: this.calculateSetPieceDefense(matches, teamId)
      };

      console.log(`Advanced defensive metrics calculated for team ${teamId}`);
      return consolidatedMetrics;

    } catch (error) {
      console.error(`Error calculating defensive metrics for team ${teamId}:`, error);
      return this.getDefaultDefensiveMetrics();
    }
  }

  async calculateAttackEfficiencyAdvanced(
    teamId: string, 
    beforeDate: string, 
    matchesCount: number = 10
  ): Promise<any> {
    try {
      console.log(`Calculating advanced attack metrics for team ${teamId}...`);

      const matches = await this.getTeamMatches(teamId, beforeDate, matchesCount);
      const matchStats = await this.getMatchStatistics(teamId, beforeDate, matchesCount);

      // Basic attack metrics
      const basicAttack = this.calculateBasicAttackMetrics(matches, teamId);
      
      // Advanced attack metrics
      const advancedAttack = matchStats.length > 0 
        ? this.calculateAdvancedAttackMetrics(matchStats, teamId)
        : this.estimateAdvancedAttackMetrics(matches, teamId);

      const consolidatedMetrics = {
        ...basicAttack,
        ...advancedAttack,
        
        // Composite attack efficiency index
        attack_efficiency_index: this.calculateAttackEfficiencyIndex(basicAttack, advancedAttack),
        
        // Finishing quality
        finishing_quality: this.calculateFinishingQuality(matches, matchStats, teamId),
        
        // Creative threat
        creative_threat_index: this.calculateCreativeThreatIndex(matches, matchStats, teamId)
      };

      console.log(`Advanced attack metrics calculated for team ${teamId}`);
      return consolidatedMetrics;

    } catch (error) {
      console.error(`Error calculating attack metrics for team ${teamId}:`, error);
      return this.getDefaultAttackMetrics();
    }
  }

  async calculateGameControlMetrics(
    teamId: string, 
    beforeDate: string, 
    matchesCount: number = 10
  ): Promise<any> {
    try {
      console.log(`Calculating game control metrics for team ${teamId}...`);

      const matches = await this.getTeamMatches(teamId, beforeDate, matchesCount);
      const matchStats = await this.getMatchStatistics(teamId, beforeDate, matchesCount);

      const gameControlMetrics = {
        possession_dominance: await this.calculatePossessionDominance(teamId, beforeDate),
        tempo_control: this.calculateTempoControl(matches, matchStats, teamId),
        territorial_dominance: this.calculateTerritorialDominance(matchStats, teamId),
        game_state_management: this.calculateGameStateManagement(matches, teamId),
        intensity_sustainability: this.calculateIntensitySustainability(matches, teamId),
        tactical_flexibility: this.calculateTacticalFlexibility(matches, teamId)
      };

      console.log(`Game control metrics calculated for team ${teamId}`);
      return gameControlMetrics;

    } catch (error) {
      console.error(`Error calculating game control metrics for team ${teamId}:`, error);
      return this.getDefaultGameControlMetrics();
    }
  }

  async calculateContextualPerformance(
    teamId: string, 
    beforeDate: string,
    opponentId?: string,
    matchesCount: number = 15
  ): Promise<any> {
    try {
      console.log(`Calculating contextual performance for team ${teamId}...`);

      const matches = await this.getTeamMatches(teamId, beforeDate, matchesCount);
      
      const contextualMetrics = {
        // Performance vs similar opponents
        vs_top6_performance: this.calculateVsTopTeamsPerformance(matches, teamId),
        vs_bottom6_performance: this.calculateVsBottomTeamsPerformance(matches, teamId),
        
        // Situational performance
        when_leading_performance: this.calculateWhenLeadingPerformance(matches, teamId),
        when_trailing_performance: this.calculateWhenTrailingPerformance(matches, teamId),
        
        // Time-based performance
        first_half_strength: this.calculateFirstHalfStrength(matches, teamId),
        second_half_strength: this.calculateSecondHalfStrength(matches, teamId),
        
        // Pressure situations
        big_game_performance: this.calculateBigGamePerformance(matches, teamId),
        clutch_performance: this.calculateClutchPerformance(matches, teamId)
      };

      // Add opponent-specific metrics if opponent provided
      if (opponentId) {
        const h2hMetrics = await this.calculateHeadToHeadContext(teamId, opponentId, beforeDate);
        Object.assign(contextualMetrics, h2hMetrics);
      }

      console.log(`Contextual performance calculated for team ${teamId}`);
      return contextualMetrics;

    } catch (error) {
      console.error(`Error calculating contextual performance for team ${teamId}:`, error);
      return this.getDefaultContextualMetrics();
    }
  }

  // CORE CALCULATION METHODS

  private calculateXgFromStatistics(matchStats: any[], matches: any[], teamId: string): any {
    let totalXgFor = 0;
    let totalXgAgainst = 0;
    let totalGoalsFor = 0;
    let totalGoalsAgainst = 0;
    let totalShotsFor = 0;
    let bigChancesCreated = 0;
    let bigChancesMissed = 0;
    let validMatches = 0;

    for (let i = 0; i < Math.min(matchStats.length, matches.length); i++) {
      const stats = matchStats[i];
      const match = matches[i];

      try {
        const parsedStats = typeof stats.statistics === 'string' 
          ? JSON.parse(stats.statistics) 
          : stats.statistics;

        const isHome = match.home_team_id === teamId;
        const goalsFor = isHome ? match.home_score : match.away_score;
        const goalsAgainst = isHome ? match.away_score : match.home_score;

        if (parsedStats && goalsFor !== null && goalsAgainst !== null) {
          // Extract xG data (if available) or estimate
          const shotsFor = parseInt(parsedStats.shots_total) || 10;
          const shotsOnTarget = parseInt(parsedStats.shots_on_target) || Math.floor(shotsFor * 0.4);
          
          // Estimate xG based on shots and quality
          const estimatedXgFor = this.calculateXgFromShots(shotsFor, shotsOnTarget, goalsFor);
          const estimatedXgAgainst = this.calculateXgFromShots(
            parsedStats.shots_against || 10, 
            parsedStats.shots_on_target_against || 4, 
            goalsAgainst
          );

          totalXgFor += estimatedXgFor;
          totalXgAgainst += estimatedXgAgainst;
          totalGoalsFor += goalsFor;
          totalGoalsAgainst += goalsAgainst;
          totalShotsFor += shotsFor;

          // Big chances estimation
          bigChancesCreated += Math.floor(shotsOnTarget * 0.3);
          bigChancesMissed += Math.max(0, Math.floor(estimatedXgFor) - goalsFor);

          validMatches++;
        }
      } catch (error) {
        console.log('Error parsing match statistics:', error);
      }
    }

    if (validMatches === 0) {
      return this.getDefaultXgMetrics();
    }

    return {
      xg_for_total: totalXgFor,
      xg_against_total: totalXgAgainst,
      xg_for_avg: totalXgFor / validMatches,
      xg_against_avg: totalXgAgainst / validMatches,
      xg_accuracy_for: totalXgFor > 0 ? totalGoalsFor / totalXgFor : 1.0,
      xg_accuracy_against: totalXgAgainst > 0 ? totalGoalsAgainst / totalXgAgainst : 1.0,
      shot_conversion_rate: totalShotsFor > 0 ? totalGoalsFor / totalShotsFor : 0.1,
      big_chances_created: bigChancesCreated / validMatches,
      big_chances_missed: bigChancesMissed / validMatches,
      xg_sequence_quality: this.calculateXgSequenceQuality(totalXgFor, totalShotsFor),
      xg_per_shot: totalShotsFor > 0 ? totalXgFor / totalShotsFor : 0.15,
      defensive_xg_prevention: this.calculateDefensiveXgPrevention(totalXgAgainst, validMatches)
    };
  }

  private estimateXgFromGoalsAdvanced(matches: any[], teamId: string): any {
    let totalGoalsFor = 0;
    let totalGoalsAgainst = 0;
    let validMatches = 0;

    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const goalsFor = isHome ? match.home_score : match.away_score;
      const goalsAgainst = isHome ? match.away_score : match.home_score;

      if (goalsFor !== null && goalsAgainst !== null) {
        totalGoalsFor += goalsFor;
        totalGoalsAgainst += goalsAgainst;
        validMatches++;
      }
    }

    if (validMatches === 0) {
      return this.getDefaultXgMetrics();
    }

    // Enhanced estimation with variance
    const avgGoalsFor = totalGoalsFor / validMatches;
    const avgGoalsAgainst = totalGoalsAgainst / validMatches;
    
    // xG usually slightly higher than actual goals
    const xgMultiplier = 1.15 + (Math.random() * 0.1); // 1.15-1.25
    const estimatedXgFor = avgGoalsFor * xgMultiplier;
    const estimatedXgAgainst = avgGoalsAgainst * xgMultiplier;

    return {
      xg_for_total: estimatedXgFor * validMatches,
      xg_against_total: estimatedXgAgainst * validMatches,
      xg_for_avg: estimatedXgFor,
      xg_against_avg: estimatedXgAgainst,
      xg_accuracy_for: avgGoalsFor / estimatedXgFor,
      xg_accuracy_against: avgGoalsAgainst / estimatedXgAgainst,
      shot_conversion_rate: 0.08 + (Math.random() * 0.04), // 8-12%
      big_chances_created: estimatedXgFor * 0.6,
      big_chances_missed: Math.max(0, estimatedXgFor - avgGoalsFor),
      xg_sequence_quality: 0.4 + (Math.random() * 0.3),
      xg_per_shot: 0.12 + (Math.random() * 0.06),
      defensive_xg_prevention: this.calculateDefensiveXgPrevention(estimatedXgAgainst * validMatches, validMatches)
    };
  }

  private calculateXgFromShots(shotsTotal: number, shotsOnTarget: number, actualGoals: number): number {
    // Basic xG model based on shots
    const shotQuality = shotsOnTarget / Math.max(shotsTotal, 1);
    const baseXg = shotsTotal * 0.1; // 10% base chance per shot
    const qualityBonus = shotsOnTarget * 0.15; // 15% for on target
    
    // Adjust based on actual goals (some context)
    const contextAdjustment = actualGoals > 0 ? Math.min(actualGoals * 0.2, 0.5) : 0;
    
    return baseXg + qualityBonus + contextAdjustment;
  }

  private calculateXgSequenceQuality(totalXg: number, totalShots: number): number {
    if (totalShots === 0) return 0.5;
    
    const xgPerShot = totalXg / totalShots;
    
    // Quality ranges: 0.05-0.10 (poor), 0.10-0.15 (average), 0.15+ (good)
    if (xgPerShot < 0.10) return 0.3;
    else if (xgPerShot < 0.15) return 0.5;
    else return 0.7;
  }

  private calculateDefensiveXgPrevention(totalXgAgainst: number, validMatches: number): number {
    const avgXgAgainst = totalXgAgainst / validMatches;
    
    // Good defensive teams limit opponents to < 1.2 xG per game
    if (avgXgAgainst < 1.0) return 0.8;
    else if (avgXgAgainst < 1.3) return 0.6;
    else if (avgXgAgainst < 1.6) return 0.4;
    else return 0.2;
  }

  private calculateBasicDefensiveMetrics(matches: any[], teamId: string): any {
    let cleanSheets = 0;
    let totalGoalsConceded = 0;
    let validMatches = 0;
    let conceded2Plus = 0;

    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const goalsConceded = isHome ? match.away_score : match.home_score;

      if (goalsConceded !== null) {
        if (goalsConceded === 0) cleanSheets++;
        if (goalsConceded >= 2) conceded2Plus++;
        totalGoalsConceded += goalsConceded;
        validMatches++;
      }
    }

    return {
      clean_sheets_rate: validMatches > 0 ? cleanSheets / validMatches : 0.3,
      avg_goals_conceded: validMatches > 0 ? totalGoalsConceded / validMatches : 1.5,
      defensive_consistency: validMatches > 0 ? 1 - (conceded2Plus / validMatches) : 0.6,
      defensive_stability: cleanSheets > 0 ? cleanSheets / Math.max(conceded2Plus, 1) : 0.5
    };
  }

  private calculateAdvancedDefensiveMetrics(matchStats: any[], teamId: string): any {
    let totalInterceptions = 0;
    let totalClearances = 0;
    let totalBlocks = 0;
    let validStats = 0;

    for (const stats of matchStats) {
      try {
        const parsedStats = typeof stats.statistics === 'string' 
          ? JSON.parse(stats.statistics) 
          : stats.statistics;

        if (parsedStats) {
          totalInterceptions += parseInt(parsedStats.interceptions) || 8;
          totalClearances += parseInt(parsedStats.clearances) || 15;
          totalBlocks += parseInt(parsedStats.blocked_shots) || 3;
          validStats++;
        }
      } catch (error) {
        // Use estimates for invalid stats
        totalInterceptions += 8;
        totalClearances += 15;
        totalBlocks += 3;
        validStats++;
      }
    }

    if (validStats === 0) {
      return this.getDefaultAdvancedDefensiveMetrics();
    }

    return {
      interceptions_per_game: totalInterceptions / validStats,
      clearances_per_game: totalClearances / validStats,
      blocks_per_game: totalBlocks / validStats,
      defensive_actions_total: (totalInterceptions + totalClearances + totalBlocks) / validStats,
      defensive_intensity: this.calculateDefensiveIntensity(totalInterceptions, totalClearances, validStats)
    };
  }

  private estimateAdvancedDefensiveMetrics(matches: any[], teamId: string): any {
    // Estimate based on goals conceded pattern
    const basicMetrics = this.calculateBasicDefensiveMetrics(matches, teamId);
    const avgConceded = basicMetrics.avg_goals_conceded;
    
    // Better defensive teams have more actions
    const defensiveMultiplier = avgConceded < 1.0 ? 1.3 : avgConceded < 1.5 ? 1.0 : 0.7;
    
    return {
      interceptions_per_game: (6 + Math.random() * 4) * defensiveMultiplier,
      clearances_per_game: (12 + Math.random() * 6) * defensiveMultiplier,
      blocks_per_game: (2 + Math.random() * 2) * defensiveMultiplier,
      defensive_actions_total: (20 + Math.random() * 10) * defensiveMultiplier,
      defensive_intensity: basicMetrics.clean_sheets_rate * 0.6 + (2 - Math.min(avgConceded, 2)) / 2 * 0.4
    };
  }

  private calculateDefensiveSolidityIndex(basicDefense: any, advancedDefense: any): number {
    const cleanSheetWeight = basicDefense.clean_sheets_rate * 0.3;
    const consistencyWeight = basicDefense.defensive_consistency * 0.3;
    const actionsWeight = Math.min(advancedDefense.defensive_actions_total / 25, 1) * 0.2;
    const intensityWeight = advancedDefense.defensive_intensity * 0.2;
    
    return cleanSheetWeight + consistencyWeight + actionsWeight + intensityWeight;
  }

  private calculateDefensiveIntensity(interceptions: number, clearances: number, validStats: number): number {
    const avgActions = (interceptions + clearances) / validStats;
    
    // High intensity: >20 actions per game
    if (avgActions > 20) return 0.8;
    else if (avgActions > 15) return 0.6;
    else if (avgActions > 10) return 0.4;
    else return 0.2;
  }

  private calculatePressureResistance(matches: any[], teamId: string): number {
    // Estimate based on performance in close games
    let closeGames = 0;
    let goodPerformanceInCloseGames = 0;
    
    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const teamScore = isHome ? match.home_score : match.away_score;
      const oppScore = isHome ? match.away_score : match.home_score;
      
      if (teamScore !== null && oppScore !== null) {
        const goalDiff = Math.abs(teamScore - oppScore);
        
        if (goalDiff <= 1) { // Close game
          closeGames++;
          if (teamScore >= oppScore) { // Didn't lose
            goodPerformanceInCloseGames++;
          }
        }
      }
    }
    
    return closeGames > 0 ? goodPerformanceInCloseGames / closeGames : 0.5;
  }

  private calculateSetPieceDefense(matches: any[], teamId: string): number {
    // Simplified estimation - would use real set piece data
    const basicDefense = this.calculateBasicDefensiveMetrics(matches, teamId);
    
    // Teams with good overall defense usually good at set pieces too
    return basicDefense.clean_sheets_rate * 0.7 + Math.random() * 0.3;
  }

  // ATTACK METRICS

  private calculateBasicAttackMetrics(matches: any[], teamId: string): any {
    let totalGoalsFor = 0;
    let validMatches = 0;
    let gamesWithMultipleGoals = 0;
    let gamesWithoutGoals = 0;

    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const goalsFor = isHome ? match.home_score : match.away_score;

      if (goalsFor !== null) {
        totalGoalsFor += goalsFor;
        validMatches++;
        
        if (goalsFor >= 2) gamesWithMultipleGoals++;
        if (goalsFor === 0) gamesWithoutGoals++;
      }
    }

    return {
      avg_goals_for: validMatches > 0 ? totalGoalsFor / validMatches : 1.5,
      scoring_consistency: validMatches > 0 ? 1 - (gamesWithoutGoals / validMatches) : 0.6,
      multi_goal_rate: validMatches > 0 ? gamesWithMultipleGoals / validMatches : 0.4,
      offensive_reliability: validMatches > 0 ? (validMatches - gamesWithoutGoals) / validMatches : 0.6
    };
  }

  private calculateAdvancedAttackMetrics(matchStats: any[], teamId: string): any {
    let totalShots = 0;
    let totalShotsOnTarget = 0;
    let totalPasses = 0;
    let totalCrosses = 0;
    let validStats = 0;

    for (const stats of matchStats) {
      try {
        const parsedStats = typeof stats.statistics === 'string' 
          ? JSON.parse(stats.statistics) 
          : stats.statistics;

        if (parsedStats) {
          totalShots += parseInt(parsedStats.shots_total) || 12;
          totalShotsOnTarget += parseInt(parsedStats.shots_on_target) || 5;
          totalPasses += parseInt(parsedStats.passes) || 400;
          totalCrosses += parseInt(parsedStats.crosses) || 20;
          validStats++;
        }
      } catch (error) {
        // Use estimates
        totalShots += 12;
        totalShotsOnTarget += 5;
        totalPasses += 400;
        totalCrosses += 20;
        validStats++;
      }
    }

    if (validStats === 0) {
      return this.getDefaultAdvancedAttackMetrics();
    }

    return {
      shots_per_game: totalShots / validStats,
      shots_on_target_per_game: totalShotsOnTarget / validStats,
      shot_accuracy: totalShots > 0 ? totalShotsOnTarget / totalShots : 0.4,
      passes_per_game: totalPasses / validStats,
      crosses_per_game: totalCrosses / validStats,
      attacking_tempo: this.calculateAttackingTempo(totalPasses, totalShots, validStats)
    };
  }

  private estimateAdvancedAttackMetrics(matches: any[], teamId: string): any {
    const basicMetrics = this.calculateBasicAttackMetrics(matches, teamId);
    const avgGoals = basicMetrics.avg_goals_for;
    
    // Better attacking teams generally have more shots
    const attackMultiplier = avgGoals > 2.0 ? 1.3 : avgGoals > 1.5 ? 1.0 : 0.7;
    
    return {
      shots_per_game: (10 + Math.random() * 6) * attackMultiplier,
      shots_on_target_per_game: (4 + Math.random() * 3) * attackMultiplier,
      shot_accuracy: 0.35 + Math.random() * 0.2, // 35-55%
      passes_per_game: (350 + Math.random() * 200) * attackMultiplier,
      crosses_per_game: (15 + Math.random() * 10) * attackMultiplier,
      attacking_tempo: basicMetrics.scoring_consistency * 0.6 + Math.random() * 0.4
    };
  }

  private calculateAttackEfficiencyIndex(basicAttack: any, advancedAttack: any): number {
    const goalsWeight = Math.min(basicAttack.avg_goals_for / 2, 1) * 0.3;
    const consistencyWeight = basicAttack.scoring_consistency * 0.3;
    const accuracyWeight = advancedAttack.shot_accuracy * 0.2;
    const tempoWeight = advancedAttack.attacking_tempo * 0.2;
    
    return goalsWeight + consistencyWeight + accuracyWeight + tempoWeight;
  }

  private calculateAttackingTempo(totalPasses: number, totalShots: number, validStats: number): number {
    const passesPerShot = totalShots > 0 ? totalPasses / totalShots : 30;
    
    // Lower passes per shot = higher tempo (more direct)
    if (passesPerShot < 25) return 0.8; // High tempo
    else if (passesPerShot < 35) return 0.6; // Medium tempo
    else if (passesPerShot < 45) return 0.4; // Lower tempo
    else return 0.2; // Very patient
  }

  private calculateFinishingQuality(matches: any[], matchStats: any[], teamId: string): number {
    const basicAttack = this.calculateBasicAttackMetrics(matches, teamId);
    
    if (matchStats.length > 0) {
      const advancedAttack = this.calculateAdvancedAttackMetrics(matchStats, teamId);
      const conversionRate = advancedAttack.shots_per_game > 0 ? 
        basicAttack.avg_goals_for / advancedAttack.shots_per_game : 0.1;
      
      return Math.min(conversionRate * 10, 1); // Scale to 0-1
    }
    
    // Estimate from scoring consistency
    return basicAttack.scoring_consistency * 0.7 + Math.random() * 0.3;
  }

  private calculateCreativeThreatIndex(matches: any[], matchStats: any[], teamId: string): number {
    const basicAttack = this.calculateBasicAttackMetrics(matches, teamId);
    
    if (matchStats.length > 0) {
      const advancedAttack = this.calculateAdvancedAttackMetrics(matchStats, teamId);
      
      // Combine shots, passes, and crosses for creativity
      const shotsWeight = Math.min(advancedAttack.shots_per_game / 15, 1) * 0.4;
      const passesWeight = Math.min(advancedAttack.passes_per_game / 500, 1) * 0.3;
      const crossesWeight = Math.min(advancedAttack.crosses_per_game / 25, 1) * 0.3;
      
      return shotsWeight + passesWeight + crossesWeight;
    }
    
    // Estimate from multi-goal rate
    return basicAttack.multi_goal_rate * 0.8 + Math.random() * 0.2;
  }

  // GAME CONTROL METRICS

  private async calculatePossessionDominance(teamId: string, beforeDate: string): Promise<number> {
    try {
      const { data: teamFeatures } = await this.supabase
        .from('team_features')
        .select('possession_avg')
        .eq('team_id', teamId)
        .single();

      const possession = teamFeatures?.possession_avg || 50;
      
      // Normalize possession to dominance scale (0-1)
      if (possession > 60) return 0.8;
      else if (possession > 55) return 0.6;
      else if (possession > 45) return 0.4;
      else return 0.2;
      
    } catch (error) {
      return 0.5; // Default neutral dominance
    }
  }

  private calculateTempoControl(matches: any[], matchStats: any[], teamId: string): number {
    if (matchStats.length === 0) {
      // Estimate from goal scoring patterns
      const basicAttack = this.calculateBasicAttackMetrics(matches, teamId);
      return basicAttack.scoring_consistency * 0.6 + Math.random() * 0.4;
    }
    
    const advancedAttack = this.calculateAdvancedAttackMetrics(matchStats, teamId);
    return advancedAttack.attacking_tempo;
  }

  private calculateTerritorialDominance(matchStats: any[], teamId: string): number {
    if (matchStats.length === 0) {
      return 0.4 + Math.random() * 0.2; // 40-60% estimate
    }
    
    // Would calculate from actual territorial stats
    return 0.3 + Math.random() * 0.4; // 30-70% range
  }

  private calculateGameStateManagement(matches: any[], teamId: string): number {
    let totalMatches = 0;
    let goodManagement = 0;
    
    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const teamScore = isHome ? match.home_score : match.away_score;
      const oppScore = isHome ? match.away_score : match.home_score;
      
      if (teamScore !== null && oppScore !== null) {
        totalMatches++;
        
        // Good management: winning when ahead, not losing badly
        if (teamScore >= oppScore || (teamScore < oppScore && oppScore - teamScore <= 1)) {
          goodManagement++;
        }
      }
    }
    
    return totalMatches > 0 ? goodManagement / totalMatches : 0.5;
  }

  private calculateIntensitySustainability(matches: any[], teamId: string): number {
    // Estimate from consistency across matches
    const basicDefense = this.calculateBasicDefensiveMetrics(matches, teamId);
    const basicAttack = this.calculateBasicAttackMetrics(matches, teamId);
    
    return (basicDefense.defensive_consistency + basicAttack.scoring_consistency) / 2;
  }

  private calculateTacticalFlexibility(matches: any[], teamId: string): number {
    // Estimate from performance variety
    let scorelines: { [key: string]: number } = {};
    
    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const teamScore = isHome ? match.home_score : match.away_score;
      const oppScore = isHome ? match.away_score : match.home_score;
      
      if (teamScore !== null && oppScore !== null) {
        const result = teamScore > oppScore ? 'W' : teamScore === oppScore ? 'D' : 'L';
        const scoreline = `${Math.min(teamScore, 3)}-${Math.min(oppScore, 3)}`;
        const key = `${result}_${scoreline}`;
        
        scorelines[key] = (scorelines[key] || 0) + 1;
      }
    }
    
    // More variety in results = more tactical flexibility
    const varietyScore = Object.keys(scorelines).length;
    return Math.min(varietyScore / 8, 1); // Max score for 8+ different result types
  }

  // CONTEXTUAL PERFORMANCE

  private calculateVsTopTeamsPerformance(matches: any[], teamId: string): number {
    // Simplified - would use actual league standings
    return 0.3 + Math.random() * 0.4; // 30-70% range
  }

  private calculateVsBottomTeamsPerformance(matches: any[], teamId: string): number {
    // Simplified - would use actual league standings
    return 0.5 + Math.random() * 0.4; // 50-90% range
  }

  private calculateWhenLeadingPerformance(matches: any[], teamId: string): number {
    let gamesWhenScored = 0;
    let pointsWhenScored = 0;
    
    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const teamScore = isHome ? match.home_score : match.away_score;
      const oppScore = isHome ? match.away_score : match.home_score;
      
      if (teamScore !== null && oppScore !== null && teamScore > 0) {
        gamesWhenScored++;
        
        if (teamScore > oppScore) pointsWhenScored += 3;
        else if (teamScore === oppScore) pointsWhenScored += 1;
      }
    }
    
    return gamesWhenScored > 0 ? pointsWhenScored / (gamesWhenScored * 3) : 0.6;
  }

  private calculateWhenTrailingPerformance(matches: any[], teamId: string): number {
    let gamesWhenConceded = 0;
    let pointsWhenConceded = 0;
    
    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const teamScore = isHome ? match.home_score : match.away_score;
      const oppScore = isHome ? match.away_score : match.home_score;
      
      if (teamScore !== null && oppScore !== null && oppScore > 0) {
        gamesWhenConceded++;
        
        if (teamScore > oppScore) pointsWhenConceded += 3;
        else if (teamScore === oppScore) pointsWhenConceded += 1;
      }
    }
    
    return gamesWhenConceded > 0 ? pointsWhenConceded / (gamesWhenConceded * 3) : 0.3;
  }

  private calculateFirstHalfStrength(matches: any[], teamId: string): number {
    // Would use actual first half data - estimating for now
    const basicAttack = this.calculateBasicAttackMetrics(matches, teamId);
    return basicAttack.avg_goals_for / 3 + Math.random() * 0.3; // Estimate first half goals
  }

  private calculateSecondHalfStrength(matches: any[], teamId: string): number {
    // Would use actual second half data - estimating for now
    const basicAttack = this.calculateBasicAttackMetrics(matches, teamId);
    return basicAttack.avg_goals_for * 0.6 + Math.random() * 0.3; // Estimate second half goals
  }

  private calculateBigGamePerformance(matches: any[], teamId: string): number {
    // Simplified - would identify big games by opponent quality
    return 0.4 + Math.random() * 0.3; // 40-70% range
  }

  private calculateClutchPerformance(matches: any[], teamId: string): number {
    // Estimate from late game performance (would use actual timing data)
    const gameStateManagement = this.calculateGameStateManagement(matches, teamId);
    return gameStateManagement * 0.8 + Math.random() * 0.2;
  }

  private async calculateHeadToHeadContext(teamId: string, opponentId: string, beforeDate: string): Promise<any> {
    try {
      const { data: h2hMatches } = await this.supabase
        .from('matches')
        .select('*')
        .lt('match_date', beforeDate)
        .eq('status', 'finished')
        .or(`and(home_team_id.eq.${teamId},away_team_id.eq.${opponentId}),and(home_team_id.eq.${opponentId},away_team_id.eq.${teamId})`)
        .order('match_date', { ascending: false })
        .limit(10);

      if (!h2hMatches || h2hMatches.length === 0) {
        return {
          h2h_familiarity: 0.0,
          h2h_psychological_edge: 0.5,
          h2h_tactical_adaptation: 0.5
        };
      }

      let teamWins = 0;
      let totalGoalDiff = 0;
      
      for (const match of h2hMatches) {
        const isHome = match.home_team_id === teamId;
        const teamScore = isHome ? match.home_score : match.away_score;
        const oppScore = isHome ? match.away_score : match.home_score;
        
        if (teamScore !== null && oppScore !== null) {
          if (teamScore > oppScore) teamWins++;
          totalGoalDiff += (teamScore - oppScore);
        }
      }

      const winRate = teamWins / h2hMatches.length;
      const avgGoalDiff = totalGoalDiff / h2hMatches.length;

      return {
        h2h_familiarity: Math.min(h2hMatches.length / 10, 1.0),
        h2h_psychological_edge: winRate,
        h2h_tactical_adaptation: 0.5 + (avgGoalDiff / 4) // Normalized goal difference
      };

    } catch (error) {
      return {
        h2h_familiarity: 0.0,
        h2h_psychological_edge: 0.5,
        h2h_tactical_adaptation: 0.5
      };
    }
  }

  // UTILITY METHODS

  private async getTeamMatches(teamId: string, beforeDate: string, limit: number) {
    const { data, error } = await this.supabase
      .from('matches')
      .select('*')
      .lt('match_date', beforeDate)
      .eq('status', 'finished')
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .order('match_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  private async getMatchStatistics(teamId: string, beforeDate: string, limit: number) {
    const { data, error } = await this.supabase
      .from('match_statistics')
      .select('statistics, match_date')
      .eq('team_id', teamId)
      .lt('match_date', beforeDate)
      .order('match_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.log('Match statistics not available for team:', teamId);
      return [];
    }
    return data || [];
  }

  // DEFAULT VALUES

  private getDefaultXgMetrics() {
    return {
      xg_for_total: 15,
      xg_against_total: 15,
      xg_for_avg: 1.5,
      xg_against_avg: 1.5,
      xg_accuracy_for: 1.0,
      xg_accuracy_against: 1.0,
      shot_conversion_rate: 0.1,
      big_chances_created: 2,
      big_chances_missed: 1,
      xg_sequence_quality: 0.5,
      xg_per_shot: 0.15,
      defensive_xg_prevention: 0.5
    };
  }

  private getDefaultDefensiveMetrics() {
    return {
      clean_sheets_rate: 0.3,
      avg_goals_conceded: 1.5,
      defensive_consistency: 0.6,
      defensive_stability: 0.5,
      interceptions_per_game: 8,
      clearances_per_game: 15,
      blocks_per_game: 3,
      defensive_actions_total: 26,
      defensive_intensity: 0.5,
      defensive_solidity_index: 0.5,
      pressure_resistance: 0.5,
      set_piece_defense: 0.5
    };
  }

  private getDefaultAdvancedDefensiveMetrics() {
    return {
      interceptions_per_game: 8,
      clearances_per_game: 15,
      blocks_per_game: 3,
      defensive_actions_total: 26,
      defensive_intensity: 0.5
    };
  }

  private getDefaultAttackMetrics() {
    return {
      avg_goals_for: 1.5,
      scoring_consistency: 0.6,
      multi_goal_rate: 0.4,
      offensive_reliability: 0.6,
      shots_per_game: 12,
      shots_on_target_per_game: 5,
      shot_accuracy: 0.4,
      passes_per_game: 400,
      crosses_per_game: 20,
      attacking_tempo: 0.5,
      attack_efficiency_index: 0.5,
      finishing_quality: 0.5,
      creative_threat_index: 0.5
    };
  }

  private getDefaultAdvancedAttackMetrics() {
    return {
      shots_per_game: 12,
      shots_on_target_per_game: 5,
      shot_accuracy: 0.4,
      passes_per_game: 400,
      crosses_per_game: 20,
      attacking_tempo: 0.5
    };
  }

  private getDefaultGameControlMetrics() {
    return {
      possession_dominance: 0.5,
      tempo_control: 0.5,
      territorial_dominance: 0.5,
      game_state_management: 0.5,
      intensity_sustainability: 0.5,
      tactical_flexibility: 0.5
    };
  }

  private getDefaultContextualMetrics() {
    return {
      vs_top6_performance: 0.4,
      vs_bottom6_performance: 0.6,
      when_leading_performance: 0.7,
      when_trailing_performance: 0.3,
      first_half_strength: 0.5,
      second_half_strength: 0.5,
      big_game_performance: 0.5,
      clutch_performance: 0.5
    };
  }
}