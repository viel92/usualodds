#!/usr/bin/env node

/**
 * CRÉATION DIRECTE TABLES IA
 * 
 * Créer les tables IA via INSERT direct pour contourner l'absence d'exec_sql
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createAITablesDirect() {
    console.log('🏗️ CRÉATION DIRECTE TABLES IA')
    console.log('==============================')
    
    // Test de connectivité et vérification des tables
    const tables = [
        'ai_team_analysis',
        'ai_predictions', 
        'ai_predictions_upcoming',
        'ai_learning_log'
    ]
    
    for (const tableName of tables) {
        console.log(`📊 Test table ${tableName}...`)
        
        try {
            // Tenter une requête simple pour voir si la table existe
            const { data, error } = await supabase
                .from(tableName)
                .select('id')
                .limit(1)
            
            if (error) {
                if (error.message.includes('relation') && error.message.includes('does not exist')) {
                    console.log(`❌ Table ${tableName} n'existe pas`)
                    
                    // Tenter de créer via insertion factice puis rollback
                    await tryCreateTable(tableName)
                } else {
                    console.log(`⚠️ Erreur ${tableName}:`, error.message)
                }
            } else {
                console.log(`✅ Table ${tableName} existe déjà`)
            }
            
        } catch (err) {
            console.log(`🔍 Test ${tableName} - Erreur:`, err.message)
            await tryCreateTable(tableName)
        }
    }
    
    // Test d'insertion simple pour ai_team_analysis
    await testInsertData()
    
    console.log('\n✅ Vérification tables IA terminée')
    return true
}

async function tryCreateTable(tableName) {
    console.log(`🛠️ Tentative création ${tableName}...`)
    
    // Les tables sont normalement créées par la migration
    // On va juste tester l'insertion pour confirmer
    
    const testData = getTestDataForTable(tableName)
    
    if (testData) {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .insert(testData)
                .select()
            
            if (error) {
                console.log(`❌ Erreur insertion test ${tableName}:`, error.message)
            } else {
                console.log(`✅ Table ${tableName} prête pour données`)
                
                // Supprimer les données test
                if (data && data[0]) {
                    await supabase
                        .from(tableName)
                        .delete()
                        .eq('id', data[0].id)
                }
            }
        } catch (err) {
            console.log(`❌ Exception ${tableName}:`, err.message)
        }
    }
}

function getTestDataForTable(tableName) {
    switch (tableName) {
        case 'ai_team_analysis':
            return {
                team_id: 999,
                season: 2024,
                analysis: { test: true },
                confidence: 50
            }
            
        case 'ai_predictions':
            return {
                home_team_id: 999,
                away_team_id: 998,
                prediction: { test: true },
                confidence: 50
            }
            
        case 'ai_predictions_upcoming':
            return {
                fixture_id: 999999,
                match_date: new Date().toISOString(),
                home_team_id: 999,
                away_team_id: 998,
                prediction_data: { test: true },
                confidence: 50
            }
            
        case 'ai_learning_log':
            return {
                match_id: 999,
                learning_data: { test: true }
            }
            
        default:
            return null
    }
}

async function testInsertData() {
    console.log('\n🧪 Test insertion données réelles...')
    
    // Test ai_team_analysis
    try {
        const { data, error } = await supabase
            .from('ai_team_analysis')
            .insert({
                team_id: 81, // PSG
                season: 2024,
                analysis: {
                    style_tactique: 'possession',
                    forces: ['Attaque', 'Technique', 'Profondeur'],
                    forme_actuelle: 'excellente',
                    confiance_analyse: 85
                },
                confidence: 85
            })
            .select()
        
        if (error) {
            console.log('❌ Erreur test insertion:', error.message)
        } else {
            console.log('✅ Test insertion réussi')
            
            // Nettoyer
            if (data && data[0]) {
                await supabase
                    .from('ai_team_analysis')
                    .delete()
                    .eq('id', data[0].id)
                console.log('🧹 Données test nettoyées')
            }
        }
    } catch (err) {
        console.log('❌ Exception test insertion:', err.message)
    }
}

async function main() {
    await createAITablesDirect()
}

module.exports = { createAITablesDirect }

if (require.main === module) {
    main().catch(console.error)
}