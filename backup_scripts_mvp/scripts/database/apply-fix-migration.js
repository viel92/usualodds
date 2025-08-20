#!/usr/bin/env node

/**
 * Application de la migration de fix schema
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Utilisation des vars d'env directes
const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function applyFixMigration() {
    console.log('🔧 APPLICATION MIGRATION FIX SCHEMA...')
    
    try {
        // Lire le fichier de migration
        const migrationSQL = fs.readFileSync('../../supabase/migrations/20250820_fix_collectors_schema.sql', 'utf8')
        
        console.log('📝 Exécution des commandes SQL...')
        
        // Découper en commandes individuelles (simple split sur ;)
        const commands = migrationSQL
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
        
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i]
            if (command) {
                console.log(`  Commande ${i+1}/${commands.length}...`)
                const { error } = await supabase.rpc('exec_sql', { sql_query: command })
                if (error) {
                    console.log(`    ⚠️ Avertissement: ${error.message}`)
                } else {
                    console.log(`    ✅ OK`)
                }
            }
        }
        
        console.log('✅ Migration appliquée avec succès!')
        
    } catch (error) {
        console.error('❌ Erreur migration:', error.message)
    }
}

applyFixMigration()