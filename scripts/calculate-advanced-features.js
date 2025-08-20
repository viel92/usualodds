#!/usr/bin/env node

/**
 * CALCUL FEATURES AVANCÉES POUR ML
 * 
 * Pipeline robuste de calcul des features critiques identifiées :
 * 1. ELO Rating System dynamique
 * 2. Form & Momentum (5/10 derniers matchs)  
 * 3. Possession moyenne depuis match_statistics JSON
 * 4. Volatility index (consistance performance)
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

class AdvancedFeaturesCalculator {
    constructor() {
        this.calculations = {
            eloCalculated: 0,
            formCalculated: 0,
            possessionCalculated: 0,
            volatilityCalculated: 0,
            errors: []
        }
        
        // Configuration ELO
        this.eloConfig = {
            initialRating: 1500,
            kFactor: 32,
            homeAdvantage: 100
        }
    }

    async calculateAllAdvancedFeatures() {
        console.log('🧠 CALCUL FEATURES AVANCÉES POUR ML')
        console.log('===================================')
        console.log('🎯 Objectif: Calculer ELO, Form, Possession, Volatility\n')

        // 1. Calculer ELO ratings pour toutes les saisons
        await this.calculateELOForAllSeasons()
        
        // 2. Calculer Form & Momentum
        await this.calculateFormFeatures()
        
        // 3. Extraire possession depuis JSON
        await this.extractPossessionFromJSON()
        
        // 4. Calculer volatility index
        await this.calculateVolatilityIndex()
        
        // 5. Validation finale
        await this.validateAdvancedFeatures()
        
        return this.calculations
    }

    async calculateELOForAllSeasons() {
        console.log('🏆 1. CALCUL ELO RATING SYSTEM')
        console.log('==============================')
        
        const seasons = [2021, 2022, 2023, 2024]
        
        for (const season of seasons) {
            console.log(`\n📊 Saison ${season}:`)
            await this.calculateSeasonELO(season)
        }
    }

    async calculateSeasonELO(season) {
        try {
            // Récupérer tous les matchs de la saison par ordre chronologique
            const { data: matches } = await supabase
                .from('matches')
                .select('*')
                .eq('season', season)
                .not('home_score', 'is', null)
                .not('away_score', 'is', null)
                .order('date')
                
            if (!matches || matches.length === 0) {
                console.log(`  ❌ Aucun match pour ${season}`)
                return
            }
            
            console.log(`  📈 ${matches.length} matches à traiter`)
            
            // Initialiser ELO ratings pour toutes les équipes
            const teamELOs = {}
            const teamNames = {}
            
            matches.forEach(match => {
                if (!teamELOs[match.home_team_id]) {
                    teamELOs[match.home_team_id] = this.eloConfig.initialRating
                    teamNames[match.home_team_id] = match.home_team_name
                }
                if (!teamELOs[match.away_team_id]) {
                    teamELOs[match.away_team_id] = this.eloConfig.initialRating
                    teamNames[match.away_team_id] = match.away_team_name
                }
            })
            
            console.log(`  🏆 ${Object.keys(teamELOs).length} équipes initialisées à ELO ${this.eloConfig.initialRating}`)
            
            // Calculer ELO match par match
            let processedMatches = 0
            for (const match of matches) {
                const homeELOBefore = teamELOs[match.home_team_id]
                const awayELOBefore = teamELOs[match.away_team_id]
                
                // Ajouter avantage domicile
                const homeELOWithAdvantage = homeELOBefore + this.eloConfig.homeAdvantage
                
                // Probabilité de victoire domicile
                const expectedHomeScore = this.calculateExpectedScore(homeELOWithAdvantage, awayELOBefore)
                
                // Score réel (1 = victoire domicile, 0.5 = nul, 0 = victoire extérieur)
                const actualScore = this.getActualScore(match)
                
                // Mise à jour ELO
                const homeELOChange = this.eloConfig.kFactor * (actualScore - expectedHomeScore)
                const awayELOChange = -homeELOChange
                
                teamELOs[match.home_team_id] = Math.round(homeELOBefore + homeELOChange)
                teamELOs[match.away_team_id] = Math.round(awayELOBefore + awayELOChange)
                
                processedMatches++
            }
            
            console.log(`  ⚡ ${processedMatches} matchs traités`)
            
            // Sauvegarder ELO final dans team_features
            let updatedTeams = 0
            for (const [teamId, finalELO] of Object.entries(teamELOs)) {
                // Calculer ELO home/away (ajustements basés sur performance domicile/extérieur)
                const { data: teamFeature } = await supabase
                    .from('team_features')
                    .select('home_advantage, away_performance')
                    .eq('team_id', teamId)
                    .eq('season', season)
                    .single()
                
                if (teamFeature) {
                    const homeAdvantageMultiplier = 1 + (teamFeature.home_advantage - 0.5) * 0.1
                    const awayPerformanceMultiplier = 1 + (teamFeature.away_performance - 0.5) * 0.1
                    
                    const eloHome = Math.round(finalELO * homeAdvantageMultiplier)
                    const eloAway = Math.round(finalELO * awayPerformanceMultiplier)
                    
                    const { error } = await supabase
                        .from('team_features')
                        .update({
                            elo_rating: finalELO,
                            elo_home: eloHome,
                            elo_away: eloAway
                        })
                        .eq('team_id', teamId)
                        .eq('season', season)
                        
                    if (!error) {
                        console.log(`    ✅ ${teamNames[teamId]}: ELO ${finalELO} (Home: ${eloHome}, Away: ${eloAway})`)
                        updatedTeams++
                        this.calculations.eloCalculated++
                    } else {
                        console.log(`    ❌ ${teamNames[teamId]}: ${error.message}`)
                        this.calculations.errors.push({ team: teamNames[teamId], season, error: error.message })
                    }
                }
            }
            
            console.log(`  📊 ${updatedTeams} équipes mises à jour avec ELO`)
            
        } catch (error) {
            console.error(`❌ Erreur ELO saison ${season}:`, error.message)
            this.calculations.errors.push({ season, error: error.message })
        }
    }

    calculateExpectedScore(eloA, eloB) {
        return 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
    }

    getActualScore(match) {
        if (match.home_score > match.away_score) return 1      // Victoire domicile
        if (match.home_score < match.away_score) return 0      // Victoire extérieur  
        return 0.5                                             // Match nul
    }

    async calculateFormFeatures() {
        console.log('\n📈 2. CALCUL FORM & MOMENTUM')
        console.log('============================')
        
        const seasons = [2021, 2022, 2023, 2024]
        
        for (const season of seasons) {
            console.log(`\n📊 Forme saison ${season}:`)
            await this.calculateSeasonForm(season)
        }
    }

    async calculateSeasonForm(season) {
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
                const form5 = await this.calculateTeamForm(team.team_id, season, 5)
                const form10 = await this.calculateTeamForm(team.team_id, season, 10)
                
                if (form5 !== null && form10 !== null) {
                    const { error } = await supabase
                        .from('team_features')
                        .update({
                            form_5_points: form5,
                            form_10_points: form10
                        })
                        .eq('team_id', team.team_id)
                        .eq('season', season)
                        
                    if (!error) {
                        updatedTeams++
                        this.calculations.formCalculated++
                    } else {
                        this.calculations.errors.push({ team: team.team_id, season, error: error.message })
                    }
                }
            }
            
            console.log(`    ✅ ${updatedTeams} équipes mises à jour (Form 5/10)`)
            
        } catch (error) {
            console.error(`❌ Erreur form saison ${season}:`, error.message)
            this.calculations.errors.push({ season, error: error.message })
        }
    }

    async calculateTeamForm(teamId, season, lastNMatches) {
        try {
            // Récupérer les N derniers matchs de l'équipe
            const { data: matches } = await supabase
                .from('matches')
                .select('home_team_id, away_team_id, home_score, away_score, date')
                .eq('season', season)
                .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
                .not('home_score', 'is', null)
                .not('away_score', 'is', null)
                .order('date', { ascending: false })
                .limit(lastNMatches)
                
            if (!matches || matches.length === 0) return null
            
            let totalPoints = 0
            matches.forEach(match => {
                const isHome = match.home_team_id === teamId
                const teamScore = isHome ? match.home_score : match.away_score
                const opponentScore = isHome ? match.away_score : match.home_score
                
                if (teamScore > opponentScore) totalPoints += 3      // Victoire
                else if (teamScore === opponentScore) totalPoints += 1  // Nul
                // Défaite = 0 points
            })
            
            return totalPoints
            
        } catch (error) {
            console.error(`Erreur calcul form team ${teamId}:`, error.message)
            return null
        }
    }

    async extractPossessionFromJSON() {
        console.log('\n⚽ 3. EXTRACTION POSSESSION DEPUIS JSON')
        console.log('======================================')
        
        try {
            // Récupérer échantillon match_statistics avec JSON
            const { data: statsample } = await supabase
                .from('match_statistics')
                .select('team_id, match_id, statistics')
                .not('statistics', 'is', null)
                .limit(100)
                
            if (!statsample || statsample.length === 0) {
                console.log('  ❌ Aucune statistique JSON disponible')
                return
            }
            
            console.log(`  📊 ${statsample.length} statistiques JSON analysées`)
            
            // Extraire possession par équipe
            const teamPossessions = {}
            let extractedStats = 0
            
            statsample.forEach(stat => {
                if (stat.statistics && stat.statistics.ball_possession) {
                    if (!teamPossessions[stat.team_id]) {
                        teamPossessions[stat.team_id] = []
                    }
                    // Parse possession (format: "45%" -> 45)
                    const possession = parseFloat(stat.statistics.ball_possession.replace('%', ''))
                    if (!isNaN(possession)) {
                        teamPossessions[stat.team_id].push(possession)
                        extractedStats++
                    }
                }
            })
            
            console.log(`  ⚡ ${extractedStats} données possession extraites`)
            console.log(`  🏆 ${Object.keys(teamPossessions).length} équipes avec données possession`)
            
            // Calculer moyenne possession et mettre à jour team_features
            let updatedTeams = 0
            for (const [teamId, possessions] of Object.entries(teamPossessions)) {
                const avgPossession = possessions.reduce((a, b) => a + b, 0) / possessions.length
                
                // Trouver à quelle saison appartient cette équipe
                const { data: teamSeasons } = await supabase
                    .from('team_features')
                    .select('season')
                    .eq('team_id', teamId)
                    
                if (teamSeasons && teamSeasons.length > 0) {
                    // Mettre à jour toutes les saisons pour cette équipe
                    for (const seasonData of teamSeasons) {
                        const { error } = await supabase
                            .from('team_features')
                            .update({ possession_avg: Number(avgPossession.toFixed(1)) })
                            .eq('team_id', teamId)
                            .eq('season', seasonData.season)
                            
                        if (!error) {
                            this.calculations.possessionCalculated++
                        }
                    }
                    
                    console.log(`    ✅ Équipe ${teamId}: ${avgPossession.toFixed(1)}% possession moyenne (${possessions.length} matchs)`)
                    updatedTeams++
                }
            }
            
            console.log(`  📊 ${updatedTeams} équipes mises à jour avec possession`)
            
        } catch (error) {
            console.error('❌ Erreur extraction possession:', error.message)
            this.calculations.errors.push({ feature: 'possession', error: error.message })
        }
    }

    async calculateVolatilityIndex() {
        console.log('\n📊 4. CALCUL VOLATILITY INDEX')
        console.log('=============================')
        
        const seasons = [2021, 2022, 2023, 2024]
        
        for (const season of seasons) {
            console.log(`\n📈 Volatilité saison ${season}:`)
            await this.calculateSeasonVolatility(season)
        }
    }

    async calculateSeasonVolatility(season) {
        try {
            const { data: teams } = await supabase
                .from('team_features')
                .select('team_id')
                .eq('season', season)
                
            if (!teams || teams.length === 0) return
            
            console.log(`  🏆 ${teams.length} équipes à traiter`)
            
            let updatedTeams = 0
            for (const team of teams) {
                const volatility = await this.calculateTeamVolatility(team.team_id, season)
                
                if (volatility !== null) {
                    const { error } = await supabase
                        .from('team_features')
                        .update({ volatility_index: volatility })
                        .eq('team_id', team.team_id)
                        .eq('season', season)
                        
                    if (!error) {
                        updatedTeams++
                        this.calculations.volatilityCalculated++
                    } else {
                        this.calculations.errors.push({ team: team.team_id, season, error: error.message })
                    }
                }
            }
            
            console.log(`    ✅ ${updatedTeams} équipes mises à jour (Volatilité)`)
            
        } catch (error) {
            console.error(`❌ Erreur volatilité saison ${season}:`, error.message)
        }
    }

    async calculateTeamVolatility(teamId, season) {
        try {
            // Récupérer résultats récents de l'équipe
            const { data: matches } = await supabase
                .from('matches')
                .select('home_team_id, away_team_id, home_score, away_score')
                .eq('season', season)
                .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
                .not('home_score', 'is', null)
                .not('away_score', 'is', null)
                .limit(15)  // 15 derniers matchs pour volatilité
                
            if (!matches || matches.length < 5) return null
            
            // Calculer différence de buts par match
            const goalDifferences = []
            matches.forEach(match => {
                const isHome = match.home_team_id === teamId
                const teamScore = isHome ? match.home_score : match.away_score
                const opponentScore = isHome ? match.away_score : match.home_score
                goalDifferences.push(teamScore - opponentScore)
            })
            
            // Calculer écart-type (volatilité)
            const mean = goalDifferences.reduce((a, b) => a + b, 0) / goalDifferences.length
            const variance = goalDifferences.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / goalDifferences.length
            const volatility = Math.sqrt(variance)
            
            return Number(volatility.toFixed(3))
            
        } catch (error) {
            console.error(`Erreur volatilité team ${teamId}:`, error.message)
            return null
        }
    }

    async validateAdvancedFeatures() {
        console.log('\n✅ 5. VALIDATION FEATURES AVANCÉES')
        console.log('===================================')
        
        // Compter features calculées par type
        const { data: eloCount } = await supabase
            .from('team_features')
            .select('elo_rating')
            .not('elo_rating', 'is', null)
            
        const { data: formCount } = await supabase
            .from('team_features')
            .select('form_5_points')
            .not('form_5_points', 'is', null)
            
        const { data: possessionCount } = await supabase
            .from('team_features')  
            .select('possession_avg')
            .not('possession_avg', 'is', null)
            
        const { data: volatilityCount } = await supabase
            .from('team_features')
            .select('volatility_index')
            .not('volatility_index', 'is', null)
            
        console.log('  📊 RÉSULTATS FINAUX:')
        console.log(`    • ELO ratings: ${eloCount?.length || 0} équipes`)
        console.log(`    • Form features: ${formCount?.length || 0} équipes`) 
        console.log(`    • Possession: ${possessionCount?.length || 0} équipes`)
        console.log(`    • Volatilité: ${volatilityCount?.length || 0} équipes`)
        console.log(`    • Erreurs: ${this.calculations.errors.length}`)
        
        // Test échantillon complet
        const { data: sampleTeam } = await supabase
            .from('team_features')
            .select('elo_rating, form_5_points, possession_avg, volatility_index')
            .not('elo_rating', 'is', null)
            .limit(1)
            .single()
            
        if (sampleTeam) {
            console.log('\n  🧪 ÉCHANTILLON FEATURES AVANCÉES:')
            console.log(`    ELO: ${sampleTeam.elo_rating}`)
            console.log(`    Form 5: ${sampleTeam.form_5_points} points`)
            console.log(`    Possession: ${sampleTeam.possession_avg}%`)
            console.log(`    Volatilité: ${sampleTeam.volatility_index}`)
        }
        
        const completionRate = ((eloCount?.length || 0) + (formCount?.length || 0) + 
                               (possessionCount?.length || 0) + (volatilityCount?.length || 0)) / 4
        
        console.log(`\n  🎯 TAUX COMPLETION: ${completionRate.toFixed(0)} features moyennes par équipe`)
        console.log(`  🚀 QUALITÉ: ${this.calculations.errors.length === 0 ? 'EXCELLENT' : 'BON'}`)
    }
}

// Fonction principale
async function calculateAdvancedFeatures() {
    try {
        const calculator = new AdvancedFeaturesCalculator()
        const results = await calculator.calculateAllAdvancedFeatures()
        
        console.log('\n🏆 CALCUL FEATURES AVANCÉES TERMINÉ')
        console.log('====================================')
        console.log(`✅ ELO calculé: ${results.eloCalculated} équipes`)
        console.log(`📈 Form calculé: ${results.formCalculated} équipes`)
        console.log(`⚽ Possession extraite: ${results.possessionCalculated} équipes`)
        console.log(`📊 Volatilité calculée: ${results.volatilityCalculated} équipes`)
        console.log(`❌ Erreurs: ${results.errors.length}`)
        console.log('🎯 Prêt pour architecture ML enterprise')
        
        return results
        
    } catch (error) {
        console.error('❌ Erreur calcul features avancées:', error)
        throw error
    }
}

// Exécution si appelé directement
if (require.main === module) {
    calculateAdvancedFeatures()
}

module.exports = { AdvancedFeaturesCalculator, calculateAdvancedFeatures }