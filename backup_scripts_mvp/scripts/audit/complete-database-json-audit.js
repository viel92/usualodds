#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function completeDatabaseJsonAudit() {
    console.log('\n=== AUDIT COMPLET DATABASE - RECHERCHE TOUS JSON ===\n')
    
    try {
        // Liste de toutes les tables potentielles dans votre DB
        const allTablesToCheck = [
            'matches',
            'teams',
            'players', 
            'seasons',
            'leagues',
            'match_statistics',
            'match_players_stats',
            'player_features',
            'team_features',
            'league_features',
            'standings',
            'fixtures',
            'lineups',
            'events',
            'odds',
            'predictions'
        ]
        
        const jsonFindings = []
        
        for (const tableName of allTablesToCheck) {
            console.log(`\n🔍 ANALYSE TABLE: ${tableName.toUpperCase()}`)
            
            try {
                // 1. Vérifier si table existe et compter records
                const { count, error: countError } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true })
                
                if (countError) {
                    console.log(`   ❌ Table n'existe pas: ${countError.message}`)
                    continue
                }
                
                console.log(`   📊 Records: ${count}`)
                
                if (count === 0) {
                    console.log(`   ⚠️ Table vide`)
                    continue
                }
                
                // 2. Récupérer échantillon pour analyser colonnes JSON
                const { data: sample, error: sampleError } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(5)
                
                if (sampleError) {
                    console.log(`   ❌ Erreur échantillon: ${sampleError.message}`)
                    continue
                }
                
                if (!sample || sample.length === 0) {
                    console.log(`   ⚠️ Échantillon vide`)
                    continue
                }
                
                // 3. Analyser chaque colonne pour détecter JSON
                const firstRow = sample[0]
                const jsonColumns = []
                
                Object.entries(firstRow).forEach(([columnName, value]) => {
                    let isJson = false
                    let jsonType = null
                    let sampleData = null
                    
                    // Détecter différents types de JSON
                    if (value && typeof value === 'object' && value !== null) {
                        isJson = true
                        jsonType = Array.isArray(value) ? 'array' : 'object'
                        sampleData = JSON.stringify(value).substring(0, 200)
                    } else if (typeof value === 'string' && value.length > 0) {
                        // Tester si string contient JSON valide
                        try {
                            const parsed = JSON.parse(value)
                            if (typeof parsed === 'object') {
                                isJson = true
                                jsonType = Array.isArray(parsed) ? 'string_array' : 'string_object'
                                sampleData = value.substring(0, 200)
                            }
                        } catch {
                            // Pas du JSON valide
                        }
                    }
                    
                    if (isJson) {
                        jsonColumns.push({
                            column: columnName,
                            type: jsonType,
                            sample: sampleData + (sampleData.length >= 200 ? '...' : '')
                        })
                    }
                })
                
                // 4. Analyser la distribution des JSON dans la table
                if (jsonColumns.length > 0) {
                    console.log(`   ✅ ${jsonColumns.length} colonnes JSON trouvées:`)
                    
                    for (const jsonCol of jsonColumns) {
                        console.log(`\n   📋 COLONNE: ${jsonCol.column} (${jsonCol.type})`)
                        console.log(`      Sample: ${jsonCol.sample}`)
                        
                        // Compter combien de rows ont des données JSON non null
                        const { count: jsonCount } = await supabase
                            .from(tableName)
                            .select('*', { count: 'exact', head: true })
                            .not(jsonCol.column, 'is', null)
                        
                        const percentage = count > 0 ? Math.round((jsonCount / count) * 100) : 0
                        console.log(`      Rempli: ${jsonCount}/${count} (${percentage}%)`)
                        
                        // Analyser structure JSON détaillée sur échantillon plus large
                        const { data: jsonSample } = await supabase
                            .from(tableName)
                            .select(jsonCol.column)
                            .not(jsonCol.column, 'is', null)
                            .limit(20)
                        
                        let fieldFrequency = {}
                        
                        if (jsonSample && jsonSample.length > 0) {
                            jsonSample.forEach(row => {
                                const jsonValue = row[jsonCol.column]
                                let parsedJson = null
                                
                                try {
                                    if (typeof jsonValue === 'object') {
                                        parsedJson = jsonValue
                                    } else if (typeof jsonValue === 'string') {
                                        parsedJson = JSON.parse(jsonValue)
                                    }
                                    
                                    if (parsedJson && typeof parsedJson === 'object') {
                                        // Compter fréquence des champs
                                        Object.keys(parsedJson).forEach(field => {
                                            fieldFrequency[field] = (fieldFrequency[field] || 0) + 1
                                        })
                                    }
                                } catch (e) {
                                    // Ignore parsing errors
                                }
                            })
                            
                            // Afficher top fields
                            const topFields = Object.entries(fieldFrequency)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 10)
                            
                            if (topFields.length > 0) {
                                console.log(`      Top fields (sur ${jsonSample.length} échantillons):`)
                                topFields.forEach(([field, freq]) => {
                                    const fieldPercentage = Math.round((freq / jsonSample.length) * 100)
                                    console.log(`        ${field}: ${freq}/${jsonSample.length} (${fieldPercentage}%)`)
                                })
                            }
                        }
                        
                        // Ajouter à notre liste de findings
                        jsonFindings.push({
                            table: tableName,
                            column: jsonCol.column,
                            type: jsonCol.type,
                            totalRecords: count,
                            jsonRecords: jsonCount,
                            coverage: percentage,
                            topFields: Object.entries(fieldFrequency)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([field, freq]) => ({ field, frequency: freq }))
                        })
                    }
                } else {
                    console.log(`   ℹ️ Aucune colonne JSON détectée`)
                }
                
            } catch (tableError) {
                console.log(`   ❌ Erreur analyse table: ${tableError.message}`)
            }
        }
        
        // 5. Résumé global
        console.log('\n\n📊 RÉSUMÉ AUDIT JSON COMPLET:')
        console.log(`Tables analysées: ${allTablesToCheck.length}`)
        console.log(`Tables avec JSON: ${[...new Set(jsonFindings.map(f => f.table))].length}`)
        console.log(`Total colonnes JSON: ${jsonFindings.length}`)
        
        // 6. Priorités d'extraction
        console.log('\n🎯 PRIORITÉS EXTRACTION JSON:')
        
        const prioritized = jsonFindings
            .filter(f => f.jsonRecords > 0)
            .sort((a, b) => (b.jsonRecords * b.coverage) - (a.jsonRecords * a.coverage))
        
        prioritized.forEach((finding, index) => {
            const priority = index < 3 ? '🔴 HAUTE' : index < 7 ? '🟡 MOYENNE' : '🟢 BASSE'
            console.log(`\n${priority} - ${finding.table}.${finding.column}`)
            console.log(`  Records: ${finding.jsonRecords}/${finding.totalRecords} (${finding.coverage}%)`)
            console.log(`  Type: ${finding.type}`)
            if (finding.topFields && finding.topFields.length > 0) {
                console.log(`  Top fields: ${finding.topFields.map(tf => tf.field).join(', ')}`)
            }
        })
        
        // 7. Scripts d'extraction recommandés
        console.log('\n📋 SCRIPTS EXTRACTION RECOMMANDÉS:')
        
        const highPriority = prioritized.slice(0, 3)
        highPriority.forEach((finding, index) => {
            console.log(`\n${index + 1}. extract-${finding.table}-${finding.column.replace('_', '-')}.js`)
            console.log(`   Commande: node scripts/features/extract-${finding.table}-${finding.column.replace('_', '-')}.js`)
            console.log(`   Impact: ${finding.jsonRecords} records → ~${finding.topFields?.length || 0}+ features ML`)
        })
        
        // 8. Estimation potentiel ML
        console.log('\n🚀 POTENTIEL ML TOTAL:')
        
        const totalJsonRecords = jsonFindings.reduce((sum, f) => sum + f.jsonRecords, 0)
        const estimatedFeatures = jsonFindings.reduce((sum, f) => sum + (f.topFields?.length || 0), 0)
        
        console.log(`Total JSON records: ${totalJsonRecords}`)
        console.log(`Features ML estimées: ${estimatedFeatures}+`)
        console.log(`Tables critiques à traiter: ${prioritized.slice(0, 3).map(f => f.table).join(', ')}`)
        
        // 9. Sauvegarder rapport détaillé
        const fs = require('fs')
        const report = {
            auditDate: new Date().toISOString(),
            tablesAnalyzed: allTablesToCheck.length,
            jsonFindings: jsonFindings,
            priorities: prioritized,
            summary: {
                totalJsonRecords,
                estimatedFeatures,
                criticalTables: prioritized.slice(0, 3).map(f => `${f.table}.${f.column}`)
            }
        }
        
        fs.writeFileSync('./database_json_audit_report.json', JSON.stringify(report, null, 2))
        console.log('\n📄 Rapport détaillé sauvé: ./database_json_audit_report.json')
        
    } catch (error) {
        console.error('❌ Erreur audit:', error.message)
    }
}

completeDatabaseJsonAudit()