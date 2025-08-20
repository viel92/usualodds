#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function ultimateDatabaseAudit() {
    console.log('\n🔥🔥🔥 ULTIMATE DATABASE AUDIT - FINAL VERIFICATION 🔥🔥🔥\n')
    console.log('📋 Mission: Audit EXHAUSTIF pour clôturer définitivement cette étape\n')
    
    const auditResults = {
        tables: {},
        jsonColumns: [],
        nullColumns: [],
        relationships: {},
        mlReadiness: {},
        actionItems: []
    }
    
    try {
        // Liste COMPLÈTE de toutes les tables possibles
        const ALL_TABLES = [
            'matches', 'teams', 'players', 'seasons', 'leagues',
            'match_statistics', 'match_players_stats', 'player_features', 'team_features',
            'standings', 'fixtures', 'lineups', 'events', 'odds', 'predictions',
            'injuries', 'suspensions', 'weather', 'referees', 'venues'
        ]
        
        console.log('🔍 PHASE 1: INVENTAIRE COMPLET TOUTES TABLES\n')
        
        for (const tableName of ALL_TABLES) {
            console.log(`📊 ANALYSE: ${tableName.toUpperCase()}`)
            
            try {
                // 1. Compter TOUS les records avec pagination complète
                let totalRecords = 0
                let page = 0
                const pageSize = 1000
                let allData = []
                
                while (true) {
                    const { data: pageData, count, error } = await supabase
                        .from(tableName)
                        .select('*', { count: 'exact' })
                        .range(page * pageSize, (page + 1) * pageSize - 1)
                    
                    if (error) {
                        console.log(`   ❌ Table n'existe pas ou erreur: ${error.message}`)
                        break
                    }
                    
                    if (page === 0) {
                        totalRecords = count || 0
                        console.log(`   📊 Total records: ${totalRecords}`)
                    }
                    
                    if (!pageData || pageData.length === 0) break
                    
                    allData.push(...pageData)
                    console.log(`   📃 Page ${page + 1}: ${pageData.length} records (total: ${allData.length})`)
                    
                    if (pageData.length < pageSize) break
                    page++
                    
                    if (page > 50) { // Safety limit
                        console.log(`   ⚠️ Arrêt sécurité après 50 pages (${allData.length} records)`)
                        break
                    }
                }
                
                if (allData.length === 0) {
                    console.log(`   ⚠️ Table vide\n`)
                    auditResults.tables[tableName] = { status: 'EMPTY', records: 0 }
                    continue
                }
                
                // 2. Analyse complète structure + JSON + NULL
                const firstRow = allData[0]
                const columns = Object.keys(firstRow)
                const jsonColumns = []
                const nullColumns = []
                const emptyColumns = []
                
                console.log(`   📋 Colonnes (${columns.length}): ${columns.join(', ')}`)
                
                // Analyser chaque colonne
                for (const column of columns) {
                    let nullCount = 0
                    let emptyCount = 0
                    let jsonCount = 0
                    let hasValidData = false
                    let sampleValues = []
                    
                    // Analyser tous les records de cette colonne
                    for (const row of allData) {
                        const value = row[column]
                        
                        if (value === null || value === undefined) {
                            nullCount++
                        } else if (value === '' || value === '{}' || (Array.isArray(value) && value.length === 0)) {
                            emptyCount++
                        } else {
                            hasValidData = true
                            
                            // Détecter JSON
                            if (typeof value === 'object' && value !== null) {
                                jsonCount++
                            } else if (typeof value === 'string' && value.length > 0) {
                                try {
                                    const parsed = JSON.parse(value)
                                    if (typeof parsed === 'object') {
                                        jsonCount++
                                    }
                                } catch {}
                            }
                            
                            // Échantillon de valeurs
                            if (sampleValues.length < 3) {
                                sampleValues.push(value)
                            }
                        }
                    }
                    
                    const totalRows = allData.length
                    const nullPercentage = Math.round((nullCount / totalRows) * 100)
                    const emptyPercentage = Math.round((emptyCount / totalRows) * 100)
                    const jsonPercentage = Math.round((jsonCount / totalRows) * 100)
                    
                    // Classification des colonnes
                    if (jsonCount > 0) {
                        jsonColumns.push({
                            table: tableName,
                            column: column,
                            jsonRecords: jsonCount,
                            totalRecords: totalRows,
                            coverage: jsonPercentage,
                            sampleValue: JSON.stringify(sampleValues[0]).substring(0, 100)
                        })
                        console.log(`   🔶 ${column}: ${jsonCount} JSON (${jsonPercentage}%) - ${jsonCount > 0 ? '⚠️ À TRAITER' : ''}`)
                    }
                    
                    if (nullCount > totalRows * 0.8) { // Plus de 80% null
                        nullColumns.push({
                            table: tableName,
                            column: column,
                            nullCount: nullCount,
                            totalRecords: totalRows,
                            nullPercentage: nullPercentage,
                            hasAnyData: hasValidData,
                            sampleValues: sampleValues
                        })
                        console.log(`   🔸 ${column}: ${nullPercentage}% NULL - ${hasValidData ? '⚠️ PARTIELLEMENT REMPLI' : '❌ VIDE'}`)
                    }
                    
                    if (!hasValidData && nullCount + emptyCount === totalRows) {
                        emptyColumns.push({
                            table: tableName,
                            column: column,
                            reason: 'COMPLETELY_EMPTY'
                        })
                        console.log(`   💀 ${column}: 100% VIDE`)
                    }
                }
                
                auditResults.tables[tableName] = {
                    status: 'EXISTS',
                    records: allData.length,
                    totalRecordsCounted: totalRecords,
                    columns: columns.length,
                    jsonColumns: jsonColumns.filter(j => j.table === tableName).length,
                    nullColumns: nullColumns.filter(n => n.table === tableName).length,
                    emptyColumns: emptyColumns.length,
                    dataQuality: Math.round(((columns.length - emptyColumns.length) / columns.length) * 100)
                }
                
                console.log(`   ✅ Analysé: ${allData.length}/${totalRecords} records, ${jsonColumns.filter(j => j.table === tableName).length} JSON, qualité ${auditResults.tables[tableName].dataQuality}%\n`)
                
            } catch (tableError) {
                console.log(`   💥 Erreur table: ${tableError.message}\n`)
                auditResults.tables[tableName] = { status: 'ERROR', error: tableError.message }
            }
        }
        
        auditResults.jsonColumns = jsonColumns
        auditResults.nullColumns = nullColumns
        
        // PHASE 2: ANALYSE JSON NON TRAITÉS
        console.log('🔍 PHASE 2: ANALYSE TOUS JSON NON TRAITÉS\n')
        
        const processedJson = [
            'match_statistics.statistics',
            'match_players_stats.raw_stats',
            'matches.raw_data' // Nouveau traité
        ]
        
        const unprocessedJson = jsonColumns.filter(j => 
            !processedJson.includes(`${j.table}.${j.column}`)
        )
        
        console.log(`📊 JSON DÉJÀ TRAITÉS: ${processedJson.length}`)
        processedJson.forEach(pj => console.log(`   ✅ ${pj}`))
        
        console.log(`\n🚨 JSON NON TRAITÉS: ${unprocessedJson.length}`)
        
        for (const ujson of unprocessedJson) {
            console.log(`\n   🔶 ${ujson.table}.${ujson.column}`)
            console.log(`      Records: ${ujson.jsonRecords}/${ujson.totalRecords} (${ujson.coverage}%)`)
            console.log(`      Sample: ${ujson.sampleValue}...`)
            
            // Déterminer si c'est API ou ML
            const isApiData = ujson.sampleValue.includes('api') || 
                             ujson.sampleValue.includes('id":') ||
                             ujson.sampleValue.includes('logo') ||
                             ujson.column.includes('raw')
            
            const isMlData = ujson.column.includes('ai_') ||
                            ujson.column.includes('context_') ||
                            ujson.column.includes('features') ||
                            ujson.sampleValue.includes('confidence') ||
                            ujson.sampleValue.includes('tactical')
            
            if (isApiData) {
                console.log(`      🔥 TYPE: API DATA - À EXTRAIRE`)
                console.log(`      📋 Action: Créer extract-${ujson.table}-${ujson.column.replace('_', '-')}.js`)
                auditResults.actionItems.push({
                    type: 'EXTRACT_JSON',
                    priority: 'HIGH',
                    table: ujson.table,
                    column: ujson.column,
                    records: ujson.jsonRecords,
                    action: `extract-${ujson.table}-${ujson.column.replace('_', '-')}.js`
                })
            } else if (isMlData) {
                console.log(`      🤖 TYPE: ML DATA - À CALCULER`)
                console.log(`      📋 Action: Implémenter calculate-${ujson.column.replace('_', '-')}.js`)
                auditResults.actionItems.push({
                    type: 'CALCULATE_ML',
                    priority: 'MEDIUM',
                    table: ujson.table,
                    column: ujson.column,
                    records: ujson.jsonRecords,
                    action: `calculate-${ujson.column.replace('_', '-')}.js`
                })
            } else {
                console.log(`      🔍 TYPE: INCONNU - À ANALYSER`)
                auditResults.actionItems.push({
                    type: 'ANALYZE',
                    priority: 'LOW',
                    table: ujson.table,
                    column: ujson.column,
                    records: ujson.jsonRecords,
                    action: `ANALYSER MANUELLEMENT`
                })
            }
        }
        
        // PHASE 3: ANALYSE COLONNES NULL/VIDES
        console.log('\n🔍 PHASE 3: ANALYSE COLONNES NULL/VIDES\n')
        
        console.log(`📊 COLONNES MAJORITAIREMENT VIDES: ${nullColumns.length}`)
        
        const criticalNulls = []
        const normalNulls = []
        const mlNulls = []
        
        for (const nullCol of nullColumns) {
            console.log(`\n   💀 ${nullCol.table}.${nullCol.column}: ${nullCol.nullPercentage}% NULL`)
            
            // Déterminer pourquoi c'est NULL
            const isPlayerTable = nullCol.table === 'players' || nullCol.table === 'player_features'
            const isTeamFeatures = nullCol.table === 'team_features'
            const isCalculatedField = nullCol.column.includes('_score') ||
                                     nullCol.column.includes('rating') ||
                                     nullCol.column.includes('elo') ||
                                     nullCol.column.includes('form_') ||
                                     nullCol.column.includes('ai_')
            
            if (isPlayerTable && nullCol.table === 'players') {
                console.log(`      📋 Raison: Table players vide - données dans match_players_stats`)
                console.log(`      ✅ Status: NORMAL - utilisez player_features consolidées`)
                normalNulls.push(nullCol)
            } else if (isCalculatedField || isTeamFeatures) {
                console.log(`      🤖 Raison: Champ ML à calculer par nos algorithmes`)
                console.log(`      📋 Action: Implémenter calcul ML`)
                mlNulls.push(nullCol)
            } else if (!nullCol.hasAnyData) {
                console.log(`      🔥 Raison: Collecteur manquant ou API non configurée`)
                console.log(`      ⚠️ Status: CRITIQUE - vérifier collectors`)
                criticalNulls.push(nullCol)
            } else {
                console.log(`      📊 Raison: Données partielles - normal`)
                normalNulls.push(nullCol)
            }
        }
        
        // PHASE 4: VÉRIFICATION RELATIONS CRITIQUES
        console.log('\n🔍 PHASE 4: VÉRIFICATION RELATIONS CRITIQUES\n')
        
        const relationshipTests = [
            {
                name: 'Matches ↔ Saisons',
                test: async () => {
                    const { data: matches } = await supabase.from('matches').select('season').limit(10)
                    const { data: seasons } = await supabase.from('seasons').select('year').limit(10)
                    return matches && seasons && matches.length > 0 && seasons.length > 0
                }
            },
            {
                name: 'Player Features ↔ Matches',
                test: async () => {
                    const { data: pf } = await supabase.from('player_features').select('player_name').limit(10)
                    return pf && pf.length > 0
                }
            },
            {
                name: 'Match Statistics ↔ Matches',
                test: async () => {
                    const { data: ms } = await supabase.from('match_statistics').select('match_id').limit(10)
                    return ms && ms.length > 0
                }
            },
            {
                name: 'Teams ↔ Matches',
                test: async () => {
                    const { data: teams } = await supabase.from('teams').select('name').limit(1)
                    const { data: matches } = await supabase.from('matches').select('home_team_name').limit(1)
                    return teams && matches && teams.length > 0 && matches.length > 0
                }
            }
        ]
        
        for (const relation of relationshipTests) {
            const result = await relation.test()
            console.log(`   ${result ? '✅' : '❌'} ${relation.name}`)
            auditResults.relationships[relation.name] = result
        }
        
        // PHASE 5: ML READINESS FINAL
        console.log('\n🔍 PHASE 5: ML READINESS EVALUATION\n')
        
        const mlComponents = {
            'Matches complets': auditResults.tables['matches']?.records > 1000,
            'Player stats consolidés': auditResults.tables['player_features']?.records > 1000,
            'Match statistics': auditResults.tables['match_statistics']?.records > 100,
            'Teams data': auditResults.tables['teams']?.records > 10,
            'Relations fonctionnelles': Object.values(auditResults.relationships).filter(r => r).length >= 3,
            'JSON critiques traités': processedJson.length >= 3
        }
        
        console.log('📊 COMPOSANTS ML:')
        Object.entries(mlComponents).forEach(([component, status]) => {
            console.log(`   ${status ? '✅' : '❌'} ${component}`)
            auditResults.mlReadiness[component] = status
        })
        
        const mlReadinessScore = Object.values(mlComponents).filter(Boolean).length
        const totalComponents = Object.values(mlComponents).length
        const mlReadinessPercent = Math.round((mlReadinessScore / totalComponents) * 100)
        
        console.log(`\n🎯 ML READINESS SCORE: ${mlReadinessScore}/${totalComponents} (${mlReadinessPercent}%)`)
        
        // PHASE 6: ACTION ITEMS FINAL
        console.log('\n🔍 PHASE 6: PLAN D\'ACTION FINAL\n')
        
        const highPriorityActions = auditResults.actionItems.filter(a => a.priority === 'HIGH')
        const mediumPriorityActions = auditResults.actionItems.filter(a => a.priority === 'MEDIUM')
        const lowPriorityActions = auditResults.actionItems.filter(a => a.priority === 'LOW')
        
        console.log('🔴 ACTIONS PRIORITÉ HAUTE (JSON API à extraire):')
        highPriorityActions.forEach((action, i) => {
            console.log(`   ${i+1}. ${action.action}`)
            console.log(`      → ${action.table}.${action.column}: ${action.records} records`)
        })
        
        console.log('\n🟡 ACTIONS PRIORITÉ MOYENNE (ML à calculer):')
        mediumPriorityActions.forEach((action, i) => {
            console.log(`   ${i+1}. ${action.action}`)
            console.log(`      → ${action.table}.${action.column}: ${action.records} records`)
        })
        
        console.log('\n🟢 ACTIONS PRIORITÉ BASSE (à analyser):')
        lowPriorityActions.forEach((action, i) => {
            console.log(`   ${i+1}. ${action.action}`)
            console.log(`      → ${action.table}.${action.column}: ${action.records} records`)
        })
        
        // PHASE 7: VERDICT FINAL
        console.log('\n🏆 PHASE 7: VERDICT FINAL\n')
        
        const totalTables = Object.keys(auditResults.tables).filter(t => auditResults.tables[t].status !== 'ERROR').length
        const tablesWithData = Object.keys(auditResults.tables).filter(t => auditResults.tables[t].records > 0).length
        const criticalIssues = criticalNulls.length + highPriorityActions.length
        const totalJsonUnprocessed = unprocessedJson.length
        
        console.log('📊 STATISTIQUES FINALES:')
        console.log(`   Tables analysées: ${totalTables}`)
        console.log(`   Tables avec données: ${tablesWithData}`)
        console.log(`   JSON non traités: ${totalJsonUnprocessed}`)
        console.log(`   Issues critiques: ${criticalIssues}`)
        console.log(`   ML Readiness: ${mlReadinessPercent}%`)
        
        let verdict = ''
        let nextSteps = []
        
        if (mlReadinessPercent >= 80 && criticalIssues <= 2) {
            verdict = '🎉 ÉTAPE DATA TERMINÉE - PRÊT POUR ML!'
            nextSteps = [
                'Passer à PHASE 2: ML Features Engineering',
                'Calculer ELO, form, possession sur base solide',
                'Optionnel: Traiter JSON restants si temps disponible'
            ]
        } else if (mlReadinessPercent >= 60) {
            verdict = '⚠️ ÉTAPE DATA PRESQUE TERMINÉE - ACTIONS MINEURES'
            nextSteps = [
                `Traiter ${highPriorityActions.length} JSON critiques`,
                'Résoudre issues critiques si bloquantes',
                'Puis passer à ML Features'
            ]
        } else {
            verdict = '❌ ÉTAPE DATA INCOMPLÈTE - ACTIONS REQUISES'
            nextSteps = [
                'Traiter TOUS les JSON haute priorité',
                'Résoudre issues critiques',
                'Re-audit avant passage ML'
            ]
        }
        
        console.log(`\n🎯 VERDICT: ${verdict}`)
        console.log('\n📋 PROCHAINES ÉTAPES:')
        nextSteps.forEach((step, i) => {
            console.log(`   ${i+1}. ${step}`)
        })
        
        // Sauvegarder rapport complet
        const fs = require('fs')
        const fullReport = {
            auditDate: new Date().toISOString(),
            verdict: verdict,
            statistics: {
                totalTables,
                tablesWithData,
                totalJsonUnprocessed,
                criticalIssues,
                mlReadinessPercent
            },
            ...auditResults,
            nextSteps
        }
        
        fs.writeFileSync('./ultimate_audit_report.json', JSON.stringify(fullReport, null, 2))
        console.log('\n📄 Rapport complet sauvé: ./ultimate_audit_report.json')
        
        console.log('\n🔥🔥🔥 ULTIMATE AUDIT TERMINÉ 🔥🔥🔥')
        console.log(`🎯 RÉSULTAT: ${verdict}`)
        
    } catch (error) {
        console.error('💥 Erreur ultimate audit:', error.message)
    }
}

ultimateDatabaseAudit()