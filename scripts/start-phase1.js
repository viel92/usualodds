#!/usr/bin/env node

/**
 * DÉMARRAGE COLLECTE PHASE 1 - SAISON 2024-25
 * Script Node.js pur pour éviter problèmes TypeScript
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger variables environnement
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration Phase 1
const PHASE_1_CONFIG = {
  phase: 1,
  season: '2024-25',
  year: 2024,
  leagues: [
    { id: 61, name: 'Ligue 1' },
    { id: 39, name: 'Premier League' },
    { id: 140, name: 'La Liga' },
    { id: 78, name: 'Bundesliga' },
    { id: 135, name: 'Serie A' }
  ],
  estimatedCallsPerLeague: 380, // ~380 API calls par ligue
  pauseBetweenCalls: 12000 // 12s entre calls pour rate limiting
};

class SimpleHistoricalCollector {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.apiKey = process.env.API_FOOTBALL_KEY;
  }

  async validateConnections() {
    console.log('🔍 Validation des connexions...');
    
    // Test Supabase
    const { data, error } = await this.supabase.from('teams').select('count', { count: 'exact' });
    if (error) throw new Error(`Supabase: ${error.message}`);
    console.log('✅ Connexion Supabase: OK');
    
    // Test API Football
    const response = await fetch('https://v3.football.api-sports.io/status', {
      headers: {
        'x-rapidapi-key': this.apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });
    
    if (!response.ok) throw new Error(`API Football: ${response.status}`);
    
    const apiData = await response.json();
    console.log('✅ Connexion API Football: OK');
    console.log(`📊 Quota: ${apiData.response.requests.current}/${apiData.response.requests.limit_day} calls`);
    
    return {
      quotaUsed: apiData.response.requests.current,
      quotaLimit: apiData.response.requests.limit_day
    };
  }

  async collectLeagueFixtures(leagueId, leagueName) {
    console.log(`\n📥 Collecte ${leagueName} saison 2024-25...`);
    
    try {
      const response = await fetch(`https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=2024`, {
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const fixtures = data.response;
      
      console.log(`📊 ${fixtures.length} matchs trouvés pour ${leagueName}`);
      
      // Filtrer seulement les matchs terminés (saison 2024-25 terminée)
      const finishedFixtures = fixtures.filter(f => 
        ['FT', 'AET', 'PEN'].includes(f.fixture.status.short)
      );
      
      console.log(`✅ ${finishedFixtures.length} matchs terminés à collecter`);
      
      // Pour cette démo, on collecte juste les 5 premiers matchs
      let collected = 0;
      const maxToCollect = Math.min(5, finishedFixtures.length);
      
      for (let i = 0; i < maxToCollect; i++) {
        const fixture = finishedFixtures[i];
        
        try {
          await this.collectMatchDetails(fixture, leagueId, leagueName);
          collected++;
          
          console.log(`  ✅ Match ${collected}/${maxToCollect}: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
          
          // Pause pour rate limiting
          if (i < maxToCollect - 1) {
            console.log('  ⏳ Pause 12s...');
            await this.sleep(12000);
          }
          
        } catch (error) {
          console.error(`  ❌ Erreur match ${fixture.fixture.id}:`, error.message);
        }
      }
      
      console.log(`📈 ${leagueName}: ${collected}/${maxToCollect} matchs collectés (demo)`);
      return collected;
      
    } catch (error) {
      console.error(`❌ Erreur collecte ${leagueName}:`, error.message);
      return 0;
    }
  }

  async collectMatchDetails(fixture, leagueId, leagueName) {
    // 1. Sauvegarder les équipes
    await this.upsertTeam(fixture.teams.home);
    await this.upsertTeam(fixture.teams.away);
    
    // 2. Sauvegarder le match de base (sans stats détaillées pour cette démo)
    await this.upsertMatch(fixture, leagueId);
    
    // Pour collecte complète, on ajouterait:
    // - Statistics du match
    // - Lineups
    // - Events
  }

  async upsertTeam(teamData) {
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
        api_id: teamData.id,
        created_at: new Date().toISOString()
      });
    }
  }

  async upsertMatch(fixture, leagueId) {
    // Récupérer les IDs des équipes
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
    
    const matchData = {
      api_id: fixture.fixture.id,
      home_team_id: homeTeam?.id,
      away_team_id: awayTeam?.id,
      match_date: fixture.fixture.date,
      status: this.mapFixtureStatus(fixture.fixture.status.short),
      home_score: fixture.goals?.home || 0,
      away_score: fixture.goals?.away || 0,
      referee: fixture.fixture.referee,
      venue: fixture.fixture.venue?.name,
      league_api_id: leagueId,
      season: '2024-25',
      created_at: new Date().toISOString()
    };
    
    // Upsert match
    const { error } = await this.supabase
      .from('matches')
      .upsert(matchData, { onConflict: 'api_id' });
    
    if (error) {
      console.error('Erreur upsert match:', error.message);
    }
  }

  mapFixtureStatus(status) {
    const statusMap = {
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

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runPhase1Demo() {
    console.log('🚀 DÉMO COLLECTE PHASE 1 - SAISON 2024-25');
    console.log('==========================================');
    
    // Validation connexions
    const { quotaUsed, quotaLimit } = await this.validateConnections();
    
    if (quotaUsed > quotaLimit * 0.9) {
      console.log('⚠️  Quota API > 90%, démo limitée');
    }
    
    console.log('\n📋 Collecte démo (5 matchs par ligue)');
    
    let totalCollected = 0;
    
    for (const league of PHASE_1_CONFIG.leagues) {
      const collected = await this.collectLeagueFixtures(league.id, league.name);
      totalCollected += collected;
      
      // Pause entre ligues
      console.log('⏳ Pause 30s entre ligues...');
      await this.sleep(30000);
    }
    
    console.log(`\n✅ DÉMO TERMINÉE`);
    console.log(`📊 ${totalCollected} matchs collectés (démo)`);
    console.log(`💾 Données sauvées en base Supabase`);
    console.log(`\n💡 Pour collecte complète:`);
    console.log(`   - Modifier maxToCollect = finishedFixtures.length`);
    console.log(`   - Ajouter collecte statistics + lineups`);
    console.log(`   - Durée estimée: ~2-3 heures par ligue`);
  }
}

async function main() {
  try {
    const collector = new SimpleHistoricalCollector();
    await collector.runPhase1Demo();
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);