#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function checkJsonStatisticsStructure() {
    console.log('\n=== ANALYSE STRUCTURE JSON STATISTIQUES ===\n')
    
    try {
        // 1. Identifier toutes les tables avec des colonnes JSON
        console.log('1. 🔍 RECHERCHE COLONNES JSON:')
        
        // Tables probables avec JSON statistics
        const tablesToCheck = [
            'matches',
            'match_statistics', 
            'team_statistics',
            'match_players_stats',
            'player_features'
        ]
        
        for (const table of tablesToCheck) {
            console.log(`\n📊 TABLE: ${table.toUpperCase()}`)
            
            try {
                const { data: sample, error } = await supabase
                    .from(table)
                    .select('*')
                    .limit(3)
                
                if (error) {
                    console.log(`   ❌ Table n'existe pas: ${error.message}`)
                    continue
                }
                
                if (!sample || sample.length === 0) {
                    console.log('   ⚠️ Table vide')
                    continue
                }
                
                // Analyser les colonnes pour JSON objects
                const firstRow = sample[0]
                const jsonColumns = []
                
                Object.keys(firstRow).forEach(col => {
                    const value = firstRow[col]
                    if (value && typeof value === 'object' && value !== null) {
                        jsonColumns.push({
                            column: col,
                            type: Array.isArray(value) ? 'array' : 'object',
                            sample: JSON.stringify(value).substring(0, 200) + '...'
                        })
                    }
                })
                
                if (jsonColumns.length > 0) {
                    console.log(`   ✅ ${jsonColumns.length} colonnes JSON trouvées:`)
                    jsonColumns.forEach(jc => {
                        console.log(`     - ${jc.column} (${jc.type}): ${jc.sample}`)
                    })
                } else {
                    console.log('   ℹ️ Aucune colonne JSON détectée')
                }
                
            } catch (tableError) {
                console.log(`   ❌ Erreur accès table: ${tableError.message}`)
            }
        }
        
        // 2. Focus sur les match statistics
        console.log('\n2. 📊 ANALYSE DÉTAILLÉE MATCH STATISTICS:')
        
        const { data: matchStats } = await supabase
            .from('matches')
            .select('id, home_team_name, away_team_name, home_statistics, away_statistics, statistics')
            .limit(10)
        
        if (matchStats && matchStats.length > 0) {
            matchStats.forEach((match, index) => {
                console.log(`\n📍 Match ${index + 1}: ${match.home_team_name} vs ${match.away_team_name}`)
                
                // Analyser home_statistics
                if (match.home_statistics) {
                    console.log('   🏠 HOME STATS:')
                    const homeStats = typeof match.home_statistics === 'string' 
                        ? JSON.parse(match.home_statistics) 
                        : match.home_statistics
                    
                    Object.keys(homeStats).slice(0, 5).forEach(key => {
                        console.log(`     ${key}: ${homeStats[key]}`)
                    })
                    
                    console.log(`     ... et ${Object.keys(homeStats).length - 5} autres champs`)
                }
                
                // Analyser away_statistics
                if (match.away_statistics) {
                    console.log('   ✈️ AWAY STATS:')
                    const awayStats = typeof match.away_statistics === 'string' 
                        ? JSON.parse(match.away_statistics) 
                        : match.away_statistics
                    
                    Object.keys(awayStats).slice(0, 5).forEach(key => {
                        console.log(`     ${key}: ${awayStats[key]}`)
                    })
                }
                
                if (index >= 2) return // Limiter à 3 exemples
            })
        }
        
        // 3. Analyser la structure complète d'un JSON
        console.log('\n3. 🎯 STRUCTURE COMPLÈTE JSON EXEMPLE:')
        
        const { data: fullExample } = await supabase
            .from('matches')
            .select('home_statistics, away_statistics')
            .not('home_statistics', 'is', null)
            .limit(1)
            .single()
        
        if (fullExample && fullExample.home_statistics) {
            const stats = typeof fullExample.home_statistics === 'string' 
                ? JSON.parse(fullExample.home_statistics) 
                : fullExample.home_statistics
            
            console.log('   📋 TOUS LES CHAMPS JSON:')
            Object.entries(stats).forEach(([key, value]) => {
                console.log(`     ${key}: ${value} (${typeof value})`)
            })
            
            // Calcul metrics utiles
            console.log('\n   🎯 METRICS ML POTENTIELS:')
            const mlMetrics = {
                possession: stats.ball_possession,
                shots_accuracy: stats.total_shots ? (stats.shots_on_goal / stats.total_shots * 100).toFixed(1) + '%' : 'N/A',
                pass_accuracy: stats.passes_accuracy || stats['passes_%'] || 'N/A', 
                expected_goals: stats.expected_goals,
                defensive_actions: (stats.fouls || 0) + (stats.yellow_cards || 0) + (stats.red_cards || 0)
            }
            
            Object.entries(mlMetrics).forEach(([metric, value]) => {
                console.log(`     ${metric}: ${value}`)
            })
        }
        
        // 4. Count stats disponibles
        console.log('\n4. 📊 DISPONIBILITÉ STATS:')
        
        const { count: totalMatches } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
        
        const { count: withHomeStats } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .not('home_statistics', 'is', null)
        
        const { count: withAwayStats } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .not('away_statistics', 'is', null)
        
        console.log(`   Total matches: ${totalMatches}`)
        console.log(`   Avec home_statistics: ${withHomeStats} (${((withHomeStats/totalMatches)*100).toFixed(1)}%)`)
        console.log(`   Avec away_statistics: ${withAwayStats} (${((withAwayStats/totalMatches)*100).toFixed(1)}%)`)
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

checkJsonStatisticsStructure()