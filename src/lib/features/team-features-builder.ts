import { BaseFeatureBuilder } from './base-feature-builder';
import { WindowType } from '@/types/database';

export class TeamFeaturesBuilder extends BaseFeatureBuilder {
  async buildFeatures(matchId: string, window: WindowType): Promise<void> {
    console.log(`Building team features for match ${matchId} at window ${window}...`);

    try {
      const match = await this.getMatchData(matchId);
      
      // Build features for both teams
      await this.buildTeamFeatures(match, match.home_team_id, true, window);
      await this.buildTeamFeatures(match, match.away_team_id, false, window);

      console.log(`Team features built successfully for match ${matchId}`);
    } catch (error) {
      console.error(`Error building team features for match ${matchId}:`, error);
      throw error;
    }
  }

  private async buildTeamFeatures(
    match: any,
    teamId: string,
    isHome: boolean,
    window: WindowType
  ): Promise<void> {
    try {
      // Get historical matches for form calculation
      const recentMatches = await this.getHistoricalMatches(teamId, match.match_date, 10);
      const homeMatches = await this.getHistoricalMatches(teamId, match.match_date, 10, true);
      const awayMatches = await this.getHistoricalMatches(teamId, match.match_date, 10, false);

      // Calculate basic form metrics
      const form5 = this.calculateForm(recentMatches.slice(0, 5), teamId);
      const form10 = this.calculateForm(recentMatches, teamId);
      const homeForm = this.calculateForm(homeMatches.slice(0, 5), teamId);
      const awayForm = this.calculateForm(awayMatches.slice(0, 5), teamId);

      // Calculate Elo rating (simplified version)
      const baseElo = 1500;
      let currentElo = await this.calculateTeamElo(teamId, match.match_date);

      // Calculate Dixon-Coles parameters (simplified)
      const { attack, defense } = this.calculateDixonColesParams(recentMatches, teamId);

      // Calculate tactical style features (placeholders for now)
      const tacticalFeatures = await this.calculateTacticalFeatures(teamId, match.match_date);

      // Calculate set pieces statistics
      const setPiecesStats = await this.calculateSetPiecesStats(teamId, match.match_date);

      // Calculate calendar/fatigue features
      const fatigueFeatures = await this.calculateFatigueFeatures(teamId, match.match_date);

      // Calculate volatility features
      const volatilityFeatures = this.calculateVolatilityFeatures(recentMatches, teamId);

      // Store features in database
      const features = {
        match_id: match.id,
        team_id: teamId,
        window,
        is_home: isHome,
        
        // Force intrinsic features
        elo_rating: currentElo,
        dixon_coles_attack: attack,
        dixon_coles_defense: defense,
        form_5_points: form5.points,
        form_10_points: form10.points,
        xg_diff_5: form5.xgFor - form5.xgAgainst,
        xg_diff_10: form10.xgFor - form10.xgAgainst,
        
        // Tactical style features
        ...tacticalFeatures,
        
        // Set pieces
        ...setPiecesStats,
        
        // Calendar/fatigue
        ...fatigueFeatures,
        
        // Volatility
        ...volatilityFeatures
      };

      // Insert or update features
      const { error } = await this.supabase
        .from('features_match_team')
        .upsert(features, {
          onConflict: 'match_id,team_id,window'
        });

      if (error) {
        throw new Error(`Failed to store team features: ${error.message}`);
      }
    } catch (error) {
      console.error(`Error building features for team ${teamId}:`, error);
      throw error;
    }
  }

  private async calculateTeamElo(teamId: string, beforeDate: string): Promise<number> {
    // Get recent matches to calculate current Elo
    const matches = await this.getHistoricalMatches(teamId, beforeDate, 20);
    
    let elo = 1500; // Starting Elo
    
    for (const match of matches.reverse()) {
      const isHome = match.home_team_id === teamId;
      const opponentId = isHome ? match.away_team_id : match.home_team_id;
      
      // Assume opponent also starts at 1500 (simplified)
      const opponentElo = 1500;
      
      // Calculate result
      const teamScore = isHome ? match.home_score : match.away_score;
      const oppScore = isHome ? match.away_score : match.home_score;
      
      let result = 0.5; // Draw
      if (teamScore > oppScore) result = 1; // Win
      else if (teamScore < oppScore) result = 0; // Loss
      
      const homeAdvantage = isHome ? 100 : 0;
      elo = this.calculateEloRating(elo, opponentElo, result, 32, homeAdvantage);
    }
    
    return elo;
  }

  private calculateDixonColesParams(matches: any[], teamId: string): { attack: number; defense: number } {
    let totalGoalsFor = 0;
    let totalGoalsAgainst = 0;
    let totalMatches = 0;

    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const goalsFor = isHome ? match.home_score : match.away_score;
      const goalsAgainst = isHome ? match.away_score : match.home_score;

      if (goalsFor !== null && goalsAgainst !== null) {
        totalGoalsFor += goalsFor;
        totalGoalsAgainst += goalsAgainst;
        totalMatches++;
      }
    }

    const avgGoalsFor = totalMatches > 0 ? totalGoalsFor / totalMatches : 1.5;
    const avgGoalsAgainst = totalMatches > 0 ? totalGoalsAgainst / totalMatches : 1.5;

    // Simple Dixon-Coles parameters (normally would be fitted via MLE)
    const attack = Math.log(Math.max(avgGoalsFor, 0.1));
    const defense = -Math.log(Math.max(avgGoalsAgainst, 0.1));

    return { attack, defense };
  }

  private async calculateTacticalFeatures(teamId: string, beforeDate: string): Promise<Record<string, number>> {
    // Placeholder tactical features - would normally be calculated from detailed match data
    // These would come from tracking data, pass networks, etc.
    
    return {
      possession_style: Math.random() * 2 - 1, // Normalized -1 to 1
      tempo_style: Math.random() * 2 - 1,
      pressing_style: Math.random() * 2 - 1, // PPDA-based
      verticality_style: Math.random() * 2 - 1,
      width_style: Math.random() * 2 - 1,
      avg_shot_distance: 18 + Math.random() * 10 // 18-28 yards
    };
  }

  private async calculateSetPiecesStats(teamId: string, beforeDate: string): Promise<Record<string, number>> {
    // Placeholder set pieces stats - would come from match events
    const matches = await this.getHistoricalMatches(teamId, beforeDate, 10);
    const totalMatches = matches.length;

    if (totalMatches === 0) {
      return {
        corners_for_rate: 5.0,
        corners_against_rate: 5.0,
        penalties_for_rate: 0.1,
        penalties_against_rate: 0.1
      };
    }

    // Simplified calculation - would normally parse match events
    return {
      corners_for_rate: 4 + Math.random() * 4, // 4-8 corners per match
      corners_against_rate: 4 + Math.random() * 4,
      penalties_for_rate: 0.05 + Math.random() * 0.1, // 0.05-0.15 per match
      penalties_against_rate: 0.05 + Math.random() * 0.1
    };
  }

  private async calculateFatigueFeatures(teamId: string, matchDate: string): Promise<Record<string, number>> {
    const recentMatches = await this.getHistoricalMatches(teamId, matchDate, 5);
    
    let daysRest = 7; // Default
    let congestionIndex = 0;
    let uclWithin3d = false;

    if (recentMatches.length > 0) {
      const lastMatch = recentMatches[0];
      const daysDiff = Math.floor(
        (new Date(matchDate).getTime() - new Date(lastMatch.match_date).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      daysRest = Math.max(daysDiff, 1);
    }

    // Calculate congestion index (matches in last 30 days)
    const matchesIn30Days = recentMatches.filter(m => {
      const daysDiff = Math.floor(
        (new Date(matchDate).getTime() - new Date(m.match_date).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      return daysDiff <= 30;
    });

    congestionIndex = matchesIn30Days.length / 10; // Normalized

    // Check for UCL matches (simplified - would need competition data)
    // For now, assume some probability based on team quality
    uclWithin3d = Math.random() < 0.2; // 20% chance for simplicity

    return {
      days_rest: daysRest,
      travel_km: Math.random() * 500, // Placeholder
      congestion_index: congestionIndex,
      ucl_within_3d: uclWithin3d
    };
  }

  private calculateVolatilityFeatures(matches: any[], teamId: string): Record<string, number> {
    if (matches.length === 0) {
      return {
        volatility_index: 0.5,
        giant_killer_flag: false,
        choker_flag: false
      };
    }

    // Calculate performance variance
    const performances: number[] = [];
    
    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const goalsFor = isHome ? match.home_score : match.away_score;
      const goalsAgainst = isHome ? match.away_score : match.home_score;
      
      if (goalsFor !== null && goalsAgainst !== null) {
        const goalDiff = goalsFor - goalsAgainst;
        performances.push(goalDiff);
      }
    }

    const mean = performances.reduce((sum, p) => sum + p, 0) / performances.length;
    const variance = performances.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / performances.length;
    const volatilityIndex = Math.sqrt(variance) / 3; // Normalized

    // Simple flags based on recent performance patterns
    const giantKillerFlag = performances.some(p => p >= 2) && mean < 0; // Big wins despite poor average
    const chokerFlag = performances.some(p => p <= -2) && mean > 0; // Big losses despite good average

    return {
      volatility_index: Math.min(volatilityIndex, 1),
      giant_killer_flag: giantKillerFlag,
      choker_flag: chokerFlag
    };
  }
}