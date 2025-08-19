// @ts-nocheck
import { BaseCollector } from './base-collector';
import { LeagueType } from '@/types/database';

interface APILeague {
  league: {
    id: number;
    name: string;
    type: string;
    logo: string;
  };
  country: {
    name: string;
    code: string;
    flag: string;
  };
  seasons: Array<{
    year: number;
    start: string;
    end: string;
    current: boolean;
  }>;
}

export class LeaguesCollector extends BaseCollector {
  private readonly TARGET_LEAGUES = {
    39: { name: 'Premier League', type: 'EPL' as LeagueType, country: 'England' },
    140: { name: 'La Liga', type: 'LaLiga' as LeagueType, country: 'Spain' },
    135: { name: 'Serie A', type: 'Serie A' as LeagueType, country: 'Italy' },
    78: { name: 'Bundesliga', type: 'Bundesliga' as LeagueType, country: 'Germany' },
    61: { name: 'Ligue 1', type: 'Ligue 1' as LeagueType, country: 'France' }
  };

  async collect(): Promise<void> {
    console.log('Starting leagues collection...');

    try {
      for (const [apiId, config] of Object.entries(this.TARGET_LEAGUES)) {
        await this.collectLeague(parseInt(apiId), config);
        await this.rateLimitDelay(1000);
      }

      await this.logDataQuality(
        'collection',
        'leagues',
        'big5_leagues_check',
        'passed',
        { collected_leagues: Object.keys(this.TARGET_LEAGUES).length }
      );

      console.log('Leagues collection completed successfully');
    } catch (error) {
      console.error('Error collecting leagues:', error);
      await this.logDataQuality(
        'collection',
        'leagues',
        'big5_leagues_check',
        'failed',
        { error: error instanceof Error ? error.message : String(error) }
      );
      throw error;
    }
  }

  private async collectLeague(apiId: number, config: { name: string; type: LeagueType; country: string }) {
    try {
      // Check if league already exists
      const { data: existingLeague } = await this.supabase
        .from('leagues')
        .select('id')
        .eq('api_id', apiId)
        .single();

      if (existingLeague) {
        console.log(`League ${config.name} already exists, skipping...`);
        return;
      }

      // Get league details from API
      const response = await this.api.getLeagues();
      const apiLeague = response.response?.find((l: APILeague) => l.league.id === apiId);

      if (!apiLeague) {
        throw new Error(`League with API ID ${apiId} not found`);
      }

      // Insert league
      const { error: leagueError } = await this.supabase
        .from('leagues')
        .insert({
          name: config.name,
          type: config.type,
          country: config.country,
          api_id: apiId
        });

      if (leagueError) {
        throw new Error(`Failed to insert league: ${leagueError.message}`);
      }

      // Insert seasons (last 5 years)
      const currentYear = new Date().getFullYear();
      const seasons = apiLeague.seasons
        .filter(s => s.year >= currentYear - 4 && s.year <= currentYear)
        .slice(-5); // Last 5 seasons

      for (const season of seasons) {
        const { error: seasonError } = await this.supabase
          .from('seasons')
          .insert({
            league_id: (await this.supabase
              .from('leagues')
              .select('id')
              .eq('api_id', apiId)
              .single()).data?.id,
            year: season.year,
            start_date: season.start,
            end_date: season.end,
            api_id: parseInt(`${apiId}${season.year}`) // Composite ID
          });

        if (seasonError && !seasonError.message.includes('duplicate')) {
          console.warn(`Failed to insert season ${season.year} for league ${config.name}:`, seasonError.message);
        }
      }

      console.log(`Successfully collected league: ${config.name} with ${seasons.length} seasons`);
    } catch (error) {
      console.error(`Error collecting league ${config.name}:`, error);
      throw error;
    }
  }
}