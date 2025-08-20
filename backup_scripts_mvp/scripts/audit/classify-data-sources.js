#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function classifyDataSources() {
    console.log('\n=== CLASSIFICATION SOURCES DONNÉES ===\n')
    
    try {
        console.log('🔍 ANALYSE JSON FINDINGS vs ARCHITECTURE:')
        
        // Charger les findings de notre audit précédent
        const fs = require('fs')
        let jsonFindings = []
        
        try {
            const reportData = fs.readFileSync('./database_json_audit_report.json', 'utf8')
            const report = JSON.parse(reportData)
            jsonFindings = report.jsonFindings || []
        } catch (e) {
            console.log('⚠️ Impossible de charger le rapport audit précédent')
        }
        
        // Classification basée sur l'architecture et la roadmap
        const dataClassification = {
            // 🔥 API FOOTBALL (Sources externes - à extraire)
            apiSources: [
                {
                    table: 'matches',
                    column: 'raw_data',
                    source: 'API Football',
                    status: 'NON_EXTRAIT',
                    priority: 'HAUTE',
                    description: 'Données complètes matches: scores détaillés, teams metadata, fixture info',
                    action: 'EXTRAIRE_JSON → colonnes séparées',
                    collector: 'fixtures-collector.ts',
                    records: jsonFindings.find(f => f.table === 'matches')?.jsonRecords || 0
                },
                {
                    table: 'match_statistics',
                    column: 'statistics',
                    source: 'API Football',
                    status: 'DÉJÀ_EXTRAIT',
                    priority: 'HAUTE', 
                    description: 'Stats matches: possession, shots, passes, xG',
                    action: 'FAIT ✅',
                    collector: 'fixtures-collector.ts',
                    records: jsonFindings.find(f => f.table === 'match_statistics' && f.column === 'statistics')?.jsonRecords || 0
                },
                {
                    table: 'match_statistics',
                    column: 'raw_data',
                    source: 'API Football',
                    status: 'METADATA_ONLY',
                    priority: 'BASSE',
                    description: 'Metadata API: team info, API structure',
                    action: 'PAS_PRIORITAIRE',
                    collector: 'fixtures-collector.ts',
                    records: jsonFindings.find(f => f.table === 'match_statistics' && f.column === 'raw_data')?.jsonRecords || 0
                },
                {
                    table: 'match_players_stats',
                    column: 'raw_stats', 
                    source: 'API Football',
                    status: 'DÉJÀ_EXTRAIT',
                    priority: 'HAUTE',
                    description: 'Stats joueurs détaillées: rating, passes, duels, shots',
                    action: 'FAIT ✅',
                    collector: 'players-collector.ts',
                    records: jsonFindings.find(f => f.table === 'match_players_stats')?.jsonRecords || 0
                }
            ],
            
            // 🤖 ML/AI CALCULATED (À calculer par nos algorithmes)
            mlCalculated: [
                {
                    table: 'team_features',
                    column: 'ai_features',
                    source: 'NOS_ALGORITHMES',
                    status: 'À_CALCULER',
                    priority: 'MOYENNE',
                    description: 'Features IA: style tactique, profil équipe, confiance',
                    action: 'IMPLÉMENTER context-collector.ts',
                    script: 'scripts/features/calculate-team-ai-features.js',
                    records: jsonFindings.find(f => f.table === 'team_features' && f.column === 'ai_features')?.jsonRecords || 0
                },
                {
                    table: 'team_features',
                    column: 'context_analysis',
                    source: 'NOS_ALGORITHMES',
                    status: 'À_CALCULER',
                    priority: 'MOYENNE',
                    description: 'Analyse contexte: zone (relegation/title), pression, motivation',
                    action: 'IMPLÉMENTER context-collector.ts',
                    script: 'scripts/features/calculate-context-analysis.js',
                    records: jsonFindings.find(f => f.table === 'team_features' && f.column === 'context_analysis')?.jsonRecords || 0
                }
            ],
            
            // 📊 HYBRID (API + Nos calculs)
            hybridSources: [
                {
                    table: 'team_features',
                    column: 'raw_stats',
                    source: 'API_FOOTBALL + ML',
                    status: 'PARTIELLEMENT_REMPLI',
                    priority: 'MOYENNE',
                    description: 'Mix données API (form, stats) + nos calculs enrichis',
                    action: 'ANALYSER_CONTENU → décider extraction',
                    collector: 'teams-collector.ts',
                    records: jsonFindings.find(f => f.table === 'team_features' && f.column === 'raw_stats')?.jsonRecords || 0
                },
                {
                    table: 'team_features',
                    column: 'standing_data',
                    source: 'API_FOOTBALL',
                    status: 'À_EXTRAIRE',
                    priority: 'BASSE',
                    description: 'Classements détaillés: victoires home/away, form, points',
                    action: 'EXTRAIRE_SI_UTILE',
                    collector: 'leagues-collector.ts',
                    records: jsonFindings.find(f => f.table === 'team_features' && f.column === 'standing_data')?.jsonRecords || 0
                }
            ]
        }
        
        // Afficher classification complète
        console.log('\n🔥 API FOOTBALL DATA (à extraire):')
        dataClassification.apiSources.forEach(item => {
            const status = item.status === 'NON_EXTRAIT' ? '❌' : item.status === 'DÉJÀ_EXTRAIT' ? '✅' : '⚠️'
            console.log(`${status} ${item.table}.${item.column}`)
            console.log(`   Records: ${item.records}`)
            console.log(`   Statut: ${item.status}`)
            console.log(`   Action: ${item.action}`)
            console.log(`   Description: ${item.description}`)
            console.log('')
        })
        
        console.log('\n🤖 ML/AI FEATURES (nos algorithmes):')
        dataClassification.mlCalculated.forEach(item => {
            console.log(`📋 ${item.table}.${item.column}`)
            console.log(`   Records actuels: ${item.records}`)
            console.log(`   Source: ${item.source}`)
            console.log(`   Action requise: ${item.action}`)
            console.log(`   Script suggéré: ${item.script}`)
            console.log(`   Description: ${item.description}`)
            console.log('')
        })
        
        console.log('\n📊 DONNÉES HYBRIDES (API + ML):')
        dataClassification.hybridSources.forEach(item => {
            console.log(`🔄 ${item.table}.${item.column}`)
            console.log(`   Records: ${item.records}`)
            console.log(`   Type: ${item.source}`)
            console.log(`   Action: ${item.action}`)
            console.log(`   Description: ${item.description}`)
            console.log('')
        })
        
        // Recommandations d'actions
        console.log('\n🎯 ACTIONS PRIORITAIRES:')
        
        const highPriorityApi = dataClassification.apiSources.filter(item => 
            item.priority === 'HAUTE' && item.status === 'NON_EXTRAIT'
        )
        
        if (highPriorityApi.length > 0) {
            console.log('\n🔴 URGENCE - Extraction JSON API:')
            highPriorityApi.forEach(item => {
                console.log(`1. Créer: extract-${item.table}-${item.column.replace('_', '-')}.js`)
                console.log(`   → Extraire ${item.records} JSON records`)
                console.log(`   → Transformer en colonnes ML-ready`)
                console.log(`   → Impact: données match complètes pour ML`)
            })
        }
        
        const mlTasks = dataClassification.mlCalculated.filter(item => 
            item.status === 'À_CALCULER'
        )
        
        if (mlTasks.length > 0) {
            console.log('\n🤖 DÉVELOPPEMENT - Features ML:')
            mlTasks.forEach((item, index) => {
                console.log(`${index + 2}. Implémenter: ${item.script}`)
                console.log(`   → Calculer ${item.description}`)
                console.log(`   → Utiliser context-collector.ts comme base`)
                console.log(`   → Objectif: remplir ${item.table}.${item.column}`)
            })
        }
        
        // Estimation impact ML
        console.log('\n📊 IMPACT POTENTIEL ML:')
        
        const apiRecords = dataClassification.apiSources
            .filter(item => item.status === 'NON_EXTRAIT')
            .reduce((sum, item) => sum + item.records, 0)
        
        const mlSlots = dataClassification.mlCalculated
            .reduce((sum, item) => sum + 100, 0) // Estimer 100 features par type ML
        
        console.log(`JSON API à extraire: ${apiRecords} records`)
        console.log(`Features ML à calculer: ${mlSlots}+ nouvelles features`)
        console.log(`Total impact: ${apiRecords + mlSlots} nouveaux data points`)
        
        // Ordre de priorité recommandé
        console.log('\n⚡ ORDRE RECOMMANDÉ:')
        console.log('1. ✅ matches.raw_data (1760 records) - EXTRACTION JSON')
        console.log('2. 📋 team_features.ai_features - DÉVELOPPEMENT ML')
        console.log('3. 📋 team_features.context_analysis - DÉVELOPPEMENT ML')
        console.log('4. 🔄 team_features.raw_stats - ANALYSE CONTENU')
        console.log('5. 🔄 team_features.standing_data - SI TEMPS DISPONIBLE')
        
        // Sauvegarder classification
        const classification = {
            analysisDate: new Date().toISOString(),
            summary: {
                apiSourcesToExtract: dataClassification.apiSources.filter(i => i.status === 'NON_EXTRAIT').length,
                mlFeaturesToCalculate: dataClassification.mlCalculated.filter(i => i.status === 'À_CALCULER').length,
                hybridToAnalyze: dataClassification.hybridSources.length,
                totalImpactRecords: apiRecords + mlSlots
            },
            classification: dataClassification,
            recommendations: {
                immediate: highPriorityApi.map(i => i.action),
                nextPhase: mlTasks.map(i => i.script),
                optional: dataClassification.hybridSources.map(i => i.action)
            }
        }
        
        fs.writeFileSync('./data_sources_classification.json', JSON.stringify(classification, null, 2))
        console.log('\n📄 Classification sauvée: ./data_sources_classification.json')
        
    } catch (error) {
        console.error('❌ Erreur classification:', error.message)
    }
}

classifyDataSources()