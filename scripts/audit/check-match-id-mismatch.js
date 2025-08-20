#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function checkMatchIdMismatch() {
    console.log('\n=== ANALYSE MATCH_ID MISMATCH ===\n')
    
    try {
        // 1. Échantillon match_players_stats
        console.log('1. 📊 ÉCHANTILLON MATCH_PLAYERS_STATS:')
        const { data: playerStats } = await supabase
            .from('match_players_stats')
            .select('match_id, player_name')
            .limit(5)
        
        playerStats?.forEach(stat => {
            console.log(`   match_id: ${stat.match_id} (type: ${typeof stat.match_id}) - ${stat.player_name}`)
        })
        
        // 2. Échantillon matches
        console.log('\n2. ⚽ ÉCHANTILLON MATCHES:')
        const { data: matches } = await supabase
            .from('matches')
            .select('id, home_team_name, away_team_name, season')
            .limit(5)
        
        matches?.forEach(match => {
            console.log(`   id: ${match.id} (type: ${typeof match.id}) - ${match.home_team_name} vs ${match.away_team_name} (${match.season})`)
        })
        
        // 3. Test de correspondance directe
        if (playerStats && matches) {
            const testMatchId = playerStats[0].match_id
            console.log(`\n3. 🔍 TEST CORRESPONDANCE:`)
            console.log(`   Recherche match_id: ${testMatchId}`)
            
            const { data: foundMatch } = await supabase
                .from('matches')
                .select('id, season, home_team_name, away_team_name')
                .eq('id', testMatchId)
                .single()
            
            if (foundMatch) {
                console.log(`   ✅ Match trouvé: ${foundMatch.home_team_name} vs ${foundMatch.away_team_name} (${foundMatch.season})`)
            } else {
                console.log(`   ❌ Aucun match trouvé pour id=${testMatchId}`)
                
                // Essayer de trouver des patterns
                console.log('\n   🔍 RECHERCHE PATTERN:')
                const { data: allMatchIds } = await supabase
                    .from('matches')
                    .select('id')
                    .limit(20)
                
                const allPlayerMatchIds = playerStats.map(s => s.match_id).slice(0, 10)
                
                console.log(`   IDs matches: ${allMatchIds?.map(m => m.id).join(', ')}...`)
                console.log(`   IDs players: ${allPlayerMatchIds.join(', ')}...`)
                
                // Vérifier s'il y a des overlaps avec conversion
                const matchIdsStr = allMatchIds?.map(m => String(m.id))
                const playerMatchIdsStr = allPlayerMatchIds.map(id => String(id))
                
                const overlaps = playerMatchIdsStr.filter(pId => matchIdsStr?.includes(pId))
                console.log(`   Overlaps trouvés: ${overlaps.length}/${playerMatchIdsStr.length}`)
                if (overlaps.length > 0) {
                    console.log(`   Exemples: ${overlaps.slice(0, 3).join(', ')}`)
                }
            }
        }
        
        // 4. Compter les matches uniques dans chaque table
        console.log('\n4. 📊 COMPTES UNIQUES:')
        
        const { data: uniquePlayerMatchIds } = await supabase
            .from('match_players_stats')
            .select('match_id')
        
        const uniquePlayerMatches = new Set(uniquePlayerMatchIds?.map(s => s.match_id))
        console.log(`   Matches uniques dans match_players_stats: ${uniquePlayerMatches.size}`)
        
        const { data: uniqueMatchIds } = await supabase
            .from('matches')
            .select('id')
        
        const uniqueMatches = new Set(uniqueMatchIds?.map(m => m.id))
        console.log(`   Matches uniques dans matches: ${uniqueMatches.size}`)
        
        // Intersection
        const intersection = [...uniquePlayerMatches].filter(id => uniqueMatches.has(id))
        console.log(`   Intersection: ${intersection.length} matches communs`)
        
        if (intersection.length > 0) {
            console.log(`   Premiers IDs communs: ${intersection.slice(0, 5).join(', ')}`)
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

checkMatchIdMismatch()