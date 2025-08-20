#!/usr/bin/env node

/**
 * Fix manuel du schéma avec commandes SQL directes
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function fixSchema() {
    console.log('🔧 FIX MANUEL SCHEMA...')
    
    try {
        // 1. Ajouter api_id à seasons
        console.log('1. Ajout api_id à seasons...')
        const { error: error1 } = await supabase
            .rpc('execute_sql', {
                query: 'ALTER TABLE seasons ADD COLUMN IF NOT EXISTS api_id INTEGER'
            })
        
        if (error1 && !error1.message.includes('already exists')) {
            console.log('   ⚠️ Utilisation méthode alternative...')
            // Méthode alternative: vérifier si la colonne existe
            const { data: columns } = await supabase
                .rpc('get_table_columns', { table_name: 'seasons' })
            console.log('   Colonnes seasons:', columns)
        }
        
        // 2. Ajouter short_name à teams  
        console.log('2. Ajout short_name à teams...')
        const { error: error2 } = await supabase
            .rpc('execute_sql', {
                query: 'ALTER TABLE teams ADD COLUMN IF NOT EXISTS short_name VARCHAR(10)'
            })
            
        if (error2 && !error2.message.includes('already exists')) {
            console.log('   ⚠️ Utilisation méthode alternative...')
        }
        
        // 3. Test simple: lire structure actuelle
        console.log('3. Test lecture structure...')
        const { data: seasonsTest, error: testError } = await supabase
            .from('seasons')
            .select('*')
            .limit(1)
            
        if (testError) {
            console.log('   Erreur test seasons:', testError.message)
        } else {
            console.log('   Structure seasons OK, colonnes:', Object.keys(seasonsTest[0] || {}))
        }
        
        const { data: teamsTest, error: teamsTestError } = await supabase
            .from('teams')
            .select('*')
            .limit(1)
            
        if (teamsTestError) {
            console.log('   Erreur test teams:', teamsTestError.message)
        } else {
            console.log('   Structure teams OK, colonnes:', Object.keys(teamsTest[0] || {}))
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

fixSchema()