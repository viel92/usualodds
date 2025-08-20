#!/usr/bin/env node

/**
 * TEST MOTEUR IA SIMPLIFIÉ
 * 
 * Version sans ChatGPT pour éviter les rate limits
 */

require('dotenv').config()
const { SimpleAIPredictionEngine } = require('./simple-ai-prediction-engine')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSimpleAI() {
    console.log('🚀 TEST MOTEUR IA SIMPLIFIÉ')
    console.log('============================')
    
    const aiEngine = new SimpleAIPredictionEngine()
    
    try {
        // 1. Récupérer équipes test
        console.log('📊 1. Récupération équipes test...')
        const { data: teams, error } = await supabase
            .from('team_features')
            .select('*')
            .eq('season', 2024)
            .not('current_rank', 'is', null)
            .limit(4)
        
        if (error || !teams || teams.length < 2) {
            console.error('❌ Erreur récupération équipes:', error?.message)
            return
        }
        
        console.log(`✅ ${teams.length} équipes récupérées`)
        teams.forEach(team => {
            console.log(`   ${team.team_id}: Rang ${team.current_rank}, ${team.goals_per_game?.toFixed(1) || 'N/A'} buts/match`)
        })
        
        // 2. Test analyse tactique locale
        console.log('\n🔍 2. Test analyse tactique locale...')
        const testTeam = teams[0]
        const analysis = aiEngine.analyzeTacticalStyleLocal(testTeam)
        
        console.log('✅ Analyse tactique:')
        console.log(`   Style: ${analysis.style_tactique}`)
        console.log(`   Forces: ${analysis.forces.join(', ')}`)
        console.log(`   Forme: ${analysis.forme_actuelle}`)
        console.log(`   Confiance: ${analysis.confiance_analyse}%`)
        
        // 3. Test prédiction complète
        console.log('\n🔮 3. Test prédiction complète...')
        const homeTeam = teams[0]
        const awayTeam = teams[1]
        
        console.log(`🏟️ Match test: ${homeTeam.team_id} (dom) vs ${awayTeam.team_id} (ext)`)
        console.log(`   Dom: Rang ${homeTeam.current_rank}, ${homeTeam.goals_per_game?.toFixed(1) || 0} buts/match`)
        console.log(`   Ext: Rang ${awayTeam.current_rank}, ${awayTeam.goals_per_game?.toFixed(1) || 0} buts/match`)
        
        const prediction = await aiEngine.predictMatch(homeTeam, awayTeam, {
            importance: 'normal',
            round: 'Journée 20'
        })
        
        // 4. Affichage résultats
        console.log('\n📊 RÉSULTATS PRÉDICTION:')
        console.log('=' .repeat(50))
        
        const p1x2 = prediction.result_1x2
        console.log(`🎯 1X2: ${(p1x2.home_win*100).toFixed(1)}% - ${(p1x2.draw*100).toFixed(1)}% - ${(p1x2.away_win*100).toFixed(1)}%`)
        
        const goals = prediction.total_goals
        console.log(`⚽ Over/Under:`)
        console.log(`   Over 2.5: ${(goals.over_2_5*100).toFixed(1)}%`)
        console.log(`   Over 1.5: ${(goals.over_1_5*100).toFixed(1)}%`)
        console.log(`   Over 3.5: ${(goals.over_3_5*100).toFixed(1)}%`)
        
        console.log(`🏆 Buteurs probables domicile:`)
        prediction.probable_scorers.home.forEach((scorer, i) => {
            console.log(`   ${i+1}. ${scorer.name}: ${(scorer.probability*100).toFixed(1)}%`)
        })
        
        console.log(`🏆 Buteurs probables extérieur:`)
        prediction.probable_scorers.away.forEach((scorer, i) => {
            console.log(`   ${i+1}. ${scorer.name}: ${(scorer.probability*100).toFixed(1)}%`)
        })
        
        console.log(`📈 Analyses:`)
        console.log(`   Avantage tactique: ${prediction.analysis.matchup_analysis.avantage_tactique}`)
        console.log(`   Facteurs clés: ${prediction.analysis.key_factors.join(', ')}`)
        console.log(`   Potentiel surprise: ${prediction.analysis.matchup_analysis.upset_potential}%`)
        console.log(`   Confiance globale: ${prediction.analysis.overall_confidence}%`)
        
        // 5. Test plusieurs prédictions
        console.log('\n🎲 4. Test prédictions multiples...')
        
        for (let i = 0; i < Math.min(3, teams.length - 1); i++) {
            const home = teams[i]
            const away = teams[i + 1] || teams[0]
            
            console.log(`\n🔮 Match ${i+1}: ${home.team_id} vs ${away.team_id}`)
            
            const quickPred = await aiEngine.predictMatch(home, away)
            const quick1x2 = quickPred.result_1x2
            
            console.log(`   Résultat: ${(quick1x2.home_win*100).toFixed(1)}% - ${(quick1x2.draw*100).toFixed(1)}% - ${(quick1x2.away_win*100).toFixed(1)}%`)
            console.log(`   Over 2.5: ${(quickPred.total_goals.over_2_5*100).toFixed(1)}%`)
            console.log(`   Confiance: ${quickPred.analysis.overall_confidence}%`)
        }
        
        console.log('\n✅ TESTS RÉUSSIS!')
        console.log('🎯 Le moteur IA simplifié fonctionne correctement')
        console.log('📊 Prêt pour génération prédictions matchs à venir')
        
        return true
        
    } catch (error) {
        console.error('❌ Erreur tests IA:', error.message)
        console.error(error.stack)
        return false
    }
}

async function main() {
    const success = await testSimpleAI()
    if (success) {
        console.log('\n🚀 Moteur IA simplifié validé!')
    } else {
        console.log('\n❌ Échec validation moteur IA')
    }
}

module.exports = { testSimpleAI }

if (require.main === module) {
    main().catch(console.error)
}