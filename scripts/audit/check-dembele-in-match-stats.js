#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function checkDembeleInMatchStats() {
    console.log('\n=== RECHERCHE DEMBÉLÉ DANS MATCH STATS ===\n')
    
    try {
        // 1. Recherche Dembélé
        console.log('1. 🔍 RECHERCHE DEMBÉLÉ:')
        const { data: dembeles } = await supabase
            .from('match_players_stats')
            .select('player_name, goals, assists, minutes, match_id')
            .ilike('player_name', '%dembele%')
            .limit(10)
        
        if (dembeles && dembeles.length > 0) {
            console.log(`   Trouvé ${dembeles.length} occurrences:`)
            dembeles.forEach(p => {
                console.log(`     ${p.player_name}: ${p.goals}G ${p.assists}A`)
            })
        } else {
            console.log('   ❌ Aucun Dembélé trouvé, essayons d\'autres variantes...')
            
            // Variantes possibles
            const variants = ['%ousmane%', '%demb%', '%dembélé%']
            for (const variant of variants) {
                const { data: found } = await supabase
                    .from('match_players_stats')
                    .select('player_name, goals, assists')
                    .ilike('player_name', variant)
                    .limit(3)
                
                if (found && found.length > 0) {
                    console.log(`   Variante "${variant}":`)
                    found.forEach(p => console.log(`     ${p.player_name}: ${p.goals}G`))
                }
            }
        }
        
        // 2. Top buteurs dans match_players_stats
        console.log('\n2. ⚽ TOP BUTEURS DANS MATCH_PLAYERS_STATS:')
        
        // Agrégation manuelle des buts par joueur
        const { data: allStats } = await supabase
            .from('match_players_stats')
            .select('player_name, goals')
            .gt('goals', 0)
        
        if (allStats) {
            const playerGoals = {}
            allStats.forEach(stat => {
                const name = stat.player_name || 'Inconnu'
                playerGoals[name] = (playerGoals[name] || 0) + stat.goals
            })
            
            const topScorers = Object.entries(playerGoals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
            
            console.log('   Top 10 buteurs (agrégation manuelle):')
            topScorers.forEach((scorer, i) => {
                console.log(`     ${i+1}. ${scorer[0]}: ${scorer[1]} buts`)
            })
        }
        
        // 3. Distribution générale
        console.log('\n3. 📊 DISTRIBUTION MATCH STATS:')
        const { data: distribution } = await supabase
            .from('match_players_stats')
            .select('player_name, goals, assists, minutes')
            .limit(1000)
        
        if (distribution) {
            const withGoals = distribution.filter(p => p.goals > 0)
            const withAssists = distribution.filter(p => p.assists > 0)
            const withMinutes = distribution.filter(p => p.minutes > 0)
            
            console.log(`   Stats avec buts: ${withGoals.length}`)
            console.log(`   Stats avec assists: ${withAssists.length}`)
            console.log(`   Stats avec minutes: ${withMinutes.length}`)
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

checkDembeleInMatchStats()