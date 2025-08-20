#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function detailedJsonStatsAnalysis() {
    console.log('\n=== ANALYSE DÉTAILLÉE STATISTIQUES JSON ===\n')
    
    try {
        // 1. Focus sur match_statistics
        console.log('1. 📊 TABLE MATCH_STATISTICS:')
        
        const { count: totalMatchStats } = await supabase
            .from('match_statistics')
            .select('*', { count: 'exact', head: true })
        
        console.log(`   Total records: ${totalMatchStats}`)
        
        // Échantillon détaillé
        const { data: statsExample } = await supabase
            .from('match_statistics')
            .select('match_id, team_id, statistics, raw_data')
            .limit(5)
        
        if (statsExample && statsExample.length > 0) {
            console.log('\n   📋 EXEMPLES DÉTAILLÉS:')
            
            statsExample.forEach((stat, index) => {
                console.log(`\n   Match ${index + 1}: match_id=${stat.match_id}, team_id=${stat.team_id}`)
                
                // Analyser le JSON statistics 
                if (stat.statistics) {
                    const stats = typeof stat.statistics === 'string' 
                        ? JSON.parse(stat.statistics) 
                        : stat.statistics
                    
                    console.log('     📊 STATISTICS JSON:')
                    Object.entries(stats).forEach(([key, value]) => {
                        console.log(`       ${key}: ${value}`)
                    })
                    
                    // Identifier les metrics ML importants
                    const mlMetrics = {
                        possession: stats.ball_possession || stats.possession,
                        shots_total: stats.total_shots,
                        shots_on_target: stats.shots_on_goal,
                        pass_accuracy: stats.passes_accuracy || stats['passes_%'],
                        expected_goals: stats.expected_goals,
                        corners: stats.corner_kicks,
                        fouls: stats.fouls,
                        cards: (stats.yellow_cards || 0) + (stats.red_cards || 0)
                    }
                    
                    console.log('     🎯 ML FEATURES EXTRACTIBLES:')
                    Object.entries(mlMetrics).forEach(([key, value]) => {
                        if (value !== undefined && value !== null) {
                            console.log(`       ${key}: ${value}`)
                        }
                    })
                }
            })
        }
        
        // 2. Analyser la distribution des champs JSON
        console.log('\n2. 📈 DISTRIBUTION CHAMPS JSON:')
        
        const { data: allStats } = await supabase
            .from('match_statistics')
            .select('statistics')
            .limit(100)
        
        if (allStats) {
            const fieldCounts = {}
            
            allStats.forEach(record => {
                if (record.statistics) {
                    const stats = typeof record.statistics === 'string' 
                        ? JSON.parse(record.statistics) 
                        : record.statistics
                    
                    Object.keys(stats).forEach(field => {
                        fieldCounts[field] = (fieldCounts[field] || 0) + 1
                    })
                }
            })
            
            console.log('   📊 Fréquence champs (sur 100 échantillons):')
            Object.entries(fieldCounts)
                .sort((a, b) => b[1] - a[1])
                .forEach(([field, count]) => {
                    console.log(`     ${field}: ${count}/100 (${count}%)`)
                })
        }
        
        // 3. Vérifier correspondance avec matches
        console.log('\n3. 🔗 CORRESPONDANCE AVEC MATCHES:')
        
        const { data: matchesWithStats } = await supabase
            .from('match_statistics')
            .select('match_id')
            .limit(10)
        
        if (matchesWithStats && matchesWithStats.length > 0) {
            const sampleMatchId = matchesWithStats[0].match_id
            
            // Chercher ce match dans la table matches
            const { data: matchInfo } = await supabase
                .from('matches')
                .select('id, home_team_name, away_team_name, date')
                .eq('id', sampleMatchId)
                .single()
            
            if (matchInfo) {
                console.log(`   ✅ Match trouvé: ${matchInfo.home_team_name} vs ${matchInfo.away_team_name}`)
                
                // Récupérer toutes les stats de ce match
                const { data: allStatsForMatch } = await supabase
                    .from('match_statistics')
                    .select('team_id, statistics')
                    .eq('match_id', sampleMatchId)
                
                console.log(`   📊 Stats disponibles: ${allStatsForMatch?.length} équipes`)
                
                allStatsForMatch?.forEach((teamStat, index) => {
                    console.log(`     Équipe ${index + 1} (id: ${teamStat.team_id}):`)
                    
                    if (teamStat.statistics) {
                        const stats = typeof teamStat.statistics === 'string' 
                            ? JSON.parse(teamStat.statistics) 
                            : teamStat.statistics
                        
                        console.log(`       Possession: ${stats.ball_possession || 'N/A'}`)
                        console.log(`       Shots: ${stats.total_shots || 'N/A'}`)
                        console.log(`       xG: ${stats.expected_goals || 'N/A'}`)
                    }
                })
            } else {
                console.log('   ❌ Match non trouvé dans table matches')
            }
        }
        
        // 4. Structure raw_data dans match_players_stats
        console.log('\n4. 👤 PLAYER STATS JSON (raw_stats):')
        
        const { data: playerStatsExample } = await supabase
            .from('match_players_stats')
            .select('player_name, raw_stats')
            .limit(3)
        
        if (playerStatsExample) {
            playerStatsExample.forEach((player, index) => {
                console.log(`\n   Joueur ${index + 1}: ${player.player_name}`)
                
                if (player.raw_stats) {
                    const rawStats = typeof player.raw_stats === 'string' 
                        ? JSON.parse(player.raw_stats) 
                        : player.raw_stats
                    
                    // Afficher structure principale
                    console.log('     📊 Structure raw_stats:')
                    Object.keys(rawStats).forEach(category => {
                        console.log(`       ${category}: ${typeof rawStats[category]}`)
                        
                        // Si c'est un objet, montrer les sous-clés
                        if (typeof rawStats[category] === 'object' && rawStats[category] !== null) {
                            const subKeys = Object.keys(rawStats[category]).slice(0, 3)
                            console.log(`         > ${subKeys.join(', ')}${subKeys.length < Object.keys(rawStats[category]).length ? '...' : ''}`)
                        }
                    })
                }
            })
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

detailedJsonStatsAnalysis()