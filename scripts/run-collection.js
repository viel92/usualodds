#!/usr/bin/env node

/**
 * RUNNER POUR COLLECTE HISTORIQUE PRODUCTION
 * Usage: node run-collection.js [command] [options]
 */

import ProductionHistoricalCollector from './production-historical-collector.js';
import { COLLECTION_PHASES } from './production-historical-collector.js';

async function showHelp() {
  console.log(`
🚀 UsualOdds - Collecteur Historique Production

USAGE:
  node scripts/run-collection.js <command> [options]

COMMANDES:
  phase <1|2|3>     Collecte une phase spécifique
  all               Collecte toutes les phases (séquentiel)
  status            Affiche le statut de progression
  resume            Reprend une collecte interrompue

OPTIONS:
  --force             Ignore les vérifications de quota
  --stats             Inclut statistiques et compositions (plus lent)
  --dry-run           Simulation sans appels API réels

EXEMPLES:
  node scripts/run-collection.js phase 1
  node scripts/run-collection.js phase 1 --stats
  node scripts/run-collection.js all --force
  node scripts/run-collection.js status

PHASES:
  Phase 1: Saison 2024-25 complète (~1900 calls, ~6h)
  Phase 2: Saison 2023-24 complète (~1900 calls, ~6h) 
  Phase 3: Saison 2022-23 complète (~1900 calls, ~6h)
  Total:   ~5700 calls sur ~18h (avec rate limiting)
`);
}

async function showStatus() {
  const collector = new ProductionHistoricalCollector();
  const progress = await collector.getProgress();
  
  if (!progress) {
    console.log('❌ Aucune collecte en cours ou terminée');
    return;
  }

  console.log('\n📊 STATUT DE LA COLLECTE HISTORIQUE');
  console.log('====================================');
  console.log(`🚀 Démarrée: ${new Date(progress.started_at).toLocaleString()}`);
  console.log(`📅 Dernière MAJ: ${new Date(progress.last_updated).toLocaleString()}`);
  console.log(`📈 Total: ${progress.total_matches_collected} matchs, ${progress.total_api_calls_used} API calls`);

  for (const [phaseKey, phaseData] of Object.entries(progress.phases)) {
    console.log(`\n📋 PHASE ${phaseData.phase}: ${phaseData.season}`);
    console.log(`   Status: ${getStatusIcon(phaseData.status)} ${phaseData.status}`);
    
    if (phaseData.started_at) {
      console.log(`   Démarrée: ${new Date(phaseData.started_at).toLocaleString()}`);
    }
    
    if (phaseData.completed_at) {
      console.log(`   Terminée: ${new Date(phaseData.completed_at).toLocaleString()}`);
    }
    
    console.log(`   Matchs: ${phaseData.total_matches || 0}, API calls: ${phaseData.total_api_calls || 0}`);
    
    // Détail par ligue
    for (const [leagueKey, leagueData] of Object.entries(phaseData.leagues || {})) {
      const status = getStatusIcon(leagueData.status);
      console.log(`     ${status} ${leagueData.league_name}: ${leagueData.matches_collected || 0} matchs`);
    }
  }
  
  // Estimation temps restant
  const totalPhases = COLLECTION_PHASES.length;
  const completedPhases = Object.values(progress.phases).filter(p => p.status === 'completed').length;
  const remainingPhases = totalPhases - completedPhases;
  
  if (remainingPhases > 0) {
    console.log(`\n⏱️  Phases restantes: ${remainingPhases}/${totalPhases}`);
    console.log(`📅 Temps estimé restant: ~${remainingPhases * 6}h (avec rate limiting)`);
  } else {
    console.log('\n✅ COLLECTE COMPLÈTE TERMINÉE !');
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'completed': return '✅';
    case 'in_progress': return '🔄';
    case 'error': return '❌';
    case 'started': return '🚀';
    default: return '⏳';
  }
}

async function runPhase(phaseNumber, options) {
  console.log(`🎯 COLLECTE PHASE ${phaseNumber}`);
  console.log('============================');
  
  if (options.dryRun) {
    console.log('🧪 MODE SIMULATION - Aucun appel API réel');
    
    const phase = COLLECTION_PHASES.find(p => p.phase === phaseNumber);
    if (!phase) {
      console.error(`❌ Phase ${phaseNumber} introuvable`);
      process.exit(1);
    }
    
    console.log(`📋 ${phase.description}`);
    console.log(`🏆 Ligues: ${phase.leagues.map(l => l.name).join(', ')}`);
    console.log(`📞 Estimation: ${phase.estimatedCallsPerLeague * phase.leagues.length} API calls`);
    console.log(`⏱️  Durée estimée: ~6h avec rate limiting`);
    
    return;
  }
  
  const collector = new ProductionHistoricalCollector();
  
  try {
    const finalProgress = await collector.runPhase(phaseNumber, {
      force: options.force,
      includeStatistics: options.stats
    });
    
    console.log('\n✅ COLLECTE TERMINÉE AVEC SUCCÈS !');
    console.log(`📊 Résultat: ${finalProgress.total_matches_collected} matchs collectés`);
    
  } catch (error) {
    console.error(`❌ Erreur collecte Phase ${phaseNumber}:`, error.message);
    process.exit(1);
  }
}

async function runAllPhases(options) {
  console.log('🚀 COLLECTE COMPLÈTE - TOUTES LES PHASES');
  console.log('========================================');
  
  if (options.dryRun) {
    console.log('🧪 MODE SIMULATION - Aucun appel API réel');
    
    COLLECTION_PHASES.forEach(phase => {
      console.log(`\n📋 Phase ${phase.phase}: ${phase.description}`);
      console.log(`🏆 Ligues: ${phase.leagues.map(l => l.name).join(', ')}`);
      console.log(`📞 Estimation: ${phase.estimatedCallsPerLeague * phase.leagues.length} API calls`);
    });
    
    const totalCalls = COLLECTION_PHASES.reduce((sum, p) => sum + (p.estimatedCallsPerLeague * p.leagues.length), 0);
    console.log(`\n🎯 TOTAL ESTIMATION:`);
    console.log(`📞 API Calls: ${totalCalls} calls`);
    console.log(`⏱️  Durée: ~18h avec rate limiting`);
    console.log(`📊 Matchs attendus: ~${totalCalls / 3} matchs`);
    
    return;
  }
  
  console.log('⚠️  ATTENTION: Collecte complète ~18h avec 5700+ API calls');
  console.log('💡 Recommandé: Lancer phase par phase avec monitoring');
  
  if (!options.force) {
    console.log('\n🛑 Utilisez --force pour confirmer la collecte complète');
    process.exit(0);
  }
  
  const collector = new ProductionHistoricalCollector();
  
  try {
    const finalProgress = await collector.runAllPhases({
      includeStatistics: options.stats
    });
    
    console.log('\n✅ COLLECTE COMPLÈTE TERMINÉE !');
    console.log(`📊 Total final: ${finalProgress.total_matches_collected} matchs`);
    console.log(`📞 API calls utilisés: ${finalProgress.total_api_calls_used}`);
    
  } catch (error) {
    console.error('❌ Erreur collecte complète:', error.message);
    process.exit(1);
  }
}

async function resumeCollection() {
  console.log('🔄 REPRISE DE COLLECTE INTERROMPUE');
  
  const collector = new ProductionHistoricalCollector();
  const progress = await collector.getProgress();
  
  if (!progress) {
    console.log('❌ Aucune collecte à reprendre');
    process.exit(1);
  }
  
  // Trouver la première phase incomplète
  const incompletePhase = Object.values(progress.phases).find(p => 
    p.status === 'started' || p.status === 'in_progress'
  );
  
  if (!incompletePhase) {
    console.log('✅ Toutes les phases sont terminées');
    return;
  }
  
  console.log(`🎯 Reprise Phase ${incompletePhase.phase}: ${incompletePhase.season}`);
  
  try {
    await collector.runPhase(incompletePhase.phase, { resume: true });
    console.log('✅ Reprise terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur reprise:', error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const subCommand = args[1];
  
  const options = {
    force: args.includes('--force'),
    stats: args.includes('--stats'),
    dryRun: args.includes('--dry-run')
  };

  try {
    switch (command) {
      case 'help':
      case '--help':
      case '-h':
        await showHelp();
        break;
        
      case 'status':
        await showStatus();
        break;
        
      case 'phase':
        const phaseNum = parseInt(subCommand);
        if (!phaseNum || phaseNum < 1 || phaseNum > 3) {
          console.error('❌ Phase invalide. Utiliser: 1, 2, ou 3');
          process.exit(1);
        }
        await runPhase(phaseNum, options);
        break;
        
      case 'all':
        await runAllPhases(options);
        break;
        
      case 'resume':
        await resumeCollection();
        break;
        
      default:
        console.error('❌ Commande invalide');
        await showHelp();
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

if (process.argv.includes('--help') || process.argv.includes('-h') || process.argv.length === 2) {
  showHelp();
} else {
  main().catch(console.error);
}