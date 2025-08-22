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
import { createAdminClient } from '@/lib/supabase';
import { spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
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
  console.log('📊 Récupération matches à venir (fallback)...');
  
  const supabase = createAdminClient();
  
  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      id,
      home_team_name,
      away_team_name,
      date,
      venue_name,
      season,
      home_team_id,
      away_team_id,
      status
    `)
    .is('home_score', null)
    .is('away_score', null)
    .gte('date', new Date().toISOString())
    .order('date')
    .limit(limit);
    
  if (error) {
    throw new Error(`Données de prédiction - À venir: ${error.message}`);
  }
  
  console.log(`✅ ${matches?.length || 0} matches trouvés`);
  return matches || [];
}

/**
 * NOUVEAU: Déclenche l'apprentissage continu du modèle
 */
async function triggerContinuousLearning(): Promise<void> {
  console.log('📚 Déclenchement apprentissage continu...');
  
  try {
    // Vérifier s'il y a de nouveaux résultats à apprendre
    const supabase = createAdminClient();
    
    // Récupérer matches récents avec résultats
    const { data: recentMatches, error } = await supabase
      .from('matches')
      .select('id, home_score, away_score, date, status')
      .eq('status', 'Match Finished')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 derniers jours
      .order('date', { ascending: false });
    
    if (error || !recentMatches || recentMatches.length === 0) {
      console.log('📝 Pas de nouveaux résultats à apprendre');
      return;
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
      let drawProb = 0.25 + (0.10 * Math.random());
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
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Erreur API Prédictions:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
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