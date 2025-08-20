#!/usr/bin/env node

/**
 * TEST SYSTÈME IA AVANCÉ - USUAL ODDS
 * 
 * Test complet du moteur IA avec ChatGPT pour prédictions multi-marchés
 */

require('dotenv').config()
const { AdvancedAIPredictionEngine } = require('./advanced-ai-prediction-engine')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testAdvancedAI() {
    console.log('🚀 TEST SYSTÈME IA AVANCÉ USUAL ODDS')
    console.log('=====================================')
    
    const aiEngine = new AdvancedAIPredictionEngine()
    
    try {
        console.log('📊 1. Récupération équipes Ligue 1...')
        
        // Récupérer 2 équipes pour test de prédiction
        const { data: teams, error } = await supabase
            .from('team_features')
            .select('*')
            .eq('season', 2024)
            .limit(2)
        
        if (error || !teams || teams.length < 2) {
            console.error('❌ Erreur récupération équipes:', error?.message)
            return
        }
        
        const [homeTeam, awayTeam] = teams
        console.log(`🏟️ Match test: ${homeTeam.team_id} (dom) vs ${awayTeam.team_id} (ext)`)
        
        console.log('\n🤖 2. Test analyse tactique ChatGPT...')
        
        // Test analyse individuelle
        const homeAnalysis = await aiEngine.analyzeTacticalStyleWithChatGPT(homeTeam)
        console.log('✅ Analyse équipe domicile:', {
            style: homeAnalysis.style_tactique,
            forces: homeAnalysis.forces,
            confiance: homeAnalysis.confiance_analyse
        })
        
        console.log('\n🔮 3. Test prédiction complète...')
        
        // Context de match exemple
        const matchContext = {
            importance: 'normal',
            weather: 'clear',
            referee: 'standard',
            injuries: [],
            motivation_factors: ['league_position']
        }
        
        // Prédiction complète
        const prediction = await aiEngine.predictMatch(homeTeam, awayTeam, matchContext)
        
        console.log('\n📊 RÉSULTATS PRÉDICTION:')
        console.log('========================')
        
        console.log('🎯 1X2:')
        console.log(`   Victoire domicile: ${(prediction.result_1x2.home_win * 100).toFixed(1)}%`)
        console.log(`   Match nul: ${(prediction.result_1x2.draw * 100).toFixed(1)}%`)
        console.log(`   Victoire extérieur: ${(prediction.result_1x2.away_win * 100).toFixed(1)}%`)
        console.log(`   Confiance: ${prediction.result_1x2.confidence}%`)
        
        console.log('\n⚽ Total buts:')
        console.log(`   Over 2.5: ${(prediction.total_goals.over_2_5 * 100).toFixed(1)}%`)
        console.log(`   Under 2.5: ${(prediction.total_goals.under_2_5 * 100).toFixed(1)}%`)
        console.log(`   Over 1.5: ${(prediction.total_goals.over_1_5 * 100).toFixed(1)}%`)
        
        console.log('\n🕐 Timing buts:')
        console.log(`   But 1ère mi-temps: ${(prediction.goal_timing.first_half_goal * 100).toFixed(1)}%`)
        console.log(`   But précoce (0-15): ${(prediction.goal_timing.early_goal_0_15 * 100).toFixed(1)}%`)
        console.log(`   But tardif (75-90): ${(prediction.goal_timing.late_goal_75_90 * 100).toFixed(1)}%`)
        
        console.log('\n🧠 Analyse IA:')
        console.log(`   Avantage tactique: ${prediction.analysis.matchup_analysis.avantage_tactique}`)
        console.log(`   Facteurs clés: ${prediction.analysis.key_factors.join(', ')}`)
        console.log(`   Confiance globale: ${prediction.analysis.overall_confidence}%`)
        console.log(`   Potentiel surprise: ${prediction.analysis.matchup_analysis.upset_potential}%`)
        
        console.log('\n📈 4. Test calibration et métriques...')
        
        // Calculer métriques de performance
        const metrics = {
            confidence_distribution: [
                prediction.result_1x2.confidence,
                prediction.total_goals.confidence,
                prediction.analysis.overall_confidence
            ],
            prediction_entropy: calculateEntropy([
                prediction.result_1x2.home_win,
                prediction.result_1x2.draw, 
                prediction.result_1x2.away_win
            ]),
            model_consensus: prediction.analysis.overall_confidence
        }
        
        console.log('📊 Métriques performance:')
        console.log(`   Entropie prédiction: ${metrics.prediction_entropy.toFixed(3)}`)
        console.log(`   Consensus modèle: ${metrics.model_consensus}%`)
        console.log(`   Distribution confiance: ${metrics.confidence_distribution.join('%, ')}%`)
        
        console.log('\n✅ TEST TERMINÉ AVEC SUCCÈS!')
        console.log('🎯 Système IA prêt pour prédictions temps réel')
        console.log('🔄 Prochaine étape: Intégrer fixtures 2025 pour prédictions live')
        
        return {
            success: true,
            prediction,
            metrics,
            teams: { home: homeTeam.team_id, away: awayTeam.team_id }
        }
        
    } catch (error) {
        console.error('❌ Erreur test IA:', error.message)
        console.error('Stack:', error.stack)
        return { success: false, error: error.message }
    }
}

function calculateEntropy(probabilities) {
    return -probabilities.reduce((sum, p) => {
        return p > 0 ? sum + p * Math.log2(p) : sum
    }, 0)
}

// Export pour utilisation dans d'autres scripts
module.exports = { testAdvancedAI }

// Lancer si appelé directement
if (require.main === module) {
    testAdvancedAI().catch(console.error)
}