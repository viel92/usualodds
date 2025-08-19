// @ts-nocheck
import { BaseCollector } from './base-collector';

interface APITeam {
  team: {
    id: number;
    name: string;
    code: string;
    country: string;
    founded: number;
    national: boolean;
    logo: string;
  };
  venue: {
    id: number;
    name: string;
    address: string;
    city: string;
    capacity: number;
    surface: string;
    image: string;
  };
}

export class TeamsCollector extends BaseCollector {
  async collect(): Promise<void> {
    console.log('Starting teams collection...');

    try {
      // Get all leagues
      const { data: leagues } = await this.supabase
        .from('leagues')
        .select('id, api_id, name');

      if (!leagues || leagues.length === 0) {
        throw new Error('No leagues found. Run leagues collector first.');
      }

      let totalTeams = 0;

      for (const league of leagues) {
        // Get current season for this league
        const { data: currentSeason } = await this.supabase
          .from('seasons')
          .select('year')
          .eq('league_id', league.id)
          .order('year', { ascending: false })
          .limit(1)
          .single();

        if (!currentSeason) {
          console.warn(`No seasons found for league ${league.name}`);
          continue;
        }

        const teamsCount = await this.collectTeamsForLeague(
          league.api_id,
          currentSeason.year.toString(),
          league.name
        );
        
        totalTeams += teamsCount;
        await this.rateLimitDelay(2000); // Longer delay for teams endpoint
      }

      await this.logDataQuality(
        'collection',
        'teams',
        'teams_collection_check',
        'passed',
        { total_teams_collected: totalTeams }
      );

      console.log(`Teams collection completed. Total teams: ${totalTeams}`);
    } catch (error) {
      console.error('Error collecting teams:', error);
      await this.logDataQuality(
        'collection',
        'teams',
        'teams_collection_check',
        'failed',
        { error: error instanceof Error ? error.message : String(error) }
      );
      throw error;
    }
  }

  private async collectTeamsForLeague(
    leagueApiId: number,
    season: string,
    leagueName: string
  ): Promise<number> {
    try {
      console.log(`Collecting teams for ${leagueName} (${season})...`);

      const response = await this.api.getTeams(leagueApiId.toString(), season);
      const teams: APITeam[] = response.response || [];

      if (teams.length === 0) {
        console.warn(`No teams found for league ${leagueName} season ${season}`);
        return 0;
      }

      let insertedCount = 0;

      for (const apiTeam of teams) {
        try {
          // Check if team already exists
          const { data: existingTeam } = await this.supabase
            .from('teams')
            .select('id')
            .eq('api_id', apiTeam.team.id)
            .single();

          if (existingTeam) {
            continue; // Team already exists
          }

          // Insert team
          const { error } = await this.supabase
            .from('teams')
            .insert({
              name: apiTeam.team.name,
              short_name: apiTeam.team.code || null,
              logo_url: apiTeam.team.logo || null,
              founded: apiTeam.team.founded || null,
              venue_name: apiTeam.venue?.name || null,
              venue_capacity: apiTeam.venue?.capacity || null,
              api_id: apiTeam.team.id
            });

          if (error) {
            if (!error.message.includes('duplicate')) {
              console.warn(`Failed to insert team ${apiTeam.team.name}:`, error.message);
            }
          } else {
            insertedCount++;
          }
        } catch (teamError) {
          console.warn(`Error processing team ${apiTeam.team.name}:`, teamError);
        }
      }

      console.log(`Collected ${insertedCount} new teams for ${leagueName}`);
      return insertedCount;
    } catch (error) {
      console.error(`Error collecting teams for league ${leagueName}:`, error);
      return 0;
    }
  }
}