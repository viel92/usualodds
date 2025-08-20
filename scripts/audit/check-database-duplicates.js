const { createClient } = require('@supabase/supabase-js')

async function checkDuplicates() {
    console.log('🔍 VÉRIFICATION DOUBLONS BASE DE DONNÉES')
    console.log('==========================================')
    
    const supabase = createClient(
        'https://agysfqhijfbnqzzooyeo.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    )
    
    try {
        // 1. Vérifier les matchs
        console.log('📊 ANALYSE TABLE MATCHES...')
        
        // Total des matchs
        const { count: totalMatches } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
        
        console.log(`Total matchs: ${totalMatches}`)
        
        // Vérifier doublons par api_id (clé unique normalement)
        const { data: duplicateApiIds } = await supabase
            .from('matches')
            .select('api_id')
            .then(({ data }) => {
                const counts = {}
                data?.forEach(match => {
                    counts[match.api_id] = (counts[match.api_id] || 0) + 1
                })
                
                const duplicates = Object.entries(counts)
                    .filter(([_, count]) => count > 1)
                    .map(([api_id, count]) => ({ api_id: parseInt(api_id), count }))
                
                return { data: duplicates }
            })
        
        if (duplicateApiIds && duplicateApiIds.length > 0) {
            console.log(`❌ DOUBLONS API_ID détectés: ${duplicateApiIds.length}`)
            console.log('Premiers doublons:', duplicateApiIds.slice(0, 5))
        } else {
            console.log('✅ Aucun doublon api_id détecté')
        }
        
        // Distribution par saison
        const { data: seasonStats } = await supabase
            .from('matches')
            .select('season')
            .then(({ data }) => {
                const seasons = {}
                data?.forEach(match => {
                    seasons[match.season] = (seasons[match.season] || 0) + 1
                })
                return { data: seasons }
            })
        
        console.log('📅 Distribution par saison:')
        Object.entries(seasonStats || {}).forEach(([season, count]) => {
            console.log(`   ${season}: ${count} matchs`)
        })
        
        // 2. Vérifier les équipes
        console.log('\n🏆 ANALYSE TABLE TEAM_FEATURES...')
        
        const { count: totalTeams } = await supabase
            .from('team_features')
            .select('*', { count: 'exact', head: true })
        
        console.log(`Total team_features: ${totalTeams}`)
        
        // Vérifier doublons équipes (team_id + season + league_id = unique)
        const { data: teamDuplicates } = await supabase
            .from('team_features')
            .select('team_id, season, league_id')
            .then(({ data }) => {
                const keys = {}
                data?.forEach(team => {
                    const key = `${team.team_id}-${team.season}-${team.league_id}`
                    keys[key] = (keys[key] || 0) + 1
                })
                
                const duplicates = Object.entries(keys)
                    .filter(([_, count]) => count > 1)
                    .map(([key, count]) => ({ key, count }))
                
                return { data: duplicates }
            })
        
        if (teamDuplicates && teamDuplicates.length > 0) {
            console.log(`❌ DOUBLONS ÉQUIPES détectés: ${teamDuplicates.length}`)
            console.log('Premiers doublons:', teamDuplicates.slice(0, 5))
        } else {
            console.log('✅ Aucun doublon équipe détecté')
        }
        
        // 3. Vérifier les joueurs
        console.log('\n👤 ANALYSE TABLE PLAYER_FEATURES...')
        
        const { count: totalPlayers } = await supabase
            .from('player_features')
            .select('*', { count: 'exact', head: true })
        
        console.log(`Total player_features: ${totalPlayers}`)
        
        // 4. Analyse détaillée toutes les tables
        console.log('\n📋 ANALYSE COMPLÈTE TOUTES LES TABLES...')
        
        const tablesAnalysis = [
            'match_statistics',
            'match_events', 
            'match_formations',
            'match_lineups',
            'match_players_stats',
            'match_context',
            'match_odds_timeline',
            'coach_features',
            'ai_match_insights'
        ]
        
        for (const table of tablesAnalysis) {
            try {
                const { count } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true })
                
                console.log(`📊 ${table}: ${count || 0} entrées`)
                
                // Analyses spécifiques par table
                if (table === 'match_statistics' && count > 0) {
                    // Vérifier doublons match_statistics (match_id + team_id = unique)
                    const { data: matchStatsDuplicates } = await supabase
                        .from('match_statistics')
                        .select('match_id, team_id')
                        .then(({ data }) => {
                            const keys = {}
                            data?.forEach(stat => {
                                const key = `${stat.match_id}-${stat.team_id}`
                                keys[key] = (keys[key] || 0) + 1
                            })
                            
                            const duplicates = Object.entries(keys)
                                .filter(([_, count]) => count > 1)
                                .map(([key, count]) => ({ key, count }))
                            
                            return { data: duplicates }
                        })
                    
                    if (matchStatsDuplicates && matchStatsDuplicates.length > 0) {
                        console.log(`   ❌ ${matchStatsDuplicates.length} doublons détectés`)
                    } else {
                        console.log(`   ✅ Aucun doublon`)
                    }
                }
                
                if (table === 'match_events' && count > 0) {
                    // Vérifier distribution des événements par type
                    const { data: eventTypes } = await supabase
                        .from('match_events')
                        .select('type')
                        .limit(1000)
                        .then(({ data }) => {
                            const types = {}
                            data?.forEach(event => {
                                types[event.type] = (types[event.type] || 0) + 1
                            })
                            return { data: types }
                        })
                    
                    console.log(`   📈 Types d'événements:`, Object.keys(eventTypes || {}).slice(0, 5).join(', '))
                }
                
                if (table === 'player_features' && count > 0) {
                    // Vérifier doublons joueurs (player_id + team_id + season = unique)
                    const { data: playerDuplicates } = await supabase
                        .from('player_features')
                        .select('player_id, team_id, season')
                        .then(({ data }) => {
                            const keys = {}
                            data?.forEach(player => {
                                const key = `${player.player_id}-${player.team_id}-${player.season}`
                                keys[key] = (keys[key] || 0) + 1
                            })
                            
                            const duplicates = Object.entries(keys)
                                .filter(([_, count]) => count > 1)
                                .map(([key, count]) => ({ key, count }))
                            
                            return { data: duplicates }
                        })
                    
                    if (playerDuplicates && playerDuplicates.length > 0) {
                        console.log(`   ❌ ${playerDuplicates.length} doublons joueurs détectés`)
                    } else {
                        console.log(`   ✅ Aucun doublon joueur`)
                    }
                }
                
                if (table === 'match_lineups' && count > 0) {
                    // Vérifier doublons lineups (match_id + player_id = unique)
                    const { data: lineupDuplicates } = await supabase
                        .from('match_lineups')
                        .select('match_id, player_id')
                        .then(({ data }) => {
                            const keys = {}
                            data?.forEach(lineup => {
                                const key = `${lineup.match_id}-${lineup.player_id}`
                                keys[key] = (keys[key] || 0) + 1
                            })
                            
                            const duplicates = Object.entries(keys)
                                .filter(([_, count]) => count > 1)
                                .map(([key, count]) => ({ key, count }))
                            
                            return { data: duplicates }
                        })
                    
                    if (lineupDuplicates && lineupDuplicates.length > 0) {
                        console.log(`   ❌ ${lineupDuplicates.length} doublons lineups détectés`)
                    } else {
                        console.log(`   ✅ Aucun doublon lineup`)
                    }
                }
                
            } catch (error) {
                console.log(`   ❌ Erreur analyse ${table}:`, error.message)
            }
        }
        
        // 5. RECOMMANDATIONS
        console.log('\n💡 RECOMMANDATIONS:')
        
        if (totalMatches > 1000) {
            console.log('⚠️  Beaucoup de matchs détectés')
            console.log('   → Vérifier si données de test à nettoyer')
        }
        
        if (duplicateApiIds && duplicateApiIds.length > 0) {
            console.log('🧹 Nettoyage nécessaire: doublons api_id')
            console.log('   → Garder la version la plus récente (updated_at)')
        }
        
        if (teamDuplicates && teamDuplicates.length > 0) {
            console.log('🧹 Nettoyage nécessaire: doublons équipes')
            console.log('   → Garder la version la plus récente (updated_at)')
        }
        
        console.log('\n🎯 CONCLUSION:')
        if ((duplicateApiIds?.length || 0) === 0 && (teamDuplicates?.length || 0) === 0) {
            console.log('✅ Base de données propre - pas de nettoyage nécessaire')
        } else {
            console.log('🧹 Nettoyage recommandé avant phase prédictions 2025')
        }
        
    } catch (error) {
        console.error('❌ Erreur vérification:', error.message)
    }
}

checkDuplicates().catch(console.error)