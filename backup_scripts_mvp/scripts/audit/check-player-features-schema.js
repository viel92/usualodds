#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function checkPlayerFeaturesSchema() {
    console.log('\n=== SCHÉMA PLAYER_FEATURES ===\n')
    
    try {
        // Essayer d'insérer un test pour voir les colonnes acceptées
        console.log('1. 📋 TEST INSERTION SIMPLE:')
        
        const testPlayer = {
            player_name: 'Test Player',
            season: '2024',
            goals: 5,
            assists: 3
        }
        
        const { error: testError } = await supabase
            .from('player_features')
            .insert([testPlayer])
        
        if (testError) {
            console.log(`❌ Erreur test: ${testError.message}`)
            
            // Essayer avec différentes combinaisons de colonnes
            console.log('\n2. 🔍 TEST COLONNES ESSENTIELLES:')
            
            const essentialColumns = {
                player_name: 'Test Player 2',
                goals: 5
            }
            
            const { error: essentialError } = await supabase
                .from('player_features')
                .insert([essentialColumns])
            
            if (essentialError) {
                console.log(`❌ Colonnes essentielles: ${essentialError.message}`)
            } else {
                console.log('✅ Insertion basique réussie')
                
                // Supprimer le test
                await supabase
                    .from('player_features')
                    .delete()
                    .eq('player_name', 'Test Player 2')
            }
        } else {
            console.log('✅ Test insertion réussie')
            
            // Supprimer le test
            await supabase
                .from('player_features')
                .delete()
                .eq('player_name', 'Test Player')
        }
        
        // 3. Vérifier s'il y a des exemples existants
        console.log('\n3. 📊 ÉCHANTILLON EXISTANT:')
        const { data: sample } = await supabase
            .from('player_features')
            .select('*')
            .limit(3)
        
        if (sample && sample.length > 0) {
            console.log('   Colonnes détectées:')
            Object.keys(sample[0]).forEach(key => {
                console.log(`     - ${key}: ${typeof sample[0][key]}`)
            })
        } else {
            console.log('   Table vide - impossible de détecter le schéma')
            
            // Essayer des noms de colonnes probables
            console.log('\n4. 🎯 TEST COLONNES PROBABLES:')
            const probableColumns = [
                'id', 'player_name', 'season', 'goals', 'assists',
                'minutes_played', 'matches_played', 'team_id',
                'yellow_cards', 'red_cards', 'created_at', 'updated_at'
            ]
            
            for (const col of probableColumns) {
                try {
                    await supabase
                        .from('player_features')
                        .select(col)
                        .limit(1)
                    
                    console.log(`     ✅ ${col}`)
                } catch (error) {
                    console.log(`     ❌ ${col}`)
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

checkPlayerFeaturesSchema()