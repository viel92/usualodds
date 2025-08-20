#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function find2024Matches() {
    console.log('\n=== RECHERCHE MATCHES 2024 ===\n')
    
    try {
        // 1. Chercher par saison 2024
        console.log('1. MATCHES SAISON 2024:')
        const { data: season2024, count: count2024 } = await supabase
            .from('matches')
            .select('*', { count: 'exact' })
            .eq('season', 2024)
        
        console.log(`   Trouvés: ${count2024} matches saison 2024`)
        
        // 2. Chercher par date 2024
        console.log('\n2. MATCHES DATES 2024 (2024-01-01 à 2024-12-31):')
        const { data: date2024, count: countDate2024 } = await supabase
            .from('matches')
            .select('*', { count: 'exact' })
            .gte('date', '2024-01-01')
            .lte('date', '2024-12-31')
        
        console.log(`   Trouvés: ${countDate2024} matches en dates 2024`)
        
        // 3. Chercher par date 2023
        console.log('\n3. MATCHES DATES 2023 (2023-01-01 à 2023-12-31):')
        const { data: date2023, count: countDate2023 } = supabase
            .from('matches')
            .select('*', { count: 'exact' })
            .gte('date', '2023-01-01')
            .lte('date', '2023-12-31')
        
        console.log(`   Trouvés: ${countDate2023} matches en dates 2023`)
        
        // 4. Count total vraiment
        const { count: realTotal } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
        
        console.log(`\n📊 TOTAL RÉEL MATCHES: ${realTotal}`)
        
        // 5. Par saisons uniquement
        const { data: allSeasons } = await supabase
            .from('matches')
            .select('season')
        
        const seasonCounts = {}
        allSeasons.forEach(match => {
            seasonCounts[match.season] = (seasonCounts[match.season] || 0) + 1
        })
        
        console.log('\n📅 RÉPARTITION PAR SAISON:')
        Object.entries(seasonCounts).sort().forEach(([season, count]) => {
            console.log(`   ${season}: ${count} matches`)
        })
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

find2024Matches()