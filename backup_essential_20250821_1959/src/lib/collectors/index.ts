// @ts-nocheck
export { BaseCollector } from './base-collector';
export { LeaguesCollector } from './leagues-collector';
export { TeamsCollector } from './teams-collector';
export { FixturesCollector } from './fixtures-collector';
export { PlayersCollector } from './players-collector';
export { OddsCollector } from './odds-collector';

import { LeaguesCollector } from './leagues-collector';
import { TeamsCollector } from './teams-collector';
import { FixturesCollector } from './fixtures-collector';
import { PlayersCollector } from './players-collector';
import { OddsCollector } from './odds-collector';

export class CollectionOrchestrator {
  private leaguesCollector = new LeaguesCollector();
  private teamsCollector = new TeamsCollector();
  private fixturesCollector = new FixturesCollector();
  private playersCollector = new PlayersCollector();
  private oddsCollector = new OddsCollector();

  async initializeDatabase(): Promise<void> {
    console.log('Starting database initialization...');
    
    try {
      // Step 1: Collect leagues and seasons
      await this.leaguesCollector.collect();
      
      // Step 2: Collect teams for each league
      await this.teamsCollector.collect();
      
      // Step 3: Collect players for each team
      await this.playersCollector.collect();
      
      console.log('Database initialization completed successfully');
    } catch (error) {
      console.error('Error during database initialization:', error);
      throw error;
    }
  }

  async collectDailyData(): Promise<void> {
    console.log('Starting daily data collection...');
    
    try {
      // Collect upcoming fixtures
      await this.fixturesCollector.collect();
      
      // Collect odds for different windows
      await this.oddsCollector.collectForWindow('T24');
      
      console.log('Daily data collection completed successfully');
    } catch (error) {
      console.error('Error during daily data collection:', error);
      throw error;
    }
  }

  async collectOddsUpdates(): Promise<void> {
    console.log('Starting odds updates collection...');
    
    try {
      // Collect odds for T6, T1, and T30 windows
      await this.oddsCollector.collectForWindow('T6');
      await this.oddsCollector.collectForWindow('T1');
      await this.oddsCollector.collectForWindow('T30');
      
      console.log('Odds updates collection completed successfully');
    } catch (error) {
      console.error('Error during odds updates collection:', error);
      throw error;
    }
  }

  async collectHistoricalData(seasons: string[]): Promise<void> {
    console.log('Starting historical data collection...');
    
    try {
      for (const season of seasons) {
        console.log(`Collecting data for season ${season}...`);
        
        // Collect fixtures for the entire season
        const startDate = `${season}-08-01`;
        const endDate = `${parseInt(season) + 1}-07-31`;
        
        await this.fixturesCollector.collect(startDate, endDate);
        await this.playersCollector.collect(season);
        
        // Add delay between seasons to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
      console.log('Historical data collection completed successfully');
    } catch (error) {
      console.error('Error during historical data collection:', error);
      throw error;
    }
  }
}