// INTÉGRATION API - SYSTÈME ML AUTOMATIQUE
// =========================================
// 
// Point d'intégration pour déclencher automatiquement le système ML
// après chaque match terminé dans votre API Next.js
//
// UTILISATION:
// 1. Ajouter ce code à votre API existante
// 2. Appeler processMatchResult() après chaque match terminé
// 3. Le système mettra à jour automatiquement ELO, forme, etc.

import { spawn } from 'child_process';
import * as path from 'path';

/**
 * NOUVEAU: Déclenche la mise à jour ML après un match terminé
 * Intègre directement avec le système ML Python
 */
export async function processMatchResult(matchId, matchData = null) {
  console.log(`🤖 ML Auto-Update: Processing match ${matchId}...`);
  
  try {
    // 1. Vérifier que le match est terminé
    if (matchData && matchData.status !== 'FT') {
      console.log(`⏳ Match ${matchId} not finished (${matchData.status}), skipping ML update`);
      return { success: true, message: 'Match not finished', processed: false };
    }
    
    // 2. Déclencher système ML Python
    const mlResult = await triggerMLSystem(matchId);
    
    // 3. Invalider cache prédictions pour forcer refresh
    await invalidatePredictionsCache();
    
    console.log(`✅ ML Auto-Update: Match ${matchId} processed successfully`);
    console.log(`📊 Updates: ELO=${mlResult.elo_updated}, Form=${mlResult.form_updated}`);
    
    return {
      success: true,
      match_id: matchId,
      ml_updates: mlResult,
      cache_invalidated: true,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ ML Auto-Update Error for match ${matchId}:`, error);
    return {
      success: false,
      match_id: matchId,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Déclenche le système ML Python
 */
async function triggerMLSystem(matchId) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'complete_ml_update_system.py');
    
    // Lancer script Python avec match ID spécifique
    const mlProcess = spawn('python', [
      pythonScript, 
      '--match-id', 
      matchId.toString()
    ], {
      cwd: process.cwd(),
      env: { ...process.env }
    });
    
    let output = '';
    let errorOutput = '';
    
    mlProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    mlProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    mlProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // Parser résultat JSON
          const result = JSON.parse(output);
          
          // Extraire métriques importantes
          const updates = result.updates || [];
          const eloUpdate = updates.find(u => u.type === 'elo_update');
          const formUpdate = updates.find(u => u.type === 'form_update');
          
          resolve({
            success: true,
            elo_updated: eloUpdate ? eloUpdate.success : false,
            form_updated: formUpdate ? formUpdate.success : false,
            total_updates: updates.filter(u => u.success).length,
            raw_result: result
          });
        } catch (parseError) {
          reject(new Error(`ML result parse error: ${parseError.message}`));
        }
      } else {
        reject(new Error(`ML process failed (code ${code}): ${errorOutput}`));
      }
    });
    
    // Timeout sécurité (30 secondes)
    setTimeout(() => {
      mlProcess.kill();
      reject(new Error('ML process timeout (30s)'));
    }, 30000);
  });
}

/**
 * Invalide le cache des prédictions pour forcer un refresh
 */
async function invalidatePredictionsCache() {
  try {
    const { PredictionsCache } = await import('@/lib/cache-manager');
    
    // Vider cache prédictions
    const cleared = PredictionsCache.clearAll();
    
    console.log(`🗑️ Predictions cache invalidated: ${cleared} items cleared`);
    return cleared;
    
  } catch (error) {
    console.warn('Cache invalidation failed:', error);
    return 0;
  }
}

/**
 * WEBHOOK ENDPOINT - À ajouter à votre API
 * Route: /api/ml-webhook
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { match_id, status, ...matchData } = body;
    
    if (!match_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'match_id required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Déclencher traitement ML
    const result = await processMatchResult(match_id, { status, ...matchData });
    
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * INTÉGRATION DANS VOTRE API EXISTANTE
 * Ajouter ces lignes dans votre route.ts après traitement d'un match
 */

/* EXEMPLE D'INTÉGRATION:

// Dans votre API existante, après qu'un match soit marqué comme terminé:
export async function updateMatchStatus(matchId, newStatus) {
  // Votre logique existante...
  await updateMatchInDatabase(matchId, newStatus);
  
  // NOUVELLE LIGNE: Déclencher ML si match terminé
  if (newStatus === 'FT') {
    // Déclencher en arrière-plan (non-bloquant)
    processMatchResult(matchId, { status: newStatus })
      .then(result => {
        console.log('ML update completed:', result);
      })
      .catch(error => {
        console.error('ML update failed:', error);
      });
  }
  
  return { success: true };
}

*/

/**
 * MAINTENANCE QUOTIDIENNE
 * À appeler une fois par jour pour vérifier les matchs manqués
 */
export async function runDailyMaintenance() {
  console.log('🔧 Starting daily ML maintenance...');
  
  try {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(process.cwd(), 'complete_ml_update_system.py');
      
      const maintenanceProcess = spawn('python', [
        pythonScript,
        '--full-maintenance'
      ], {
        cwd: process.cwd(),
        env: { ...process.env }
      });
      
      let output = '';
      
      maintenanceProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      maintenanceProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            console.log('✅ Daily maintenance completed:', result);
            resolve(result);
          } catch (parseError) {
            resolve({ success: false, error: 'Parse error', raw: output });
          }
        } else {
          reject(new Error(`Maintenance failed with code ${code}`));
        }
      });
      
      // Timeout 5 minutes
      setTimeout(() => {
        maintenanceProcess.kill();
        reject(new Error('Maintenance timeout'));
      }, 300000);
    });
    
  } catch (error) {
    console.error('❌ Daily maintenance error:', error);
    throw error;
  }
}

/**
 * CRON JOB - Configuration pour automatisation
 * À ajouter dans votre package.json ou système de déploiement
 */

/* CONFIGURATION AUTOMATISATION:

1. CRON JOB (toutes les 15 minutes):
   */15 * * * * node -e "import('./api_integration_webhook.js').then(m => m.runDailyMaintenance())"

2. WEBHOOK (temps réel):
   Configurer votre source de données pour appeler /api/ml-webhook quand un match se termine

3. VERCEL CRON (si déployé sur Vercel):
   // vercel.json
   {
     "crons": [
       {
         "path": "/api/ml-maintenance",
         "schedule": "0 2 * * *"
       }
     ]
   }

*/

export default {
  processMatchResult,
  runDailyMaintenance,
  POST
};