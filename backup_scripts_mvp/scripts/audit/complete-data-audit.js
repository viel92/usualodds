#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function completeDataAudit() {
    console.log('\n=== AUDIT COMPLET 1760 MATCHES ===\n')
    
    try {
        // Récupérer TOUS les matches avec pagination
        const allMatches = []
        let page = 0
        const pageSize = 1000
        
        while (true) {
            const { data: pageData } = await supabase
                .from('matches')
                .select('season, league_id, date, home_team_name, away_team_name')
                .range(page * pageSize, (page + 1) * pageSize - 1)
            
            if (!pageData || pageData.length === 0) break
            allMatches.push(...pageData)
            
            console.log(`Chargé page ${page + 1}: ${pageData.length} matches (total: ${allMatches.length})`)
            
            if (pageData.length < pageSize) break
            page++
        }
        
        console.log(`\n📊 TOUS LES MATCHES CHARGÉS: ${allMatches.length}`)
        
        // Analyse par saison
        const seasonCounts = {}
        allMatches.forEach(match => {
            const season = match.season || 'NULL'
            seasonCounts[season] = (seasonCounts[season] || 0) + 1
        })
        
        console.log('\n📅 RÉPARTITION PAR SAISON (COMPLÈTE):')
        Object.entries(seasonCounts).sort().forEach(([season, count]) => {
            console.log(`   ${season}: ${count} matches`)
        })
        
        // Analyse par ligue
        const leagueCounts = {}
        allMatches.forEach(match => {
            leagueCounts[match.league_id] = (leagueCounts[match.league_id] || 0) + 1
        })
        
        console.log('\n🏆 RÉPARTITION PAR LIGUE:')
        Object.entries(leagueCounts).sort().forEach(([leagueId, count]) => {
            console.log(`   League ${leagueId}: ${count} matches`)
        })
        
        // Dates extrêmes
        const dates = allMatches.map(m => m.date).filter(d => d).sort()
        console.log('\n📅 PÉRIODE COUVERTE:')
        console.log(`   Du: ${dates[0]?.split('T')[0]}`)
        console.log(`   Au: ${dates[dates.length-1]?.split('T')[0]}`)
        
        // Équipes uniques
        const teams = new Set()
        allMatches.forEach(match => {
            if (match.home_team_name) teams.add(match.home_team_name)
            if (match.away_team_name) teams.add(match.away_team_name)
        })
        
        console.log(`\n⚽ ÉQUIPES UNIQUES: ${teams.size}`)
        console.log('   Exemples:', [...teams].slice(0, 5).join(', '))
        
        // Résumé stockage
        const estimatedSize = allMatches.length * 2 // ~2KB par match
        console.log(`\n💾 ESTIMATION STOCKAGE: ${Math.round(estimatedSize/1024)}MB`)
        console.log(`   Supabase Free limite: 500MB`)
        console.log(`   Utilisation: ${Math.round(estimatedSize/1024/500*100)}%`)
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

completeDataAudit()