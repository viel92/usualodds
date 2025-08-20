#!/usr/bin/env node

/**
 * AUDIT RAPIDE ÉTAT DES DONNÉES 2020-2024
 * Simple vérification sans problèmes d'encodage
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function quickDataAudit() {
    console.log('\n=== AUDIT RAPIDE DONNÉES USUALODDS ===\n')
    
    try {
        // 1. Matches count by season
        console.log('1. MATCHES PAR SAISON:')
        const { data: matches, error: matchesError } = await supabase
            .from('matches')
            .select('season, status')
        
        if (matchesError) {
            console.log(`   ERROR: ${matchesError.message}`)
        } else {
            const seasons = {}
            const statusCount = {}
            
            matches.forEach(match => {
                seasons[match.season] = (seasons[match.season] || 0) + 1
                statusCount[match.status] = (statusCount[match.status] || 0) + 1
            })
            
            Object.entries(seasons).sort().forEach(([season, count]) => {
                console.log(`   ${season}: ${count} matches`)
            })
            console.log(`   TOTAL: ${matches.length} matches`)
            
            console.log('\n   STATUS MATCHES:')
            Object.entries(statusCount).forEach(([status, count]) => {
                console.log(`   ${status}: ${count}`)
            })
        }

        // 2. Team features
        console.log('\n2. TEAM FEATURES:')
        const { data: teamFeatures, error: teamError } = await supabase
            .from('team_features')
            .select('team_id, season, elo_rating, form_5_points, goals_per_game')
        
        if (teamError) {
            console.log(`   ERROR: ${teamError.message}`)
        } else {
            const seasonsTeams = {}
            let eloCount = 0
            let formCount = 0
            let goalsCount = 0
            
            teamFeatures.forEach(tf => {
                seasonsTeams[tf.season] = (seasonsTeams[tf.season] || 0) + 1
                if (tf.elo_rating) eloCount++
                if (tf.form_5_points) formCount++  
                if (tf.goals_per_game) goalsCount++
            })
            
            console.log(`   TOTAL: ${teamFeatures.length} team_features`)
            Object.entries(seasonsTeams).sort().forEach(([season, count]) => {
                console.log(`   ${season}: ${count} équipes`)
            })
            
            console.log('\n   FEATURES COMPLÉTÉES:')
            console.log(`   ELO Ratings: ${eloCount}/${teamFeatures.length} (${Math.round(eloCount/teamFeatures.length*100)}%)`)
            console.log(`   Form Points: ${formCount}/${teamFeatures.length} (${Math.round(formCount/teamFeatures.length*100)}%)`)
            console.log(`   Goals/Game: ${goalsCount}/${teamFeatures.length} (${Math.round(goalsCount/teamFeatures.length*100)}%)`)
        }

        // 3. Player features
        console.log('\n3. PLAYER FEATURES:')
        const { data: playerFeatures, error: playerError } = await supabase
            .from('player_features')
            .select('player_name, team_id, goals, assists, minutes_played')
        
        if (playerError) {
            console.log(`   ERROR: ${playerError.message}`)
        } else {
            let namesCount = 0
            let goalsCount = 0
            let assistsCount = 0
            let minutesCount = 0
            
            playerFeatures.forEach(pf => {
                if (pf.player_name && pf.player_name !== 'Unknown Player') namesCount++
                if (pf.goals > 0) goalsCount++
                if (pf.assists > 0) assistsCount++
                if (pf.minutes_played > 0) minutesCount++
            })
            
            console.log(`   TOTAL: ${playerFeatures.length} player_features`)
            console.log(`   Noms joueurs: ${namesCount}/${playerFeatures.length} (${Math.round(namesCount/playerFeatures.length*100)}%)`)
            console.log(`   Avec goals: ${goalsCount}/${playerFeatures.length} (${Math.round(goalsCount/playerFeatures.length*100)}%)`)
            console.log(`   Avec assists: ${assistsCount}/${playerFeatures.length} (${Math.round(assistsCount/playerFeatures.length*100)}%)`)
            console.log(`   Avec minutes: ${minutesCount}/${playerFeatures.length} (${Math.round(minutesCount/playerFeatures.length*100)}%)`)
        }

        // 4. Match statistics
        console.log('\n4. MATCH STATISTICS:')
        const { data: matchStats, error: statsError } = await supabase
            .from('match_statistics')
            .select('match_id, home_team_stats, away_team_stats, statistics')
        
        if (statsError) {
            console.log(`   ERROR: ${statsError.message}`)
        } else {
            let homeStatsCount = 0
            let awayStatsCount = 0
            let statisticsCount = 0
            
            matchStats.forEach(ms => {
                if (ms.home_team_stats) homeStatsCount++
                if (ms.away_team_stats) awayStatsCount++
                if (ms.statistics) statisticsCount++
            })
            
            console.log(`   TOTAL: ${matchStats.length} match_statistics`)
            console.log(`   Home stats: ${homeStatsCount}/${matchStats.length} (${Math.round(homeStatsCount/matchStats.length*100)}%)`)
            console.log(`   Away stats: ${awayStatsCount}/${matchStats.length} (${Math.round(awayStatsCount/matchStats.length*100)}%)`)
            console.log(`   JSON statistics: ${statisticsCount}/${matchStats.length} (${Math.round(statisticsCount/matchStats.length*100)}%)`)
        }

        // 5. Leagues & Teams
        console.log('\n5. LEAGUES & TEAMS:')
        const { data: leagues, error: leaguesError } = await supabase
            .from('leagues')
            .select('id, name, country')
        
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('id, name, league_id')
        
        if (!leaguesError && !teamsError) {
            console.log(`   Leagues: ${leagues.length}`)
            leagues.forEach(league => console.log(`     - ${league.name} (${league.country})`))
            
            const teamsByLeague = {}
            teams.forEach(team => {
                teamsByLeague[team.league_id] = (teamsByLeague[team.league_id] || 0) + 1
            })
            
            console.log(`   Teams: ${teams.length}`)
            Object.entries(teamsByLeague).forEach(([leagueId, count]) => {
                const league = leagues.find(l => l.id == leagueId)
                console.log(`     - ${league?.name || 'Unknown'}: ${count} équipes`)
            })
        }

        console.log('\n=== RÉSUMÉ CRITIQUE ===')
        const totalMatches = matches?.length || 0
        const totalTeamFeatures = teamFeatures?.length || 0
        const totalPlayerFeatures = playerFeatures?.length || 0
        
        console.log(`✓ ${totalMatches} matches historiques`)
        console.log(`✓ ${totalTeamFeatures} team_features`) 
        console.log(`✓ ${totalPlayerFeatures} player_features`)
        
        // Calcul score global
        const expectedMatches = 2000 // 5 saisons × ~40 matchs × 10 équipes
        const expectedTeams = 100   // 5 saisons × 20 équipes  
        const expectedPlayers = 2000 // Estimation large
        
        const dataScore = Math.round(
            (Math.min(totalMatches/expectedMatches, 1) * 40) +
            (Math.min(totalTeamFeatures/expectedTeams, 1) * 30) +
            (Math.min(totalPlayerFeatures/expectedPlayers, 1) * 30)
        )
        
        console.log(`\nSCORE GLOBAL DONNÉES: ${dataScore}/100`)
        
        if (dataScore >= 80) {
            console.log('🟢 ÉTAT: EXCELLENT - Prêt pour ML')
        } else if (dataScore >= 60) {
            console.log('🟡 ÉTAT: BON - Quelques améliorations nécessaires')  
        } else if (dataScore >= 40) {
            console.log('🟠 ÉTAT: MOYEN - Ingestion additionnelle requise')
        } else {
            console.log('🔴 ÉTAT: INSUFFISANT - Ingestion massive nécessaire')
        }
        
    } catch (error) {
        console.error('Erreur audit:', error.message)
    }
}

if (require.main === module) {
    quickDataAudit()
}