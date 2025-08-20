#!/usr/bin/env node

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function create2023Features() {
    console.log('🏆 CRÉATION TEAM_FEATURES 2023')
    console.log('===============================')
    
    const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('season', 2023)
        .not('home_score', 'is', null)
        .order('date')
    
    if (!matches || matches.length === 0) {
        console.log('❌ Aucun match 2023')
        return
    }
    
    console.log(`📊 ${matches.length} matches analysés`)
    
    const teamStats = {}
    const teamNames = {}
    
    // Calculate stats for all teams
    matches.forEach(match => {
        [match.home_team_id, match.away_team_id].forEach(teamId => {
            if (!teamStats[teamId]) {
                teamStats[teamId] = { wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, games: 0 }
                teamNames[teamId] = teamId === match.home_team_id ? match.home_team_name : match.away_team_name
            }
        })
        
        teamStats[match.home_team_id].games++
        teamStats[match.away_team_id].games++
        
        teamStats[match.home_team_id].goals_for += match.home_score
        teamStats[match.home_team_id].goals_against += match.away_score
        teamStats[match.away_team_id].goals_for += match.away_score
        teamStats[match.away_team_id].goals_against += match.home_score
        
        if (match.home_score > match.away_score) {
            teamStats[match.home_team_id].wins++
            teamStats[match.away_team_id].losses++
        } else if (match.home_score < match.away_score) {
            teamStats[match.away_team_id].wins++
            teamStats[match.home_team_id].losses++
        } else {
            teamStats[match.home_team_id].draws++
            teamStats[match.away_team_id].draws++
        }
    })
    
    console.log(`🏆 ${Object.keys(teamStats).length} équipes identifiées`)
    
    let created = 0
    for (const [teamId, stats] of Object.entries(teamStats)) {
        const points = stats.wins * 3 + stats.draws
        
        const { error } = await supabase
            .from('team_features')
            .insert({
                team_id: parseInt(teamId),
                season: 2023,
                league_id: 61,
                games_played: stats.games,
                wins: stats.wins,
                draws: stats.draws, 
                losses: stats.losses,
                points: points,
                goals_for: stats.goals_for,
                goals_against: stats.goals_against,
                goal_difference: stats.goals_for - stats.goals_against,
                goals_per_game: Number((stats.goals_for / stats.games).toFixed(3)),
                goals_conceded_per_game: Number((stats.goals_against / stats.games).toFixed(3)),
                current_rank: 0,
                points_difference: 0,
                home_advantage: 0.5,
                away_performance: 0.5,
                form_5_points: 0,
                form_10_points: 0,
                underdog_performance: 0.5,
                big_game_mentality: 0.5,
                raw_stats: { team_name: teamNames[teamId] }
            })
            
        if (!error) {
            console.log(`  ✅ ${teamNames[teamId]}: ${stats.games} matchs, ${points} pts, ${stats.goals_for - stats.goals_against} diff`)
            created++
        } else {
            console.log(`  ❌ ${teamNames[teamId]}: ${error.message}`)
        }
    }
    
    console.log(`\n✅ ${created} équipes créées pour 2023`)
}

create2023Features().catch(console.error)