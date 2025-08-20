#!/usr/bin/env node

/**
 * CALCULATEUR FEATURES XG AVANCÉES
 * 
 * Calcule des features XG sophistiquées pour améliorer ML:
 * 1. XG par match (agrégation depuis match_statistics)  
 * 2. XG moyennes par équipe et saison
 * 3. XG features avancées (différentiels, ratios, tendances)
 * 4. Features XG pré-match pour prédictions
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

class XGFeaturesCalculator {
    constructor() {
        this.calculations = {
            matchXGCalculated: 0,
            teamXGCalculated: 0,
            advancedXGCalculated: 0,
            errors: []
        }
    }

    async calculateAllXGFeatures() {
        console.log('🎯 CALCUL FEATURES XG AVANCÉES')
        console.log('==============================')
        console.log('Objectif: Améliorer ML 45.8% → 55-60% avec XG\\n')

        // 1. Calculer XG par match
        await this.calculateMatchXG()
        
        // 2. Mettre à jour XG moyennes team_features
        await this.updateTeamXGAverages()
        
        // 3. Calculer features XG avancées
        await this.calculateAdvancedXGFeatures()
        
        // 4. Validation
        await this.validateXGFeatures()
        
        return this.calculations
    }

    async calculateMatchXG() {
        console.log('⚽ 1. CALCUL XG PAR MATCH')
        console.log('========================')
        
        try {
            // Récupérer TOUS les matchs avec résultats (pagination)
            console.log('  🔍 Récupération matches avec pagination...')
            let allMatches = []
            let page = 0
            const pageSize = 500
            
            while (true) {
                const offset = page * pageSize
                console.log(`    📃 Page ${page + 1}: offset ${offset}...`)
                
                const { data: matches, error } = await supabase
                    .from('matches')
                    .select('id, home_team_id, away_team_id, home_team_name, away_team_name, season')
                    .not('home_score', 'is', null)
                    .not('away_score', 'is', null)
                    .range(offset, offset + pageSize - 1)
                    
                if (error) throw error
                if (!matches || matches.length === 0) break
                
                allMatches = allMatches.concat(matches)
                console.log(`      📊 ${matches.length} matches récupérés (total: ${allMatches.length})`)
                page++
            }
                
            if (!allMatches || allMatches.length === 0) {
                console.log('  ❌ Aucun match trouvé')
                return
            }
            
            console.log(`  📊 TOTAL: ${allMatches.length} matches à traiter`)
            
            let processedMatches = 0
            for (const match of allMatches) {
                // Récupérer XG pour les deux équipes
                const { data: homeXGStats } = await supabase
                    .from('match_statistics')
                    .select('expected_goals')
                    .eq('match_id', match.id)
                    .eq('team_id', match.home_team_id)
                    .single()
                    
                const { data: awayXGStats } = await supabase
                    .from('match_statistics')
                    .select('expected_goals')
                    .eq('match_id', match.id)
                    .eq('team_id', match.away_team_id)
                    .single()
                
                if (homeXGStats?.expected_goals && awayXGStats?.expected_goals) {
                    const homeXG = parseFloat(homeXGStats.expected_goals)
                    const awayXG = parseFloat(awayXGStats.expected_goals)
                    
                    // Calculer features XG pour ce match
                    const xgFeatures = {
                        xg_home: homeXG,
                        xg_away: awayXG,
                        xg_total: homeXG + awayXG,
                        xg_diff: homeXG - awayXG,
                        xg_ratio: awayXG > 0 ? homeXG / awayXG : null,
                        xg_advantage_home: homeXG > awayXG ? 1 : 0,
                        xg_high_scoring: (homeXG + awayXG) > 2.5 ? 1 : 0
                    }
                    
                    // Mettre à jour le match avec les features XG
                    const { error } = await supabase
                        .from('matches')
                        .update(xgFeatures)
                        .eq('id', match.id)
                        
                    if (!error) {
                        processedMatches++
                        this.calculations.matchXGCalculated++
                        
                        if (processedMatches % 50 === 0) {
                            console.log(`    ✅ ${processedMatches} matches traités...`)
                        }
                    } else {
                        console.log(`    ❌ Erreur match ${match.home_team_name} vs ${match.away_team_name}: ${error.message}`)
                        this.calculations.errors.push({ match: match.id, error: error.message })
                    }
                }
            }
            
            console.log(`  🎯 ${processedMatches} matches mis à jour avec features XG`)
            
        } catch (error) {
            console.error('❌ Erreur calcul XG matches:', error.message)
            this.calculations.errors.push({ feature: 'match_xg', error: error.message })
        }
    }

    async updateTeamXGAverages() {
        console.log('\\n📊 2. MISE À JOUR XG MOYENNES ÉQUIPES')
        console.log('=====================================')
        
        const seasons = [2020, 2021, 2022, 2023, 2024]
        
        for (const season of seasons) {
            console.log(`\\n📈 Saison ${season}:`)
            await this.calculateSeasonTeamXG(season)
        }
    }

    async calculateSeasonTeamXG(season) {
        try {
            // Récupérer toutes les équipes de la saison
            const { data: teams } = await supabase
                .from('team_features')
                .select('team_id')
                .eq('season', season)
                
            if (!teams || teams.length === 0) {
                console.log(`  ❌ Aucune équipe pour ${season}`)
                return
            }
            
            console.log(`  🏆 ${teams.length} équipes à traiter`)
            
            let updatedTeams = 0
            for (const team of teams) {
                const xgStats = await this.calculateTeamSeasonXG(team.team_id, season)
                
                if (xgStats) {
                    const { error } = await supabase
                        .from('team_features')
                        .update({
                            xg_for_avg: xgStats.xgFor,
                            xg_against_avg: xgStats.xgAgainst,
                            xg_diff_avg: xgStats.xgDiff,
                            xga_box_avg: xgStats.xgAgainst // Approximation pour XGA dans la surface
                        })
                        .eq('team_id', team.team_id)
                        .eq('season', season)
                        
                    if (!error) {
                        updatedTeams++
                        this.calculations.teamXGCalculated++
                    } else {
                        this.calculations.errors.push({ team: team.team_id, season, error: error.message })
                    }
                }
            }
            
            console.log(`    ✅ ${updatedTeams} équipes mises à jour (XG moyennes)`)
            
        } catch (error) {
            console.error(`❌ Erreur XG saison ${season}:`, error.message)
        }
    }

    async calculateTeamSeasonXG(teamId, season) {
        try {
            // Récupérer toutes les stats XG de l'équipe pour la saison
            const { data: stats } = await supabase
                .from('match_statistics')
                .select('expected_goals, match_id')
                .eq('team_id', teamId)
                .not('expected_goals', 'is', null)
                
            if (!stats || stats.length === 0) return null
            
            // Filtrer par saison en vérifiant les matchs
            const seasonStats = []
            for (const stat of stats) {
                const { data: match } = await supabase
                    .from('matches')
                    .select('season')
                    .eq('id', stat.match_id)
                    .single()
                    
                if (match && match.season === season) {
                    seasonStats.push(parseFloat(stat.expected_goals))
                }
            }
            
            if (seasonStats.length === 0) return null
            
            // Calculer moyennes
            const avgXGFor = seasonStats.reduce((a, b) => a + b, 0) / seasonStats.length
            
            // Pour XG Against, récupérer les XG des adversaires
            const { data: opponentStats } = await supabase
                .from('matches')
                .select('id, home_team_id, away_team_id')
                .eq('season', season)
                .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
                
            let opponentXGs = []
            for (const match of opponentStats || []) {
                const opponentId = match.home_team_id === teamId ? match.away_team_id : match.home_team_id
                
                const { data: opponentStat } = await supabase
                    .from('match_statistics')
                    .select('expected_goals')
                    .eq('match_id', match.id)
                    .eq('team_id', opponentId)
                    .single()
                    
                if (opponentStat?.expected_goals) {
                    opponentXGs.push(parseFloat(opponentStat.expected_goals))
                }
            }
            
            const avgXGAgainst = opponentXGs.length > 0 ? 
                opponentXGs.reduce((a, b) => a + b, 0) / opponentXGs.length : 0
            
            return {
                xgFor: Number(avgXGFor.toFixed(2)),
                xgAgainst: Number(avgXGAgainst.toFixed(2)),
                xgDiff: Number((avgXGFor - avgXGAgainst).toFixed(2))
            }
            
        } catch (error) {
            console.error(`Erreur XG team ${teamId} saison ${season}:`, error.message)
            return null
        }
    }

    async calculateAdvancedXGFeatures() {
        console.log('\\n🚀 3. FEATURES XG AVANCÉES')
        console.log('===========================')
        
        try {
            // Calculer features XG sophistiquées pour chaque équipe
            const seasons = [2020, 2021, 2022, 2023, 2024]
            
            for (const season of seasons) {
                console.log(`\\n🧠 Features avancées saison ${season}:`)
                
                const { data: teams } = await supabase
                    .from('team_features')
                    .select('team_id, xg_for_avg, xg_against_avg')
                    .eq('season', season)
                    .not('xg_for_avg', 'is', null)
                    
                if (!teams || teams.length === 0) continue
                
                let updatedTeams = 0
                for (const team of teams) {
                    const advancedFeatures = await this.calculateTeamAdvancedXG(team.team_id, season)
                    
                    if (advancedFeatures) {
                        const { error } = await supabase
                            .from('team_features')
                            .update(advancedFeatures)
                            .eq('team_id', team.team_id)
                            .eq('season', season)
                            
                        if (!error) {
                            updatedTeams++
                            this.calculations.advancedXGCalculated++
                        }
                    }
                }
                
                console.log(`    ✅ ${updatedTeams} équipes avec features XG avancées`)
            }
            
        } catch (error) {
            console.error('❌ Erreur features XG avancées:', error.message)
        }
    }

    async calculateTeamAdvancedXG(teamId, season) {
        try {
            // Récupérer historique XG récent (10 derniers matchs)
            const { data: recentMatches } = await supabase
                .from('matches')
                .select('xg_home, xg_away, home_team_id, away_team_id, date')
                .eq('season', season)
                .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
                .not('xg_home', 'is', null)
                .not('xg_away', 'is', null)
                .order('date', { ascending: false })
                .limit(10)
                
            if (!recentMatches || recentMatches.length < 5) return null
            
            // Calculer tendance XG (forme récente)
            const recentXGs = recentMatches.map(match => {
                return match.home_team_id === teamId ? match.xg_home : match.xg_away
            })
            
            const recentXGsAgainst = recentMatches.map(match => {
                return match.home_team_id === teamId ? match.xg_away : match.xg_home
            })
            
            // Features avancées
            const avgRecentXG = recentXGs.reduce((a, b) => a + b, 0) / recentXGs.length
            const avgRecentXGAgainst = recentXGsAgainst.reduce((a, b) => a + b, 0) / recentXGsAgainst.length
            
            // Volatilité XG (écart-type)
            const xgMean = avgRecentXG
            const xgVariance = recentXGs.reduce((acc, xg) => acc + Math.pow(xg - xgMean, 2), 0) / recentXGs.length
            const xgVolatility = Math.sqrt(xgVariance)
            
            // Tendance (pente linéaire des 5 derniers)
            const recent5 = recentXGs.slice(0, 5)
            const xgTrend = recent5.length >= 3 ? this.calculateTrend(recent5) : 0
            
            return {
                xg_form_5: Number(avgRecentXG.toFixed(2)),
                xg_form_against_5: Number(avgRecentXGAgainst.toFixed(2)),
                xg_volatility: Number(xgVolatility.toFixed(3)),
                xg_trend: Number(xgTrend.toFixed(3)),
                xg_efficiency: recentXGs.length > 0 ? Number((avgRecentXG / Math.max(avgRecentXGAgainst, 0.1)).toFixed(2)) : 1
            }
            
        } catch (error) {
            console.error(`Erreur features XG avancées team ${teamId}:`, error.message)
            return null
        }
    }

    calculateTrend(values) {
        // Calcul simple de tendance (pente)
        const n = values.length
        const x = [...Array(n).keys()] // [0, 1, 2, ...]
        const y = values
        
        const sumX = x.reduce((a, b) => a + b, 0)
        const sumY = y.reduce((a, b) => a + b, 0)
        const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
        const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0)
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
        return isNaN(slope) ? 0 : slope
    }

    async validateXGFeatures() {
        console.log('\\n✅ 4. VALIDATION FEATURES XG')
        console.log('=============================')
        
        // Compter features calculées
        const { data: matchesWithXG } = await supabase
            .from('matches')
            .select('xg_home')
            .not('xg_home', 'is', null)
            
        const { data: teamsWithXG } = await supabase
            .from('team_features')
            .select('xg_for_avg')
            .not('xg_for_avg', 'is', null)
            
        const { data: teamsWithAdvancedXG } = await supabase
            .from('team_features')
            .select('xg_form_5')
            .not('xg_form_5', 'is', null)
            
        console.log('  📊 RÉSULTATS:')
        console.log(`    • Matches avec XG: ${matchesWithXG?.length || 0}`)
        console.log(`    • Équipes avec XG moyennes: ${teamsWithXG?.length || 0}`)
        console.log(`    • Équipes avec XG avancées: ${teamsWithAdvancedXG?.length || 0}`)
        console.log(`    • Erreurs: ${this.calculations.errors.length}`)
        
        // Test échantillon
        const { data: sampleMatch } = await supabase
            .from('matches')
            .select('home_team_name, away_team_name, xg_home, xg_away, xg_total, xg_diff')
            .not('xg_home', 'is', null)
            .limit(1)
            .single()
            
        if (sampleMatch) {
            console.log('\\n  🧪 ÉCHANTILLON MATCH XG:')
            console.log(`    ${sampleMatch.home_team_name} ${sampleMatch.xg_home} - ${sampleMatch.xg_away} ${sampleMatch.away_team_name}`)
            console.log(`    Total XG: ${sampleMatch.xg_total}, Diff: ${sampleMatch.xg_diff}`)
        }
        
        const { data: sampleTeam } = await supabase
            .from('team_features')
            .select('xg_for_avg, xg_against_avg, xg_form_5, xg_volatility')
            .not('xg_for_avg', 'is', null)
            .limit(1)
            .single()
            
        if (sampleTeam) {
            console.log('\\n  🧪 ÉCHANTILLON ÉQUIPE XG:')
            console.log(`    XG For: ${sampleTeam.xg_for_avg}, Against: ${sampleTeam.xg_against_avg}`)
            console.log(`    Form 5: ${sampleTeam.xg_form_5}, Volatilité: ${sampleTeam.xg_volatility}`)
        }
    }
}

// Fonction principale
async function calculateXGFeatures() {
    try {
        const calculator = new XGFeaturesCalculator()
        const results = await calculator.calculateAllXGFeatures()
        
        console.log('\\n🏆 CALCUL FEATURES XG TERMINÉ')
        console.log('==============================')
        console.log(`✅ XG par match: ${results.matchXGCalculated}`)
        console.log(`📊 XG équipes: ${results.teamXGCalculated}`)
        console.log(`🚀 XG avancées: ${results.advancedXGCalculated}`)
        console.log(`❌ Erreurs: ${results.errors.length}`)
        console.log('🎯 IMPACT: Features XG disponibles pour améliorer ML 45.8% → 55-60%')
        
        return results
        
    } catch (error) {
        console.error('❌ Erreur calcul features XG:', error)
        throw error
    }
}

// Exécution si appelé directement
if (require.main === module) {
    calculateXGFeatures()
}

module.exports = { XGFeaturesCalculator, calculateXGFeatures }