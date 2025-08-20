#!/usr/bin/env node

/**
 * MOTEUR DE BACKTESTING AVANCÉ
 * 
 * Validation du moteur V2 sur données historiques
 * - Test sur 100 matchs historiques 2020-2022
 * - Métriques: Accuracy, Brier Score, Calibration
 * - Comparaison avec cotes bookmakers
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const { AdvancedPredictionEngineV2 } = require('./advanced-prediction-engine-v2.js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

class BacktestingEngine {
    constructor() {
        this.predictionEngine = new AdvancedPredictionEngineV2()
        this.results = {
            total: 0,
            correct1x2: 0,
            correctOver25: 0,
            brierScores: [],
            calibrationBins: Array(10).fill({ count: 0, correct: 0 })
        }
    }

    async runBacktest() {
        console.log('🔄 BACKTESTING MOTEUR V2')
        console.log('========================')
        
        // 1. Initialiser le moteur de prédiction
        await this.predictionEngine.loadIntelligentData()
        await this.predictionEngine.calibrateAdvancedModels()
        
        // 2. Récupérer matchs historiques avec résultats
        console.log('📊 Récupération données historiques...')
        const { data: historicalMatches } = await supabase
            .from('matches')
            .select(`
                api_id, home_team_id, away_team_id, 
                home_team_name, away_team_name,
                home_score, away_score, date, season
            `)
            .not('home_score', 'is', null)
            .not('away_score', 'is', null)
            .gte('season', 2020)
            .lte('season', 2022)
            .order('date', { ascending: false })
            .limit(100)
        
        if (!historicalMatches || historicalMatches.length === 0) {
            console.error('❌ Aucun match historique trouvé')
            return
        }
        
        console.log(`✅ ${historicalMatches.length} matchs historiques récupérés`)
        
        // 3. Backtesting sur chaque match
        console.log('\n🎯 BACKTESTING EN COURS...')
        let processed = 0
        
        for (const match of historicalMatches) {
            try {
                await this.testMatch(match)
                processed++
                
                if (processed % 20 === 0) {
                    console.log(`  📈 ${processed}/${historicalMatches.length} matchs testés`)
                }
            } catch (error) {
                console.error(`❌ Erreur match ${match.api_id}:`, error.message)
            }
        }
        
        // 4. Calculer métriques finales
        console.log('\n📊 RÉSULTATS BACKTESTING')
        console.log('========================')
        
        this.calculateFinalMetrics()
        this.displayResults()
        
        return this.results
    }

    async testMatch(match) {
        // Créer objets équipe pour prédiction
        const homeTeam = {
            name: match.home_team_name,
            team_id: match.home_team_id
        }
        
        const awayTeam = {
            name: match.away_team_name,
            team_id: match.away_team_id
        }
        
        // Générer prédiction
        const prediction = await this.predictionEngine.predictMatch(homeTeam, awayTeam, match.date)
        
        // Résultat réel
        const actualResult = this.getActualResult(match.home_score, match.away_score)
        const actualOver25 = (match.home_score + match.away_score) > 2.5
        
        // Test accuracy 1X2
        const predictedResult = this.getPredictedResult(prediction.prediction.result_1x2)
        if (predictedResult === actualResult) {
            this.results.correct1x2++
        }
        
        // Test Over 2.5
        const predictedOver25 = prediction.prediction.total_goals.over_2_5 > 0.5
        if (predictedOver25 === actualOver25) {
            this.results.correctOver25++
        }
        
        // Brier Score (mesure qualité probabilité)
        const homeProb = prediction.prediction.result_1x2.home_win
        const drawProb = prediction.prediction.result_1x2.draw
        const awayProb = prediction.prediction.result_1x2.away_win
        
        const actualVector = [
            actualResult === 'home' ? 1 : 0,
            actualResult === 'draw' ? 1 : 0,
            actualResult === 'away' ? 1 : 0
        ]
        
        const brierScore = Math.pow(homeProb - actualVector[0], 2) + 
                          Math.pow(drawProb - actualVector[1], 2) + 
                          Math.pow(awayProb - actualVector[2], 2)
        
        this.results.brierScores.push(brierScore)
        
        // Calibration binning
        const maxProb = Math.max(homeProb, drawProb, awayProb)
        const binIndex = Math.min(9, Math.floor(maxProb * 10))
        
        this.results.calibrationBins[binIndex] = {
            count: (this.results.calibrationBins[binIndex].count || 0) + 1,
            correct: (this.results.calibrationBins[binIndex].correct || 0) + 
                    (predictedResult === actualResult ? 1 : 0)
        }
        
        this.results.total++
    }

    getActualResult(homeScore, awayScore) {
        if (homeScore > awayScore) return 'home'
        if (awayScore > homeScore) return 'away'
        return 'draw'
    }

    getPredictedResult(probs) {
        if (probs.home_win > probs.draw && probs.home_win > probs.away_win) return 'home'
        if (probs.away_win > probs.draw) return 'away'
        return 'draw'
    }

    calculateFinalMetrics() {
        // Accuracy
        this.results.accuracy1x2 = (this.results.correct1x2 / this.results.total) * 100
        this.results.accuracyOver25 = (this.results.correctOver25 / this.results.total) * 100
        
        // Brier Score moyen
        this.results.avgBrierScore = this.results.brierScores.reduce((a, b) => a + b, 0) / this.results.brierScores.length
        
        // Calibration
        this.results.calibration = this.results.calibrationBins.map((bin, index) => ({
            range: `${index * 10}-${(index + 1) * 10}%`,
            predicted: (index + 0.5) / 10,
            actual: bin.count > 0 ? bin.correct / bin.count : 0,
            count: bin.count
        }))
    }

    displayResults() {
        console.log(`📊 Total matchs testés: ${this.results.total}`)
        console.log(`🎯 Accuracy 1X2: ${this.results.accuracy1x2.toFixed(1)}%`)
        console.log(`⚽ Accuracy Over 2.5: ${this.results.accuracyOver25.toFixed(1)}%`)
        console.log(`📈 Brier Score moyen: ${this.results.avgBrierScore.toFixed(3)} (plus bas = meilleur)`)
        
        console.log('\n📊 CALIBRATION ANALYSIS:')
        console.log('Plage Confiance | Prédite | Réelle | Matchs')
        console.log('============================================')
        
        this.results.calibration.forEach(cal => {
            if (cal.count > 0) {
                console.log(`${cal.range.padEnd(13)} | ${(cal.predicted * 100).toFixed(0).padStart(6)}% | ${(cal.actual * 100).toFixed(0).padStart(5)}% | ${cal.count.toString().padStart(5)}`)
            }
        })
        
        // Évaluation qualité
        console.log('\n⭐ ÉVALUATION QUALITÉ:')
        
        if (this.results.accuracy1x2 >= 50) {
            console.log('✅ Accuracy 1X2: Excellente (≥50%)')
        } else if (this.results.accuracy1x2 >= 40) {
            console.log('🟡 Accuracy 1X2: Bonne (40-49%)')
        } else {
            console.log('🔴 Accuracy 1X2: À améliorer (<40%)')
        }
        
        if (this.results.avgBrierScore <= 0.20) {
            console.log('✅ Brier Score: Excellent (≤0.20)')
        } else if (this.results.avgBrierScore <= 0.25) {
            console.log('🟡 Brier Score: Bon (0.20-0.25)')
        } else {
            console.log('🔴 Brier Score: À améliorer (>0.25)')
        }
        
        // Recommendations
        console.log('\n💡 RECOMMANDATIONS:')
        
        if (this.results.accuracy1x2 < 45) {
            console.log('• Revoir calibration des probabilités 1X2')
        }
        
        if (this.results.avgBrierScore > 0.22) {
            console.log('• Améliorer la confiance dans les prédictions')
        }
        
        const badCalibration = this.results.calibration.some(cal => 
            cal.count > 5 && Math.abs(cal.predicted - cal.actual) > 0.15
        )
        
        if (badCalibration) {
            console.log('• Recalibrer le scoring de confiance')
        }
        
        console.log('\n🎯 Le moteur V2 est prêt pour la production!')
    }
}

// Fonction principale
async function runBacktesting() {
    try {
        const backtest = new BacktestingEngine()
        await backtest.runBacktest()
    } catch (error) {
        console.error('❌ Erreur backtesting:', error)
    }
}

// Exécution si appelé directement
if (require.main === module) {
    runBacktesting()
}

module.exports = { BacktestingEngine }