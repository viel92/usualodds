import { createClient } from '@/lib/supabase';
import { WindowType } from '@/types/database';

export abstract class BaseFeatureBuilder {
  protected supabase = createClient();

  protected async getMatchData(matchId: string) {
    const { data, error } = await this.supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!home_team_id(*),
        away_team:teams!away_team_id(*),
        season:seasons(*)
      `)
      .eq('id', matchId)
      .single();

    if (error) throw new Error(`Failed to get match data: ${error.message}`);
    return data;
  }

  protected async getHistoricalMatches(
    teamId: string,
    beforeDate: string,
    limit: number = 10,
    isHome?: boolean
  ) {
    let query = this.supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!home_team_id(*),
        away_team:teams!away_team_id(*)
      `)
      .lt('match_date', beforeDate)
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
    if (error) throw new Error(`Failed to get historical matches: ${error.message}`);
    return data || [];
  }

  protected async getPlayerRecentPerformance(
    playerId: string,
    beforeDate: string,
    limit: number = 5
  ) {
    const { data, error } = await this.supabase
      .from('player_match_stats')
      .select(`
        *,
        match:matches!inner(match_date, status)
      `)
      .eq('player_id', playerId)
      .lt('match.match_date', beforeDate)
      .eq('match.status', 'finished')
      .order('match.match_date', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get player performance: ${error.message}`);
    return data || [];
  }

  protected calculateForm(matches: any[], teamId: string): {
    points: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    xgFor: number;
    xgAgainst: number;
  } {
    let points = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    let xgFor = 0;
    let xgAgainst = 0;

    for (const match of matches) {
      const isHome = match.home_team_id === teamId;
      const teamScore = isHome ? match.home_score : match.away_score;
      const oppScore = isHome ? match.away_score : match.home_score;

      goalsFor += teamScore || 0;
      goalsAgainst += oppScore || 0;

      if (teamScore > oppScore) {
        wins++;
        points += 3;
      } else if (teamScore === oppScore) {
        draws++;
        points += 1;
      } else {
        losses++;
      }

      // Note: xG data would come from match events/stats when available
      // For now, we'll use a placeholder calculation
      xgFor += (teamScore || 0) * 1.1; // Rough approximation
      xgAgainst += (oppScore || 0) * 1.1;
    }

    return {
      points,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      xgFor,
      xgAgainst
    };
  }

  protected calculateEloRating(
    currentElo: number,
    opponentElo: number,
    actualResult: number, // 1 for win, 0.5 for draw, 0 for loss
    kFactor: number = 32,
    homeAdvantage: number = 0
  ): number {
    const expectedResult = 1 / (1 + Math.pow(10, (opponentElo - currentElo - homeAdvantage) / 400));
    return currentElo + kFactor * (actualResult - expectedResult);
  }

  protected exponentialDecay(value: number, daysDiff: number, halfLife: number = 30): number {
    return value * Math.exp(-Math.log(2) * daysDiff / halfLife);
  }

  protected weightedAverage(values: { value: number; weight: number }[]): number {
    const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight === 0) return 0;
    
    const weightedSum = values.reduce((sum, item) => sum + item.value * item.weight, 0);
    return weightedSum / totalWeight;
  }

  abstract buildFeatures(matchId: string, window: WindowType): Promise<void>;
}