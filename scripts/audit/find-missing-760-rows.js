#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function findMissing760Rows() {
    console.log('\n=== RECHERCHE DES 760 ROWS MANQUANTES ===\n')
    
    try {
        // 1. Count total avec différentes méthodes
        console.log('1. COUNTS AVEC DIFFÉRENTES MÉTHODES:')
        
        // Méthode 1: count exact
        const { count: exactCount } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
        console.log(`   Count exact: ${exactCount}`)
        
        // Méthode 2: select all et compter
        const { data: allRows } = await supabase
            .from('matches')
            .select('id, season, league_id, home_team_name, date')
        console.log(`   Select all: ${allRows.length} rows`)
        
        // 2. Chercher des ligues autres que 61
        console.log('\n2. AUTRES LIGUES QUE LIGUE 1:')
        const leagueCounts = {}
        allRows.forEach(row => {
            leagueCounts[row.league_id] = (leagueCounts[row.league_id] || 0) + 1
        })
        
        Object.entries(leagueCounts).sort().forEach(([leagueId, count]) => {
            console.log(`   League ${leagueId}: ${count} matches`)
        })
        
        // 3. Chercher des saisons inattendues
        console.log('\n3. TOUTES LES SAISONS:')
        const seasonCounts = {}
        allRows.forEach(row => {
            const season = row.season || 'NULL'
            seasonCounts[season] = (seasonCounts[season] || 0) + 1
        })
        
        Object.entries(seasonCounts).sort().forEach(([season, count]) => {
            console.log(`   Saison ${season}: ${count} matches`)
        })
        
        // 4. Chercher doublons par api_id
        console.log('\n4. DOUBLONS PAR API_ID:')
        const { data: withApiId } = await supabase
            .from('matches')
            .select('api_id, id, home_team_name, date')
        
        const apiIdCounts = {}
        const duplicates = []
        
        withApiId.forEach(row => {
            if (apiIdCounts[row.api_id]) {
                duplicates.push({
                    api_id: row.api_id,
                    match: `${row.home_team_name} - ${row.date?.split('T')[0]}`,
                    ids: [apiIdCounts[row.api_id].id, row.id]
                })
            }
            apiIdCounts[row.api_id] = row
        })
        
        console.log(`   Doublons détectés: ${duplicates.length}`)
        if (duplicates.length > 0) {
            duplicates.slice(0, 5).forEach(dup => {
                console.log(`     API_ID ${dup.api_id}: ${dup.match} (IDs: ${dup.ids.join(', ')})`)
            })
            if (duplicates.length > 5) {
                console.log(`     ... +${duplicates.length - 5} autres doublons`)
            }
        }
        
        // 5. Chercher des dates extrêmes
        console.log('\n5. DATES EXTRÊMES:')
        const dates = allRows.map(r => r.date).filter(d => d).sort()
        console.log(`   Première date: ${dates[0]?.split('T')[0]}`)
        console.log(`   Dernière date: ${dates[dates.length-1]?.split('T')[0]}`)
        
        // 6. Matches sans saison 
        const noSeason = allRows.filter(r => !r.season)
        console.log(`\n6. MATCHES SANS SAISON: ${noSeason.length}`)
        
        // 7. Résumé complet
        console.log('\n📊 RÉSUMÉ:')
        console.log(`   Rows visibles via select: ${allRows.length}`)
        console.log(`   Count exact Supabase: ${exactCount}`)
        console.log(`   Différence: ${exactCount - allRows.length}`)
        console.log(`   Doublons api_id: ${duplicates.length}`)
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

findMissing760Rows()