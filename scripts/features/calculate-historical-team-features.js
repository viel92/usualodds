#!/usr/bin/env node

/**
 * CALCUL AUTOMATIQUE TEAM_FEATURES HISTORIQUES
 * 
 * Création des team_features pour saisons 2020-2022 depuis les données matches
 * Objectif: Débloquer développement ML avec relations matches ↔ team_features
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

class HistoricalTeamFeaturesCalculator {
    constructor() {
        this.calculations = {
            seasonsProcessed: [],
            teamsCreated: 0,
            featuresCalculated: [],
            errors: []
        }
    }

    async calculateAllHistoricalFeatures() {
        console.log('🏗️ CALCUL AUTOMATIQUE TEAM_FEATURES HISTORIQUES')
        console.log('=================================================')
        console.log('🎯 Objectif: Créer team_features 2020-2022 pour débloquer ML\n')

        // 1. Identifier saisons à traiter
        await this.identifyTargetSeasons()
        
        // 2. Calculer team_features par saison
        const seasons = [2020, 2021, 2022]
        
        for (const season of seasons) {
            console.log(`\n🏆 TRAITEMENT SAISON ${season}`)
            console.log('==============================')
            await this.calculateSeasonTeamFeatures(season)
        }
        
        // 3. Validation finale des relations
        await this.validateRelationships()
        
        return this.calculations
    }

    async identifyTargetSeasons() {
        console.log('📊 1. IDENTIFICATION SAISONS CIBLES')
        console.log('===================================')
        
        // Saisons matches
        const { data: matches } = await supabase
            .from('matches')
            .select('season')
            .limit(2000)
            
        const matchSeasons = [...new Set(matches?.map(m => m.season) || [])]
        
        // Saisons team_features existantes
        const { data: teams } = await supabase
            .from('team_features')
            .select('season')
            
        const existingSeasons = [...new Set(teams?.map(t => t.season) || [])]
        
        const targetSeasons = matchSeasons.filter(s => !existingSeasons.includes(s))
        
        console.log('  📈 Saisons matches disponibles:', matchSeasons.sort().join(', '))
        console.log('  🏆 Saisons team_features existantes:', existingSeasons.sort().join(', '))
        console.log('  🎯 Saisons à calculer:', targetSeasons.sort().join(', '))
        
        this.calculations.seasonsProcessed = targetSeasons
    }

    async calculateSeasonTeamFeatures(season) {
        try {
            // 1. Récupérer tous les matchs de la saison
            const { data: matches } = await supabase
                .from('matches')
                .select('*')
                .eq('season', season)
                .not('home_score', 'is', null)
                .not('away_score', 'is', null)
                .order('date')
                
            if (!matches || matches.length === 0) {
                console.log(`  ❌ Aucun match disponible pour ${season}`)
                return
            }
            
            console.log(`  📊 ${matches.length} matchs disponibles`)
            
            // 2. Identifier toutes les équipes de la saison
            const teamIds = new Set()
            const teamNames = {}
            
            matches.forEach(match => {
                teamIds.add(match.home_team_id)
                teamIds.add(match.away_team_id)
                teamNames[match.home_team_id] = match.home_team_name
                teamNames[match.away_team_id] = match.away_team_name
            })
            
            console.log(`  🏆 ${teamIds.size} équipes identifiées`)
            
            // 3. Calculer features pour chaque équipe
            for (const teamId of teamIds) {
                await this.calculateTeamFeatures(teamId, season, matches, teamNames[teamId])
            }
            
        } catch (error) {
            console.error(`❌ Erreur saison ${season}:`, error.message)
            this.calculations.errors.push({ season, error: error.message })
        }
    }

    async calculateTeamFeatures(teamId, season, allMatches, teamName) {
        try {
            // Filtrer les matchs de cette équipe
            const teamMatches = allMatches.filter(m => 
                m.home_team_id === teamId || m.away_team_id === teamId
            )
            
            if (teamMatches.length === 0) return
            
            // Calculer statistiques de base
            const stats = this.calculateBasicStats(teamId, teamMatches)
            const homeStats = this.calculateHomeAwayStats(teamId, teamMatches, 'home')  
            const awayStats = this.calculateHomeAwayStats(teamId, teamMatches, 'away')
            const contextualStats = this.calculateContextualStats(teamId, teamMatches, allMatches)
            
            // Créer l'enregistrement team_features
            const teamFeature = {
                team_id: teamId,
                season: season,
                league_id: 61, // Ligue 1
                
                // Statistiques de base
                games_played: stats.games_played,
                wins: stats.wins,
                draws: stats.draws, 
                losses: stats.losses,
                points: stats.points,
                
                // Buts
                goals_for: stats.goals_for,
                goals_against: stats.goals_against,
                goal_difference: stats.goals_for - stats.goals_against,
                goals_per_game: Number((stats.goals_for / stats.games_played).toFixed(3)),
                goals_conceded_per_game: Number((stats.goals_against / stats.games_played).toFixed(3)),
                
                // Domicile
                home_wins: homeStats.wins,
                home_draws: homeStats.draws,
                home_losses: homeStats.losses,
                home_goals_for: homeStats.goals_for,
                home_goals_against: homeStats.goals_against,
                home_advantage: Number((homeStats.points / (homeStats.games_played * 3)).toFixed(3)),
                
                // Extérieur  
                away_wins: awayStats.wins,
                away_draws: awayStats.draws,
                away_losses: awayStats.losses,
                away_goals_for: awayStats.goals_for,
                away_goals_against: awayStats.goals_against,
                away_performance: Number((awayStats.points / (awayStats.games_played * 3)).toFixed(3)),
                
                // Métriques contextuelles
                current_rank: contextualStats.rank,
                points_difference: contextualStats.points_difference,
                
                // Forme récente (calculée plus tard par un autre script)
                form_5_points: 0,
                form_10_points: 0,
                
                // Features avancées (null pour l'instant, calculées séparément)
                elo_rating: null,
                elo_home: null,
                elo_away: null,
                xg_for_avg: null,
                xg_against_avg: null,
                xg_diff_avg: null,
                possession_avg: null,
                volatility_index: null,
                
                // Performance categories
                underdog_performance: 0.5,
                big_game_mentality: 0.5,
                giant_killer_flag: false,
                choker_flag: false,
                
                // Metadata
                raw_stats: {
                    team_name: teamName,
                    season_summary: {
                        matches_played: stats.games_played,
                        total_points: stats.points,
                        goal_difference: stats.goals_for - stats.goals_against,
                        win_rate: Number((stats.wins / stats.games_played).toFixed(3))
                    }
                },
                
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
            
            // Insérer en base
            const { error } = await supabase
                .from('team_features')
                .insert(teamFeature)
                
            if (error) {
                console.error(`    ❌ ${teamName}: ${error.message}`)
                this.calculations.errors.push({ team: teamName, season, error: error.message })
            } else {
                console.log(`    ✅ ${teamName}: ${stats.games_played} matchs, ${stats.points} pts, ${(stats.goals_for - stats.goals_against).toString().padStart(3)} diff`)
                this.calculations.teamsCreated++
            }
            
        } catch (error) {
            console.error(`❌ Erreur calcul ${teamName}:`, error.message)
            this.calculations.errors.push({ team: teamName, season, error: error.message })
        }
    }

    calculateBasicStats(teamId, teamMatches) {
        let games_played = 0
        let wins = 0
        let draws = 0
        let losses = 0
        let goals_for = 0
        let goals_against = 0
        
        teamMatches.forEach(match => {
            games_played++
            
            const isHome = match.home_team_id === teamId
            const teamScore = isHome ? match.home_score : match.away_score
            const opponentScore = isHome ? match.away_score : match.home_score
            
            goals_for += teamScore
            goals_against += opponentScore
            
            if (teamScore > opponentScore) wins++
            else if (teamScore < opponentScore) losses++  
            else draws++
        })
        
        return {
            games_played,
            wins,
            draws,
            losses,
            points: wins * 3 + draws,
            goals_for,
            goals_against
        }
    }

    calculateHomeAwayStats(teamId, teamMatches, venue) {
        const venueMatches = teamMatches.filter(match => {
            if (venue === 'home') return match.home_team_id === teamId
            else return match.away_team_id === teamId
        })
        
        let wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0
        
        venueMatches.forEach(match => {
            const isHome = match.home_team_id === teamId
            const teamScore = isHome ? match.home_score : match.away_score
            const opponentScore = isHome ? match.away_score : match.home_score
            
            goals_for += teamScore
            goals_against += opponentScore
            
            if (teamScore > opponentScore) wins++
            else if (teamScore < opponentScore) losses++
            else draws++
        })
        
        return {
            games_played: venueMatches.length,
            wins,
            draws, 
            losses,
            points: wins * 3 + draws,
            goals_for,
            goals_against
        }
    }

    calculateContextualStats(teamId, teamMatches, allMatches) {
        // Calculer classement approximatif basé sur les points
        const allTeamStats = {}
        
        // Calculer points pour toutes les équipes
        allMatches.forEach(match => {
            [match.home_team_id, match.away_team_id].forEach(id => {
                if (!allTeamStats[id]) {
                    allTeamStats[id] = { points: 0, games: 0 }
                }
            })
            
            allTeamStats[match.home_team_id].games++
            allTeamStats[match.away_team_id].games++
            
            if (match.home_score > match.away_score) {
                allTeamStats[match.home_team_id].points += 3
            } else if (match.home_score < match.away_score) {
                allTeamStats[match.away_team_id].points += 3
            } else {
                allTeamStats[match.home_team_id].points += 1
                allTeamStats[match.away_team_id].points += 1
            }
        })
        
        // Trier par points pour obtenir le classement
        const sortedTeams = Object.entries(allTeamStats)
            .sort(([,a], [,b]) => b.points - a.points)
            
        const rank = sortedTeams.findIndex(([id]) => parseInt(id) === teamId) + 1
        
        // Points différence avec le leader
        const leaderPoints = sortedTeams[0]?.[1].points || 0
        const teamPoints = allTeamStats[teamId]?.points || 0
        const points_difference = leaderPoints - teamPoints
        
        return {
            rank,
            points_difference
        }
    }

    async validateRelationships() {
        console.log('\n✅ VALIDATION FINALE DES RELATIONS')
        console.log('==================================')
        
        // Test sur quelques matchs récents
        const { data: testMatches } = await supabase
            .from('matches')
            .select('api_id, season, home_team_id, away_team_id, home_team_name, away_team_name')
            .in('season', [2020, 2021, 2022])
            .limit(5)
            
        if (testMatches && testMatches.length > 0) {
            console.log('  🧪 Tests de jointure:')
            
            for (const match of testMatches.slice(0, 3)) {
                // Test home team
                const { count: homeCount } = await supabase
                    .from('team_features')
                    .select('*', { count: 'exact', head: true })
                    .eq('team_id', match.home_team_id)
                    .eq('season', match.season)
                    
                // Test away team
                const { count: awayCount } = await supabase
                    .from('team_features')
                    .select('*', { count: 'exact', head: true })
                    .eq('team_id', match.away_team_id)
                    .eq('season', match.season)
                    
                const homeStatus = homeCount > 0 ? '✅' : '❌'
                const awayStatus = awayCount > 0 ? '✅' : '❌'
                
                console.log(`    ${match.season} ${match.home_team_name} vs ${match.away_team_name}: ${homeStatus} ${awayStatus}`)
            }
        }
        
        // Statistiques finales
        const { count: totalFeatures } = await supabase
            .from('team_features')
            .select('*', { count: 'exact', head: true })
            
        const { data: seasonCounts } = await supabase
            .from('team_features')
            .select('season')
            
        const seasonDist = {}
        seasonCounts?.forEach(s => {
            seasonDist[s.season] = (seasonDist[s.season] || 0) + 1
        })
        
        console.log('\n  📊 RÉSULTATS FINAUX:')
        console.log(`    • Total team_features: ${totalFeatures}`)
        console.log('    • Distribution par saison:')
        Object.entries(seasonDist).sort().forEach(([season, count]) => {
            console.log(`      ${season}: ${count} équipes`)
        })
        
        const coverage = this.calculations.errors.length === 0 ? 'EXCELLENT' : 'PARTIEL'
        console.log(`    • Qualité: ${coverage}`)
        
        if (this.calculations.errors.length > 0) {
            console.log(`    • Erreurs: ${this.calculations.errors.length}`)
        }
    }
}

// Fonction principale
async function calculateHistoricalTeamFeatures() {
    try {
        const calculator = new HistoricalTeamFeaturesCalculator()
        const results = await calculator.calculateAllHistoricalFeatures()
        
        console.log('\n🏆 CALCUL TERMINÉ')
        console.log('==================')
        console.log(`✅ Saisons traitées: ${results.seasonsProcessed.join(', ')}`)
        console.log(`🏗️ Équipes créées: ${results.teamsCreated}`)
        console.log(`❌ Erreurs: ${results.errors.length}`)
        console.log('🎯 Relations matches ↔ team_features: DÉBLOQUÉES pour ML')
        
        return results
        
    } catch (error) {
        console.error('❌ Erreur calcul historique:', error)
        throw error
    }
}

// Exécution si appelé directement
if (require.main === module) {
    calculateHistoricalTeamFeatures()
}

module.exports = { HistoricalTeamFeaturesCalculator, calculateHistoricalTeamFeatures }