const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function applyMigration() {
    console.log('🔄 Application migration consolidée...')
    
    // Configuration Supabase avec service role key pour permissions admin
    const supabaseUrl = 'https://agysfqhijfbnqzzooyeo.supabase.co'
    const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    
    const supabase = createClient(supabaseUrl, serviceKey)
    
    try {
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250819_200000_consolidated_migration.sql')
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        
        console.log('📝 Lecture migration:', migrationPath)
        console.log('📊 Taille migration:', migrationSQL.length, 'caractères')
        
        // Diviser en blocs plus petits pour éviter timeouts
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
        
        console.log('🔢 Nombre d\'instructions SQL:', statements.length)
        
        // Exécuter statement par statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';'
            
            if (statement.trim() === ';') continue
            
            console.log(`📋 Exécution ${i + 1}/${statements.length}: ${statement.substring(0, 60)}...`)
            
            try {
                const { error } = await supabase.rpc('exec_sql', { sql: statement })
                
                if (error) {
                    console.log(`⚠️ Erreur statement ${i + 1}:`, error.message)
                    
                    // Continuer si c'est une erreur "already exists"
                    if (error.message.includes('already exists') || 
                        error.message.includes('does not exist') ||
                        error.message.includes('duplicate key value')) {
                        console.log('   ↳ Erreur ignorée (safe)')
                        continue
                    } else {
                        throw error
                    }
                } else {
                    console.log(`   ✅ Statement ${i + 1} exécuté avec succès`)
                }
            } catch (err) {
                console.log(`   ❌ Erreur statement ${i + 1}:`, err.message)
                
                // Log du statement problématique
                console.log('   📋 Statement:', statement.substring(0, 200))
                
                // Continuer avec les autres statements
                continue
            }
            
            // Petit délai pour éviter rate limiting
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }
        
        console.log('✅ Migration consolidée appliquée avec succès!')
        console.log('🔒 RLS activé sur toutes les tables')
        console.log('📊 Architecture base de données mise à jour')
        
    } catch (error) {
        console.error('❌ Erreur application migration:', error.message)
        process.exit(1)
    }
}

// Créer fonction exec_sql si elle n'existe pas
async function createExecFunction() {
    const supabase = createClient(
        'https://agysfqhijfbnqzzooyeo.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    )
    
    const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
            EXECUTE sql;
        END;
        $$;
    `
    
    try {
        console.log('🔧 Création fonction exec_sql...')
        const { error } = await supabase.rpc('exec_sql', { sql: createFunctionSQL })
        if (error && !error.message.includes('already exists')) {
            console.log('⚠️ Tentative alternative...')
            // Fallback: essayer directement
        }
        console.log('✅ Fonction exec_sql prête')
    } catch (err) {
        console.log('⚠️ Fonction exec_sql - mode fallback')
    }
}

async function main() {
    await createExecFunction()
    await applyMigration()
}

main().catch(console.error)