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
import { getUpcomingMatchesPaginated, getRecentFinishedMatchesPaginated } from '@/lib/supabase-pagination';
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
 * ELITE: Calcule prédictions avec système ML élite complet
 */
async function calculateElitePredictions(limit: number = 20): Promise<Prediction[]> {
  console.log('🧠 Elite ML System - Calcul prédictions niveau professionnel...');
  
  try {
    const { eliteDataPipeline } = await import('@/lib/data/elite-data-pipeline');
    const { EliteFeatureEngineering } = await import('@/lib/ml/elite-feature-engineering');
    const { eliteEnsembleSystem } = await import('@/lib/ml/elite-ensemble-system');
    const { elitePerformanceMonitor } = await import('@/lib/ml/elite-performance-monitor');
    
    const featureEngine = new EliteFeatureEngineering();
    const predictions: Prediction[] = [];
    
    // Récupérer matches à venir
    const upcomingMatches = await getUpcomingMatches(limit);
    
    for (const match of upcomingMatches) {
      try {
        console.log(`🔬 Elite processing: ${match.home_team_name} vs ${match.away_team_name}`);
        
        // 1. Extract complete match data (299 columns)
        const eliteData = await eliteDataPipeline.extractCompleteMatchData(match.id);
        
        if (!eliteData) {
          console.warn(`❌ Could not extract elite data for match ${match.id}`);
          continue;
        }
        
        // 2. Transform to elite features (200+ derived features)
        const eliteFeatures = await featureEngine.transformToEliteFeatures(eliteData);
        
        // 3. Generate elite prediction with ensemble
        const elitePrediction = await eliteEnsembleSystem.predict(eliteFeatures);
        
        // 4. Record for performance monitoring
        await elitePerformanceMonitor.recordPrediction(elitePrediction, eliteFeatures);
        
        // 5. Convert to API format
        const apiPrediction: Prediction = {
          id: match.id,
          homeTeam: match.home_team_name,
          awayTeam: match.away_team_name,
          date: match.date,
          venue: match.venue_name || 'Venue TBD',
          probabilities: {
            home: Math.round(elitePrediction.probabilities.home * 100),
            draw: Math.round(elitePrediction.probabilities.draw * 100),
            away: Math.round(elitePrediction.probabilities.away * 100)
          },
          confidence: elitePrediction.confidence,
          prediction: elitePrediction.probabilities.home > Math.max(elitePrediction.probabilities.draw, elitePrediction.probabilities.away) ? 'home' :
                    elitePrediction.probabilities.away > elitePrediction.probabilities.draw ? 'away' : 'draw',
          features: {
            homeElo: Math.round(eliteData.homeTeam.elo_rating),
            awayElo: Math.round(eliteData.awayTeam.elo_rating),
            homeForm: eliteData.homeTeam.form_5_points,
            awayForm: eliteData.awayTeam.form_5_points
          }
        };
        
        predictions.push(apiPrediction);
        
        console.log(`✅ Elite prediction: ${apiPrediction.homeTeam} ${apiPrediction.probabilities.home}% - ${apiPrediction.probabilities.draw}% - ${apiPrediction.probabilities.away}% ${apiPrediction.awayTeam} (${apiPrediction.confidence}%)`);
        
      } catch (matchError) {
        console.warn(`⚠️ Elite prediction failed for match ${match.id}:`, matchError);
        continue;
      }
    }
    
    console.log(`🏆 Elite ML System generated ${predictions.length} professional predictions`);
    return predictions;
    
  } catch (error) {
    console.error('❌ Elite ML System error:', error);
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
      // INTÉGRATION DONNÉES COMPLÈTES: team_features + match_statistics + match_events
      const [homeFeatures, awayFeatures, homeRecentStats, awayRecentStats] = await Promise.all([
        // Team features existantes (ELO, forme, xG)
        supabase
          .from('team_features')
          .select(`
            elo_rating, 
            form_5_points, 
            possession_avg,
            goals_per_game,
            goals_conceded_per_game,
            xg_for_avg,
            xg_against_avg,
            shots_per_game,
            shots_against_per_game,
            shots_on_target_avg,
            corners_for,
            corners_against,
            corners_conversion_rate,
            yellow_cards,
            red_cards,
            discipline_index,
            pressing_intensity,
            tempo_score,
            season
          `)
          .eq('team_id', match.home_team_id)
          .order('season', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('team_features')
          .select(`
            elo_rating, 
            form_5_points, 
            possession_avg,
            goals_per_game,
            goals_conceded_per_game,
            xg_for_avg,
            xg_against_avg,
            shots_per_game,
            shots_against_per_game,
            shots_on_target_avg,
            corners_for,
            corners_against,
            corners_conversion_rate,
            yellow_cards,
            red_cards,
            discipline_index,
            pressing_intensity,
            tempo_score,
            season
          `)
          .eq('team_id', match.away_team_id)
          .order('season', { ascending: false })
          .limit(1)
          .single(),
        // Match statistics récentes (5 derniers matchs)
        supabase
          .from('match_statistics')
          .select(`
            ball_possession,
            total_shots,
            shots_on_goal,
            shots_off_goal,
            corner_kicks,
            fouls,
            total_passes,
            passes_accurate,
            passes_percentage,
            expected_goals,
            pressing_intensity,
            possession_quality,
            match_id
          `)
          .eq('team_id', match.home_team_id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('match_statistics')
          .select(`
            ball_possession,
            total_shots,
            shots_on_goal,
            shots_off_goal,
            corner_kicks,
            fouls,
            total_passes,
            passes_accurate,
            passes_percentage,
            expected_goals,
            pressing_intensity,
            possession_quality,
            match_id
          `)
          .eq('team_id', match.away_team_id)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);
      
      // NOUVELLES MÉTRIQUES INTELLIGENTES avec TOUTES les données disponibles
      const homeElo = homeFeatures.data?.elo_rating || 1500;
      const awayElo = awayFeatures.data?.elo_rating || 1500;
      const homeForm = homeFeatures.data?.form_5_points || 7;
      const awayForm = awayFeatures.data?.form_5_points || 7;
      const homeGoalsPerGame = homeFeatures.data?.goals_per_game || 1.2;
      const awayGoalsPerGame = awayFeatures.data?.goals_per_game || 1.2;
      const homeConcededPerGame = homeFeatures.data?.goals_conceded_per_game || 1.2;
      const awayConcededPerGame = awayFeatures.data?.goals_conceded_per_game || 1.2;
      const homeXG = homeFeatures.data?.xg_for_avg || homeGoalsPerGame;
      const awayXG = awayFeatures.data?.xg_for_avg || awayGoalsPerGame;
      
      // NOUVELLES FEATURES: Données avancées team_features
      const homeShotsPerGame = homeFeatures.data?.shots_per_game || 12;
      const awayShotsPerGame = awayFeatures.data?.shots_per_game || 12;
      const homeShotsOnTarget = homeFeatures.data?.shots_on_target_avg || 4;
      const awayShotsOnTarget = awayFeatures.data?.shots_on_target_avg || 4;
      const homeDiscipline = homeFeatures.data?.discipline_index || 0.5;
      const awayDiscipline = awayFeatures.data?.discipline_index || 0.5;
      const homePressing = homeFeatures.data?.pressing_intensity || 50;
      const awayPressing = awayFeatures.data?.pressing_intensity || 50;
      const homeTempo = homeFeatures.data?.tempo_score || 50;
      const awayTempo = awayFeatures.data?.tempo_score || 50;
      
      // CALCUL MÉTRIQUES MATCH_STATISTICS (5 derniers matchs)
      function calculateRecentStats(statsData: any) {
        if (!statsData || !statsData.data || statsData.data.length === 0) return null;
        
        const stats = statsData.data;
        if (stats.length === 0) return null;
        
        return {
          avgPossession: stats.reduce((sum: number, s: any) => sum + (s.ball_possession || 50), 0) / stats.length,
          avgShots: stats.reduce((sum: number, s: any) => sum + (s.total_shots || 10), 0) / stats.length,
          avgShotsOnTarget: stats.reduce((sum: number, s: any) => sum + (s.shots_on_goal || 3), 0) / stats.length,
          avgCorners: stats.reduce((sum: number, s: any) => sum + (s.corner_kicks || 5), 0) / stats.length,
          avgFouls: stats.reduce((sum: number, s: any) => sum + (s.fouls || 10), 0) / stats.length,
          avgPasses: stats.reduce((sum: number, s: any) => sum + (s.total_passes || 400), 0) / stats.length,
          avgPassAccuracy: stats.reduce((sum: number, s: any) => sum + (s.passes_percentage || 80), 0) / stats.length,
          avgXG: stats.reduce((sum: number, s: any) => sum + (s.expected_goals || 1.2), 0) / stats.length,
          recentForm: stats.length // Nombre de matchs récents avec données
        };
      }
      
      const homeRecentForm = calculateRecentStats(homeRecentStats);
      const awayRecentForm = calculateRecentStats(awayRecentStats);
      
      // DEBUG: Vérifier requêtes team_features
      console.log(`🔍 DEBUG Match: ${match.home_team_name} (ID: ${match.home_team_id}) vs ${match.away_team_name} (ID: ${match.away_team_id})`);
      console.log(`🔍 Home features result:`, homeFeatures.data ? 'TROUVÉ' : 'NULL', homeFeatures.error ? homeFeatures.error.message : '');
      console.log(`🔍 Away features result:`, awayFeatures.data ? 'TROUVÉ' : 'NULL', awayFeatures.error ? awayFeatures.error.message : '');
      
      // ALGORITHME INTELLIGENT MULTI-DIMENSIONNEL - TOUTES DONNÉES
      console.log(`🧠 Analyse: ${match.home_team_name} (ELO ${homeElo}) vs ${match.away_team_name} (ELO ${awayElo})`);
      
      // 1. Base ELO avec avantage domicile réaliste
      const homeAdvantage = 80;
      const eloDiff = (homeElo + homeAdvantage) - awayElo;
      const expectedHome = 1 / (1 + Math.pow(10, -eloDiff / 400));
      
      // 2. Facteur forme récente (plus impactant)
      const formDiff = (homeForm - awayForm) / 10; // Normaliser
      const formImpact = Math.max(-0.2, Math.min(0.2, formDiff));
      
      // 3. NOUVEAU: Facteur offensif/défensif enrichi
      const homeAttackStrength = (homeGoalsPerGame + homeXG) / 3.0; // Goals + xG
      const awayAttackStrength = (awayGoalsPerGame + awayXG) / 3.0;
      const homeDefenseStrength = 2.0 / (homeConcededPerGame + 1); // Inverse renforcé
      const awayDefenseStrength = 2.0 / (awayConcededPerGame + 1);
      
      // 4. NOUVEAU: Facteur efficacité (tirs/buts)
      const homeShotEfficiency = homeShotsOnTarget / (homeShotsPerGame || 1);
      const awayShotEfficiency = awayShotsOnTarget / (awayShotsPerGame || 1);
      const efficiencyDiff = (homeShotEfficiency - awayShotEfficiency) * 0.1;
      
      // 5. NOUVEAU: Facteur tactique (pressing/tempo)
      const homeStyle = (homePressing + homeTempo) / 200; // Normaliser 0-1
      const awayStyle = (awayPressing + awayTempo) / 200;
      const styleDiff = (homeStyle - awayStyle) * 0.08;
      
      // 6. NOUVEAU: Facteur discipline (cartons/fouls)
      const disciplineDiff = (awayDiscipline - homeDiscipline) * 0.06; // Moins disciplinée = désavantage
      
      // 7. NOUVEAU: Forme récente basée match_statistics
      let recentFormImpact = 0;
      if (homeRecentForm && awayRecentForm) {
        const homeRecentXG = homeRecentForm.avgXG;
        const awayRecentXG = awayRecentForm.avgXG;
        const homeRecentPossession = homeRecentForm.avgPossession;
        const awayRecentPossession = awayRecentForm.avgPossession;
        
        // Combiner xG récent et possession
        const homeRecentStrength = (homeRecentXG / 2) + (homeRecentPossession / 100);
        const awayRecentStrength = (awayRecentXG / 2) + (awayRecentPossession / 100);
        recentFormImpact = (homeRecentStrength - awayRecentStrength) * 0.12;
        
        console.log(`  📊 Forme récente: Home xG=${homeRecentXG.toFixed(2)} Poss=${homeRecentPossession.toFixed(1)}%`);
        console.log(`  📊 Forme récente: Away xG=${awayRecentXG.toFixed(2)} Poss=${awayRecentPossession.toFixed(1)}%`);
      }
      
      // COMBINAISON FINALE avec pondération intelligente
      const attackDefenseHome = (homeAttackStrength + homeDefenseStrength) / 2;
      const attackDefenseAway = (awayAttackStrength + awayDefenseStrength) / 2;
      const attackDefenseDiff = (attackDefenseHome - attackDefenseAway) * 0.15;
      
      // 8. Calcul probabilités enrichies MULTI-FACTEURS
      let homeProb = expectedHome + formImpact + attackDefenseDiff + efficiencyDiff + 
                    styleDiff + disciplineDiff + recentFormImpact;
      homeProb = Math.max(0.20, Math.min(0.75, homeProb));
      
      console.log(`  🎯 Facteurs: Form=${formImpact.toFixed(3)} AttDef=${attackDefenseDiff.toFixed(3)} Eff=${efficiencyDiff.toFixed(3)}`);
      console.log(`  🎯 Style=${styleDiff.toFixed(3)} Disc=${disciplineDiff.toFixed(3)} Recent=${recentFormImpact.toFixed(3)}`);
      
      // Ajustement nul plus réaliste basé sur équilibrage des forces
      const teamBalance = Math.abs(homeElo - awayElo) / 200; // Plus l'écart est grand, moins de nuls
      let drawProb = Math.max(0.15, 0.40 - teamBalance);
      drawProb = Math.min(0.35, drawProb);
      
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
      
      // CONFIANCE INTELLIGENTE MULTI-DIMENSIONNELLE basée sur RICHESSE des données
      let confidence = 45; // Base légèrement plus basse car plus exigeant
      let dataQualityScore = 0;
      
      // +15-25 si on a de vraies données ELO (pas 1500 par défaut)  
      if (homeFeatures.data && awayFeatures.data) {
        confidence += 20;
        dataQualityScore += 2;
        console.log(`  ✅ Vraies données ELO trouvées`);
      } else {
        console.log(`  ⚠️ Pas de données ELO, utilisation valeurs par défaut`);
      }
      
      // +5-15 selon écart ELO (plus l'écart est grand, plus on est confiant)
      const eloConfidence = Math.min(15, Math.abs(eloDiff) / 20);
      confidence += eloConfidence;
      
      // +5-10 selon différence de forme
      const formConfidence = Math.min(10, Math.abs(homeForm - awayForm) * 1.5);
      confidence += formConfidence;
      
      // +5-10 si on a des données xG
      if (homeFeatures.data?.xg_for_avg && awayFeatures.data?.xg_for_avg) {
        confidence += 8;
        dataQualityScore += 1;
        console.log(`  ✅ Données xG disponibles`);
      }
      
      // NOUVEAU: +5-12 si on a des statistics récentes
      if (homeRecentForm && awayRecentForm) {
        const recentDataBonus = Math.min(12, (homeRecentForm.recentForm + awayRecentForm.recentForm));
        confidence += recentDataBonus;
        dataQualityScore += 2;
        console.log(`  ✅ Statistics récentes: ${homeRecentForm.recentForm + awayRecentForm.recentForm} matchs`);
      }
      
      // NOUVEAU: +3-8 si on a des données tactiques (pressing, tempo)
      if (homeFeatures.data?.pressing_intensity && homeFeatures.data?.tempo_score) {
        confidence += 6;
        dataQualityScore += 1;
        console.log(`  ✅ Données tactiques disponibles`);
      }
      
      // NOUVEAU: +2-5 si données disciplinaires
      if (homeFeatures.data?.discipline_index && awayFeatures.data?.discipline_index) {
        confidence += 4;
        dataQualityScore += 1;
      }
      
      // NOUVEAU: Bonus écart significatif (prédiction plus claire)
      const probSpread = Math.max(homeProb, drawProb, awayProb) - Math.min(homeProb, drawProb, awayProb);
      if (probSpread > 30) confidence += 8; // Prédiction nette
      else if (probSpread < 15) confidence -= 5; // Prédiction incertaine
      
      confidence = Math.min(90, Math.max(35, confidence));
      
      console.log(`  🎯 Confiance: ${confidence}% (DataQuality: ${dataQualityScore}/7, ProbSpread: ${probSpread}%)`);
      console.log(`  🎯 Facteurs confiance: ELO+${eloConfidence} Form+${formConfidence} Total=${confidence}`);
      
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
          awayForm: Math.round(awayForm * 10) / 10,
          // NOUVELLES FEATURES ENRICHIES
          homeXG: Math.round(homeXG * 100) / 100,
          awayXG: Math.round(awayXG * 100) / 100,
          homeShotsPerGame: Math.round(homeShotsPerGame * 10) / 10,
          awayShotsPerGame: Math.round(awayShotsPerGame * 10) / 10,
          homeShotEfficiency: Math.round(homeShotEfficiency * 100) / 100,
          awayShotEfficiency: Math.round(awayShotEfficiency * 100) / 100,
          homeStyle: Math.round(homeStyle * 100) / 100,
          awayStyle: Math.round(awayStyle * 100) / 100,
          dataQuality: dataQualityScore,
          // Forme récente si disponible
          ...(homeRecentForm && {
            homeRecentXG: Math.round(homeRecentForm.avgXG * 100) / 100,
            homeRecentPoss: Math.round(homeRecentForm.avgPossession * 10) / 10,
            homeRecentMatches: homeRecentForm.recentForm
          }),
          ...(awayRecentForm && {
            awayRecentXG: Math.round(awayRecentForm.avgXG * 100) / 100,
            awayRecentPoss: Math.round(awayRecentForm.avgPossession * 10) / 10,
            awayRecentMatches: awayRecentForm.recentForm
          })
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
    
    // PRIORITÉ 1: Calcul prédictions Elite ML System
    let allPredictions: Prediction[] = [];
    
    try {
      console.log('🏆 Tentative Elite ML System...');
      allPredictions = await calculateElitePredictions(limit);
      console.log(`✅ ${allPredictions.length} prédictions élite générées`);
    } catch (error) {
      console.log('⚠️ Échec Elite ML, tentative cache...');
      
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