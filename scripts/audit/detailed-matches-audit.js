#!/usr/bin/env node

/**
 * Audit détaillé des matches existants
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function detailedMatchesAudit() {
    console.log('\n=== AUDIT DÉTAILLÉ MATCHES ===\n')
    
    try {
        // 1. Count total
        const { count: totalCount } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
        
        console.log(`TOTAL MATCHES: ${totalCount}`)
        
        // 2. Par saison ET league
        console.log('\n📅 RÉPARTITION PAR SAISON ET LEAGUE:')
        const { data: matches } = await supabase
            .from('matches')
            .select('season, league_id, home_team_name, away_team_name, date')
            .order('season')
        
        // Grouper par saison et league_id
        const breakdown = {}
        matches.forEach(match => {
            const key = `${match.season}-${match.league_id}`
            if (!breakdown[key]) {
                breakdown[key] = {
                    season: match.season,
                    league_id: match.league_id, 
                    count: 0,
                    teams: new Set(),
                    dateRange: { min: null, max: null }
                }
            }
            breakdown[key].count++
            breakdown[key].teams.add(match.home_team_name)
            breakdown[key].teams.add(match.away_team_name)
            
            if (!breakdown[key].dateRange.min || match.date < breakdown[key].dateRange.min) {
                breakdown[key].dateRange.min = match.date
            }
            if (!breakdown[key].dateRange.max || match.date > breakdown[key].dateRange.max) {
                breakdown[key].dateRange.max = match.date
            }
        })
        
        // Afficher par saison
        const seasons = [...new Set(Object.values(breakdown).map(b => b.season))].sort()
        
        seasons.forEach(season => {
            console.log(`\n  📅 SAISON ${season}:`)
            
            const seasonBreakdown = Object.values(breakdown).filter(b => b.season === season)
            let totalMatches = 0
            
            seasonBreakdown.forEach(item => {
                totalMatches += item.count
                const dateMin = item.dateRange.min ? item.dateRange.min.split('T')[0] : 'N/A'
                const dateMax = item.dateRange.max ? item.dateRange.max.split('T')[0] : 'N/A'
                
                console.log(`    League ${item.league_id}: ${item.count} matchs`)
                console.log(`      - ${item.teams.size} équipes uniques`)
                console.log(`      - Période: ${dateMin} → ${dateMax}`)
            })
            
            console.log(`    ✅ TOTAL SAISON ${season}: ${totalMatches} matchs`)
        })
        
        // 3. Quelques exemples récents
        console.log('\n📋 EXEMPLES MATCHES RÉCENTS (2024):')
        const { data: recent } = await supabase
            .from('matches')
            .select('date, home_team_name, away_team_name, home_score, away_score, season')
            .eq('season', 2024)
            .order('date', { ascending: false })
            .limit(5)
        
        recent.forEach(match => {
            const score = match.home_score !== null ? `${match.home_score}-${match.away_score}` : 'N/A'
            const date = match.date.split('T')[0]
            console.log(`    ${date}: ${match.home_team_name} vs ${match.away_team_name} (${score})`)
        })
        
        // 4. Leagues présentes
        console.log('\n🏆 LEAGUES PRÉSENTES:')
        const leagueIds = [...new Set(matches.map(m => m.league_id))].sort()
        for (const lid of leagueIds) {
            const count = matches.filter(m => m.league_id === lid).length
            console.log(`    League ${lid}: ${count} matchs`)
        }
        
    } catch (error) {
        console.error('❌ Erreur audit:', error.message)
    }
}

detailedMatchesAudit()