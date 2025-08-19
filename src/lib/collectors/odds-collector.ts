// @ts-nocheck
import { BaseCollector } from './base-collector';
import { WindowType } from '@/types/database';

interface APIOdds {
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
  };
  fixture: {
    id: number;
    timezone: string;
    date: string;
    timestamp: number;
  };
  update: string;
  bookmakers: Array<{
    id: number;
    name: string;
    bets: Array<{
      id: number;
      name: string;
      values: Array<{
        value: string;
        odd: string;
      }>;
    }>;
  }>;
}

export class OddsCollector extends BaseCollector {
  private readonly TARGET_BOOKMAKERS = [
    'Bet365',
    'Pinnacle',
    'Betfair',
    'William Hill',
    'Unibet'
  ];

  private readonly BET_TYPES = {
    1: 'Match Winner', // 1X2
    5: 'Goals Over/Under', // O/U 2.5
    12: 'Both Teams Score'
  };

  async collect(window: WindowType, matchDate?: string): Promise<void> {
    console.log(`Starting odds collection for window ${window}...`);

    try {
      // Get upcoming matches (or matches for specific date)
      const { data: matches } = await this.supabase
        .from('matches')
        .select('id, api_id, match_date, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
        .eq('status', 'scheduled')
        .gte('match_date', matchDate || new Date().toISOString())
        .lte('match_date', matchDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('match_date', { ascending: true });

      if (!matches || matches.length === 0) {
        console.log('No upcoming matches found for odds collection');
        return;
      }

      let totalOddsCollected = 0;

      for (const match of matches) {
        const oddsCount = await this.collectOddsForMatch(match.api_id, match.id, window);
        totalOddsCollected += oddsCount;
        await this.rateLimitDelay(2000);
      }

      await this.logDataQuality(
        'collection',
        'odds_snapshots',
        `odds_collection_${window}`,
        'passed',
        { 
          total_odds_collected: totalOddsCollected,
          window,
          matches_processed: matches.length
        }
      );

      console.log(`Odds collection completed for window ${window}. Total odds: ${totalOddsCollected}`);
    } catch (error) {
      console.error(`Error collecting odds for window ${window}:`, error);
      await this.logDataQuality(
        'collection',
        'odds_snapshots',
        `odds_collection_${window}`,
        'failed',
        { error: error instanceof Error ? error.message : String(error), window }
      );
      throw error;
    }
  }

  private async collectOddsForMatch(
    fixtureApiId: number,
    matchId: string,
    window: WindowType
  ): Promise<number> {
    try {
      const response = await this.api.getOdds({
        fixture: fixtureApiId.toString()
      });

      const oddsData: APIOdds[] = response.response || [];

      if (oddsData.length === 0) {
        console.warn(`No odds found for fixture ${fixtureApiId}`);
        return 0;
      }

      const fixtureOdds = oddsData[0]; // Should be one item per fixture
      let insertedCount = 0;

      for (const bookmaker of fixtureOdds.bookmakers) {
        if (!this.TARGET_BOOKMAKERS.includes(bookmaker.name)) {
          continue; // Skip non-target bookmakers
        }

        const oddsSnapshot = this.parseBookmakerOdds(bookmaker);
        
        if (Object.keys(oddsSnapshot).length === 0) {
          continue; // No relevant odds found
        }

        // Insert odds snapshot
        const { error } = await this.supabase
          .from('odds_snapshots')
          .insert({
            match_id: matchId,
            bookmaker: bookmaker.name,
            window,
            ...oddsSnapshot,
            captured_at: new Date().toISOString()
          });

        if (error) {
          if (!error.message.includes('duplicate')) {
            console.warn(`Failed to insert odds for ${bookmaker.name}:`, error.message);
          }
        } else {
          insertedCount++;
        }
      }

      return insertedCount;
    } catch (error) {
      console.error(`Error collecting odds for fixture ${fixtureApiId}:`, error);
      return 0;
    }
  }

  private parseBookmakerOdds(bookmaker: any): Record<string, any> {
    const odds: Record<string, any> = {};
    const marketOdds: Record<string, any> = {};

    for (const bet of bookmaker.bets) {
      switch (bet.id) {
        case 1: // Match Winner (1X2)
          for (const value of bet.values) {
            switch (value.value) {
              case 'Home':
                odds.home_win_odds = parseFloat(value.odd);
                break;
              case 'Draw':
                odds.draw_odds = parseFloat(value.odd);
                break;
              case 'Away':
                odds.away_win_odds = parseFloat(value.odd);
                break;
            }
          }
          break;

        case 5: // Goals Over/Under
          for (const value of bet.values) {
            if (value.value.includes('Over 2.5')) {
              odds.over_25_odds = parseFloat(value.odd);
            } else if (value.value.includes('Under 2.5')) {
              odds.under_25_odds = parseFloat(value.odd);
            }
            
            // Store all O/U lines in market_odds
            if (!marketOdds.over_under) {
              marketOdds.over_under = {};
            }
            marketOdds.over_under[value.value] = parseFloat(value.odd);
          }
          break;

        case 12: // Both Teams Score
          for (const value of bet.values) {
            if (!marketOdds.both_teams_score) {
              marketOdds.both_teams_score = {};
            }
            marketOdds.both_teams_score[value.value] = parseFloat(value.odd);
          }
          break;

        default:
          // Store other markets in market_odds for future use
          if (!marketOdds[bet.name]) {
            marketOdds[bet.name] = {};
          }
          for (const value of bet.values) {
            marketOdds[bet.name][value.value] = parseFloat(value.odd);
          }
          break;
      }
    }

    if (Object.keys(marketOdds).length > 0) {
      odds.market_odds = marketOdds;
    }

    return odds;
  }

  async collectForWindow(window: WindowType): Promise<void> {
    const now = new Date();
    let targetTime: Date;

    switch (window) {
      case 'T24':
        targetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'T6':
        targetTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        break;
      case 'T1':
        targetTime = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case 'T30':
        targetTime = new Date(now.getTime() + 30 * 60 * 1000);
        break;
      default:
        throw new Error(`Invalid window: ${window}`);
    }

    const targetDate = targetTime.toISOString().split('T')[0];
    await this.collect(window, targetDate);
  }
}