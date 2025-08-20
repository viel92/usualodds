const { createClient } = require('@supabase/supabase-js')

async function checkConstraints() {
    console.log('🔍 Vérification contraintes base de données...')
    
    const supabase = createClient(
        'https://agysfqhijfbnqzzooyeo.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    )
    
    try {
        // Test insertion avec des valeurs qui causaient problème
        const testData = {
            team_id: 99999, // ID test
            season: 2024,
            league_id: 61,
            current_rank: 1,
            motivation_score: 1.0, // Valeur maximale qui causait overflow
            pressure_score: 0.9,
            big_game_mentality: 1.0,
            home_advantage: 1.0,
            away_performance: 1.0
        }
        
        console.log('📊 Test insertion avec valeurs limites...')
        console.log('Données test:', testData)
        
        const { data, error } = await supabase
            .from('team_features')
            .insert(testData)
            .select()
        
        if (error) {
            console.error('❌ Erreur insertion test:', error.message)
            console.error('Code erreur:', error.code)
            console.error('Détails:', error.details)
            
            // Analyser le message d'erreur
            if (error.message.includes('numeric field overflow')) {
                console.log('🔍 OVERFLOW DÉTECTÉ - colonnes avec contraintes trop strictes')
                
                // Tests individuels pour identifier la colonne problématique
                const problemFields = ['motivation_score', 'pressure_score', 'big_game_mentality', 'home_advantage', 'away_performance']
                
                for (const field of problemFields) {
                    try {
                        const smallTest = {
                            team_id: 99999 + Math.floor(Math.random() * 100),
                            season: 2024,
                            league_id: 61,
                            current_rank: 1,
                            [field]: 1.0
                        }
                        
                        const { error: fieldError } = await supabase
                            .from('team_features')
                            .insert(smallTest)
                        
                        if (fieldError) {
                            console.log(`❌ ${field}: OVERFLOW (contrainte trop stricte)`)
                        } else {
                            console.log(`✅ ${field}: OK`)
                            // Nettoyer le test
                            await supabase.from('team_features').delete().eq('team_id', smallTest.team_id)
                        }
                    } catch (err) {
                        console.log(`❌ ${field}: ERREUR -`, err.message)
                    }
                }
            }
        } else {
            console.log('✅ Insertion test réussie!')
            console.log('Données insérées:', data)
            
            // Nettoyer le test
            await supabase.from('team_features').delete().eq('team_id', 99999)
        }
        
        // Vérifier la structure actuelle de la table
        console.log('\n📋 Vérification structure table team_features...')
        const { data: schema, error: schemaError } = await supabase
            .from('team_features')
            .select('*')
            .limit(1)
        
        if (schema && schema.length > 0) {
            console.log('✅ Table existe avec colonnes:', Object.keys(schema[0]))
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.message)
    }
}

checkConstraints().catch(console.error)