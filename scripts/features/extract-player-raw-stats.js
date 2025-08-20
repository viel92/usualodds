#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function extractPlayerRawStats() {
    console.log('\n=== EXTRACTION PLAYER RAW_STATS JSON ===\n')
    
    try {
        // 1. Analyser structure complète d'un raw_stats
        console.log('1. 📊 ANALYSE STRUCTURE COMPLÈTE:')
        
        const { data: samplePlayer } = await supabase
            .from('match_players_stats')
            .select('player_name, raw_stats')
            .not('raw_stats', 'is', null)
            .limit(1)
            .single()
        
        if (samplePlayer && samplePlayer.raw_stats) {
            const rawStats = typeof samplePlayer.raw_stats === 'string' 
                ? JSON.parse(samplePlayer.raw_stats) 
                : samplePlayer.raw_stats
            
            console.log(`   Joueur exemple: ${samplePlayer.player_name}`)
            console.log('   📋 STRUCTURE DÉTAILLÉE:')
            
            function exploreObject(obj, indent = '     ') {
                Object.entries(obj).forEach(([key, value]) => {
                    if (typeof value === 'object' && value !== null) {
                        console.log(`${indent}${key}:`)
                        Object.entries(value).forEach(([subKey, subValue]) => {
                            console.log(`${indent}  ${subKey}: ${subValue} (${typeof subValue})`)
                        })
                    } else {
                        console.log(`${indent}${key}: ${value} (${typeof value})`)
                    }
                })
            }
            
            exploreObject(rawStats)
        }
        
        // 2. Récupérer tous les player stats avec raw_stats
        console.log('\n2. 📊 RÉCUPÉRATION PLAYER RAW_STATS:')
        
        const { data: allPlayerStats } = await supabase
            .from('match_players_stats')
            .select('id, player_name, match_id, team_id, raw_stats')
            .not('raw_stats', 'is', null)
        
        console.log(`   Total avec raw_stats: ${allPlayerStats?.length || 0}`)
        
        // 3. Extraire features avancées des raw_stats
        console.log('\n3. 🔧 EXTRACTION FEATURES AVANCÉES:')
        
        const extractedPlayerFeatures = []
        
        allPlayerStats?.forEach(record => {
            if (record.raw_stats) {
                const rawStats = typeof record.raw_stats === 'string' 
                    ? JSON.parse(record.raw_stats) 
                    : record.raw_stats
                
                // Helper pour accéder aux nested values
                const getValue = (obj, path) => {
                    try {
                        return path.split('.').reduce((current, key) => current?.[key], obj)
                    } catch {
                        return null
                    }
                }
                
                // Extraire features ML avancées
                const extractedFeatures = {
                    player_stat_id: record.id,
                    player_name: record.player_name,
                    match_id: record.match_id,
                    team_id: record.team_id,
                    
                    // Game Info (from games object)
                    minutes_played: getValue(rawStats, 'games.minutes'),
                    rating: getValue(rawStats, 'games.rating'),
                    position: getValue(rawStats, 'games.position'),
                    is_captain: getValue(rawStats, 'games.captain'),
                    is_substitute: getValue(rawStats, 'games.substitute'),
                    
                    // Goals & Assists (from goals object)
                    goals_scored: getValue(rawStats, 'goals.total'),
                    assists_made: getValue(rawStats, 'goals.assists'),
                    saves_made: getValue(rawStats, 'goals.saves'), // for goalkeepers
                    
                    // Shooting (from shots object)
                    shots_total: getValue(rawStats, 'shots.total'),
                    shots_on_target: getValue(rawStats, 'shots.on'),
                    
                    // Passing (from passes object)
                    passes_total: getValue(rawStats, 'passes.total'),
                    passes_key: getValue(rawStats, 'passes.key'),
                    passes_accuracy: getValue(rawStats, 'passes.accuracy'),
                    
                    // Dribbling (from dribbles object)
                    dribbles_attempts: getValue(rawStats, 'dribbles.attempts'),
                    dribbles_success: getValue(rawStats, 'dribbles.success'),
                    dribbles_past: getValue(rawStats, 'dribbles.past'),
                    
                    // Duels (from duels object)
                    duels_total: getValue(rawStats, 'duels.total'),
                    duels_won: getValue(rawStats, 'duels.won'),
                    
                    // Tackles (from tackles object)
                    tackles_total: getValue(rawStats, 'tackles.total'),
                    tackles_blocks: getValue(rawStats, 'tackles.blocks'),
                    tackles_interceptions: getValue(rawStats, 'tackles.interceptions'),
                    
                    // Fouls (from fouls object)
                    fouls_drawn: getValue(rawStats, 'fouls.drawn'),
                    fouls_committed: getValue(rawStats, 'fouls.committed'),
                    
                    // Cards (from cards object)
                    yellow_cards: getValue(rawStats, 'cards.yellow'),
                    red_cards: getValue(rawStats, 'cards.red'),
                    
                    // Penalties (from penalty object)
                    penalties_won: getValue(rawStats, 'penalty.won'),
                    penalties_committed: getValue(rawStats, 'penalty.committed'),
                    penalties_scored: getValue(rawStats, 'penalty.scored'),
                    penalties_missed: getValue(rawStats, 'penalty.missed'),
                    penalties_saved: getValue(rawStats, 'penalty.saved'),
                    
                    // Derived metrics
                    shot_accuracy: getValue(rawStats, 'shots.total') && getValue(rawStats, 'shots.on')
                        ? Math.round((getValue(rawStats, 'shots.on') / getValue(rawStats, 'shots.total')) * 100)
                        : null,
                    
                    dribble_success_rate: getValue(rawStats, 'dribbles.attempts') && getValue(rawStats, 'dribbles.success')
                        ? Math.round((getValue(rawStats, 'dribbles.success') / getValue(rawStats, 'dribbles.attempts')) * 100)
                        : null,
                    
                    duel_success_rate: getValue(rawStats, 'duels.total') && getValue(rawStats, 'duels.won')
                        ? Math.round((getValue(rawStats, 'duels.won') / getValue(rawStats, 'duels.total')) * 100)
                        : null,
                    
                    created_at: new Date().toISOString()
                }
                
                extractedPlayerFeatures.push(extractedFeatures)
            }
        })
        
        console.log(`   ✅ Player features extraites: ${extractedPlayerFeatures.length} records`)
        
        // 4. Analyser qualité données players
        console.log('\n4. 📈 QUALITÉ DONNÉES PLAYERS:')
        
        const playerQualityMetrics = {
            total_records: extractedPlayerFeatures.length,
            with_rating: extractedPlayerFeatures.filter(r => r.rating !== null).length,
            with_minutes: extractedPlayerFeatures.filter(r => r.minutes_played !== null).length,
            with_goals: extractedPlayerFeatures.filter(r => r.goals_scored !== null).length,
            with_passes: extractedPlayerFeatures.filter(r => r.passes_total !== null).length,
            with_duels: extractedPlayerFeatures.filter(r => r.duels_total !== null).length,
            complete_advanced: extractedPlayerFeatures.filter(r => 
                r.rating !== null && 
                r.minutes_played !== null && 
                r.passes_total !== null && 
                r.duels_total !== null
            ).length
        }
        
        Object.entries(playerQualityMetrics).forEach(([metric, count]) => {
            const percentage = extractedPlayerFeatures.length > 0 
                ? Math.round((count / extractedPlayerFeatures.length) * 100) 
                : 0
            console.log(`   ${metric}: ${count}/${extractedPlayerFeatures.length} (${percentage}%)`)
        })
        
        // 5. Échantillons par position
        console.log('\n5. 🎯 ÉCHANTILLONS PAR POSITION:')
        
        const byPosition = {}
        extractedPlayerFeatures.forEach(p => {
            const pos = p.position || 'Unknown'
            if (!byPosition[pos]) byPosition[pos] = []
            byPosition[pos].push(p)
        })
        
        Object.entries(byPosition).forEach(([position, players]) => {
            console.log(`\n   📍 POSITION ${position}: ${players.length} joueurs`)
            const sample = players[0]
            if (sample) {
                console.log(`     Exemple: ${sample.player_name}`)
                console.log(`     Rating: ${sample.rating}, Minutes: ${sample.minutes_played}`)
                console.log(`     Goals: ${sample.goals_scored}, Assists: ${sample.assists_made}`)
                console.log(`     Passes: ${sample.passes_total} (${sample.passes_accuracy}%)`)
                console.log(`     Duels: ${sample.duels_won}/${sample.duels_total}`)
            }
        })
        
        // 6. Top performers par catégorie
        console.log('\n6. 🏆 TOP PERFORMERS (match unique):')
        
        const topMetrics = {
            'Top Ratings': extractedPlayerFeatures
                .filter(p => p.rating !== null)
                .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
                .slice(0, 5),
            'Top Scorers': extractedPlayerFeatures
                .filter(p => p.goals_scored > 0)
                .sort((a, b) => b.goals_scored - a.goals_scored)
                .slice(0, 5),
            'Top Passers': extractedPlayerFeatures
                .filter(p => p.passes_total > 0)
                .sort((a, b) => b.passes_total - a.passes_total)
                .slice(0, 5)
        }
        
        Object.entries(topMetrics).forEach(([category, players]) => {
            console.log(`\n   ${category}:`)
            players.forEach((p, i) => {
                const metric = category.includes('Rating') ? p.rating : 
                              category.includes('Scorer') ? p.goals_scored :
                              p.passes_total
                console.log(`     ${i+1}. ${p.player_name}: ${metric}`)
            })
        })
        
        // 7. Générer SQL pour player_advanced_features
        console.log('\n7. 📄 GÉNÉRATION SQL PLAYER_ADVANCED_FEATURES:')
        
        const createPlayerAdvancedTableSQL = `
CREATE TABLE IF NOT EXISTS player_advanced_features (
    id SERIAL PRIMARY KEY,
    player_stat_id UUID,
    player_name VARCHAR(255),
    match_id BIGINT,
    team_id BIGINT,
    minutes_played INTEGER,
    rating DECIMAL,
    position VARCHAR(10),
    goals_scored INTEGER,
    assists_made INTEGER,
    shots_total INTEGER,
    shots_on_target INTEGER,
    passes_total INTEGER,
    passes_accuracy INTEGER,
    dribbles_success INTEGER,
    duels_won INTEGER,
    duels_total INTEGER,
    tackles_total INTEGER,
    fouls_committed INTEGER,
    yellow_cards INTEGER,
    red_cards INTEGER,
    shot_accuracy DECIMAL,
    duel_success_rate DECIMAL,
    created_at TIMESTAMP DEFAULT NOW()
);`
        
        console.log('   📋 SQL Création table:')
        console.log(createPlayerAdvancedTableSQL)
        
        if (extractedPlayerFeatures.length > 0) {
            // Sauvegarder échantillon SQL
            const playerSample = extractedPlayerFeatures.slice(0, 10)
            let playerSqlInsert = 'INSERT INTO player_advanced_features (\n'
            playerSqlInsert += '  player_name, match_id, rating, position, goals_scored, assists_made,\n'
            playerSqlInsert += '  shots_total, passes_total, passes_accuracy, duels_won, duels_total\n'
            playerSqlInsert += ') VALUES\n'
            
            const playerInsertValues = playerSample.map(p => {
                return `('${p.player_name.replace(/'/g, "''")}', ${p.match_id}, ${p.rating}, '${p.position}', ${p.goals_scored}, ${p.assists_made}, ${p.shots_total}, ${p.passes_total}, ${p.passes_accuracy}, ${p.duels_won}, ${p.duels_total})`
            }).join(',\n')
            
            playerSqlInsert += playerInsertValues + ';'
            
            const fs = require('fs')
            fs.writeFileSync('./player_advanced_features_sample.sql', playerSqlInsert)
            console.log('   📄 Sample SQL sauvé: ./player_advanced_features_sample.sql')
        }
        
        // 8. Résumé final
        console.log('\n8. 📊 RÉSUMÉ EXTRACTION PLAYERS:')
        console.log(`   Raw stats traités: ${allPlayerStats?.length || 0}`)
        console.log(`   Advanced features extraites: ${extractedPlayerFeatures.length}`)
        console.log(`   Positions détectées: ${Object.keys(byPosition).join(', ')}`)
        console.log(`   Complétude avancée: ${playerQualityMetrics.complete_advanced}/${extractedPlayerFeatures.length} (${Math.round((playerQualityMetrics.complete_advanced/extractedPlayerFeatures.length)*100)}%)`)
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

extractPlayerRawStats()