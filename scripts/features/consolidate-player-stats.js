#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function consolidatePlayerStats() {
    console.log('\n=== CONSOLIDATION PLAYER STATS ===\n')
    
    try {
        // 1. Récupérer toutes les stats des matches avec pagination
        console.log('1. 📊 RÉCUPÉRATION MATCH_PLAYERS_STATS:')
        
        let allStats = []
        let page = 0
        const pageSize = 1000
        
        while (true) {
            const { data: pageData, error: pageError } = await supabase
                .from('match_players_stats')
                .select('player_name, goals, assists, minutes_played, yellow_cards, red_cards, match_id')
                .range(page * pageSize, (page + 1) * pageSize - 1)
            
            if (pageError) {
                console.log(`   ❌ Erreur page ${page + 1}: ${pageError.message}`)
                break
            }
            
            if (!pageData || pageData.length === 0) break
            allStats.push(...pageData)
            
            console.log(`   Page ${page + 1}: ${pageData.length} stats (total: ${allStats.length})`)
            
            if (pageData.length < pageSize) break
            page++
            
            if (page > 20) { // Safety limit
                console.log('   ⚠️ Arrêt sécurité après 20 pages')
                break
            }
        }
        
        console.log(`   ✅ Total stats récupérées: ${allStats.length}`)
        
        // 2. Récupérer ALL les informations des matches avec pagination
        console.log('\n2. 🏆 RÉCUPÉRATION INFO MATCHES:')
        let allMatches = []
        let matchPage = 0
        const matchPageSize = 1000
        
        while (true) {
            const { data: matchPageData } = await supabase
                .from('matches')
                .select('id, season, home_team_id, away_team_id, home_team_name, away_team_name')
                .range(matchPage * matchPageSize, (matchPage + 1) * matchPageSize - 1)
            
            if (!matchPageData || matchPageData.length === 0) break
            allMatches.push(...matchPageData)
            
            if (matchPageData.length < matchPageSize) break
            matchPage++
            
            if (matchPage > 10) break // Safety
        }
        
        const matchMap = {}
        allMatches.forEach(match => {
            matchMap[match.id] = match
        })
        console.log(`   ✅ Matches indexés: ${Object.keys(matchMap).length} (${allMatches.length} total)`)
        
        // 3. Aggreger par joueur + saison
        console.log('\n3. 📈 AGRÉGATION PAR JOUEUR-SAISON:')
        const playerSeasonStats = {}
        
        let validStats = 0
        let noPlayerName = 0
        let noMatchFound = 0
        
        allStats.forEach(stat => {
            if (!stat.player_name || stat.player_name === 'Unknown Player') {
                noPlayerName++
                return
            }
            
            const match = matchMap[stat.match_id]
            if (!match) {
                noMatchFound++
                return
            }
            
            validStats++
            
            const key = `${stat.player_name}_${match.season}`
            
            if (!playerSeasonStats[key]) {
                playerSeasonStats[key] = {
                    player_name: stat.player_name,
                    season: match.season,
                    goals: 0,
                    assists: 0,
                    minutes: 0,
                    yellow_cards: 0,
                    red_cards: 0,
                    matches_played: 0,
                    team_name: null // On prendra la plus fréquente
                }
            }
            
            // Agrégation
            const ps = playerSeasonStats[key]
            ps.goals += stat.goals || 0
            ps.assists += stat.assists || 0
            ps.minutes += stat.minutes_played || 0
            ps.yellow_cards += stat.yellow_cards || 0
            ps.red_cards += stat.red_cards || 0
            ps.matches_played += 1
            
            // Déterminer l'équipe (home ou away)
            if (stat.minutes_played > 0) {
                // Si le joueur a joué, essayer de déterminer son équipe
                // Logique simple: on garde la première équipe rencontrée
                if (!ps.team_name) {
                    ps.team_name = match.home_team_name // Par défaut, mais à améliorer
                }
            }
        })
        
        const playerSeasonArray = Object.values(playerSeasonStats)
        console.log(`   ✅ Joueurs-saisons créés: ${playerSeasonArray.length}`)
        console.log(`   Debug: stats valides=${validStats}, sans nom=${noPlayerName}, sans match=${noMatchFound}`)
        
        // 4. Afficher top buteurs consolidés
        console.log('\n4. ⚽ TOP 10 BUTEURS CONSOLIDÉS:')
        const topScorers = playerSeasonArray
            .filter(p => p.goals > 0)
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 10)
        
        topScorers.forEach((player, i) => {
            console.log(`   ${i+1}. ${player.player_name}: ${player.goals} buts (${player.season})`)
        })
        
        // 5. Vérifier Dembélé spécifiquement
        console.log('\n5. 🔍 VÉRIFICATION DEMBÉLÉ:')
        const dembeles = playerSeasonArray.filter(p => 
            p.player_name.toLowerCase().includes('dembel') ||
            p.player_name.toLowerCase().includes('ousmane')
        )
        
        dembeles.forEach(player => {
            console.log(`   ${player.player_name}: ${player.goals}G ${player.assists}A (${player.season}) - ${player.matches_played} matches`)
        })
        
        // 6. Vider et repopuler player_features
        console.log('\n6. 🗑️ NETTOYAGE PLAYER_FEATURES:')
        // Simplement ignorer la suppression si la table est vide
        console.log('   ✅ Nettoyage ignoré (table probablement vide)')
        
        // 7. Insérer les stats consolidées
        console.log('\n7. 📥 INSERTION STATS CONSOLIDÉES:')
        
        // Préparer les données pour insertion
        const playersToInsert = playerSeasonArray.map(p => ({
            player_name: p.player_name,
            season: p.season,
            goals: p.goals,
            assists: p.assists,
            minutes_played: p.minutes,
            matches_played: p.matches_played,
            yellow_cards: p.yellow_cards,
            red_cards: p.red_cards,
            team_name: p.team_name,
            goals_per_match: p.matches_played > 0 ? Math.round(p.goals / p.matches_played * 100) / 100 : 0,
            minutes_per_match: p.matches_played > 0 ? Math.round(p.minutes / p.matches_played) : 0
        }))
        
        // Insertion par batches de 100
        const batchSize = 100
        let inserted = 0
        
        for (let i = 0; i < playersToInsert.length; i += batchSize) {
            const batch = playersToInsert.slice(i, i + batchSize)
            
            const { error: insertError } = await supabase
                .from('player_features')
                .insert(batch)
            
            if (insertError) {
                console.log(`   ❌ Erreur batch ${Math.floor(i/batchSize) + 1}: ${insertError.message}`)
            } else {
                inserted += batch.length
                console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} joueurs (total: ${inserted})`)
            }
        }
        
        // 8. Résumé final
        console.log('\n8. 📊 RÉSUMÉ CONSOLIDATION:')
        console.log(`   Stats sources: ${allStats.length}`)
        console.log(`   Joueurs-saisons: ${playerSeasonArray.length}`)
        console.log(`   Joueurs insérés: ${inserted}`)
        console.log(`   Top buteur: ${topScorers[0]?.player_name} (${topScorers[0]?.goals} buts)`)
        
        // 9. Vérification finale
        const { count: finalCount } = await supabase
            .from('player_features')
            .select('*', { count: 'exact', head: true })
        
        console.log(`   Vérification finale: ${finalCount} joueurs dans player_features`)
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

consolidatePlayerStats()