#!/usr/bin/env node

/**
 * Vérification rapide tables de base
 */

const { createClient } = require('@supabase/supabase-js')

// Utilisation des vars d'env directes
const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function checkBaseTables() {
    console.log('\n=== ÉTAT TABLES DE BASE ===\n')
    
    // Leagues
    console.log('1. LEAGUES:')
    try {
        const { data: leagues, error } = await supabase.from('leagues').select('*')
        if (error) throw error
        
        console.log(`   ✓ ${leagues.length} ligues trouvées`)
        leagues.forEach(league => {
            console.log(`     - ${league.name} (${league.country}) [ID: ${league.id}]`)
        })
    } catch (error) {
        console.log(`   ✗ Erreur leagues: ${error.message}`)
    }
    
    // Teams
    console.log('\n2. TEAMS:')
    try {
        const { data: teams, error } = await supabase.from('teams').select('name, api_id, country')
        if (error) throw error
        
        console.log(`   ✓ ${teams.length} équipes trouvées`)
        
        // Grouper par pays
        const teamsByCountry = {}
        teams.forEach(team => {
            const country = team.country || 'Unknown'
            if (!teamsByCountry[country]) teamsByCountry[country] = []
            teamsByCountry[country].push(team.name)
        })
        
        Object.entries(teamsByCountry).forEach(([country, teamList]) => {
            console.log(`     ${country}: ${teamList.length} équipes`)
            teamList.slice(0, 3).forEach(name => console.log(`       - ${name}`))
            if (teamList.length > 3) console.log(`       ... +${teamList.length - 3} autres`)
        })
        
    } catch (error) {
        console.log(`   ✗ Erreur teams: ${error.message}`)
    }
    
    // Matches summary
    console.log('\n3. MATCHES SUMMARY:')
    try {
        const { data: matches, error } = await supabase
            .from('matches')
            .select('season')
        if (error) throw error
        
        const seasons = {}
        matches.forEach(match => {
            seasons[match.season] = (seasons[match.season] || 0) + 1
        })
        
        console.log(`   ✓ ${matches.length} matches au total`)
        Object.entries(seasons).sort().forEach(([season, count]) => {
            console.log(`     ${season}: ${count} matches`)
        })
        
    } catch (error) {
        console.log(`   ✗ Erreur matches: ${error.message}`)
    }
}

checkBaseTables().catch(console.error)