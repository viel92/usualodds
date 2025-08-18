import { BaseFeatureBuilder } from './base-feature-builder';
import { WindowType, PositionType } from '@/types/database';

export class PlayerFeaturesBuilder extends BaseFeatureBuilder {
  async buildFeatures(matchId: string, window: WindowType): Promise<void> {
    console.log(`Building player features for match ${matchId} at window ${window}...`);

    try {
      const match = await this.getMatchData(matchId);
      
      // Get squad players for both teams
      const homePlayers = await this.getTeamSquad(match.home_team_id);
      const awayPlayers = await this.getTeamSquad(match.away_team_id);

      // Build features for all squad players
      for (const player of homePlayers) {
        await this.buildPlayerFeatures(match, player, match.home_team_id, window);
      }

      for (const player of awayPlayers) {
        await this.buildPlayerFeatures(match, player, match.away_team_id, window);
      }

      console.log(`Player features built successfully for match ${matchId}`);
    } catch (error) {
      console.error(`Error building player features for match ${matchId}:`, error);
      throw error;
    }
  }

  private async getTeamSquad(teamId: string): Promise<any[]> {
    // Get current season squad - simplified approach
    const { data, error } = await this.supabase
      .from('player_match_stats')
      .select(`
        player_id,
        players:player_id(*)
      `)
      .in('team_id', [teamId])
      .order('match_id', { ascending: false })
      .limit(300); // Get recent player appearances

    if (error) {
      console.warn(`Failed to get team squad: ${error.message}`);
      return [];
    }

    // Deduplicate players
    const uniquePlayers = Array.from(
      new Map(data?.map(item => [item.player_id, item.players]) || []).values()
    );

    return uniquePlayers.filter(player => player !== null);
  }

  private async buildPlayerFeatures(
    match: any,
    player: any,
    teamId: string,
    window: WindowType
  ): Promise<void> {
    try {
      // Get player's recent performance
      const recentStats = await this.getPlayerRecentPerformance(player.id, match.match_date, 10);
      
      // Calculate basic performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(recentStats);
      
      // Calculate role and minutes expectation
      const roleMetrics = await this.calculateRoleMetrics(player, recentStats);
      
      // Calculate set piece roles
      const setPieceRoles = await this.calculateSetPieceRoles(player.id, match.match_date);
      
      // Calculate physical/form metrics
      const physicalMetrics = this.calculatePhysicalMetrics(recentStats, match.match_date, player);
      
      // Calculate synergies (simplified)
      const synergyHash = await this.calculateSynergyHash(player.id, teamId);

      // Store features in database
      const features = {
        match_id: match.id,
        player_id: player.id,
        team_id: teamId,
        window,
        
        // Role & expected minutes
        position: player.position as PositionType,
        minutes_expected: roleMetrics.minutesExpected,
        starter_probability: roleMetrics.starterProbability,
        
        // Performance metrics per 90
        xg_per_90: performanceMetrics.xgPer90,
        xa_per_90: performanceMetrics.xaPer90,
        shots_per_90: performanceMetrics.shotsPer90,
        shots_on_target_per_90: performanceMetrics.shotsOnTargetPer90,
        key_passes_per_90: performanceMetrics.keyPassesPer90,
        touches_box_per_90: performanceMetrics.touchesBoxPer90,
        
        // Set piece roles
        penalty_taker: setPieceRoles.penaltyTaker,
        corner_taker: setPieceRoles.cornerTaker,
        free_kick_taker: setPieceRoles.freeKickTaker,
        
        // Physical/form
        recent_matches_load: physicalMetrics.recentLoad,
        injury_return: physicalMetrics.injuryReturn,
        age: physicalMetrics.age,
        
        // Synergies
        synergy_hash: synergyHash
      };

      // Insert or update features
      const { error } = await this.supabase
        .from('features_player_match')
        .upsert(features, {
          onConflict: 'match_id,player_id,window'
        });

      if (error) {
        throw new Error(`Failed to store player features: ${error.message}`);
      }
    } catch (error) {
      console.error(`Error building features for player ${player.name}:`, error);
      // Continue with other players instead of failing completely
    }
  }

  private calculatePerformanceMetrics(recentStats: any[]): Record<string, number> {
    if (recentStats.length === 0) {
      return {
        xgPer90: 0,
        xaPer90: 0,
        shotsPer90: 0,
        shotsOnTargetPer90: 0,
        keyPassesPer90: 0,
        touchesBoxPer90: 0
      };
    }

    const totalMinutes = recentStats.reduce((sum, stat) => sum + (stat.minutes_played || 0), 0);
    
    if (totalMinutes === 0) {
      return {
        xgPer90: 0,
        xaPer90: 0,
        shotsPer90: 0,
        shotsOnTargetPer90: 0,
        keyPassesPer90: 0,
        touchesBoxPer90: 0
      };
    }

    const totalXg = recentStats.reduce((sum, stat) => sum + (stat.xg || 0), 0);
    const totalXa = recentStats.reduce((sum, stat) => sum + (stat.xa || 0), 0);
    const totalShots = recentStats.reduce((sum, stat) => sum + (stat.shots || 0), 0);
    const totalShotsOnTarget = recentStats.reduce((sum, stat) => sum + (stat.shots_on_target || 0), 0);
    const totalKeyPasses = recentStats.reduce((sum, stat) => sum + (stat.key_passes || 0), 0);
    
    // Placeholder for touches in box - would come from tracking data
    const totalTouchesBox = recentStats.reduce((sum, stat) => sum + (stat.shots * 1.5 || 0), 0); // Rough approximation

    return {
      xgPer90: (totalXg / totalMinutes) * 90,
      xaPer90: (totalXa / totalMinutes) * 90,
      shotsPer90: (totalShots / totalMinutes) * 90,
      shotsOnTargetPer90: (totalShotsOnTarget / totalMinutes) * 90,
      keyPassesPer90: (totalKeyPasses / totalMinutes) * 90,
      touchesBoxPer90: (totalTouchesBox / totalMinutes) * 90
    };
  }

  private async calculateRoleMetrics(player: any, recentStats: any[]): Promise<{
    minutesExpected: number;
    starterProbability: number;
  }> {
    if (recentStats.length === 0) {
      return {
        minutesExpected: 0,
        starterProbability: 0
      };
    }

    // Calculate average minutes and starter frequency
    const totalMinutes = recentStats.reduce((sum, stat) => sum + (stat.minutes_played || 0), 0);
    const avgMinutes = totalMinutes / recentStats.length;
    
    const starterGames = recentStats.filter(stat => (stat.minutes_played || 0) >= 70).length;
    const starterProbability = starterGames / recentStats.length;

    // Weight recent form more heavily
    const weights = recentStats.map((_, index) => Math.exp(-index * 0.1));
    const weightedAvgMinutes = this.weightedAverage(
      recentStats.map((stat, index) => ({
        value: stat.minutes_played || 0,
        weight: weights[index]
      }))
    );

    return {
      minutesExpected: Math.min(weightedAvgMinutes, 90),
      starterProbability: Math.min(starterProbability * 1.2, 1) // Slight optimism bias
    };
  }

  private async calculateSetPieceRoles(playerId: string, beforeDate: string): Promise<{
    penaltyTaker: boolean;
    cornerTaker: boolean;
    freeKickTaker: boolean;
  }> {
    // Placeholder - would normally analyze match events for set piece takers
    // For now, use position and some randomness as proxy
    
    const { data: player } = await this.supabase
      .from('players')
      .select('position')
      .eq('id', playerId)
      .single();

    const position = player?.position;
    
    // Simple heuristics based on position
    const penaltyTaker = Math.random() < (position === 'ATT' ? 0.3 : position === 'MID' ? 0.2 : 0.05);
    const cornerTaker = Math.random() < (position === 'MID' ? 0.4 : position === 'ATT' ? 0.2 : 0.1);
    const freeKickTaker = Math.random() < (position === 'MID' ? 0.3 : position === 'ATT' ? 0.25 : 0.1);

    return {
      penaltyTaker,
      cornerTaker,
      freeKickTaker
    };
  }

  private calculatePhysicalMetrics(recentStats: any[], matchDate: string, player: any): {
    recentLoad: number;
    injuryReturn: boolean;
    age: number;
  } {
    // Calculate recent matches load
    const recentMinutes = recentStats
      .slice(0, 5) // Last 5 matches
      .reduce((sum, stat) => sum + (stat.minutes_played || 0), 0);
    
    const recentLoad = recentMinutes / (5 * 90); // Normalized load

    // Check for injury return (simplified - gap in recent matches)
    const injuryReturn = recentStats.length >= 2 && 
      recentStats[0].minutes_played === 0 && 
      recentStats[1].minutes_played > 0;

    // Calculate age
    let age = 25; // Default
    if (player.birth_date) {
      const birthDate = new Date(player.birth_date);
      const currentDate = new Date(matchDate);
      age = Math.floor((currentDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }

    return {
      recentLoad: Math.min(recentLoad, 1),
      injuryReturn,
      age
    };
  }

  private async calculateSynergyHash(playerId: string, teamId: string): Promise<string> {
    // Simplified synergy calculation - would normally analyze pass networks, assists, etc.
    // For now, create a hash based on frequent teammates
    
    const { data: recentTeammates } = await this.supabase
      .from('player_match_stats')
      .select('match_id')
      .eq('player_id', playerId)
      .limit(10);

    if (!recentTeammates || recentTeammates.length === 0) {
      return 'no_synergy';
    }

    const matchIds = recentTeammates.map(t => t.match_id);
    
    const { data: teammates } = await this.supabase
      .from('player_match_stats')
      .select('player_id')
      .in('match_id', matchIds)
      .eq('team_id', teamId)
      .neq('player_id', playerId);

    if (!teammates || teammates.length === 0) {
      return 'no_synergy';
    }

    // Count teammate frequencies and create a simple hash
    const teammateFreq: Record<string, number> = {};
    teammates.forEach(t => {
      teammateFreq[t.player_id] = (teammateFreq[t.player_id] || 0) + 1;
    });

    const topTeammates = Object.entries(teammateFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([id]) => id.slice(-4)) // Last 4 chars of ID
      .join('');

    return `syn_${topTeammates}`;
  }
}