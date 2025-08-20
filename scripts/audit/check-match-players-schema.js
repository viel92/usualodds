#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function checkMatchPlayersSchema() {
    console.log('\n=== SCHÉMA MATCH_PLAYERS_STATS ===\n')
    
    try {
        // 1. Récupérer un échantillon pour voir les colonnes
        console.log('1. 📋 ÉCHANTILLON DONNÉES:')
        const { data: sample, error: sampleError } = await supabase
            .from('match_players_stats')
            .select('*')
            .limit(3)
        
        if (sampleError) {
            console.log(`❌ Erreur: ${sampleError.message}`)
            return
        }
        
        if (sample && sample.length > 0) {
            console.log('   Colonnes disponibles:')
            Object.keys(sample[0]).forEach(key => {
                console.log(`     - ${key}: ${typeof sample[0][key]} (${sample[0][key]})`)
            })
            
            console.log('\n   Échantillons:')
            sample.forEach((row, i) => {
                console.log(`   ${i+1}. ${row.player_name}: ${row.goals}G ${row.assists}A`)
            })
        } else {
            console.log('   ❌ Aucune donnée trouvée')
        }
        
        // 2. Count total
        const { count } = await supabase
            .from('match_players_stats')
            .select('*', { count: 'exact', head: true })
        
        console.log(`\n📊 TOTAL STATS: ${count}`)
        
        // 3. Test différentes colonnes possibles
        console.log('\n🔍 TEST COLONNES:')
        const possibleColumns = [
            'minutes', 'minutes_played', 'time_played',
            'yellow_cards', 'yellows', 'yellow',
            'red_cards', 'reds', 'red'
        ]
        
        for (const col of possibleColumns) {
            try {
                const { data } = await supabase
                    .from('match_players_stats')
                    .select(col)
                    .limit(1)
                
                console.log(`   ✅ ${col}: OK`)
            } catch (error) {
                console.log(`   ❌ ${col}: ${error.message}`)
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

checkMatchPlayersSchema()