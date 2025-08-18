import { BaseCollector } from './base-collector';
import { PositionType } from '@/types/database';

interface APIPlayerStats {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    age: number;
    birth: {
      date: string;
      place: string;
      country: string;
    };
    nationality: string;
    height: string;
    weight: string;
    injured: boolean;
    photo: string;
  };
  statistics: Array<{
    team: {
      id: number;
      name: string;
      logo: string;
    };
    league: {
      id: number;
      name: string;
      country: string;
      logo: string;
      flag: string;
      season: number;
    };
    games: {
      appearences: number;
      lineups: number;
      minutes: number;
      number: number;
      position: string;
      rating: string;
      captain: boolean;
    };
    substitutes: {
      in: number;
      out: number;
      bench: number;
    };
    shots: {
      total: number;
      on: number;
    };
    goals: {
      total: number;
      conceded: number;
      assists: number;
      saves: number;
    };
    passes: {
      total: number;
      key: number;
      accuracy: number;
    };
    tackles: {
      total: number;
      blocks: number;
      interceptions: number;
    };
    duels: {
      total: number;
      won: number;
    };
    dribbles: {
      attempts: number;
      success: number;
      past: number;
    };
    fouls: {
      drawn: number;
      committed: number;
    };
    cards: {
      yellow: number;
      yellowred: number;
      red: number;
    };
    penalty: {
      won: number;
      commited: number;
      scored: number;
      missed: number;
      saved: number;
    };
  }>;
}

export class PlayersCollector extends BaseCollector {
  async collect(season?: string): Promise<void> {
    console.log('Starting players collection...');

    try {
      const currentSeason = season || new Date().getFullYear().toString();

      // Get all teams
      const { data: teams } = await this.supabase
        .from('teams')
        .select('id, api_id, name');

      if (!teams || teams.length === 0) {
        throw new Error('No teams found. Run teams collector first.');
      }

      let totalPlayers = 0;

      for (const team of teams) {
        const playersCount = await this.collectPlayersForTeam(
          team.api_id,
          team.id,
          team.name,
          currentSeason
        );
        
        totalPlayers += playersCount;
        await this.rateLimitDelay(3000); // Longer delay for player stats endpoint
      }

      await this.logDataQuality(
        'collection',
        'players',
        'players_collection_check',
        'passed',
        { 
          total_players_collected: totalPlayers,
          season: currentSeason
        }
      );

      console.log(`Players collection completed. Total players: ${totalPlayers}`);
    } catch (error) {
      console.error('Error collecting players:', error);
      await this.logDataQuality(
        'collection',
        'players',
        'players_collection_check',
        'failed',
        { error: error instanceof Error ? error.message : String(error) }
      );
      throw error;
    }
  }

  private async collectPlayersForTeam(
    teamApiId: number,
    teamId: string,
    teamName: string,
    season: string
  ): Promise<number> {
    try {
      console.log(`Collecting players for ${teamName} (${season})...`);

      const response = await this.api.getPlayerStatistics({
        team: teamApiId.toString(),
        season
      });

      const players: APIPlayerStats[] = response.response || [];

      if (players.length === 0) {
        console.warn(`No players found for team ${teamName} season ${season}`);
        return 0;
      }

      let insertedCount = 0;

      for (const apiPlayer of players) {
        try {
          // Check if player already exists
          const { data: existingPlayer } = await this.supabase
            .from('players')
            .select('id')
            .eq('api_id', apiPlayer.player.id)
            .single();

          if (existingPlayer) {
            continue; // Player already exists
          }

          // Map position from API to our enum
          const position = this.mapPosition(apiPlayer.statistics[0]?.games?.position);

          // Parse height and weight
          const height = this.parseHeight(apiPlayer.player.height);
          const weight = this.parseWeight(apiPlayer.player.weight);

          // Insert player
          const { error } = await this.supabase
            .from('players')
            .insert({
              name: apiPlayer.player.name,
              birth_date: apiPlayer.player.birth?.date || null,
              nationality: apiPlayer.player.nationality || null,
              height,
              weight,
              position,
              api_id: apiPlayer.player.id
            });

          if (error) {
            if (!error.message.includes('duplicate')) {
              console.warn(`Failed to insert player ${apiPlayer.player.name}:`, error.message);
            }
          } else {
            insertedCount++;
          }
        } catch (playerError) {
          console.warn(`Error processing player ${apiPlayer.player.name}:`, playerError);
        }
      }

      console.log(`Collected ${insertedCount} new players for ${teamName}`);
      return insertedCount;
    } catch (error) {
      console.error(`Error collecting players for team ${teamName}:`, error);
      return 0;
    }
  }

  private mapPosition(apiPosition?: string): PositionType | null {
    if (!apiPosition) return null;

    const position = apiPosition.toUpperCase();
    
    if (position.includes('GK') || position.includes('GOALKEEPER')) {
      return 'GK';
    }
    
    if (position.includes('DEF') || position.includes('DEFENDER') || 
        position.includes('CB') || position.includes('LB') || 
        position.includes('RB') || position.includes('LWB') || 
        position.includes('RWB')) {
      return 'DEF';
    }
    
    if (position.includes('MID') || position.includes('MIDFIELDER') ||
        position.includes('CM') || position.includes('CDM') ||
        position.includes('CAM') || position.includes('LM') ||
        position.includes('RM')) {
      return 'MID';
    }
    
    if (position.includes('ATT') || position.includes('ATTACKER') ||
        position.includes('FW') || position.includes('FORWARD') ||
        position.includes('CF') || position.includes('LW') ||
        position.includes('RW') || position.includes('ST')) {
      return 'ATT';
    }

    return null;
  }

  private parseHeight(heightStr?: string): number | null {
    if (!heightStr) return null;
    
    // Extract numbers from string like "180 cm" or "1.80 m"
    const match = heightStr.match(/(\d+(?:\.\d+)?)/);
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    
    // Convert to cm if it looks like meters
    if (value < 3) {
      return Math.round(value * 100);
    }
    
    return Math.round(value);
  }

  private parseWeight(weightStr?: string): number | null {
    if (!weightStr) return null;
    
    // Extract numbers from string like "75 kg"
    const match = weightStr.match(/(\d+)/);
    if (!match) return null;
    
    return parseInt(match[1]);
  }
}