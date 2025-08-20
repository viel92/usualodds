#!/usr/bin/env node

/**
 * AUDIT CRITIQUE DES PRÉDICTIONS ACTUELLES
 * 
 * Analyse détaillée des 7 prédictions pour identifier les problèmes
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')

async function auditPredictions() {
    console.log('🔍 AUDIT CRITIQUE PRÉDICTIONS USUTALODDS')
    console.log('=========================================')
    
    // 1. Charger les prédictions
    const predictionsFile = path.join(__dirname, '..', 'predictions', 'predictions_2025-08-19.json')
    
    if (!fs.existsSync(predictionsFile)) {
        console.error('❌ Fichier prédictions introuvable')
        return
    }
    
    const data = JSON.parse(fs.readFileSync(predictionsFile, 'utf-8'))
    const predictions = data.predictions
    
    console.log(`📊 ${predictions.length} prédictions à analyser`)
    console.log(`⏰ Générées le: ${new Date(data.generated_at).toLocaleString('fr-FR')}\n`)
    
    // 2. Analyse globale
    console.log('📈 ANALYSE GLOBALE')
    console.log('==================')
    
    const globalStats = analyzeGlobalStats(predictions)
    displayGlobalStats(globalStats)
    
    // 3. Analyse par match
    console.log('\n⚽ ANALYSE DÉTAILLÉE PAR MATCH')
    console.log('==============================')
    
    predictions.forEach((pred, index) => {
        console.log(`\n🏟️  MATCH ${index + 1}: ${pred.match_info.home_team_name} vs ${pred.match_info.away_team_name}`)
        analyzeMatch(pred)
    })
    
    // 4. Problèmes identifiés
    console.log('\n🚨 PROBLÈMES IDENTIFIÉS')
    console.log('========================')
    identifyProblems(predictions)
    
    // 5. Recommandations
    console.log('\n💡 RECOMMANDATIONS CRITIQUES')
    console.log('=============================')
    generateRecommendations()
}

function analyzeGlobalStats(predictions) {
    const stats = {
        totalMatches: predictions.length,
        avgHomeWin: 0,
        avgDraw: 0,
        avgAwayWin: 0,
        avgConfidence: 0,
        avgOver25: 0,
        domicileAdvantageCount: 0,
        equilibreCount: 0,
        exterieurAdvantageCount: 0,
        homeWinPredictions: 0,
        drawPredictions: 0,
        awayWinPredictions: 0
    }
    
    predictions.forEach(pred => {
        const p1x2 = pred.prediction.result_1x2
        const goals = pred.prediction.total_goals
        const analysis = pred.prediction.analysis
        
        stats.avgHomeWin += p1x2.home_win
        stats.avgDraw += p1x2.draw
        stats.avgAwayWin += p1x2.away_win
        stats.avgConfidence += analysis.overall_confidence
        stats.avgOver25 += goals.over_2_5
        
        // Avantage tactique
        if (analysis.matchup_analysis.avantage_tactique === 'domicile') stats.domicileAdvantageCount++
        else if (analysis.matchup_analysis.avantage_tactique === 'exterieur') stats.exterieurAdvantageCount++
        else stats.equilibreCount++
        
        // Prédiction favorite
        if (p1x2.home_win > p1x2.draw && p1x2.home_win > p1x2.away_win) stats.homeWinPredictions++
        else if (p1x2.away_win > p1x2.draw) stats.awayWinPredictions++
        else stats.drawPredictions++
    })
    
    // Moyennes
    stats.avgHomeWin = (stats.avgHomeWin / predictions.length * 100).toFixed(1)
    stats.avgDraw = (stats.avgDraw / predictions.length * 100).toFixed(1)
    stats.avgAwayWin = (stats.avgAwayWin / predictions.length * 100).toFixed(1)
    stats.avgConfidence = (stats.avgConfidence / predictions.length).toFixed(1)
    stats.avgOver25 = (stats.avgOver25 / predictions.length * 100).toFixed(1)
    
    return stats
}

function displayGlobalStats(stats) {
    console.log(`📊 Moyennes 1X2: ${stats.avgHomeWin}% - ${stats.avgDraw}% - ${stats.avgAwayWin}%`)
    console.log(`🎯 Confiance moyenne: ${stats.avgConfidence}%`)
    console.log(`⚽ Moyenne Over 2.5: ${stats.avgOver25}%`)
    console.log(`🏠 Victoires domicile prédites: ${stats.homeWinPredictions}/${stats.totalMatches}`)
    console.log(`🤝 Nuls prédits: ${stats.drawPredictions}/${stats.totalMatches}`)
    console.log(`✈️  Victoires extérieur prédites: ${stats.awayWinPredictions}/${stats.totalMatches}`)
    console.log(`⚖️  Avantages tactiques: Dom ${stats.domicileAdvantageCount} | Équi ${stats.equilibreCount} | Ext ${stats.exterieurAdvantageCount}`)
}

function analyzeMatch(pred) {
    const p1x2 = pred.prediction.result_1x2
    const goals = pred.prediction.total_goals
    const homeAnalysis = pred.prediction.analysis.home_analysis
    const awayAnalysis = pred.prediction.analysis.away_analysis
    const matchupAnalysis = pred.prediction.analysis.matchup_analysis
    
    // Prédiction favorite
    let favorite = ''
    let favoriteProb = 0
    if (p1x2.home_win > p1x2.draw && p1x2.home_win > p1x2.away_win) {
        favorite = 'DOMICILE'
        favoriteProb = (p1x2.home_win * 100).toFixed(1)
    } else if (p1x2.away_win > p1x2.draw) {
        favorite = 'EXTÉRIEUR'
        favoriteProb = (p1x2.away_win * 100).toFixed(1)
    } else {
        favorite = 'NUL'
        favoriteProb = (p1x2.draw * 100).toFixed(1)
    }
    
    console.log(`   📅 ${new Date(pred.match_info.date).toLocaleDateString('fr-FR')}`)
    console.log(`   🎯 Favori prédit: ${favorite} (${favoriteProb}%)`)
    console.log(`   📊 1X2: ${(p1x2.home_win*100).toFixed(1)}% - ${(p1x2.draw*100).toFixed(1)}% - ${(p1x2.away_win*100).toFixed(1)}%`)
    console.log(`   ⚽ Over 2.5: ${(goals.over_2_5*100).toFixed(1)}%`)
    console.log(`   🔍 Confiance: ${pred.prediction.analysis.overall_confidence}%`)
    console.log(`   ⚖️  Avantage: ${matchupAnalysis.avantage_tactique}`)
    
    // Analyses d'équipes
    console.log(`   🏠 ${pred.match_info.home_team_name}: ${homeAnalysis.style_tactique} | ${homeAnalysis.forme_actuelle} | Forces: ${homeAnalysis.forces.length}`)
    console.log(`   ✈️  ${pred.match_info.away_team_name}: ${awayAnalysis.style_tactique} | ${awayAnalysis.forme_actuelle} | Forces: ${awayAnalysis.forces.length}`)
    
    // Cotes implicites approximatives (pour comparaison)
    const homeOdds = (1 / p1x2.home_win).toFixed(2)
    const drawOdds = (1 / p1x2.draw).toFixed(2)
    const awayOdds = (1 / p1x2.away_win).toFixed(2)
    console.log(`   💰 Cotes implicites: ${homeOdds} - ${drawOdds} - ${awayOdds}`)
}

function identifyProblems(predictions) {
    const problems = []
    
    // 1. Biais domicile excessif
    const homeWinCount = predictions.filter(p => 
        p.prediction.result_1x2.home_win > p.prediction.result_1x2.draw && 
        p.prediction.result_1x2.home_win > p.prediction.result_1x2.away_win
    ).length
    
    if (homeWinCount === predictions.length) {
        problems.push('🚨 BIAIS DOMICILE EXCESSIF: 100% des prédictions favorisent le domicile')
    }
    
    // 2. Confiance uniforme suspecte
    const confidences = predictions.map(p => p.prediction.analysis.overall_confidence)
    const uniqueConfidences = [...new Set(confidences)]
    if (uniqueConfidences.length === 1) {
        problems.push(`🚨 CONFIANCE UNIFORME: Toutes les prédictions ont ${confidences[0]}% de confiance`)
    }
    
    // 3. Analyses d'équipe trop génériques
    const genericAnalyses = predictions.filter(p => {
        const homeForces = p.prediction.analysis.home_analysis.forces.length
        const awayForces = p.prediction.analysis.away_analysis.forces.length
        return homeForces <= 1 || awayForces <= 1
    }).length
    
    if (genericAnalyses > predictions.length / 2) {
        problems.push('🚨 ANALYSES GÉNÉRIQUES: >50% des équipes ont ≤1 force identifiée')
    }
    
    // 4. Buteurs identiques
    const firstPredScorers = predictions[0].prediction.probable_scorers.home
    const identicalScorers = predictions.every(p => 
        JSON.stringify(p.prediction.probable_scorers.home) === JSON.stringify(firstPredScorers)
    )
    
    if (identicalScorers) {
        problems.push('🚨 BUTEURS GÉNÉRIQUES: Probabilités identiques pour tous les matchs')
    }
    
    // 5. Over/Under peu varié
    const over25Values = predictions.map(p => Math.round(p.prediction.total_goals.over_2_5 * 100))
    const over25Range = Math.max(...over25Values) - Math.min(...over25Values)
    
    if (over25Range < 30) {
        problems.push(`🚨 OVER/UNDER PEU VARIÉ: Écart de seulement ${over25Range}% entre matchs`)
    }
    
    // 6. Facteurs clés répétitifs
    const allFactors = predictions.flatMap(p => p.prediction.analysis.key_factors)
    const factorCounts = {}
    allFactors.forEach(factor => {
        factorCounts[factor] = (factorCounts[factor] || 0) + 1
    })
    
    const repetitiveFactors = Object.entries(factorCounts)
        .filter(([factor, count]) => count > predictions.length * 0.6)
        .map(([factor, count]) => `"${factor}" (${count}/${predictions.length})`)
    
    if (repetitiveFactors.length > 0) {
        problems.push(`🚨 FACTEURS RÉPÉTITIFS: ${repetitiveFactors.join(', ')}`)
    }
    
    // Afficher les problèmes
    if (problems.length === 0) {
        console.log('✅ Aucun problème critique détecté')
    } else {
        problems.forEach((problem, index) => {
            console.log(`${index + 1}. ${problem}`)
        })
    }
}

function generateRecommendations() {
    console.log('1. 🎯 CALIBRATION PROBABILITÉS')
    console.log('   - Revoir calculs Poisson avec vraies stats équipes')
    console.log('   - Ajuster avantage domicile selon performances réelles')
    console.log('   - Intégrer variance selon forme récente')
    
    console.log('\n2. 📊 ENRICHISSEMENT FEATURES')
    console.log('   - Utiliser vraiment toutes colonnes team_features disponibles')
    console.log('   - Intégrer données H2H historiques')
    console.log('   - Prendre en compte météo, absences, calendrier')
    
    console.log('\n3. 🤖 ANALYSE CONTEXTUELLE')
    console.log('   - Différencier analyses selon vraies caractéristiques équipes')
    console.log('   - Personnaliser buteurs probables par équipe')
    console.log('   - Ajuster confiance selon qualité données disponibles')
    
    console.log('\n4. 🎲 DIVERSIFICATION PRÉDICTIONS')
    console.log('   - Éviter biais systématique faveur domicile')
    console.log('   - Varier Over/Under selon styles tactiques')
    console.log('   - Identifier vraies opportunités de surprise')
    
    console.log('\n5. 📈 VALIDATION')
    console.log('   - Backtesting sur 100 matchs historiques')
    console.log('   - Comparaison avec cotes bookmakers')
    console.log('   - Métriques: accuracy, Brier score, calibration')
}

// Exécution
auditPredictions().catch(console.error)