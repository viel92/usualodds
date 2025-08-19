// @ts-nocheck
/**
 * COLLECTE DONNÉES HISTORIQUES MULTI-SAISONS
 * Strategy Option A: Collecte Progressive
 * Phase 1: Saison 2024-25 (matchs terminés) 
 * Phase 2: Saison 2023-24 complète
 * Phase 3: Saison 2022-23 complète
 */

import { createApiClient } from '@/lib/supabase';
import { APIFootballClient } from '@/lib/api-football';

interface SeasonCollectionPhase {
  phase: 1 | 2 | 3;
  season: string;
  year: number;
  leagues: number[]; // API-Football league IDs
  description: string;
  estimatedCalls: number;
}

interface CollectionProgress {
  phase: number;
  season: string;
  league: number;
  matches_collected: number;
  total_matches: number;
  api_calls_used: number;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
}

class HistoricalDataCollector {
  private supabase = createApiClient();
  private apiFootball = new APIFootballClient();
  
  // Phases de collecte progressive
  private readonly COLLECTION_PHASES: SeasonCollectionPhase[] = [
    {
      phase: 1,
      season: '2024-25',
      year: 2024,
      leagues: [61, 39, 140, 78, 135], // Ligue 1, EPL, La Liga, Bundesliga, Serie A
      description: 'Saison 2024-25 complète (terminée)',
      estimatedCalls: 1900 // ~380 matchs/ligue x 5 ligues (saison complète)
    },
    {
      phase: 2,
      season: '2023-24',
      year: 2023,
      leagues: [61, 39, 140, 78, 135],
      description: 'Saison 2023-24 complète pour entraînement',
      estimatedCalls: 1900 // ~380 matchs/ligue x 5 ligues
    },
    {
      phase: 3,
      season: '2022-23',
      year: 2022,
      leagues: [61, 39, 140, 78, 135],
      description: 'Saison 2022-23 pour validation robuste',
      estimatedCalls: 1900 // ~380 matchs/ligue x 5 ligues
    }
  ];

  // Mapping league ID → nom
  private readonly LEAGUE_NAMES: Record<number, string> = {
    61: 'Ligue 1',
    39: 'Premier League',
    140: 'La Liga',
    78: 'Bundesliga',
    135: 'Serie A'
  };

  async startProgressiveCollection(): Promise<void> {
    console.log('🚀 Démarrage collecte progressive multi-saisons...');
    
    // Créer table de progress si nécessaire
    await this.initializeProgressTracking();
    
    for (const phase of this.COLLECTION_PHASES) {
      console.log(`\n📊 Phase ${phase.phase}: ${phase.description}`);
      console.log(`📈 Estimation: ${phase.estimatedCalls} API calls pour ${phase.leagues.length} ligues`);
      
      await this.collectPhase(phase);
    }
    
    console.log('\n✅ Collecte progressive terminée !');
    await this.generateCollectionSummary();
  }

  private async collectPhase(phase: SeasonCollectionPhase): Promise<void> {
    for (const leagueId of phase.leagues) {
      const leagueName = this.LEAGUE_NAMES[leagueId];
      console.log(`\n🏆 Collecte ${leagueName} (${phase.season})`);
      
      // Vérifier si déjà collecté
      const existing = await this.getCollectionProgress(phase.phase, phase.season, leagueId);
      if (existing?.status === 'completed') {
        console.log(`✅ ${leagueName} ${phase.season} déjà collecté, passage au suivant`);
        continue;
      }
      
      // Initialiser progress
      await this.updateCollectionProgress({
        phase: phase.phase,
        season: phase.season,
        league: leagueId,
        matches_collected: 0,
        total_matches: 0,
        api_calls_used: 0,
        status: 'in_progress',
        started_at: new Date()
      });
      
      try {
        await this.collectLeagueSeason(leagueId, phase.year, phase.season, phase.phase);
        
        // Marquer comme completé
        await this.updateCollectionProgress({
          phase: phase.phase,
          season: phase.season,
          league: leagueId,
          matches_collected: 0, // sera mis à jour par collectLeagueSeason
          total_matches: 0,
          api_calls_used: 0,
          status: 'completed',
          completed_at: new Date()
        });
        
        console.log(`✅ ${leagueName} ${phase.season} collecté avec succès`);
        
        // Pause entre ligues pour respecter rate limits
        console.log('⏳ Pause 30s pour rate limiting...');
        await this.sleep(30000);
        
      } catch (error) {
        console.error(`❌ Erreur collecte ${leagueName} ${phase.season}:`, error);
        
        await this.updateCollectionProgress({
          phase: phase.phase,
          season: phase.season,
          league: leagueId,
          matches_collected: 0,
          total_matches: 0,
          api_calls_used: 0,
          status: 'error',
          error_message: error.message
        });
      }
    }
  }

  private async collectLeagueSeason(
    leagueId: number, 
    year: number, 
    season: string, 
    phase: number
  ): Promise<void> {
    console.log(`📥 Collecte matches ${this.LEAGUE_NAMES[leagueId]} ${season}...`);
    
    // 1. Collecter les fixtures de la saison
    const fixtures = await this.apiFootball.getFixtures({
      league: leagueId,
      season: year,
      status: 'FT-AET-PEN' // Toutes les phases: saisons complètes terminées
    });
    
    console.log(`📊 ${fixtures.length} matchs trouvés pour ${season}`);
    
    let collected = 0;
    let apiCalls = 1; // getFixtures = 1 call
    
    for (const fixture of fixtures) {
      try {
        // 2. Collecter données détaillées du match
        const matchDetails = await this.collectMatchDetails(fixture.fixture.id);
        
        // 3. Sauvegarder en base
        await this.saveMatchToDatabase(matchDetails, leagueId, season);
        
        collected++;
        apiCalls += 3; // fixture details + statistics + lineups
        
        // Progress update tous les 10 matchs
        if (collected % 10 === 0) {
          await this.updateCollectionProgress({
            phase,
            season,
            league: leagueId,
            matches_collected: collected,
            total_matches: fixtures.length,
            api_calls_used: apiCalls,
            status: 'in_progress'
          });
          
          console.log(`📈 Progress: ${collected}/${fixtures.length} matchs (${apiCalls} API calls)`);
        }
        
        // Pause pour rate limiting (7500/jour ≈ 5 calls/minute max)
        await this.sleep(12000); // 12s entre matchs = 5 calls/min
        
      } catch (error) {
        console.error(`⚠️ Erreur match ${fixture.fixture.id}:`, error.message);
        // Continue avec le match suivant
        continue;
      }
    }
    
    console.log(`✅ ${collected}/${fixtures.length} matchs collectés (${apiCalls} API calls total)`);
  }

  private async collectMatchDetails(fixtureId: number): Promise<any> {
    // Collecter 3 types de données par match:
    const [fixture, statistics, lineups] = await Promise.all([
      this.apiFootball.getFixture(fixtureId),
      this.apiFootball.getStatistics(fixtureId),
      this.apiFootball.getLineups(fixtureId)
    ]);
    
    return {
      fixture: fixture.response[0],
      statistics: statistics.response,
      lineups: lineups.response
    };
  }

  private async saveMatchToDatabase(matchData: any, leagueId: number, season: string): Promise<void> {
    const { fixture, statistics, lineups } = matchData;
    
    // 1. Sauvegarder teams si pas exists
    await this.upsertTeam(fixture.teams.home);
    await this.upsertTeam(fixture.teams.away);
    
    // 2. Sauvegarder league/season si pas exists  
    await this.upsertLeagueSeason(leagueId, season);
    
    // 3. Sauvegarder match principal
    const matchId = await this.upsertMatch(fixture, leagueId, season);
    
    // 4. Sauvegarder statistiques détaillées
    if (statistics?.length > 0) {
      await this.saveMatchStatistics(matchId, statistics);
    }
    
    // 5. Sauvegarder compositions si disponibles
    if (lineups?.length > 0) {
      await this.saveMatchLineups(matchId, lineups);
    }
  }

  private async upsertTeam(teamData: any): Promise<void> {
    const { data: existing } = await this.supabase
      .from('teams')
      .select('id')
      .eq('api_id', teamData.id)
      .single();
    
    if (!existing) {
      await this.supabase.from('teams').insert({
        name: teamData.name,
        short_name: teamData.name.substring(0, 3).toUpperCase(),
        logo_url: teamData.logo,
        api_id: teamData.id
      });
    }
  }

  private async upsertLeagueSeason(leagueId: number, season: string): Promise<void> {
    // Logique similaire pour league et season
    // Implementation simplifiée ici
  }

  private async upsertMatch(fixture: any, leagueId: number, season: string): Promise<string> {
    const { data: homeTeam } = await this.supabase
      .from('teams')
      .select('id')
      .eq('api_id', fixture.teams.home.id)
      .single();
      
    const { data: awayTeam } = await this.supabase
      .from('teams')
      .select('id')
      .eq('api_id', fixture.teams.away.id)
      .single();
    
    const { data: seasonData } = await this.supabase
      .from('seasons')
      .select('id')
      .eq('api_id', leagueId)
      .single();
    
    const matchData = {
      season_id: seasonData?.id,
      home_team_id: homeTeam?.id,
      away_team_id: awayTeam?.id,
      match_date: fixture.fixture.date,
      status: this.mapFixtureStatus(fixture.fixture.status.short),
      home_score: fixture.goals.home,
      away_score: fixture.goals.away,
      referee: fixture.fixture.referee,
      venue: fixture.fixture.venue.name,
      api_id: fixture.fixture.id
    };
    
    const { data: match } = await this.supabase
      .from('matches')
      .upsert(matchData, { onConflict: 'api_id' })
      .select('id')
      .single();
    
    return match.id;
  }

  private mapFixtureStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'FT': 'finished',
      'AET': 'finished', 
      'PEN': 'finished',
      'LIVE': 'live',
      'NS': 'scheduled',
      'CANC': 'cancelled',
      'PST': 'postponed'
    };
    
    return statusMap[status] || 'scheduled';
  }

  private async saveMatchStatistics(matchId: string, statistics: any[]): Promise<void> {
    // Sauvegarder les statistiques détaillées
    // Implementation selon structure de données API-Football
  }

  private async saveMatchLineups(matchId: string, lineups: any[]): Promise<void> {
    // Sauvegarder les compositions d'équipes
    // Implementation selon structure de données API-Football
  }

  // =============================================================================
  // GESTION PROGRESS TRACKING
  // =============================================================================

  private async initializeProgressTracking(): Promise<void> {
    // Créer table de suivi si pas existe
    const { error } = await this.supabase.rpc('create_collection_progress_table');
    if (error && !error.message.includes('already exists')) {
      console.error('Error creating progress table:', error);
    }
  }

  private async getCollectionProgress(
    phase: number, 
    season: string, 
    league: number
  ): Promise<CollectionProgress | null> {
    const { data } = await this.supabase
      .from('collection_progress')
      .select('*')
      .eq('phase', phase)
      .eq('season', season)
      .eq('league', league)
      .single();
    
    return data;
  }

  private async updateCollectionProgress(progress: Partial<CollectionProgress>): Promise<void> {
    await this.supabase
      .from('collection_progress')
      .upsert({
        ...progress,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'phase,season,league'
      });
  }

  private async generateCollectionSummary(): Promise<void> {
    console.log('\n📊 RÉSUMÉ DE LA COLLECTE PROGRESSIVE');
    console.log('=====================================');
    
    const { data: progress } = await this.supabase
      .from('collection_progress')
      .select('*')
      .order('phase', { ascending: true });
    
    if (!progress) return;
    
    for (let phase = 1; phase <= 3; phase++) {
      const phaseData = progress.filter(p => p.phase === phase);
      const completed = phaseData.filter(p => p.status === 'completed').length;
      const total = phaseData.length;
      const totalMatches = phaseData.reduce((sum, p) => sum + p.matches_collected, 0);
      const totalCalls = phaseData.reduce((sum, p) => sum + p.api_calls_used, 0);
      
      console.log(`\nPhase ${phase}: ${completed}/${total} ligues (${totalMatches} matchs, ${totalCalls} API calls)`);
      
      phaseData.forEach(p => {
        const status = p.status === 'completed' ? '✅' : 
                      p.status === 'error' ? '❌' : 
                      p.status === 'in_progress' ? '🔄' : '⏳';
        console.log(`  ${status} ${this.LEAGUE_NAMES[p.league]}: ${p.matches_collected} matchs`);
      });
    }
    
    const totalMatches = progress.reduce((sum, p) => sum + p.matches_collected, 0);
    const totalCalls = progress.reduce((sum, p) => sum + p.api_calls_used, 0);
    
    console.log(`\n🎯 TOTAL: ${totalMatches} matchs collectés avec ${totalCalls} API calls`);
    console.log('💾 Base de données prête pour entraînement ML multi-saisons !');
  }

  // =============================================================================
  // UTILITIES
  // =============================================================================

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async estimateCollectionCost(): Promise<void> {
    console.log('📊 ESTIMATION COÛT COLLECTE PROGRESSIVE');
    console.log('=======================================');
    
    let totalCalls = 0;
    let totalDays = 0;
    
    this.COLLECTION_PHASES.forEach(phase => {
      console.log(`\nPhase ${phase.phase}: ${phase.description}`);
      console.log(`Ligues: ${phase.leagues.length}`);
      console.log(`Estimation: ${phase.estimatedCalls} API calls`);
      console.log(`Durée estimée: ${Math.ceil(phase.estimatedCalls / 7000)} jours`);
      
      totalCalls += phase.estimatedCalls;
      totalDays += Math.ceil(phase.estimatedCalls / 7000);
    });
    
    console.log(`\n🎯 TOTAL ESTIMATION:`);
    console.log(`📞 API Calls: ${totalCalls} calls`);
    console.log(`⏱️ Durée: ${totalDays} jours (avec limit 7500/jour)`);
    console.log(`💰 Coût: Inclus dans plan Pro API-Football`);
    
    console.log(`\n📋 STRATÉGIE RECOMMANDÉE:`);
    console.log(`1. Phase 1 d'abord (saison courante) → ~1 jour`);
    console.log(`2. Phase 2 ensuite (2023-24) → ~3 jours`);
    console.log(`3. Phase 3 enfin (2022-23) → ~3 jours`);
    console.log(`4. Total: ~7 jours pour collecte complète`);
  }

  async startSinglePhase(phaseNumber: 1 | 2 | 3): Promise<void> {
    const phase = this.COLLECTION_PHASES.find(p => p.phase === phaseNumber);
    if (!phase) {
      throw new Error(`Phase ${phaseNumber} not found`);
    }
    
    console.log(`🎯 Démarrage Phase ${phaseNumber}: ${phase.description}`);
    await this.initializeProgressTracking();
    await this.collectPhase(phase);
    console.log(`✅ Phase ${phaseNumber} terminée !`);
  }
}

export default HistoricalDataCollector;
export type { SeasonCollectionPhase, CollectionProgress };