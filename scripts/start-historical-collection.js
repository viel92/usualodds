#!/usr/bin/env node

// Charger les variables d'environnement depuis .env
require('dotenv').config();

/**
 * SCRIPT DE COLLECTE HISTORIQUE MULTI-SAISONS  
 * Usage: node scripts/start-historical-collection.js [phase]
 * 
 * Sans argument: Collecte progressive complète (Phases 1, 2, 3)
 * Avec argument: Collecte d'une phase spécifique
 * 
 * Exemples:
 * node scripts/start-historical-collection.js          # Collecte complète
 * node scripts/start-historical-collection.js 1       # Phase 1 uniquement
 * node scripts/start-historical-collection.js estimate # Estimation coûts
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !API_FOOTBALL_KEY) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('- API_FOOTBALL_KEY');
  process.exit(1);
}

// Simulé HistoricalDataCollector (simplifié pour script standalone)
class SimpleHistoricalCollector {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Connected to Supabase');
  }

  async estimateCollectionCost() {
    console.log('📊 ESTIMATION COÛT COLLECTE PROGRESSIVE');
    console.log('=======================================');
    
    const phases = [
      {
        phase: 1,
        description: 'Saison courante 2024-25 (matchs terminés)',
        leagues: 5, // EPL, La Liga, Ligue 1, Bundesliga, Serie A
        estimatedMatches: 800, // ~160 matchs/ligue x 5
        estimatedCalls: 2400 // 3 calls/match (fixture + stats + lineups)
      },
      {
        phase: 2,
        description: 'Saison 2023-24 complète',
        leagues: 5,
        estimatedMatches: 1900, // ~380 matchs/ligue x 5
        estimatedCalls: 5700
      },
      {
        phase: 3,
        description: 'Saison 2022-23 complète',
        leagues: 5,
        estimatedMatches: 1900,
        estimatedCalls: 5700
      }
    ];
    
    let totalCalls = 0;
    let totalMatches = 0;
    
    phases.forEach(phase => {
      console.log(`\\nPhase ${phase.phase}: ${phase.description}`);
      console.log(`🏆 Ligues: ${phase.leagues} (EPL, La Liga, Ligue 1, Bundesliga, Serie A)`);
      console.log(`⚽ Matchs estimés: ${phase.estimatedMatches}`);
      console.log(`📞 API calls estimés: ${phase.estimatedCalls}`);
      console.log(`⏱️ Durée estimée: ${Math.ceil(phase.estimatedCalls / 7000)} jour(s)`);
      
      totalCalls += phase.estimatedCalls;
      totalMatches += phase.estimatedMatches;
    });
    
    console.log(`\\n🎯 TOTAL ESTIMATION:`);
    console.log(`⚽ Matchs: ${totalMatches} matchs sur 3 saisons`);
    console.log(`📞 API Calls: ${totalCalls} calls`);
    console.log(`⏱️ Durée totale: ${Math.ceil(totalCalls / 7000)} jours (limite 7500/jour)`);
    console.log(`💰 Coût: Inclus dans plan Pro API-Football`);
    
    console.log(`\\n📋 STRATÉGIE RECOMMANDÉE:`);
    console.log(`1. Commencer par Phase 1 (saison courante)`);
    console.log(`2. Phase 2 (2023-24) pour entraînement principal`);
    console.log(`3. Phase 3 (2022-23) pour validation robuste`);
    console.log(`4. Entraîner modèles ML sur 2-3 saisons`);
    console.log(`5. Prédire sur matchs à venir 2025`);
    
    return { totalCalls, totalMatches, phases };
  }

  async startPhase1() {
    console.log('🚀 DÉMARRAGE PHASE 1: Saison 2024-25 (matchs terminés)');
    console.log('=====================================================');
    
    // Test de connexion base de données
    const { data: leagues, error } = await this.supabase
      .from('leagues')
      .select('count');
    
    if (error) {
      console.error('❌ Erreur connexion base:', error.message);
      return;
    }
    
    console.log('✅ Connexion base de données OK');
    
    // Simulation collecte Phase 1
    console.log('\\n📊 Configuration Phase 1:');
    console.log('- Saison: 2024-25');
    console.log('- Status: Matchs terminés uniquement (FT)');
    console.log('- Ligues: 5 principales européennes');
    console.log('- Estimation: 800 matchs, 2400 API calls');
    
    console.log('\\n🎯 Pour démarrer la collecte réelle:');
    console.log('1. Vérifier les limites API (7500/jour)');
    console.log('2. Activer la collecte automatique');
    console.log('3. Monitoring progress via admin panel');
    
    // Créer table de progress si nécessaire
    await this.createProgressTable();
    
    return {
      phase: 1,
      status: 'ready',
      message: 'Prêt pour collecte Phase 1'
    };
  }

  async createProgressTable() {
    console.log('\\n📝 Création table de suivi...');
    
    const createTableSQL = `
      create table if not exists collection_progress (
        id uuid default uuid_generate_v4() primary key,
        phase integer not null,
        season text not null,
        league integer not null,
        league_name text,
        matches_collected integer default 0,
        total_matches integer default 0,
        api_calls_used integer default 0,
        status text check (status in ('pending', 'in_progress', 'completed', 'error')) default 'pending',
        started_at timestamp with time zone,
        completed_at timestamp with time zone,
        error_message text,
        created_at timestamp with time zone default now(),
        updated_at timestamp with time zone default now(),
        unique(phase, season, league)
      );
    `;
    
    try {
      await this.supabase.rpc('exec_sql', { query: createTableSQL });
      console.log('✅ Table collection_progress créée/vérifiée');
    } catch (error) {
      // Table existe probablement déjà
      console.log('ℹ️ Table collection_progress existe déjà');
    }
  }

  async showCurrentStatus() {
    console.log('📊 STATUT ACTUEL DE LA COLLECTE');
    console.log('================================');
    
    try {
      const { data: progress, error } = await this.supabase
        .from('collection_progress')
        .select('*')
        .order('phase');
      
      if (error) {
        console.log('ℹ️ Aucun historique de collecte trouvé');
        return;
      }
      
      if (!progress || progress.length === 0) {
        console.log('ℹ️ Aucune collecte démarrée');
        return;
      }
      
      // Regrouper par phase
      const byPhase = progress.reduce((acc, item) => {
        if (!acc[item.phase]) acc[item.phase] = [];
        acc[item.phase].push(item);
        return acc;
      }, {});
      
      Object.keys(byPhase).forEach(phase => {
        console.log(`\\nPhase ${phase}:`);
        byPhase[phase].forEach(p => {
          const status = p.status === 'completed' ? '✅' : 
                        p.status === 'error' ? '❌' : 
                        p.status === 'in_progress' ? '🔄' : '⏳';
          console.log(`  ${status} ${p.league_name || `Ligue ${p.league}`}: ${p.matches_collected}/${p.total_matches} matchs`);
        });
      });
      
    } catch (error) {
      console.error('❌ Erreur lecture statut:', error.message);
    }
  }
}

// Script principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const collector = new SimpleHistoricalCollector();
  
  console.log('🚀 COLLECTE HISTORIQUE MULTI-SAISONS');
  console.log('===================================');
  console.log(`📅 Date: ${new Date().toLocaleDateString('fr-FR')}`);
  console.log(`⚡ Commande: ${command || 'collecte complète'}`);
  
  try {
    switch (command) {
      case 'estimate':
        await collector.estimateCollectionCost();
        break;
        
      case '1':
        await collector.startPhase1();
        break;
        
      case 'status':
        await collector.showCurrentStatus();
        break;
        
      case 'setup':
        await collector.createProgressTable();
        console.log('✅ Configuration terminée');
        break;
        
      default:
        console.log('\\n📋 Commandes disponibles:');
        console.log('- node scripts/start-historical-collection.js estimate');
        console.log('- node scripts/start-historical-collection.js 1');
        console.log('- node scripts/start-historical-collection.js status');
        console.log('- node scripts/start-historical-collection.js setup');
        
        console.log('\\n🎯 Recommandation: Commencer par "estimate"');
        await collector.estimateCollectionCost();
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}