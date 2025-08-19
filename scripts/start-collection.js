#!/usr/bin/env node

/**
 * COLLECTE RÉELLE DONNÉES HISTORIQUES
 * Août 2025 - Démarrage Phase 1: Saison 2024-25 complète
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger variables environnement
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function validateEnvironment() {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'API_FOOTBALL_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Variables environnement manquantes:', missing.join(', '));
    console.log('💡 Vérifier le fichier .env.local');
    process.exit(1);
  }
  
  console.log('✅ Variables environnement validées');
}

async function testConnections() {
  console.log('🔍 Test des connexions...');
  
  try {
    // Test Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase.from('teams').select('count', { count: 'exact' });
    if (error) throw error;
    
    console.log('✅ Connexion Supabase: OK');
    
    // Test API Football (simple call)
    const response = await fetch('https://v3.football.api-sports.io/status', {
      headers: {
        'x-rapidapi-key': process.env.API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });
    
    if (!response.ok) throw new Error(`API Football: ${response.status}`);
    
    const apiData = await response.json();
    console.log('✅ Connexion API Football: OK');
    console.log(`📊 Quota: ${apiData.response.requests.current}/${apiData.response.requests.limit_day} calls aujourd'hui`);
    
    return {
      apiQuotaUsed: apiData.response.requests.current,
      apiQuotaLimit: apiData.response.requests.limit_day
    };
    
  } catch (error) {
    console.error('❌ Erreur test connexions:', error.message);
    process.exit(1);
  }
}

async function startPhaseCollection(phase) {
  console.log(`\n🚀 DÉMARRAGE COLLECTE PHASE ${phase}`);
  console.log('=====================================');
  
  try {
    // Import dynamique du collector TypeScript
    const collectorModule = await import('../src/lib/collectors/historical-collector.ts');
    const HistoricalDataCollector = collectorModule.default;
    
    const collector = new HistoricalDataCollector();
    
    console.log(`⏳ Démarrage collecte Phase ${phase}...`);
    await collector.startSinglePhase(phase);
    
    console.log(`\n✅ Phase ${phase} terminée avec succès !`);
    
  } catch (error) {
    console.error(`❌ Erreur Phase ${phase}:`, error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

async function startProgressiveCollection() {
  console.log('\n🚀 DÉMARRAGE COLLECTE PROGRESSIVE COMPLÈTE');
  console.log('==========================================');
  
  try {
    const collectorModule = await import('../src/lib/collectors/historical-collector.ts');
    const HistoricalDataCollector = collectorModule.default;
    
    const collector = new HistoricalDataCollector();
    
    console.log('⏳ Démarrage collecte progressive (3 phases)...');
    await collector.startProgressiveCollection();
    
    console.log('\n✅ Collecte progressive terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur collecte progressive:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const phaseArg = args.find(arg => arg.startsWith('--phase='));
  const phase = phaseArg ? parseInt(phaseArg.split('=')[1]) : null;
  const forceArg = args.includes('--force');

  console.log('🚀 UsualOdds - Collecte Historique RÉELLE');
  console.log('=========================================');
  console.log('📅 Août 2025 - Collecte multi-saisons\n');

  // Validation environnement
  await validateEnvironment();
  
  // Test connexions
  const { apiQuotaUsed, apiQuotaLimit } = await testConnections();
  
  // Vérification quota API
  if (apiQuotaUsed > apiQuotaLimit * 0.8) {
    console.log(`⚠️  ATTENTION: Quota API utilisé à ${Math.round(apiQuotaUsed/apiQuotaLimit*100)}%`);
    console.log('💡 Recommandation: Attendre demain pour collecte complète');
    
    if (!forceArg) {
      console.log('🛑 Collecte annulée. Utiliser --force pour forcer.');
      process.exit(1);
    }
  }

  // Confirmation utilisateur
  if (!forceArg) {
    console.log('\n⚠️  CONFIRMATION REQUISE:');
    console.log('Cette collecte utilisera des appels API réels.');
    console.log('Continuer ? (y/N)');
    
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('> ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('🛑 Collecte annulée par l\'utilisateur.');
      process.exit(0);
    }
  }

  try {
    switch (command) {
      case 'phase':
        if (!phase || phase < 1 || phase > 3) {
          console.error('❌ Phase invalide. Utiliser --phase=1, --phase=2, ou --phase=3');
          process.exit(1);
        }
        await startPhaseCollection(phase);
        break;
        
      case 'all':
        await startProgressiveCollection();
        break;
        
      default:
        console.error('❌ Commande invalide');
        console.log(`
UTILISATION:
  node scripts/start-collection.js phase --phase=1    # Phase 1 uniquement
  node scripts/start-collection.js phase --phase=2    # Phase 2 uniquement  
  node scripts/start-collection.js phase --phase=3    # Phase 3 uniquement
  node scripts/start-collection.js all                # Toutes les phases
  
OPTIONS:
  --force    Ignorer confirmations et quotas
  
PHASES:
  Phase 1: Saison 2024-25 complète (~1900 calls)
  Phase 2: Saison 2023-24 complète (~1900 calls) 
  Phase 3: Saison 2022-23 complète (~1900 calls)
`);
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);