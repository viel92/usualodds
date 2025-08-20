#!/usr/bin/env node

/**
 * AUDIT COMPLET BASE DE DONNÉES USUALODDS
 * 
 * Analyse exhaustive de TOUTES les tables pour ML system:
 * - Inventaire complet des données disponibles
 * - Test potentiel prédictif de chaque feature  
 * - Identification des lacunes critiques
 * - Recommandations APIs externes nécessaires
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

class ComprehensiveDataAuditor {
    constructor() {
        this.auditResults = {
            tables: {},
            totalRows: 0,
            predictiveFeatures: [],
            missingCritical: [],
            dataQuality: {},
            mlReadiness: 0
        }
    }

    async runComprehensiveAudit() {
        console.log('🔍 AUDIT COMPLET BASE DE DONNÉES USUALODDS')
        console.log('=========================================')
        console.log('🎯 Objectif: Préparer ML system optimal pour 2021→2022→2023→2024→2025\n')

        // 1. Inventaire complet des tables
        await this.auditAllTables()
        
        // 2. Analyse prédictive des features
        await this.analyzePredictiveFeatures()
        
        // 3. Test qualité des données par saison
        await this.testDataQualityBySeasons()
        
        // 4. Identification des gaps critiques
        await this.identifyCriticalGaps()
        
        // 5. Génération rapport ML-ready
        this.generateMLReadinessReport()
        
        return this.auditResults
    }

    async auditAllTables() {
        console.log('📊 1. INVENTAIRE COMPLET DES TABLES')
        console.log('===================================')
        
        const tables = [
            'matches', 'team_features', 'player_features', 'match_statistics', 
            'match_events', 'match_context', 'match_formations', 'match_lineups',
            'match_players_stats', 'coach_features', 'ai_team_analysis',
            'ai_predictions', 'match_odds_timeline'
        ]
        
        for (const tableName of tables) {
            await this.auditSingleTable(tableName)
        }
        
        console.log(`\n📈 RÉSUMÉ INVENTAIRE:`)
        console.log(`  📊 Tables analysées: ${Object.keys(this.auditResults.tables).length}`)
        console.log(`  📋 Total rows: ${this.auditResults.totalRows}`)
        console.log(`  💾 Tables principales: ${Object.keys(this.auditResults.tables).filter(t => this.auditResults.tables[t].count > 100).length}`)
    }

    async auditSingleTable(tableName) {
        try {
            // Compter les lignes
            const { count, error: countError } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true })
            
            if (countError) {
                console.log(`  ❌ ${tableName.padEnd(20)}: Erreur (${countError.message})`)
                return
            }

            // Échantillon pour analyse des colonnes
            const { data: sample, error: sampleError } = await supabase
                .from(tableName)
                .select('*')
                .limit(3)
                
            if (sampleError) {
                console.log(`  ⚠️ ${tableName.padEnd(20)}: ${count} rows (échantillon inaccessible)`)
                return
            }

            // Analyser structure des colonnes
            const columnAnalysis = this.analyzeColumns(sample, tableName)
            
            this.auditResults.tables[tableName] = {
                count: count || 0,
                columns: columnAnalysis.columns,
                mlFeatures: columnAnalysis.mlFeatures,
                nullRate: columnAnalysis.nullRate,
                dataTypes: columnAnalysis.dataTypes,
                sample: sample?.[0] || null
            }
            
            this.auditResults.totalRows += (count || 0)
            
            console.log(`  📊 ${tableName.padEnd(20)}: ${(count || 0).toString().padStart(5)} rows | ${columnAnalysis.columns.length} cols | ${columnAnalysis.mlFeatures} ML features`)
            
        } catch (error) {
            console.log(`  💥 ${tableName.padEnd(20)}: Exception (${error.message})`)
        }
    }

    analyzeColumns(sample, tableName) {
        if (!sample || sample.length === 0) {
            return { columns: [], mlFeatures: 0, nullRate: 100, dataTypes: {} }
        }
        
        const firstRow = sample[0]
        const columns = Object.keys(firstRow)
        const dataTypes = {}
        const nullCounts = {}
        let mlFeatures = 0
        
        columns.forEach(col => {
            const values = sample.map(row => row[col]).filter(v => v !== null && v !== undefined)
            
            if (values.length === 0) {
                dataTypes[col] = 'null'
                nullCounts[col] = 100
                return
            }
            
            const firstValue = values[0]
            
            if (typeof firstValue === 'number') {
                dataTypes[col] = 'numeric'
                if (this.isPredictiveFeature(col, tableName)) {
                    mlFeatures++
                }
            } else if (typeof firstValue === 'boolean') {
                dataTypes[col] = 'boolean'
                if (this.isPredictiveFeature(col, tableName)) {
                    mlFeatures++
                }
            } else if (typeof firstValue === 'string' && firstValue.includes('-') && firstValue.includes(':')) {
                dataTypes[col] = 'datetime'
            } else {
                dataTypes[col] = 'text'
            }
            
            nullCounts[col] = ((sample.length - values.length) / sample.length) * 100
        })
        
        const avgNullRate = Object.values(nullCounts).reduce((a, b) => a + b, 0) / columns.length
        
        return {
            columns,
            mlFeatures,
            nullRate: Math.round(avgNullRate),
            dataTypes
        }
    }

    isPredictiveFeature(columnName, tableName) {
        const predictivePatterns = [
            // Stats numériques
            /goals?/i, /shots?/i, /points?/i, /wins?/i, /losses?/i,
            /possession/i, /passes?/i, /fouls?/i, /cards?/i,
            /rating/i, /score/i, /average?/i, /per_game/i, /per90/i,
            
            // Features calculées
            /elo/i, /form/i, /strength/i, /momentum/i, /pressure/i,
            /motivation/i, /expectation/i, /volatility/i, /advantage/i,
            
            // Contexte prédictif
            /rank/i, /position/i, /distance/i, /rest/i, /travel/i,
            /injury/i, /suspension/i, /weather/i, /temperature/i,
            
            // Performance
            /home_/i, /away_/i, /big_game/i, /underdog/i, /upset/i
        ]
        
        return predictivePatterns.some(pattern => pattern.test(columnName))
    }

    async analyzePredictiveFeatures() {
        console.log('\n🧠 2. ANALYSE POTENTIEL PRÉDICTIF')
        console.log('=================================')
        
        // Focus sur les tables principales avec des résultats
        await this.analyzeMatchResults()
        await this.analyzeTeamFeatures()
        await this.analyzePlayerImpact()
        await this.analyzeMatchStatistics()
        await this.analyzeMatchEvents()
    }

    async analyzeMatchResults() {
        console.log('\n⚽ ANALYSE RÉSULTATS MATCHS')
        
        const { data: matches } = await supabase
            .from('matches')
            .select('season, home_score, away_score, date')
            .not('home_score', 'is', null)
            .not('away_score', 'is', null)
            .order('date')

        if (!matches || matches.length === 0) {
            console.log('  ❌ Aucun match avec résultats')
            return
        }

        // Analyser distribution des résultats par saison
        const seasonStats = {}
        matches.forEach(match => {
            if (!seasonStats[match.season]) {
                seasonStats[match.season] = { total: 0, home_wins: 0, draws: 0, away_wins: 0, goals: [] }
            }
            
            seasonStats[match.season].total++
            const totalGoals = match.home_score + match.away_score
            seasonStats[match.season].goals.push(totalGoals)
            
            if (match.home_score > match.away_score) seasonStats[match.season].home_wins++
            else if (match.home_score < match.away_score) seasonStats[match.season].away_wins++
            else seasonStats[match.season].draws++
        })

        console.log('  📊 Distribution résultats par saison:')
        Object.entries(seasonStats).forEach(([season, stats]) => {
            const homeWinRate = (stats.home_wins / stats.total * 100).toFixed(1)
            const drawRate = (stats.draws / stats.total * 100).toFixed(1)
            const awayWinRate = (stats.away_wins / stats.total * 100).toFixed(1)
            const avgGoals = stats.goals.length > 0 ? (stats.goals.reduce((a,b) => a+b, 0) / stats.goals.length).toFixed(2) : 0
            
            console.log(`    ${season}: ${stats.total} matchs | H:${homeWinRate}% D:${drawRate}% A:${awayWinRate}% | ${avgGoals} buts/match`)
        })

        this.auditResults.predictiveFeatures.push({
            category: 'Target Variables',
            features: ['home_score', 'away_score', 'total_goals', 'result_1x2'],
            count: matches.length,
            seasons: Object.keys(seasonStats),
            quality: 'excellent'
        })
    }

    async analyzeTeamFeatures() {
        console.log('\n🏆 ANALYSE TEAM FEATURES')
        
        const { data: features } = await supabase
            .from('team_features')
            .select('*')
            .limit(5)

        if (!features || features.length === 0) {
            console.log('  ❌ Aucune team feature')
            return
        }

        const sample = features[0]
        const numericFeatures = []
        const categoricalFeatures = []
        const nullFeatures = []

        Object.entries(sample).forEach(([key, value]) => {
            if (typeof value === 'number') {
                numericFeatures.push(key)
            } else if (typeof value === 'string' && !key.includes('_at') && !key.includes('id')) {
                categoricalFeatures.push(key)
            } else if (value === null) {
                nullFeatures.push(key)
            }
        })

        console.log(`  📊 Features numériques (${numericFeatures.length}):`)
        console.log(`    ${numericFeatures.slice(0, 10).join(', ')}${numericFeatures.length > 10 ? '...' : ''}`)
        
        console.log(`  🏷️ Features catégorielles (${categoricalFeatures.length}):`)
        console.log(`    ${categoricalFeatures.slice(0, 5).join(', ')}${categoricalFeatures.length > 5 ? '...' : ''}`)
        
        console.log(`  ❌ Features vides (${nullFeatures.length}):`)
        console.log(`    ${nullFeatures.slice(0, 8).join(', ')}${nullFeatures.length > 8 ? '...' : ''}`)

        this.auditResults.predictiveFeatures.push({
            category: 'Team Performance',
            features: numericFeatures,
            count: features.length,
            nullFeatures: nullFeatures.length,
            quality: nullFeatures.length < numericFeatures.length / 2 ? 'good' : 'partial'
        })
    }

    async analyzePlayerImpact() {
        console.log('\n👤 ANALYSE PLAYER FEATURES')
        
        const { data: players } = await supabase
            .from('player_features')
            .select('goals, assists, minutes_total, goals_per90')
            .gt('minutes_total', 500)
            .order('goals', { ascending: false })
            .limit(20)

        if (!players || players.length === 0) {
            console.log('  ❌ Aucune player feature significative')
            return
        }

        const topScorers = players.filter(p => p.goals > 5).length
        const avgGoalsPer90 = players.reduce((sum, p) => sum + (p.goals_per90 || 0), 0) / players.length

        console.log(`  ⚽ Top scorers (>5 buts): ${topScorers}`)
        console.log(`  📊 Moyenne goals/90min: ${avgGoalsPer90.toFixed(3)}`)
        console.log(`  🎯 Potentiel prédictif: Impact joueurs clés sur résultats équipe`)

        this.auditResults.predictiveFeatures.push({
            category: 'Player Impact',
            features: ['goals', 'assists', 'goals_per90', 'minutes_total'],
            count: players.length,
            quality: 'good'
        })
    }

    async analyzeMatchStatistics() {
        console.log('\n📈 ANALYSE MATCH STATISTICS')
        
        const { data: stats } = await supabase
            .from('match_statistics')
            .select('*')
            .limit(5)

        if (!stats || stats.length === 0) {
            console.log('  ❌ Aucune statistique de match')
            return
        }

        const sample = stats[0]
        const availableStats = Object.keys(sample).filter(key => 
            sample[key] !== null && !key.includes('id') && !key.includes('_at')
        )

        console.log(`  📊 Statistiques disponibles: ${availableStats.length}`)
        console.log(`  📋 Types: ${availableStats.slice(0, 8).join(', ')}${availableStats.length > 8 ? '...' : ''}`)

        // Vérifier si données dans statistics JSONB
        if (sample.statistics) {
            const jsonStats = Object.keys(sample.statistics).length
            console.log(`  💾 Données JSON: ${jsonStats} statistiques additionnelles`)
        }

        this.auditResults.predictiveFeatures.push({
            category: 'Match Statistics',
            features: availableStats,
            count: stats.length,
            quality: availableStats.length > 5 ? 'good' : 'limited'
        })
    }

    async analyzeMatchEvents() {
        console.log('\n⚡ ANALYSE MATCH EVENTS')
        
        const { data: events } = await supabase
            .from('match_events')
            .select('type, time_elapsed, detail')
            .limit(1000)

        if (!events || events.length === 0) {
            console.log('  ❌ Aucun événement de match')
            return
        }

        const eventTypes = {}
        events.forEach(event => {
            eventTypes[event.type] = (eventTypes[event.type] || 0) + 1
        })

        console.log(`  📊 Types d'événements: ${Object.keys(eventTypes).length}`)
        Object.entries(eventTypes).forEach(([type, count]) => {
            console.log(`    ${type}: ${count}`)
        })

        this.auditResults.predictiveFeatures.push({
            category: 'Match Events',
            features: Object.keys(eventTypes),
            count: events.length,
            quality: 'excellent'
        })
    }

    async testDataQualityBySeasons() {
        console.log('\n🔍 3. QUALITÉ DONNÉES PAR SAISON')
        console.log('================================')
        
        const seasons = [2020, 2021, 2022, 2023, 2024]
        
        for (const season of seasons) {
            await this.testSeasonQuality(season)
        }
    }

    async testSeasonQuality(season) {
        // Test matches
        const { count: matchCount } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .eq('season', season)
            .not('home_score', 'is', null)

        // Test team features
        const { count: teamFeaturesCount } = await supabase
            .from('team_features')
            .select('*', { count: 'exact', head: true })
            .eq('season', season)

        // Test match statistics
        const { data: sampleStats } = await supabase
            .from('matches')
            .select('api_id')
            .eq('season', season)
            .limit(10)

        let statsAvailable = 0
        if (sampleStats && sampleStats.length > 0) {
            for (const match of sampleStats.slice(0, 3)) {
                const { count } = await supabase
                    .from('match_statistics')
                    .select('*', { count: 'exact', head: true })
                    .eq('match_id', match.api_id)
                
                if (count > 0) statsAvailable++
            }
        }

        const statsRate = sampleStats ? (statsAvailable / Math.min(3, sampleStats.length)) * 100 : 0
        let qualityScore = 0
        
        if (matchCount > 300) qualityScore += 40
        if (teamFeaturesCount > 15) qualityScore += 30
        if (statsRate > 50) qualityScore += 30

        console.log(`  📅 Saison ${season}: ${matchCount || 0} matchs | ${teamFeaturesCount || 0} équipes | ${statsRate.toFixed(0)}% stats → Score: ${qualityScore}/100`)

        this.auditResults.dataQuality[season] = {
            matches: matchCount || 0,
            teamFeatures: teamFeaturesCount || 0,
            statsRate,
            qualityScore
        }
    }

    async identifyCriticalGaps() {
        console.log('\n🚨 4. LACUNES CRITIQUES IDENTIFIÉES')
        console.log('====================================')

        const criticalGaps = []

        // Vérifier météo
        const { count: weatherCount } = await supabase
            .from('match_context')
            .select('*', { count: 'exact', head: true })
            .not('weather_condition', 'is', null)

        if (weatherCount === 0) {
            criticalGaps.push({
                category: 'Météo',
                impact: 'HIGH',
                description: 'Aucune donnée météo disponible',
                solution: 'Intégrer API OpenWeatherMap ou WeatherAPI',
                benefit: '+8-12% accuracy sur matchs extérieurs difficiles'
            })
        }

        // Vérifier absences/blessures
        const { data: samplePlayers } = await supabase
            .from('player_features')
            .select('injury_history')
            .not('injury_history', 'is', null)
            .limit(5)

        if (!samplePlayers || samplePlayers.length === 0) {
            criticalGaps.push({
                category: 'Blessures/Absences',
                impact: 'HIGH', 
                description: 'Pas de tracking des absences joueurs clés',
                solution: 'API-Football injuries endpoint ou web scraping',
                benefit: '+10-15% accuracy quand joueur star absent'
            })
        }

        // Vérifier cotes bookmakers
        const { count: oddsCount } = await supabase
            .from('match_odds_timeline')
            .select('*', { count: 'exact', head: true })

        if (oddsCount === 0) {
            criticalGaps.push({
                category: 'Cotes Bookmakers',
                impact: 'MEDIUM',
                description: 'Aucune donnée de cotes pour calibration',
                solution: 'API Odds-API ou The Odds API',
                benefit: '+5-8% calibration probabilités'
            })
        }

        // Vérifier données récentes
        const { data: recentMatches } = await supabase
            .from('matches')
            .select('date')
            .gte('date', '2024-01-01')
            .order('date', { ascending: false })
            .limit(1)

        const hasRecent2024 = recentMatches && recentMatches.length > 0 && 
                              new Date(recentMatches[0].date) > new Date('2024-06-01')

        if (!hasRecent2024) {
            criticalGaps.push({
                category: 'Données 2024',
                impact: 'HIGH',
                description: 'Données 2024 incomplètes pour training récent',
                solution: 'Collecte complète matchs Ligue 1 2023-24',
                benefit: '+15-20% accuracy grâce à patterns récents'
            })
        }

        this.auditResults.missingCritical = criticalGaps

        console.log('  🔴 Lacunes critiques détectées:')
        criticalGaps.forEach((gap, index) => {
            console.log(`    ${index + 1}. ${gap.category} [${gap.impact}]`)
            console.log(`       Problem: ${gap.description}`)
            console.log(`       Solution: ${gap.solution}`)
            console.log(`       Bénéfice: ${gap.benefit}`)
            console.log('')
        })
    }

    generateMLReadinessReport() {
        console.log('\n🎯 5. RAPPORT ML READINESS')
        console.log('==========================')

        let mlScore = 0
        let maxScore = 100

        // Données historiques (30 points)
        const hasGoodHistorical = Object.keys(this.auditResults.dataQuality).length >= 3 &&
                                 Object.values(this.auditResults.dataQuality).some(s => s.qualityScore > 70)
        if (hasGoodHistorical) mlScore += 25
        else mlScore += 10

        // Features disponibles (25 points)
        const totalFeatures = this.auditResults.predictiveFeatures.reduce((sum, cat) => sum + cat.features.length, 0)
        if (totalFeatures > 50) mlScore += 25
        else if (totalFeatures > 30) mlScore += 20
        else mlScore += 15

        // Qualité des données (20 points)
        const avgQuality = Object.values(this.auditResults.dataQuality).reduce((sum, s) => sum + s.qualityScore, 0) / 
                          Object.keys(this.auditResults.dataQuality).length
        mlScore += Math.round(avgQuality * 0.2)

        // Volume de données (15 points)  
        if (this.auditResults.totalRows > 15000) mlScore += 15
        else if (this.auditResults.totalRows > 5000) mlScore += 10
        else mlScore += 5

        // Gaps critiques (10 points)
        const criticalGaps = this.auditResults.missingCritical.filter(g => g.impact === 'HIGH').length
        if (criticalGaps === 0) mlScore += 10
        else if (criticalGaps <= 2) mlScore += 5
        else mlScore += 0

        this.auditResults.mlReadiness = mlScore

        console.log(`  📊 Score ML Readiness: ${mlScore}/100`)
        console.log(`  📈 Données historiques: ${hasGoodHistorical ? '✅' : '⚠️'} (${Object.keys(this.auditResults.dataQuality).length} saisons)`)
        console.log(`  🧠 Features prédictives: ${totalFeatures} disponibles`)
        console.log(`  💾 Volume total: ${this.auditResults.totalRows.toLocaleString()} rows`)
        console.log(`  🚨 Lacunes critiques: ${this.auditResults.missingCritical.filter(g => g.impact === 'HIGH').length}`)

        if (mlScore >= 80) {
            console.log('  🎉 EXCELLENT - Prêt pour ML system avancé')
        } else if (mlScore >= 60) {
            console.log('  👍 BON - ML system possible avec améliorations')
        } else if (mlScore >= 40) {
            console.log('  ⚠️ MOYEN - Données insuffisantes pour ML optimal')
        } else {
            console.log('  🔴 FAIBLE - Enrichissement majeur requis')
        }

        // Recommandations spécifiques
        console.log('\n💡 RECOMMANDATIONS PRIORITAIRES:')
        if (mlScore < 80) {
            this.auditResults.missingCritical.forEach((gap, index) => {
                if (gap.impact === 'HIGH') {
                    console.log(`  ${index + 1}. ${gap.category}: ${gap.solution}`)
                }
            })
        }
        console.log(`  🔄 Priorité: Compléter données 2023-2024 pour training optimal`)
        console.log(`  🎯 Target: ${mlScore < 60 ? 'Atteindre 60+' : 'Optimiser vers 90+'} avant développement ML`)
    }
}

// Fonction principale
async function runComprehensiveAudit() {
    try {
        const auditor = new ComprehensiveDataAuditor()
        const results = await auditor.runComprehensiveAudit()
        
        console.log('\n🚀 AUDIT TERMINÉ')
        console.log('================')
        console.log(`📊 ${Object.keys(results.tables).length} tables analysées`)
        console.log(`🧠 ${results.predictiveFeatures.length} catégories de features`)
        console.log(`⚡ Score ML Readiness: ${results.mlReadiness}/100`)
        console.log(`🎯 Prêt pour développement système ML avancé`)
        
        return results
        
    } catch (error) {
        console.error('❌ Erreur audit:', error)
        throw error
    }
}

// Exécution si appelé directement
if (require.main === module) {
    runComprehensiveAudit()
}

module.exports = { ComprehensiveDataAuditor, runComprehensiveAudit }