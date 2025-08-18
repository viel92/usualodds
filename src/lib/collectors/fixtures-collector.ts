import { BaseCollector } from './base-collector';

interface APIFixture {
  fixture: {
    id: number;
    referee: string;
    timezone: string;
    date: string;
    timestamp: number;
    periods: {
      first: number;
      second: number;
    };
    venue: {
      id: number;
      name: string;
      city: string;
    };
    status: {
      long: string;
      short: string;
      elapsed: number;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: {
      home: number | null;
      away: number | null;
    };
    fulltime: {
      home: number | null;
      away: number | null;
    };
    extratime: {
      home: number | null;
      away: number | null;
    };
    penalty: {
      home: number | null;
      away: number | null;
    };
  };
}

export class FixturesCollector extends BaseCollector {
  async collect(dateFrom?: string, dateTo?: string): Promise<void> {
    console.log('Starting fixtures collection...');

    try {
      // Default to upcoming 30 days if no dates provided
      const from = dateFrom || new Date().toISOString().split('T')[0];
      const to = dateTo || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get all leagues
      const { data: leagues } = await this.supabase
        .from('leagues')
        .select('id, api_id, name');

      if (!leagues || leagues.length === 0) {
        throw new Error('No leagues found. Run leagues collector first.');
      }

      let totalFixtures = 0;

      for (const league of leagues) {
        const fixturesCount = await this.collectFixturesForLeague(
          league.api_id,
          league.id,
          league.name,
          from,
          to
        );
        
        totalFixtures += fixturesCount;
        await this.rateLimitDelay(2000);
      }

      await this.logDataQuality(
        'collection',
        'matches',
        'fixtures_collection_check',
        'passed',
        { 
          total_fixtures_collected: totalFixtures,
          date_range: { from, to }
        }
      );

      console.log(`Fixtures collection completed. Total fixtures: ${totalFixtures}`);
    } catch (error) {
      console.error('Error collecting fixtures:', error);
      await this.logDataQuality(
        'collection',
        'matches',
        'fixtures_collection_check',
        'failed',
        { error: error instanceof Error ? error.message : String(error) }
      );
      throw error;
    }
  }

  private async collectFixturesForLeague(
    leagueApiId: number,
    leagueId: string,
    leagueName: string,
    from: string,
    to: string
  ): Promise<number> {
    try {
      console.log(`Collecting fixtures for ${leagueName} (${from} to ${to})...`);

      // Get current season
      const { data: currentSeason } = await this.supabase
        .from('seasons')
        .select('id, year')
        .eq('league_id', leagueId)
        .order('year', { ascending: false })
        .limit(1)
        .single();

      if (!currentSeason) {
        console.warn(`No current season found for league ${leagueName}`);
        return 0;
      }

      const response = await this.api.getFixtures({
        league: leagueApiId.toString(),
        season: currentSeason.year.toString(),
        from,
        to,
        timezone: 'UTC'
      });

      const fixtures: APIFixture[] = response.response || [];

      if (fixtures.length === 0) {
        console.log(`No fixtures found for ${leagueName} in date range`);
        return 0;
      }

      let insertedCount = 0;

      for (const apiFixture of fixtures) {
        try {
          // Check if fixture already exists
          const { data: existingFixture } = await this.supabase
            .from('matches')
            .select('id')
            .eq('api_id', apiFixture.fixture.id)
            .single();

          if (existingFixture) {
            // Update existing fixture if status changed
            await this.updateExistingFixture(existingFixture.id, apiFixture);
            continue;
          }

          // Get team IDs from database
          const { data: homeTeam } = await this.supabase
            .from('teams')
            .select('id')
            .eq('api_id', apiFixture.teams.home.id)
            .single();

          const { data: awayTeam } = await this.supabase
            .from('teams')
            .select('id')
            .eq('api_id', apiFixture.teams.away.id)
            .single();

          if (!homeTeam || !awayTeam) {
            console.warn(`Teams not found for fixture ${apiFixture.fixture.id}`);
            continue;
          }

          // Map API status to our enum
          const status = this.mapFixtureStatus(apiFixture.fixture.status.short);

          // Insert fixture
          const { error } = await this.supabase
            .from('matches')
            .insert({
              season_id: currentSeason.id,
              home_team_id: homeTeam.id,
              away_team_id: awayTeam.id,
              match_date: apiFixture.fixture.date,
              status,
              home_score: apiFixture.goals.home,
              away_score: apiFixture.goals.away,
              referee: apiFixture.fixture.referee || null,
              venue: apiFixture.fixture.venue?.name || null,
              api_id: apiFixture.fixture.id
            });

          if (error) {
            if (!error.message.includes('duplicate')) {
              console.warn(`Failed to insert fixture ${apiFixture.fixture.id}:`, error.message);
            }
          } else {
            insertedCount++;
          }
        } catch (fixtureError) {
          console.warn(`Error processing fixture ${apiFixture.fixture.id}:`, fixtureError);
        }
      }

      console.log(`Collected ${insertedCount} new fixtures for ${leagueName}`);
      return insertedCount;
    } catch (error) {
      console.error(`Error collecting fixtures for league ${leagueName}:`, error);
      return 0;
    }
  }

  private async updateExistingFixture(matchId: string, apiFixture: APIFixture) {
    const status = this.mapFixtureStatus(apiFixture.fixture.status.short);
    
    await this.supabase
      .from('matches')
      .update({
        status,
        home_score: apiFixture.goals.home,
        away_score: apiFixture.goals.away,
        referee: apiFixture.fixture.referee || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId);
  }

  private mapFixtureStatus(apiStatus: string): string {
    const statusMap: Record<string, string> = {
      'TBD': 'scheduled',
      'NS': 'scheduled',
      'LIVE': 'live',
      '1H': 'live',
      'HT': 'live',
      '2H': 'live',
      'ET': 'live',
      'P': 'live',
      'FT': 'finished',
      'AET': 'finished',
      'PEN': 'finished',
      'PST': 'postponed',
      'CANC': 'cancelled',
      'ABD': 'cancelled',
      'AWD': 'finished',
      'WO': 'finished'
    };

    return statusMap[apiStatus] || 'scheduled';
  }
}