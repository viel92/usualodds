require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function calculateTeamXGAverages() {
    console.log('📊 CALCUL XG MOYENNES ÉQUIPES')
    console.log('=============================')
    
    try {
        const seasons = [2020, 2021, 2022, 2023, 2024]
        let totalUpdated = 0
        
        for (const season of seasons) {
            console.log(`\\n📈 Saison ${season}:`)
            
            // Get all teams for this season
            const { data: teams } = await supabase
                .from('team_features')
                .select('team_id')
                .eq('season', season)
                
            if (!teams || teams.length === 0) {
                console.log(`  ❌ Aucune équipe pour saison ${season}`)
                continue
            }
            
            console.log(`  🏆 ${teams.length} équipes à traiter`)
            
            let updatedThisSeason = 0
            
            for (const team of teams) {
                const teamXG = await calculateTeamSeasonXG(team.team_id, season)
                
                if (teamXG && teamXG.matches > 0) {
                    const { error } = await supabase
                        .from('team_features')
                        .update({
                            xg_for_avg: teamXG.xgFor,
                            xg_against_avg: teamXG.xgAgainst, 
                            xg_diff_avg: teamXG.xgDiff,
                            xga_box_avg: teamXG.xgAgainst // Approximation
                        })
                        .eq('team_id', team.team_id)
                        .eq('season', season)
                        
                    if (!error) {
                        updatedThisSeason++
                        console.log(`    ✅ Team ${team.team_id}: XG For ${teamXG.xgFor}, Against ${teamXG.xgAgainst} (${teamXG.matches} matchs)`)
                    } else {
                        console.log(`    ❌ Team ${team.team_id}: ${error.message}`)
                    }
                }
            }
            
            totalUpdated += updatedThisSeason
            console.log(`  📊 ${updatedThisSeason} équipes mises à jour pour saison ${season}`)
        }
        
        console.log(`\\n🏆 TOTAL: ${totalUpdated} équipes mises à jour avec XG moyennes`)
        return { updated: totalUpdated }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
        throw error
    }
}

async function calculateTeamSeasonXG(teamId, season) {
    try {
        // Get all matches for this team in this season
        const { data: matches } = await supabase
            .from('matches')
            .select('id, home_team_id, away_team_id')
            .eq('season', season)
            .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
            .not('home_score', 'is', null)
            
        if (!matches || matches.length === 0) return null
        
        let xgForTotal = 0
        let xgAgainstTotal = 0
        let validMatches = 0
        
        for (const match of matches) {
            // Get XG for this team
            const { data: teamXG } = await supabase
                .from('match_statistics')
                .select('expected_goals')
                .eq('match_id', match.id)
                .eq('team_id', teamId)
                .single()
                
            // Get XG against (opponent)
            const opponentId = match.home_team_id === teamId ? match.away_team_id : match.home_team_id
            const { data: opponentXG } = await supabase
                .from('match_statistics')
                .select('expected_goals')
                .eq('match_id', match.id)
                .eq('team_id', opponentId)
                .single()
                
            if (teamXG?.expected_goals !== null && opponentXG?.expected_goals !== null) {
                xgForTotal += parseFloat(teamXG.expected_goals)
                xgAgainstTotal += parseFloat(opponentXG.expected_goals)
                validMatches++
            }
        }
        
        if (validMatches === 0) return null
        
        return {
            xgFor: Number((xgForTotal / validMatches).toFixed(2)),
            xgAgainst: Number((xgAgainstTotal / validMatches).toFixed(2)),
            xgDiff: Number(((xgForTotal - xgAgainstTotal) / validMatches).toFixed(2)),
            matches: validMatches
        }
        
    } catch (error) {
        console.error(`Erreur calcul XG team ${teamId} saison ${season}:`, error.message)
        return null
    }
}

// Execute if run directly
if (require.main === module) {
    calculateTeamXGAverages()
        .then(result => {
            console.log(`\\n✅ Script terminé: ${result?.updated || 0} équipes mises à jour`)
        })
        .catch(error => {
            console.error('Script failed:', error.message)
        })
}

module.exports = { calculateTeamXGAverages }