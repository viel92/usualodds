#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function debugSeasonIssue() {
    console.log('\n=== DEBUG PROBLÈME SAISONS ===\n')
    
    try {
        // 1. Toutes les valeurs season uniques
        const { data: allMatches } = await supabase
            .from('matches')
            .select('season, id')
        
        console.log(`TOTAL MATCHES BRUTS: ${allMatches.length}`)
        
        const seasonCounts = {}
        const nullSeasons = []
        
        allMatches.forEach(match => {
            if (match.season === null || match.season === undefined) {
                nullSeasons.push(match.id)
            } else {
                seasonCounts[match.season] = (seasonCounts[match.season] || 0) + 1
            }
        })
        
        console.log('\n📅 TOUTES LES SAISONS:')
        Object.entries(seasonCounts).sort().forEach(([season, count]) => {
            console.log(`   ${season}: ${count} matches`)
        })
        
        if (nullSeasons.length > 0) {
            console.log(`\n⚠️ MATCHES AVEC SEASON NULL: ${nullSeasons.length}`)
        }
        
        // 2. Vérification saisons 2023/2024 spécifiquement
        const { data: s2023 } = await supabase
            .from('matches')
            .select('id, date, home_team_name, season')
            .eq('season', 2023)
            .limit(3)
            
        const { data: s2024 } = await supabase
            .from('matches')
            .select('id, date, home_team_name, season')  
            .eq('season', 2024)
            .limit(3)
        
        console.log('\n🔍 EXEMPLES 2023:', s2023?.length || 0, 'matches')
        s2023?.forEach(m => console.log(`   ${m.date?.split('T')[0]} - ${m.home_team_name}`))
        
        console.log('\n🔍 EXEMPLES 2024:', s2024?.length || 0, 'matches')  
        s2024?.forEach(m => console.log(`   ${m.date?.split('T')[0]} - ${m.home_team_name}`))
        
        // 3. Total exact
        const total = Object.values(seasonCounts).reduce((sum, count) => sum + count, 0) + nullSeasons.length
        console.log(`\n✅ TOTAL CALCULÉ: ${total}`)
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

debugSeasonIssue()