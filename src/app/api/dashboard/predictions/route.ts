import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * API Dashboard - Récupération Prédictions
 * 
 * Endpoint pour récupérer les prédictions générées
 */

export async function GET(request: NextRequest) {
  try {
    console.log('📊 API Dashboard: Récupération prédictions...')
    
    // 1. Chercher le fichier de prédictions le plus récent
    const predictionsDir = join(process.cwd(), 'predictions')
    const today = new Date().toISOString().split('T')[0]
    const predictionsFile = join(predictionsDir, `predictions_${today}.json`)
    
    // 2. Vérifier si le fichier existe
    if (!existsSync(predictionsFile)) {
      console.log('⚠️ Aucun fichier prédictions pour aujourd\'hui')
      return NextResponse.json({
        success: true,
        data: {
          predictions: [],
          total: 0,
          generated_at: null,
          message: 'Aucune prédiction disponible pour aujourd\'hui'
        }
      })
    }
    
    // 3. Lire et parser le fichier
    const fileContent = readFileSync(predictionsFile, 'utf-8')
    const predictionsData = JSON.parse(fileContent)
    
    // 4. Transformer les données pour le dashboard
    const dashboardPredictions = predictionsData.predictions.map((pred: any) => {
      const p1x2 = pred.prediction.result_1x2
      const goals = pred.prediction.total_goals
      const analysis = pred.prediction.analysis
      
      return {
        id: pred.match_info.fixture_id,
        match: {
          home_team: pred.match_info.home_team_name,
          away_team: pred.match_info.away_team_name,
          date: pred.match_info.date,
          venue: pred.match_info.venue,
          round: pred.match_info.round
        },
        predictions: {
          result_1x2: {
            home_win: Math.round(p1x2.home_win * 100),
            draw: Math.round(p1x2.draw * 100), 
            away_win: Math.round(p1x2.away_win * 100)
          },
          total_goals: {
            over_2_5: Math.round(goals.over_2_5 * 100),
            under_2_5: Math.round(goals.under_2_5 * 100),
            over_1_5: Math.round(goals.over_1_5 * 100),
            over_3_5: Math.round(goals.over_3_5 * 100)
          },
          scorers: {
            home: pred.prediction.probable_scorers.home,
            away: pred.prediction.probable_scorers.away
          }
        },
        analysis: {
          overall_confidence: analysis.overall_confidence,
          home_style: analysis.home_analysis.style_tactique,
          away_style: analysis.away_analysis.style_tactique,
          home_form: analysis.home_analysis.forme_actuelle,
          away_form: analysis.away_analysis.forme_actuelle,
          advantage: analysis.matchup_analysis.avantage_tactique,
          upset_potential: analysis.matchup_analysis.upset_potential,
          key_factors: analysis.key_factors
        },
        generated_at: pred.generated_at
      }
    })
    
    // 5. Statistiques globales
    const stats = {
      total_predictions: dashboardPredictions.length,
      avg_confidence: Math.round(
        dashboardPredictions.reduce((sum: number, p: any) => sum + p.analysis.overall_confidence, 0) / 
        dashboardPredictions.length
      ),
      home_wins: dashboardPredictions.filter((p: any) => 
        p.predictions.result_1x2.home_win > p.predictions.result_1x2.away_win && 
        p.predictions.result_1x2.home_win > p.predictions.result_1x2.draw
      ).length,
      away_wins: dashboardPredictions.filter((p: any) => 
        p.predictions.result_1x2.away_win > p.predictions.result_1x2.home_win && 
        p.predictions.result_1x2.away_win > p.predictions.result_1x2.draw
      ).length,
      draws: dashboardPredictions.filter((p: any) => 
        p.predictions.result_1x2.draw > p.predictions.result_1x2.home_win && 
        p.predictions.result_1x2.draw > p.predictions.result_1x2.away_win
      ).length,
      over_2_5_count: dashboardPredictions.filter((p: any) => 
        p.predictions.total_goals.over_2_5 > 50
      ).length
    }
    
    console.log(`✅ ${dashboardPredictions.length} prédictions récupérées`)
    
    return NextResponse.json({
      success: true,
      data: {
        predictions: dashboardPredictions,
        stats,
        generated_at: predictionsData.generated_at,
        total: dashboardPredictions.length
      }
    })
    
  } catch (error) {
    console.error('❌ Erreur API Dashboard:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erreur récupération prédictions',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 })
  }
}

/**
 * Régénérer prédictions (POST)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Régénération prédictions demandée...')
    
    // Pour l'instant, retourner un message informatif
    // La régénération doit être faite manuellement via les scripts Node.js
    return NextResponse.json({
      success: false,
      error: 'Régénération automatique non disponible',
      details: 'Utilisez la commande: node scripts/predict-upcoming-simple.js',
      instructions: [
        '1. Ouvrir un terminal dans le dossier usualodds',
        '2. Exécuter: node scripts/predict-upcoming-simple.js',
        '3. Actualiser le dashboard pour voir les nouvelles prédictions'
      ]
    }, { status: 400 })
    
  } catch (error) {
    console.error('❌ Erreur régénération:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erreur régénération prédictions',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 })
  }
}