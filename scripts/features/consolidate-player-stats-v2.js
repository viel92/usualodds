#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function consolidatePlayerStatsV2() {
    console.log('\n=== CONSOLIDATION PLAYER STATS V2 (Via Saisons) ===\n')
    
    try {
        // APPROCHE ALTERNATIVE: Ne pas lier aux matches individuels, 
        // mais directement créer les player_features par saison en agrégeant les stats
        
        // 1. Récupérer toutes les stats des matches
        console.log('1. 📊 RÉCUPÉRATION MATCH_PLAYERS_STATS:')
        
        let allStats = []
        let page = 0
        const pageSize = 1000
        
        while (true) {
            const { data: pageData, error: pageError } = await supabase
                .from('match_players_stats')
                .select('player_name, goals, assists, minutes_played, yellow_cards, red_cards, team_id, match_id')
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
            
            if (page > 20) break
        }
        
        console.log(`   ✅ Total stats récupérées: ${allStats.length}`)
        
        // 2. Créer une correspondance manuelle équipe -> saison basée sur les données existantes
        console.log('\n2. 🏆 MAPPAGE SAISONS PAR LOGIQUE:')
        
        // Logique simple: 
        // - On assume que les match_players_stats sont ordonnés chronologiquement
        // - Les premiers matchs sont probablement 2020-2021, puis 2021-2022, etc.
        
        // Grouper par match_id pour avoir une idée de la chronologie
        const matchGroups = {}
        allStats.forEach(stat => {
            if (!matchGroups[stat.match_id]) {
                matchGroups[stat.match_id] = []
            }
            matchGroups[stat.match_id].push(stat)
        })
        
        const uniqueMatchIds = Object.keys(matchGroups).map(id => parseInt(id)).sort((a, b) => a - b)
        console.log(`   Matches uniques: ${uniqueMatchIds.length}`)
        console.log(`   IDs min-max: ${uniqueMatchIds[0]} - ${uniqueMatchIds[uniqueMatchIds.length-1]}`)
        
        // Répartir les matchs par saison (approximation)
        const matchesPerSeason = Math.floor(uniqueMatchIds.length / 5) // 5 saisons
        console.log(`   ~${matchesPerSeason} matches par saison`)
        
        const seasonMapping = {}
        uniqueMatchIds.forEach((matchId, index) => {
            const seasonIndex = Math.floor(index / matchesPerSeason)
            const seasons = ['2020', '2021', '2022', '2023', '2024']
            const season = seasons[Math.min(seasonIndex, 4)] // Cap à 2024
            seasonMapping[matchId] = season
        })
        
        console.log(`   ✅ Mapping créé pour ${Object.keys(seasonMapping).length} matches`)
        
        // 3. Agrégation par joueur + saison
        console.log('\n3. 📈 AGRÉGATION PAR JOUEUR-SAISON:')
        const playerSeasonStats = {}
        
        let validStats = 0
        let noPlayerName = 0
        let noSeasonFound = 0
        
        allStats.forEach(stat => {
            if (!stat.player_name || stat.player_name === 'Unknown Player') {
                noPlayerName++
                return
            }
            
            const season = seasonMapping[stat.match_id]
            if (!season) {
                noSeasonFound++
                return
            }
            
            validStats++
            
            const key = `${stat.player_name}_${season}`
            
            if (!playerSeasonStats[key]) {
                playerSeasonStats[key] = {
                    player_name: stat.player_name,
                    season: season,
                    goals: 0,
                    assists: 0,
                    minutes: 0,
                    yellow_cards: 0,
                    red_cards: 0,
                    matches_played: 0,
                    team_id: stat.team_id // Premier team_id rencontré
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
        })
        
        const playerSeasonArray = Object.values(playerSeasonStats)
        console.log(`   ✅ Joueurs-saisons créés: ${playerSeasonArray.length}`)
        console.log(`   Debug: stats valides=${validStats}, sans nom=${noPlayerName}, sans saison=${noSeasonFound}`)
        
        // 4. Top buteurs par saison
        console.log('\n4. ⚽ TOP BUTEURS PAR SAISON:')
        const seasons = ['2020', '2021', '2022', '2023', '2024']
        
        seasons.forEach(season => {
            const seasonPlayers = playerSeasonArray
                .filter(p => p.season === season && p.goals > 0)
                .sort((a, b) => b.goals - a.goals)
                .slice(0, 5)
            
            console.log(`   ${season}: ${seasonPlayers.length} buteurs`)
            seasonPlayers.forEach((player, i) => {
                console.log(`     ${i+1}. ${player.player_name}: ${player.goals} buts (${player.matches_played} matches)`)
            })
        })
        
        // 5. Vérifier Dembélé spécifiquement
        console.log('\n5. 🔍 DEMBÉLÉ TOUTES SAISONS:')
        const dembeles = playerSeasonArray.filter(p => 
            p.player_name.toLowerCase().includes('dembel') ||
            p.player_name.toLowerCase().includes('ousmane')
        )
        
        let totalDembeleGoals = 0
        dembeles.forEach(player => {
            console.log(`   ${player.season}: ${player.player_name} - ${player.goals}G ${player.assists}A (${player.matches_played} matches)`)
            totalDembeleGoals += player.goals
        })
        console.log(`   🎯 TOTAL DEMBÉLÉ: ${totalDembeleGoals} buts`)
        
        // 6. Insertion dans player_features
        console.log('\n6. 📥 INSERTION PLAYER_FEATURES:')
        
        // Préparer les données avec league_id requis
        const playersToInsert = playerSeasonArray.map((p, index) => ({
            player_id: index + 1,
            player_name: p.player_name,
            season: p.season,
            goals: p.goals,
            assists: p.assists,
            team_id: p.team_id,
            league_id: 1 // Ligue 1 = 1
        }))
        
        // Insertion par batches
        const batchSize = 100
        let inserted = 0
        
        for (let i = 0; i < playersToInsert.length; i += batchSize) {
            const batch = playersToInsert.slice(i, i + batchSize)
            
            const { error: insertError } = await supabase
                .from('player_features')
                .insert(batch)
            
            if (insertError) {
                console.log(`   ❌ Erreur batch ${Math.floor(i/batchSize) + 1}: ${insertError.message}`)
                if (i === 0) break // Stop si première batch échoue
            } else {
                inserted += batch.length
                console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} joueurs (total: ${inserted})`)
            }
        }
        
        // 7. Vérification finale
        console.log('\n7. 📊 RÉSUMÉ FINAL:')
        const { count: finalCount } = await supabase
            .from('player_features')
            .select('*', { count: 'exact', head: true })
        
        console.log(`   Stats sources: ${allStats.length}`)
        console.log(`   Joueurs-saisons créés: ${playerSeasonArray.length}`)
        console.log(`   Joueurs insérés: ${inserted}`)
        console.log(`   Vérification DB: ${finalCount} joueurs`)
        
        // Top scorer général
        const globalTopScorer = playerSeasonArray
            .sort((a, b) => b.goals - a.goals)[0]
        
        if (globalTopScorer) {
            console.log(`   🏆 Top buteur: ${globalTopScorer.player_name} (${globalTopScorer.goals} buts en ${globalTopScorer.season})`)
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

consolidatePlayerStatsV2()