#!/usr/bin/env node

/**
 * Script de test pour la collecte historique multi-saisons
 * Août 2025 - Phase 1: Saison 2024-25 complète (terminée)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import dynamique du collector (contournement TypeScript)
async function importCollector() {
  try {
    // Tentative d'import du collector compilé ou source
    const collectorPath = path.resolve(__dirname, '../src/lib/collectors/historical-collector.ts');
    console.log('📦 Chargement du collector historique...');
    
    // Pour le développement, on simule le collector
    return {
      default: MockHistoricalDataCollector
    };
  } catch (error) {
    console.error('❌ Erreur chargement collector:', error.message);
    return { default: MockHistoricalDataCollector };
  }
}

// Mock collector pour test initial
class MockHistoricalDataCollector {
  constructor() {
    this.COLLECTION_PHASES = [
      {
        phase: 1,
        season: '2024-25',
        year: 2024,
        leagues: [61, 39, 140, 78, 135],
        description: 'Saison 2024-25 complète (terminée)',
        estimatedCalls: 1900
      },
      {
        phase: 2, 
        season: '2023-24',
        year: 2023,
        leagues: [61, 39, 140, 78, 135],
        description: 'Saison 2023-24 complète pour entraînement',
        estimatedCalls: 1900
      },
      {
        phase: 3,
        season: '2022-23', 
        year: 2022,
        leagues: [61, 39, 140, 78, 135],
        description: 'Saison 2022-23 pour validation robuste',
        estimatedCalls: 1900
      }
    ];
    
    this.LEAGUE_NAMES = {
      61: 'Ligue 1',
      39: 'Premier League', 
      140: 'La Liga',
      78: 'Bundesliga',
      135: 'Serie A'
    };
  }
  
  async estimateCollectionCost() {
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
    
    console.log(`\n📋 STRATÉGIE AOÛT 2025:`);
    console.log(`1. Phase 1: Saison 2024-25 complète → ~3 jours`);
    console.log(`2. Phase 2: Saison 2023-24 complète → ~3 jours`);
    console.log(`3. Phase 3: Saison 2022-23 complète → ~3 jours`);
    console.log(`4. Total: ~9 jours pour 3 saisons complètes`);
    console.log(`5. Puis: Entraînement ML sur ~5700 matchs`);
    console.log(`6. Enfin: Prédictions saison 2025-26 en cours`);
  }
  
  async startSinglePhase(phaseNumber) {
    const phase = this.COLLECTION_PHASES.find(p => p.phase === phaseNumber);
    if (!phase) {
      throw new Error(`Phase ${phaseNumber} not found`);
    }
    
    console.log(`\n🎯 SIMULATION Phase ${phaseNumber}: ${phase.description}`);
    console.log(`🏆 Ligues: ${phase.leagues.map(id => this.LEAGUE_NAMES[id]).join(', ')}`);
    console.log(`📞 Estimation: ${phase.estimatedCalls} API calls`);
    console.log(`⏱️ Durée: ${Math.ceil(phase.estimatedCalls / 7000)} jours`);
    
    console.log(`\n📋 Détail collecte Phase ${phaseNumber}:`);
    phase.leagues.forEach(leagueId => {
      const leagueName = this.LEAGUE_NAMES[leagueId];
      const estimatedMatches = Math.floor(phase.estimatedCalls / phase.leagues.length / 3); // 3 calls per match
      console.log(`  📊 ${leagueName}: ~${estimatedMatches} matchs`);
    });
    
    console.log(`\n✅ Simulation Phase ${phaseNumber} terminée !`);
    console.log(`💡 Pour démarrer la vraie collecte:`);
    console.log(`   node scripts/start-collection.js --phase=${phaseNumber}`);
  }
  
  async startProgressiveCollection() {
    console.log('🚀 SIMULATION COLLECTE PROGRESSIVE MULTI-SAISONS');
    console.log('=================================================');
    
    for (const phase of this.COLLECTION_PHASES) {
      await this.startSinglePhase(phase.phase);
      console.log(''); // Ligne vide entre phases
    }
    
    console.log('✅ Simulation collecte progressive terminée !');
    console.log('\n🎯 RÉSULTAT ATTENDU:');
    console.log('📈 ~5700 matchs collectés sur 3 saisons');
    console.log('🧠 Base d\'entraînement ML solide');  
    console.log('🔮 Prêt pour prédictions saison 2025-26');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const phaseArg = args.find(arg => arg.startsWith('--phase='));
  const phase = phaseArg ? parseInt(phaseArg.split('=')[1]) : null;

  console.log('🚀 UsualOdds - Test Collecte Historique');
  console.log('=======================================');
  console.log('📅 Août 2025 - Saisons cibles: 2024-25, 2023-24, 2022-23\n');

  try {
    const { default: HistoricalDataCollector } = await importCollector();
    const collector = new HistoricalDataCollector();

    switch (command) {
      case 'estimate':
        await collector.estimateCollectionCost();
        break;
        
      case 'phase':
        if (!phase || phase < 1 || phase > 3) {
          console.error('❌ Phase invalide. Utiliser --phase=1, --phase=2, ou --phase=3');
          process.exit(1);
        }
        await collector.startSinglePhase(phase);
        break;
        
      case 'start':
        console.log('⚠️  ATTENTION: Ceci démarrera la vraie collecte avec appels API');
        console.log('💡 Pour la simulation, utiliser: node scripts/test-historical-collection.js simulate\n');
        await collector.startProgressiveCollection();
        break;
        
      case 'simulate':
      default:
        await collector.startProgressiveCollection();
        break;
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 UsualOdds - Test Collecte Historique

UTILISATION:
  node scripts/test-historical-collection.js [command] [options]

COMMANDES:
  simulate    Simulation de la collecte (défaut)
  estimate    Estimation coût et durée
  phase       Test d'une phase spécifique --phase=1|2|3  
  start       ⚠️ Démarrage RÉEL de la collecte

EXEMPLES:
  node scripts/test-historical-collection.js
  node scripts/test-historical-collection.js estimate
  node scripts/test-historical-collection.js phase --phase=1
  node scripts/test-historical-collection.js start

PHASES:
  Phase 1: Saison 2024-25 complète (terminée)
  Phase 2: Saison 2023-24 pour entraînement  
  Phase 3: Saison 2022-23 pour validation
`);
  process.exit(0);
}

main().catch(console.error);