/**
 * API PRÉDICTIONS UNIFIÉE - USUALODDS SAAS
 * =========================================
 * 
 * UNE SEULE API pour toutes les prédictions
 * - Dashboard
 * - Page Prédictions  
 * - Mobile
 * 
 * Architecture robuste et cohérente
 */

import { NextRequest, NextResponse } from 'next/server';
import { PredictionsCache, CacheHeaders, CACHE_CONFIG } from '@/lib/cache-manager';
import { createAdminClient } from '@/lib/supabase';
import { getUpcomingMatchesPaginated, getRecentFinishedMatchesPaginated, safeQuery } from '@/lib/supabase-pagination';
import { spawn } from 'child_process';
import * as path from 'path';

// Types pour l'API unifiée
interface Prediction {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  venue: string;
  probabilities: {
    home: number;
    draw: number;
    away: number;
  };
  confidence: number;
  prediction: 'home' | 'draw' | 'away';
  features: {
    homeElo: number;
    awayElo: number;
    homeForm: number;
    awayForm: number;
  };
}

interface APIResponse {
  success: boolean;
  data?: {
    predictions: Prediction[];
    pagination: {
      total: number;
      page: number;
      perPage: number;
      hasMore: boolean;
    };
    meta: {
      avgConfidence: number;
      modelAccuracy: string;
      lastUpdate: string;
      generated: number;
    };
  };
  error?: string;
}

/**
 * NOUVEAU: Calcule prédictions en temps réel avec Ultra Sophisticated ML System
 */
async function calculateRealTimePredictions(limit: number = 20): Promise<Prediction[]> {
  console.log('🧠 Calcul prédictions temps réel Ultra Sophisticated...');
  
  try {
    // Exécuter le système Python Ultra Sophisticated
    const pythonScript = path.join(process.cwd(), 'generate_sophisticated_predictions.py');
    
    const pythonProcess = spawn('python', [pythonScript, '--matches', limit.toString()], {
      cwd: process.cwd(),
      env: { ...process.env }
    });
    
    let output = '';
    let error = '';
    
    pythonProcess.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr?.on('data', (data) => {
      error += data.toString();
    });
    
    // Attendre la fin du processus
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Python script failed with code ${code}: ${error}`));
        }
      });
    });
    
    // Charger le cache généré
    return await loadSophisticatedPredictions();
    
  } catch (error) {
    console.error('❌ Erreur calcul temps réel:', error);
    throw error;
  }
}

/**
 * Charge prédictions depuis cache Ultra Sophisticated ML System
 */
async function loadSophisticatedPredictions(): Promise<Prediction[]> {
  console.log('🧠 Chargement prédictions Ultra Sophisticated...');
  
  try {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    
    // Chercher cache API sophistiqué
    const cacheFile = path.join(process.cwd(), 'predictions_cache_api_sophisticated.json');
    
    try {
      const cacheData = await fs.readFile(cacheFile, 'utf-8');
      const cache = JSON.parse(cacheData);
      
      // Vérifier fraîcheur du cache (max 2h)
      const generated = new Date(cache.generated_at);
      const now = new Date();
      const ageHours = (now.getTime() - generated.getTime()) / (1000 * 60 * 60);
      
      if (ageHours > 2) {
        console.log(`⚠️ Cache obsolète (${ageHours.toFixed(1)}h), fallback...`);
        return [];
      }
      
      console.log(`✅ Cache sophistiqué chargé: ${cache.total} prédictions (${cache.model_version})`);
      return cache.predictions || [];
      
    } catch (fileError) {
      console.log('📝 Cache sophistiqué non trouvé, fallback...');
      return [];
    }
    
  } catch (error) {
    console.error('❌ Erreur chargement cache sophistiqué:', error);
    return [];
  }
}

/**
 * Récupère les matches à venir depuis Supabase (fallback)
 */
async function getUpcomingMatches(limit: number = 20) {
  console.log('📊 Récupération matches à venir avec pagination automatique...');
  
  const supabase = createAdminClient();
  
  try {
    // Utiliser la pagination automatique
    const result = await getUpcomingMatchesPaginated(supabase, limit);
    
    console.log(`✅ ${result.data.length} matches trouvés (${result.batches} batches)`);
    if (result.hasMore) {
      console.log('⚠️ Plus de matches disponibles que la limite demandée');
    }
    
    return result.data || [];
    
  } catch (error) {
    console.error('❌ Erreur récupération matches:', error);
    throw new Error(`Données de prédiction - À venir: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * NOUVEAU: Déclenche l'apprentissage continu du modèle
 */
async function triggerContinuousLearning(): Promise<void> {
  console.log('📚 Déclenchement apprentissage continu...');
  
  try {
    // Vérifier s'il y a de nouveaux résultats à apprendre
    const supabase = createAdminClient();
    
    // Récupérer matches récents avec résultats - avec pagination
    const result = await getRecentFinishedMatchesPaginated(supabase, 7);
    const recentMatches = result.data;
    
    if (!recentMatches || recentMatches.length === 0) {
      console.log('📝 Pas de nouveaux résultats à apprendre');
      return;
    }
    
    if (result.batches > 1) {
      console.log(`📊 Récupération en ${result.batches} batches pour éviter limite Supabase`);
    }
    
    console.log(`🔄 ${recentMatches.length} nouveaux résultats détectés`);
    
    // Déclencher re-entraînement en arrière-plan (sans attendre)
    const retrainScript = path.join(process.cwd(), 'retrain_ultra_sophisticated.py');
    
    const retrainProcess = spawn('python', [retrainScript, '--new-results', recentMatches.length.toString()], {
      cwd: process.cwd(),
      env: { ...process.env },
      detached: true,
      stdio: 'ignore'
    });
    
    retrainProcess.unref(); // Permet au processus parent de se terminer
    
    console.log('✅ Apprentissage continu démarré en arrière-plan');
    
  } catch (error) {
    console.warn('⚠️ Erreur apprentissage continu:', error);
    // Ne pas faire échouer l'API pour autant
  }
}

/**
 * Génère prédictions basées sur ELO + forme (FALLBACK)
 */
async function generatePredictions(matches: any[]): Promise<Prediction[]> {
  console.log('🎲 Génération prédictions...');
  
  const supabase = createAdminClient();
  const predictions: Prediction[] = [];
  
  for (const match of matches) {
    try {
      // Récupérer features équipes si disponibles
      const [homeFeatures, awayFeatures] = await Promise.all([
        supabase
          .from('team_features')
          .select('elo_rating, form_5_points, possession_avg')
          .eq('team_name', match.home_team_name)
          .single(),
        supabase
          .from('team_features')
          .select('elo_rating, form_5_points, possession_avg')
          .eq('team_name', match.away_team_name)
          .single()
      ]);
      
      // ELO par défaut si pas trouvé
      const homeElo = homeFeatures.data?.elo_rating || 1500;
      const awayElo = awayFeatures.data?.elo_rating || 1500;
      const homeForm = homeFeatures.data?.form_5_points || 7;
      const awayForm = awayFeatures.data?.form_5_points || 7;
      
      // Calcul probabilités ELO + avantage domicile
      const homeAdvantage = 100;
      const eloDiff = (homeElo + homeAdvantage) - awayElo;
      
      // Formule ELO standard
      const expectedHome = 1 / (1 + Math.pow(10, -eloDiff / 400));
      
      // Ajustement pour 3 résultats
      let homeProb = Math.max(0.25, Math.min(0.70, expectedHome));
      let drawProb = Math.max(0.15, 0.35 - (Math.abs(eloDiff) / 2000));
      let awayProb = 1 - homeProb - drawProb;
      
      // Normalisation à 100%
      const total = homeProb + drawProb + awayProb;
      homeProb = Math.round((homeProb / total) * 100);
      drawProb = Math.round((drawProb / total) * 100);
      awayProb = 100 - homeProb - drawProb;
      
      // Prédiction finale
      const maxProb = Math.max(homeProb, drawProb, awayProb);
      const prediction = 
        homeProb === maxProb ? 'home' :
        awayProb === maxProb ? 'away' : 'draw';
      
      // Confiance basée sur écart ELO + forme
      const confidence = Math.min(95, 
        60 + Math.abs(eloDiff) / 15 + Math.abs(homeForm - awayForm) * 2
      );
      
      predictions.push({
        id: match.id,
        homeTeam: match.home_team_name,
        awayTeam: match.away_team_name,
        date: match.date,
        venue: match.venue_name || 'Stade non défini',
        probabilities: {
          home: homeProb,
          draw: drawProb,
          away: awayProb
        },
        confidence: Math.round(confidence),
        prediction: prediction as 'home' | 'draw' | 'away',
        features: {
          homeElo: Math.round(homeElo),
          awayElo: Math.round(awayElo),
          homeForm: Math.round(homeForm * 10) / 10,
          awayForm: Math.round(awayForm * 10) / 10
        }
      });
      
    } catch (error) {
      console.warn(`⚠️ Erreur prédiction match ${match.id}:`, error);
      // Continue avec le match suivant
    }
  }
  
  return predictions;
}

/**
 * GET /api/predictions
 * Paramètres:
 * - limit: nombre max de prédictions (défaut: 20)
 * - confidence_min: confiance minimale (défaut: 0) 
 * - page: pagination (défaut: 1)
 */
export async function GET(request: NextRequest): Promise<NextResponse<APIResponse>> {
  try {
    console.log('🎯 API Prédictions Unifiée - Démarrage');
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const confidenceMin = parseInt(searchParams.get('confidence_min') || '0');
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    
    // NOUVEAU: Déclencher apprentissage continu en arrière-plan
    triggerContinuousLearning().catch(err => 
      console.warn('Apprentissage continu échoué:', err)
    );
    
    // PRIORITÉ 1: Calcul prédictions temps réel Ultra Sophisticated
    let allPredictions: Prediction[] = [];
    
    try {
      console.log('🚀 Tentative calcul temps réel Ultra Sophisticated...');
      allPredictions = await calculateRealTimePredictions(limit);
      console.log(`✅ ${allPredictions.length} prédictions temps réel générées`);
    } catch (error) {
      console.log('⚠️ Échec calcul temps réel, tentative cache...');
      
      // FALLBACK 1: Charger cache sophistiqué existant
      try {
        allPredictions = await loadSophisticatedPredictions();
        console.log(`📦 ${allPredictions.length} prédictions depuis cache`);
      } catch (cacheError) {
        console.log('⚠️ Échec cache, génération basique...');
        allPredictions = [];
      }
    }
    
    if (allPredictions.length === 0) {
      console.log('🔄 Fallback vers génération basique...');
      
      // FALLBACK 2: Générer avec algorithme basique
      const upcomingMatches = await getUpcomingMatches(limit * 2);
      
      if (upcomingMatches.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            predictions: [],
            pagination: {
              total: 0,
              page: 1,
              perPage: limit,
              hasMore: false
            },
            meta: {
              avgConfidence: 0,
              modelAccuracy: '54.2%',
              lastUpdate: new Date().toISOString(),
              generated: 0
            }
          }
        });
      }
      
      // Générer prédictions fallback
      allPredictions = await generatePredictions(upcomingMatches);
    } else {
      console.log(`🧠 Prédictions sophistiquées utilisées: ${allPredictions.length}`);
    }
    
    // Filtrer par confiance
    const filteredPredictions = allPredictions
      .filter(p => p.confidence >= confidenceMin)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPredictions = filteredPredictions.slice(startIndex, endIndex);
    
    // Calcul métadonnées
    const avgConfidence = allPredictions.length > 0 ? 
      Math.round(allPredictions.reduce((sum, p) => sum + p.confidence, 0) / allPredictions.length) : 0;
    
    const response: APIResponse = {
      success: true,
      data: {
        predictions: paginatedPredictions,
        pagination: {
          total: filteredPredictions.length,
          page,
          perPage: limit,
          hasMore: endIndex < filteredPredictions.length
        },
        meta: {
          avgConfidence,
          modelAccuracy: '54.2%',
          lastUpdate: new Date().toISOString(),
          generated: allPredictions.length
        }
      }
    };
    
    console.log(`✅ ${paginatedPredictions.length} prédictions retournées (page ${page})`);
    
    // Mettre en cache et ajouter headers
    const cacheKey = PredictionsCache.generateKey(CACHE_CONFIG.CACHE_KEYS.PREDICTIONS, { limit, confidenceMin, page });
    PredictionsCache.set(cacheKey, response.data);
    
    return NextResponse.json(response, {
      headers: CacheHeaders.getHeaders()
    });
    
  } catch (error) {
    console.error('❌ Erreur API Prédictions:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * HEAD /api/predictions
 * Health check et statut du cache
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createAdminClient();
    
    // Test connexion BDD
    const dbStart = Date.now();
    const { error: dbError } = await supabase
      .from('matches')
      .select('id')
      .limit(1);
    const dbLatency = Date.now() - dbStart;
    
    // Stats cache
    const cacheStats = PredictionsCache.getStats();
    
    // Cleanup automatique
    const cleaned = PredictionsCache.cleanup();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: !dbError,
        latency_ms: dbLatency,
        error: dbError?.message || null
      },
      cache: {
        ...cacheStats,
        cleaned_items: cleaned,
        hit_rate_percent: Math.round(cacheStats.hitRate * 100)
      },
      api: {
        cache_ttl_hours: CACHE_CONFIG.PREDICTIONS_TTL / (1000 * 60 * 60),
        version: '2.0'
      }
    };
    
    const status = dbError ? 503 : 200;
    
    return NextResponse.json(healthData, {
      status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { 
      status: 503,
      headers: { 'Cache-Control': 'no-cache' }
    });
  }
}

/**
 * POST /api/predictions
 * Force la régénération des prédictions
 */
export async function POST(request: NextRequest): Promise<NextResponse<APIResponse>> {
  try {
    console.log('🔄 Régénération forcée des prédictions...');
    
    // Pour l'instant, simplement renvoyer vers GET
    // Dans le futur: invalider cache, relancer ML, etc.
    return GET(request);
    
  } catch (error) {
    console.error('❌ Erreur régénération:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur régénération'
    }, { status: 500 });
  }
}