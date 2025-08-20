#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function checkDataConsistency() {
    console.log('\n=== AUDIT CONSISTANCE DONNÉES ===\n')
    
    try {
        // 1. Match players stats (vous dites 12000)
        console.log('1. 📊 MATCH PLAYERS STATS:')
        const { count: matchPlayersCount } = await supabase
            .from('match_players_stats')
            .select('*', { count: 'exact', head: true })
        console.log(`   Total: ${matchPlayersCount} stats`)
        
        if (matchPlayersCount > 0) {
            // Exemples
            const { data: examples } = await supabase
                .from('match_players_stats')
                .select('player_name, goals, assists, minutes, match_id')
                .gt('goals', 0)
                .limit(5)
            
            console.log('   Exemples buteurs:')
            examples?.forEach(p => {
                console.log(`     ${p.player_name}: ${p.goals}G ${p.assists}A (${p.minutes}min)`)
            })
        }
        
        // 2. Players table (vous dites 0)
        console.log('\n2. 👥 PLAYERS TABLE:')
        const { count: playersCount } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true })
        console.log(`   Total: ${playersCount} joueurs`)
        
        // 3. Player features (vous dites 0)
        console.log('\n3. ⭐ PLAYER FEATURES:')
        const { count: playerFeaturesCount } = await supabase
            .from('player_features')
            .select('*', { count: 'exact', head: true })
        console.log(`   Total: ${playerFeaturesCount} player_features`)
        
        // 4. Seasons (vous dites 3 au lieu de 4-5)
        console.log('\n4. 📅 SEASONS:')
        const { data: seasons, count: seasonsCount } = await supabase
            .from('seasons')
            .select('*', { count: 'exact' })
        console.log(`   Total: ${seasonsCount} saisons`)
        
        seasons?.forEach(season => {
            console.log(`   ${season.year}: ${season.start_date} → ${season.end_date} (league: ${season.league_id})`)
        })
        
        // 5. Matches par saison (pour comparaison)
        console.log('\n5. ⚽ MATCHES PAR SAISON:')
        const { data: allMatches } = await supabase
            .from('matches')
            .select('season, league_id')
            .range(0, 2000) // Plus large pour voir tout
        
        const matchSeasons = {}
        allMatches?.forEach(match => {
            matchSeasons[match.season] = (matchSeasons[match.season] || 0) + 1
        })
        
        Object.entries(matchSeasons).sort().forEach(([season, count]) => {
            console.log(`   Saison ${season}: ${count} matches`)
        })
        
        // 6. Analyse des incohérences
        console.log('\n6. 🚨 INCOHÉRENCES DÉTECTÉES:')
        
        console.log('   PROBLÈME 1: Données joueurs dispersées')
        console.log(`     match_players_stats: ${matchPlayersCount}`)
        console.log(`     players: ${playersCount}`)
        console.log(`     player_features: ${playerFeaturesCount}`)
        console.log('     → Les stats sont dans match_players_stats mais pas consolidées!')
        
        const matchSeasonsCount = Object.keys(matchSeasons).length
        console.log('\n   PROBLÈME 2: Saisons incohérentes')
        console.log(`     seasons table: ${seasonsCount} saisons`)
        console.log(`     matches saisons uniques: ${matchSeasonsCount}`)
        console.log('     → Différence entre tables seasons et vraies saisons matches!')
        
        // 7. Années attendues vs réelles
        console.log('\n7. 📊 ANNÉES ATTENDUES VS RÉELLES:')
        console.log('   Années attendues: 2020, 2021, 2022, 2023, 2024 (5 saisons)')
        console.log(`   Années matches: ${Object.keys(matchSeasons).join(', ')}`)
        console.log(`   Années seasons table: ${seasons?.map(s => s.year).join(', ') || 'aucune'}`)
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

checkDataConsistency()