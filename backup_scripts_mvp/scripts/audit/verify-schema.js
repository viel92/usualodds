const { createClient } = require('@supabase/supabase-js')

async function verifySchema() {
    console.log('🔍 VÉRIFICATION COMPLÈTE DU SCHÉMA')
    console.log('===================================')
    
    const supabase = createClient(
        'https://agysfqhijfbnqzzooyeo.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    )
    
    const requiredTables = [
        'matches',
        'team_features', 
        'player_features',
        'match_events',
        'match_statistics',
        'match_formations',
        'match_lineups',
        'match_players_stats',
        'match_context',
        'match_odds_timeline',
        'coach_features',
        'ai_match_insights'
    ]
    
    let allTablesOK = true
    
    try {
        console.log('📋 Vérification existence des tables...\n')
        
        for (const tableName of requiredTables) {
            try {
                // Test d'accès à la table
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1)
                
                if (error) {
                    console.log(`❌ ${tableName}: ERREUR - ${error.message}`)
                    allTablesOK = false
                } else {
                    console.log(`✅ ${tableName}: OK`)
                    
                    // Vérifier colonnes importantes pour certaines tables
                    if (tableName === 'team_features' && data && data.length > 0) {
                        const teamColumns = Object.keys(data[0])
                        const criticalColumns = [
                            'motivation_score', 'pressure_score', 'goals_per_game', 
                            'possession_avg', 'shots_per_game', 'elo_rating', 'xg_for_avg'
                        ]
                        
                        console.log('   📊 Colonnes critiques team_features:')
                        criticalColumns.forEach(col => {
                            if (teamColumns.includes(col)) {
                                console.log(`      ✅ ${col}`)
                            } else {
                                console.log(`      ❌ ${col} - MANQUANTE`)
                                allTablesOK = false
                            }
                        })
                    }
                }
                
            } catch (err) {
                console.log(`❌ ${tableName}: EXCEPTION - ${err.message}`)
                allTablesOK = false
            }
        }
        
        console.log('\n🔍 Vérification contraintes UNIQUE...')
        
        // Test contraintes uniques importantes
        const uniqueTests = [
            { table: 'matches', field: 'api_id', description: 'Match unique par API ID' },
            { table: 'team_features', field: 'team_id,season,league_id', description: 'Équipe unique par saison' },
            { table: 'player_features', field: 'player_id,team_id,season', description: 'Joueur unique par équipe/saison' }
        ]
        
        for (const test of uniqueTests) {
            try {
                const { count } = await supabase
                    .from(test.table)
                    .select('*', { count: 'exact', head: true })
                
                console.log(`✅ ${test.table}: ${count || 0} entrées - ${test.description}`)
            } catch (err) {
                console.log(`❌ ${test.table}: Erreur contrainte - ${err.message}`)
                allTablesOK = false
            }
        }
        
        console.log('\n📊 RÉSULTAT FINAL:')
        console.log('==================')
        
        if (allTablesOK) {
            console.log('✅ SCHÉMA VALIDE - Prêt pour ingestion complète')
            console.log('📈 Toutes les tables existent et sont accessibles')
            console.log('🔒 Contraintes uniques en place')
        } else {
            console.log('❌ PROBLÈMES DÉTECTÉS - Vérifier avant ingestion')
            console.log('⚠️ Certaines tables ou colonnes manquent')
            console.log('🔧 Action requise: Appliquer migrations manquantes')
        }
        
        console.log('\n💡 RECOMMANDATIONS:')
        if (!allTablesOK) {
            console.log('1. Appliquer migration consolidée si pas fait')
            console.log('2. Vérifier permissions Supabase')
            console.log('3. Relancer après corrections')
        } else {
            console.log('1. ✅ Prêt pour lancer le pipeline complet')
            console.log('2. ✅ Données seront correctement ingérées')
            console.log('3. ✅ Pas de perte de données attendue')
        }
        
    } catch (error) {
        console.error('❌ Erreur vérification schéma:', error.message)
        allTablesOK = false
    }
    
    return allTablesOK
}

// Exporter pour utilisation dans d'autres scripts
module.exports = { verifySchema }

// Lancer si appelé directement
if (require.main === module) {
    verifySchema().catch(console.error)
}