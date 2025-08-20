#!/usr/bin/env node

/**
 * AUDIT CRITIQUE PRÉDICTIONS V2
 * 
 * Comparaison entre ancien système et nouveau moteur V2
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')

function auditV2Predictions() {
    console.log('🔍 AUDIT CRITIQUE PRÉDICTIONS V2')
    console.log('================================')
    
    // 1. Charger les prédictions V1 et V2
    const v1File = path.join(__dirname, '..', 'predictions', 'predictions_2025-08-19.json')
    const v2File = path.join(__dirname, '..', 'predictions', 'predictions_v2_2025-08-20.json')
    
    if (!fs.existsSync(v1File) || !fs.existsSync(v2File)) {
        console.error('❌ Fichiers prédictions manquants')
        return
    }
    
    const v1Data = JSON.parse(fs.readFileSync(v1File, 'utf-8'))
    const v2Data = JSON.parse(fs.readFileSync(v2File, 'utf-8'))
    
    console.log(`📊 V1: ${v1Data.predictions.length} prédictions`)
    console.log(`📊 V2: ${v2Data.predictions.length} prédictions\n`)
    
    // 2. Comparaison globale
    console.log('📈 COMPARAISON GLOBALE')
    console.log('======================')
    
    const v1Stats = analyzeGlobalStats(v1Data.predictions)
    const v2Stats = analyzeGlobalStats(v2Data.predictions)
    
    console.log('V1 (Ancien):')
    displayGlobalStats(v1Stats)
    
    console.log('\nV2 (Nouveau):')
    displayGlobalStats(v2Stats)
    
    // 3. Améliorations détectées
    console.log('\n🚀 AMÉLIORATIONS DÉTECTÉES')
    console.log('==========================')
    
    const improvements = []
    
    // Biais domicile
    if (v1Stats.homeWinPredictions === v1Stats.totalMatches && v2Stats.homeWinPredictions < v2Stats.totalMatches) {
        improvements.push('✅ BIAIS DOMICILE ÉLIMINÉ: 100% → ' + Math.round(v2Stats.homeWinPredictions/v2Stats.totalMatches*100) + '%')
    }
    
    // Diversité confiance
    const v1ConfidenceUnique = [...new Set(v1Data.predictions.map(p => p.prediction.analysis.overall_confidence))].length
    const v2ConfidenceUnique = [...new Set(v2Data.predictions.map(p => p.prediction.analysis.overall_confidence))].length
    
    if (v2ConfidenceUnique > v1ConfidenceUnique) {
        improvements.push(`✅ CONFIANCE DIVERSIFIÉE: ${v1ConfidenceUnique} → ${v2ConfidenceUnique} scores uniques`)
    }
    
    // Analyses enrichies
    const v1AvgForces = v1Data.predictions.reduce((sum, p) => sum + p.prediction.analysis.home_analysis.forces.length, 0) / v1Data.predictions.length
    const v2AvgForces = v2Data.predictions.reduce((sum, p) => sum + p.prediction.analysis.home_analysis.forces.length, 0) / v2Data.predictions.length
    
    if (v2AvgForces > v1AvgForces) {
        improvements.push(`✅ ANALYSES ENRICHIES: ${v1AvgForces.toFixed(1)} → ${v2AvgForces.toFixed(1)} forces moyennes`)
    }
    
    // Variabilité Over/Under
    const v1Over25Range = getOver25Range(v1Data.predictions)
    const v2Over25Range = getOver25Range(v2Data.predictions)
    
    if (v2Over25Range > v1Over25Range) {
        improvements.push(`✅ VARIABILITÉ AMÉLIORÉE: ${v1Over25Range}% → ${v2Over25Range}% écart Over/Under`)
    }
    
    improvements.forEach(improvement => console.log(improvement))
    
    // 4. Analyse détaillée d'un match
    console.log('\n🎯 ANALYSE DÉTAILLÉE - PSG vs ANGERS')
    console.log('====================================')
    
    const v1Match = v1Data.predictions.find(p => p.match_info.home_team_name.includes('Paris'))
    const v2Match = v2Data.predictions.find(p => p.match_info.home_team_name.includes('Paris'))
    
    if (v1Match && v2Match) {
        console.log('V1 (Ancien système):')
        displayMatchDetails(v1Match)
        
        console.log('\nV2 (Nouveau système):')
        displayMatchDetails(v2Match)
        
        console.log('\n📊 DIFFÉRENCES CLÉS:')
        const v1HomeWin = Math.round(v1Match.prediction.result_1x2.home_win * 100)
        const v2HomeWin = Math.round(v2Match.prediction.result_1x2.home_win * 100)
        console.log(`  Victoire domicile: ${v1HomeWin}% → ${v2HomeWin}%`)
        
        const v1Confidence = v1Match.prediction.analysis.overall_confidence
        const v2Confidence = v2Match.prediction.analysis.overall_confidence
        console.log(`  Confiance: ${v1Confidence}% → ${v2Confidence}%`)
        
        const v1Forces = v1Match.prediction.analysis.home_analysis.forces.length
        const v2Forces = v2Match.prediction.analysis.home_analysis.forces.length
        console.log(`  Forces identifiées: ${v1Forces} → ${v2Forces}`)
        
        const v1H2H = v1Match.prediction.analysis.key_factors || []
        const v2H2H = v2Match.prediction.analysis.matchup_analysis?.h2h_analysis || {}
        console.log(`  H2H: ${v1H2H.length > 0 ? 'Générique' : 'Absent'} → ${v2H2H.trend ? 'Personnalisé' : 'Absent'}`)
    }
    
    // 5. Score qualité global
    console.log('\n⭐ SCORE QUALITÉ GLOBAL')
    console.log('========================')
    
    const v1Quality = calculateQualityScore(v1Data.predictions)
    const v2Quality = calculateQualityScore(v2Data.predictions)
    
    console.log(`V1 Score: ${v1Quality}/100`)
    console.log(`V2 Score: ${v2Quality}/100`)
    console.log(`Amélioration: +${v2Quality - v1Quality} points`)
    
    if (v2Quality > v1Quality + 10) {
        console.log('\n🎉 AMÉLIORATION SIGNIFICATIVE!')
    } else if (v2Quality > v1Quality) {
        console.log('\n👍 Amélioration modérée')
    } else {
        console.log('\n⚠️ Amélioration limitée')
    }
}

function analyzeGlobalStats(predictions) {
    const stats = {
        totalMatches: predictions.length,
        avgHomeWin: 0,
        avgDraw: 0,
        avgAwayWin: 0,
        avgConfidence: 0,
        avgOver25: 0,
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
        stats.avgOver25 += goals.over_2_5 || 0
        
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
    console.log(`  📊 Moyennes 1X2: ${stats.avgHomeWin}% - ${stats.avgDraw}% - ${stats.avgAwayWin}%`)
    console.log(`  🎯 Confiance moyenne: ${stats.avgConfidence}%`)
    console.log(`  ⚽ Moyenne Over 2.5: ${stats.avgOver25}%`)
    console.log(`  🏠 Favoris domicile: ${stats.homeWinPredictions}/${stats.totalMatches}`)
    console.log(`  ✈️ Favoris extérieur: ${stats.awayWinPredictions}/${stats.totalMatches}`)
}

function getOver25Range(predictions) {
    const over25Values = predictions.map(p => Math.round((p.prediction.total_goals.over_2_5 || 0) * 100))
    return Math.max(...over25Values) - Math.min(...over25Values)
}

function displayMatchDetails(match) {
    const p1x2 = match.prediction.result_1x2
    const analysis = match.prediction.analysis
    
    console.log(`  📊 1X2: ${Math.round(p1x2.home_win*100)}% - ${Math.round(p1x2.draw*100)}% - ${Math.round(p1x2.away_win*100)}%`)
    console.log(`  🎯 Confiance: ${analysis.overall_confidence}%`)
    console.log(`  🏠 Forces domicile: ${analysis.home_analysis.forces.join(', ')}`)
    console.log(`  ✈️ Forces extérieur: ${analysis.away_analysis.forces.join(', ')}`)
    
    if (analysis.matchup_analysis?.h2h_analysis) {
        console.log(`  📊 H2H: ${analysis.matchup_analysis.h2h_analysis.trend || 'N/A'}`)
    }
}

function calculateQualityScore(predictions) {
    let score = 0
    const totalPredictions = predictions.length
    
    // 1. Diversité des favoris (max 25 points)
    const homeWins = predictions.filter(p => 
        p.prediction.result_1x2.home_win > Math.max(p.prediction.result_1x2.draw, p.prediction.result_1x2.away_win)
    ).length
    
    const biasScore = totalPredictions > 0 ? 25 - Math.abs(homeWins / totalPredictions - 0.5) * 50 : 0
    score += Math.max(0, biasScore)
    
    // 2. Diversité des scores de confiance (max 20 points)
    const uniqueConfidences = [...new Set(predictions.map(p => p.prediction.analysis.overall_confidence))].length
    score += Math.min(20, uniqueConfidences * 4)
    
    // 3. Richesse des analyses (max 25 points)
    const avgForces = predictions.reduce((sum, p) => 
        sum + p.prediction.analysis.home_analysis.forces.length + p.prediction.analysis.away_analysis.forces.length, 0
    ) / (totalPredictions * 2)
    
    score += Math.min(25, avgForces * 5)
    
    // 4. Variabilité Over/Under (max 20 points)
    const over25Range = getOver25Range(predictions)
    score += Math.min(20, over25Range / 3)
    
    // 5. Facteurs contextuels (max 10 points)
    const withKeyFactors = predictions.filter(p => 
        (p.prediction.analysis.key_factors && p.prediction.analysis.key_factors.length > 0) ||
        (p.prediction.analysis.matchup_analysis?.key_factors && p.prediction.analysis.matchup_analysis.key_factors.length > 0)
    ).length
    
    score += (withKeyFactors / totalPredictions) * 10
    
    return Math.round(score)
}

// Exécution
auditV2Predictions()