#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function extractJsonStatistics() {
    console.log('\n=== EXTRACTION & NORMALISATION JSON STATISTICS ===\n')
    
    try {
        // 1. Récupérer toutes les match_statistics
        console.log('1. 📊 RÉCUPÉRATION MATCH_STATISTICS:')
        
        const { data: allMatchStats } = await supabase
            .from('match_statistics')
            .select('match_id, team_id, statistics, raw_data')
        
        console.log(`   Total records: ${allMatchStats?.length || 0}`)
        
        // 2. Extraire et normaliser les JSON stats
        console.log('\n2. 🔧 EXTRACTION FEATURES ML:')
        
        const extractedStats = []
        
        allMatchStats?.forEach(record => {
            if (record.statistics) {
                const stats = typeof record.statistics === 'string' 
                    ? JSON.parse(record.statistics) 
                    : record.statistics
                
                // Fonction pour nettoyer les valeurs (retire %, null, etc.)
                const cleanValue = (value) => {
                    if (value === null || value === undefined) return null
                    if (typeof value === 'string' && value.includes('%')) {
                        return parseFloat(value.replace('%', ''))
                    }
                    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                        return parseFloat(value)
                    }
                    if (typeof value === 'number') return value
                    return null
                }
                
                // Extraire features ML standardisées
                const extractedRecord = {
                    match_id: record.match_id,
                    team_id: record.team_id,
                    
                    // Possession & Control
                    possession: cleanValue(stats.ball_possession),
                    
                    // Shooting Stats
                    shots_total: cleanValue(stats.total_shots),
                    shots_on_target: cleanValue(stats.shots_on_goal),
                    shots_off_target: cleanValue(stats.shots_off_goal),
                    shots_blocked: cleanValue(stats.blocked_shots),
                    shots_inside_box: cleanValue(stats.shots_insidebox),
                    shots_outside_box: cleanValue(stats.shots_outsidebox),
                    
                    // Expected Goals
                    expected_goals: cleanValue(stats.expected_goals),
                    
                    // Passing Stats
                    passes_total: cleanValue(stats.total_passes),
                    passes_accurate: cleanValue(stats.passes_accurate),
                    passes_accuracy: cleanValue(stats.passes_accuracy || stats['passes_%']),
                    
                    // Set Pieces
                    corners: cleanValue(stats.corner_kicks),
                    offsides: cleanValue(stats.offsides),
                    
                    // Defensive Actions
                    fouls: cleanValue(stats.fouls),
                    yellow_cards: cleanValue(stats.yellow_cards),
                    red_cards: cleanValue(stats.red_cards),
                    
                    // Goalkeeper Stats
                    saves: cleanValue(stats.goalkeeper_saves),
                    goals_prevented: cleanValue(stats.goals_prevented),
                    
                    // Derived Metrics
                    shot_accuracy: stats.total_shots && stats.shots_on_goal 
                        ? Math.round((stats.shots_on_goal / stats.total_shots) * 100)
                        : null,
                    
                    cards_total: (cleanValue(stats.yellow_cards) || 0) + (cleanValue(stats.red_cards) || 0),
                    
                    passing_rate: stats.total_passes && stats.passes_accurate
                        ? Math.round((stats.passes_accurate / stats.total_passes) * 100)
                        : null,
                        
                    created_at: new Date().toISOString()
                }
                
                extractedStats.push(extractedRecord)
            }
        })
        
        console.log(`   ✅ Features extraites: ${extractedStats.length} records`)
        
        // 3. Analyser la qualité des données extraites
        console.log('\n3. 📈 QUALITÉ DONNÉES EXTRAITES:')
        
        const qualityMetrics = {
            total_records: extractedStats.length,
            with_possession: extractedStats.filter(r => r.possession !== null).length,
            with_shots: extractedStats.filter(r => r.shots_total !== null).length,
            with_xg: extractedStats.filter(r => r.expected_goals !== null).length,
            with_passes: extractedStats.filter(r => r.passes_total !== null).length,
            complete_records: extractedStats.filter(r => 
                r.possession !== null && 
                r.shots_total !== null && 
                r.expected_goals !== null && 
                r.passes_total !== null
            ).length
        }
        
        Object.entries(qualityMetrics).forEach(([metric, count]) => {
            const percentage = extractedStats.length > 0 
                ? Math.round((count / extractedStats.length) * 100) 
                : 0
            console.log(`   ${metric}: ${count}/${extractedStats.length} (${percentage}%)`)
        })
        
        // 4. Échantillon des données extraites
        console.log('\n4. 🎯 ÉCHANTILLON DONNÉES EXTRAITES:')
        extractedStats.slice(0, 3).forEach((record, index) => {
            console.log(`\n   Record ${index + 1}:`)
            console.log(`     match_id: ${record.match_id}, team_id: ${record.team_id}`)
            console.log(`     Possession: ${record.possession}%, xG: ${record.expected_goals}`)
            console.log(`     Shots: ${record.shots_total} (${record.shots_on_target} on target)`)
            console.log(`     Passes: ${record.passes_accurate}/${record.passes_total} (${record.passes_accuracy}%)`)
            console.log(`     Cards: ${record.cards_total}, Fouls: ${record.fouls}`)
        })
        
        // 5. Créer table match_features si elle n'existe pas et insérer
        console.log('\n5. 📥 INSERTION DANS MATCH_FEATURES:')
        
        // D'abord, essayer de créer la table (ignorer erreur si existe)
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS match_features (
                id SERIAL PRIMARY KEY,
                match_id BIGINT,
                team_id BIGINT,
                possession DECIMAL,
                shots_total INTEGER,
                shots_on_target INTEGER,
                shots_off_target INTEGER,
                shots_blocked INTEGER,
                shots_inside_box INTEGER,
                shots_outside_box INTEGER,
                expected_goals DECIMAL,
                passes_total INTEGER,
                passes_accurate INTEGER,
                passes_accuracy DECIMAL,
                corners INTEGER,
                offsides INTEGER,
                fouls INTEGER,
                yellow_cards INTEGER,
                red_cards INTEGER,
                saves INTEGER,
                goals_prevented INTEGER,
                shot_accuracy DECIMAL,
                cards_total INTEGER,
                passing_rate DECIMAL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `
        
        try {
            // Note: Cette approche ne marchera pas avec Supabase client standard
            // On va plutôt insérer directement dans une table existante ou créer via SQL editor
            console.log('   ⚠️ Création table match_features nécessaire via SQL editor Supabase')
            console.log('   SQL à exécuter:')
            console.log(createTableSQL)
            
            // Alternative: Insérer dans une table existante temporaire
            console.log('\n   💡 ALTERNATIVE - Stockage temporaire:')
            console.log(`   Données prêtes pour insertion: ${extractedStats.length} records`)
            console.log(`   Champs disponibles: ${Object.keys(extractedStats[0] || {}).length}`)
            
        } catch (createError) {
            console.log(`   ❌ Erreur création table: ${createError.message}`)
        }
        
        // 6. Générer script d'insertion SQL
        console.log('\n6. 📄 GÉNÉRATION SCRIPT SQL:')
        
        if (extractedStats.length > 0) {
            let sqlInsert = 'INSERT INTO match_features (\n'
            sqlInsert += '  match_id, team_id, possession, shots_total, shots_on_target, expected_goals,\n'
            sqlInsert += '  passes_total, passes_accurate, passes_accuracy, corners, fouls, cards_total\n'
            sqlInsert += ') VALUES\n'
            
            const insertValues = extractedStats.slice(0, 10).map(record => {
                return `(${record.match_id}, ${record.team_id}, ${record.possession}, ${record.shots_total}, ${record.shots_on_target}, ${record.expected_goals}, ${record.passes_total}, ${record.passes_accurate}, ${record.passes_accuracy}, ${record.corners}, ${record.fouls}, ${record.cards_total})`
            }).join(',\n')
            
            sqlInsert += insertValues + ';'
            
            console.log('   ✅ Script SQL généré (premiers 10 records):')
            console.log(sqlInsert)
            
            // Sauvegarder dans un fichier
            const fs = require('fs')
            const fullSqlInsert = 'INSERT INTO match_features (\n' +
                'match_id, team_id, possession, shots_total, shots_on_target, expected_goals,\n' +
                'passes_total, passes_accurate, passes_accuracy, corners, fouls, cards_total\n' +
                ') VALUES\n' +
                extractedStats.map(record => {
                    return `(${record.match_id}, ${record.team_id}, ${record.possession}, ${record.shots_total}, ${record.shots_on_target}, ${record.expected_goals}, ${record.passes_total}, ${record.passes_accurate}, ${record.passes_accuracy}, ${record.corners}, ${record.fouls}, ${record.cards_total})`
                }).join(',\n') + ';'
            
            fs.writeFileSync('./match_features_insert.sql', fullSqlInsert)
            console.log('   📄 Script complet sauvé: ./match_features_insert.sql')
        }
        
        // 7. Résumé final
        console.log('\n7. 📊 RÉSUMÉ EXTRACTION:')
        console.log(`   JSON records traités: ${allMatchStats?.length || 0}`)
        console.log(`   Features ML extraites: ${extractedStats.length}`)
        console.log(`   Champs par record: ${Object.keys(extractedStats[0] || {}).length}`)
        console.log(`   Qualité completeness: ${qualityMetrics.complete_records}/${extractedStats.length} (${Math.round((qualityMetrics.complete_records/extractedStats.length)*100)}%)`)
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

extractJsonStatistics()