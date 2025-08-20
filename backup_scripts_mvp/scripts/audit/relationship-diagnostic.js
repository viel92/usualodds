#!/usr/bin/env node

/**
 * DIAGNOSTIC CRITIQUE RELATIONS TEAM_ID
 * 
 * Investigation urgente du problème de relation 0% entre matches et team_features
 * Objectif: Comprendre pourquoi aucune jointure ne fonctionne
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

class RelationshipDiagnostic {
    constructor() {
        this.diagnostic = {
            matchesAnalysis: {},
            teamFeaturesAnalysis: {},
            relationshipIssues: [],
            solutions: []
        }
    }

    async runDiagnostic() {
        console.log('🚨 DIAGNOSTIC CRITIQUE RELATIONS TEAM_ID')
        console.log('=========================================')
        console.log('🎯 Objectif: Résoudre 0% coverage matches ↔ team_features\n')

        // 1. Analyser structure team_id dans matches
        await this.analyzeMatchesTeamIds()
        
        // 2. Analyser structure team_id dans team_features  
        await this.analyzeTeamFeaturesIds()
        
        // 3. Test direct des jointures
        await this.testDirectJoins()
        
        // 4. Identifier patterns et solutions
        await this.identifyPatterns()
        
        // 5. Plan de correction
        this.generateCorrectionPlan()
        
        return this.diagnostic
    }

    async analyzeMatchesTeamIds() {
        console.log('📊 1. ANALYSE MATCHES.TEAM_IDS')
        console.log('==============================')
        
        // Échantillon matches avec team_ids
        const { data: matchSample } = await supabase
            .from('matches')
            .select('api_id, season, home_team_id, away_team_id, date, league_name')
            .not('home_team_id', 'is', null)
            .not('away_team_id', 'is', null)
            .order('date', { ascending: false })
            .limit(10)
            
        if (!matchSample || matchSample.length === 0) {
            console.log('  ❌ Aucun match avec team_ids')
            return
        }
        
        console.log(`  📈 Échantillon: ${matchSample.length} matchs récents`)
        console.log('  📋 Structure team_ids:')
        
        matchSample.slice(0, 3).forEach((match, index) => {
            console.log(`    ${index + 1}. Match ${match.api_id} (${match.season})`)
            console.log(`       home_team_id: ${match.home_team_id} (${typeof match.home_team_id})`)
            console.log(`       away_team_id: ${match.away_team_id} (${typeof match.away_team_id})`)
            console.log(`       league: ${match.league_name}`)
            console.log(`       date: ${match.date}`)
            console.log('')
        })
        
        // Analyser distribution team_ids
        const teamIds = new Set()
        const seasons = new Set()
        
        matchSample.forEach(match => {
            teamIds.add(match.home_team_id)
            teamIds.add(match.away_team_id)
            seasons.add(match.season)
        })
        
        this.diagnostic.matchesAnalysis = {
            sampleSize: matchSample.length,
            uniqueTeamIds: teamIds.size,
            seasons: Array.from(seasons),
            teamIdType: typeof matchSample[0].home_team_id,
            sampleTeamIds: Array.from(teamIds).slice(0, 10)
        }
        
        console.log(`  🔍 RÉSUMÉ MATCHES:`)
        console.log(`    • ${teamIds.size} team_ids uniques`)
        console.log(`    • Saisons: ${Array.from(seasons).join(', ')}`)
        console.log(`    • Type team_id: ${typeof matchSample[0].home_team_id}`)
        console.log(`    • Exemples IDs: ${Array.from(teamIds).slice(0, 8).join(', ')}`)
    }

    async analyzeTeamFeaturesIds() {
        console.log('\n🏆 2. ANALYSE TEAM_FEATURES.TEAM_IDS')
        console.log('====================================')
        
        // Échantillon team_features
        const { data: teamSample } = await supabase
            .from('team_features')
            .select('team_id, season, team_name, points, games_played')
            .not('team_id', 'is', null)
            .order('season', { ascending: false })
            .limit(15)
            
        if (!teamSample || teamSample.length === 0) {
            console.log('  ❌ Aucune team_feature avec team_ids')
            return
        }
        
        console.log(`  📈 Échantillon: ${teamSample.length} team_features`)
        console.log('  📋 Structure team_ids:')
        
        teamSample.slice(0, 3).forEach((team, index) => {
            console.log(`    ${index + 1}. ${team.team_name || 'Team'} (${team.season})`)
            console.log(`       team_id: ${team.team_id} (${typeof team.team_id})`)
            console.log(`       season: ${team.season}`)
            console.log(`       points: ${team.points}`)
            console.log(`       games: ${team.games_played}`)
            console.log('')
        })
        
        // Analyser distribution
        const teamFeatureIds = new Set()
        const teamSeasons = new Set()
        
        teamSample.forEach(team => {
            teamFeatureIds.add(team.team_id)
            teamSeasons.add(team.season)
        })
        
        this.diagnostic.teamFeaturesAnalysis = {
            sampleSize: teamSample.length,
            uniqueTeamIds: teamFeatureIds.size,
            seasons: Array.from(teamSeasons),
            teamIdType: typeof teamSample[0].team_id,
            sampleTeamIds: Array.from(teamFeatureIds).slice(0, 10)
        }
        
        console.log(`  🔍 RÉSUMÉ TEAM_FEATURES:`)
        console.log(`    • ${teamFeatureIds.size} team_ids uniques`)
        console.log(`    • Saisons: ${Array.from(teamSeasons).join(', ')}`)
        console.log(`    • Type team_id: ${typeof teamSample[0].team_id}`)
        console.log(`    • Exemples IDs: ${Array.from(teamFeatureIds).slice(0, 8).join(', ')}`)
    }

    async testDirectJoins() {
        console.log('\n🔗 3. TEST DIRECT JOINTURES')
        console.log('============================')
        
        // Test 1: Jointure directe simple
        console.log('🧪 Test 1: Jointure matches → team_features (home)')
        
        const { data: joinTest1, error: joinError1 } = await supabase
            .from('matches')
            .select(`
                api_id,
                season,
                home_team_id,
                team_features!inner(team_id, team_name, points)
            `)
            .eq('team_features.team_id', supabase.rpc('matches.home_team_id'))
            .eq('team_features.season', supabase.rpc('matches.season'))
            .limit(5)
            
        if (joinError1) {
            console.log(`  ❌ Erreur jointure: ${joinError1.message}`)
        } else {
            console.log(`  📊 Résultats jointure: ${joinTest1?.length || 0} matchs`)
        }
        
        // Test 2: Recherche d'intersection manuelle
        console.log('\n🧪 Test 2: Recherche intersection manuelle')
        
        // Get sample from matches
        const { data: matchSample } = await supabase
            .from('matches')
            .select('home_team_id, away_team_id, season')
            .eq('season', 2024)
            .limit(5)
            
        if (matchSample && matchSample.length > 0) {
            const testTeamId = matchSample[0].home_team_id
            const testSeason = matchSample[0].season
            
            console.log(`  🔍 Test avec team_id=${testTeamId}, season=${testSeason}`)
            
            // Rechercher dans team_features
            const { data: teamMatch, count } = await supabase
                .from('team_features')
                .select('*', { count: 'exact' })
                .eq('team_id', testTeamId)
                .eq('season', testSeason)
                
            console.log(`  📊 Correspondances trouvées: ${count || 0}`)
            
            if (teamMatch && teamMatch.length > 0) {
                console.log(`  ✅ MATCH TROUVÉ: ${teamMatch[0].team_name}`)
            } else {
                console.log(`  ❌ AUCUN MATCH - Diagnostic requis`)
                
                // Chercher team_id dans toute la table
                const { count: teamIdExists } = await supabase
                    .from('team_features')
                    .select('*', { count: 'exact', head: true })
                    .eq('team_id', testTeamId)
                    
                console.log(`    • team_id ${testTeamId} présent dans team_features: ${teamIdExists > 0 ? 'OUI' : 'NON'}`)
                
                // Chercher saison
                const { count: seasonExists } = await supabase
                    .from('team_features')
                    .select('*', { count: 'exact', head: true })
                    .eq('season', testSeason)
                    
                console.log(`    • season ${testSeason} présente dans team_features: ${seasonExists > 0 ? 'OUI' : 'NON'}`)
            }
        }
        
        // Test 3: Vérification types et formats
        console.log('\n🧪 Test 3: Vérification formats team_id')
        
        const matchesIds = this.diagnostic.matchesAnalysis.sampleTeamIds || []
        const featuresIds = this.diagnostic.teamFeaturesAnalysis.sampleTeamIds || []
        
        console.log('  📋 Comparaison formats:')
        console.log(`    Matches IDs (5 premiers): ${matchesIds.slice(0, 5).join(', ')}`)
        console.log(`    Features IDs (5 premiers): ${featuresIds.slice(0, 5).join(', ')}`)
        
        // Chercher intersections
        const intersection = matchesIds.filter(id => featuresIds.includes(id))
        console.log(`  🔍 Intersections: ${intersection.length} IDs communs`)
        
        if (intersection.length > 0) {
            console.log(`    Exemples: ${intersection.slice(0, 3).join(', ')}`)
        }
    }

    async identifyPatterns() {
        console.log('\n🕵️ 4. IDENTIFICATION PATTERNS & CAUSES')
        console.log('======================================')
        
        const issues = []
        
        // Comparer types
        const matchesType = this.diagnostic.matchesAnalysis.teamIdType
        const featuresType = this.diagnostic.teamFeaturesAnalysis.teamIdType
        
        if (matchesType !== featuresType) {
            issues.push({
                type: 'TYPE_MISMATCH',
                severity: 'HIGH',
                description: `Types différents: matches (${matchesType}) vs team_features (${featuresType})`,
                solution: 'Convertir types en même format (probablement integer)'
            })
        }
        
        // Comparer saisons disponibles
        const matchSeasons = this.diagnostic.matchesAnalysis.seasons || []
        const featureSeasons = this.diagnostic.teamFeaturesAnalysis.seasons || []
        
        const seasonIntersection = matchSeasons.filter(s => featureSeasons.includes(s))
        
        if (seasonIntersection.length === 0) {
            issues.push({
                type: 'SEASON_MISMATCH',
                severity: 'HIGH', 
                description: `Aucune saison commune: matches [${matchSeasons.join(', ')}] vs features [${featureSeasons.join(', ')}]`,
                solution: 'Recalculer team_features pour saisons dans matches'
            })
        }
        
        // Comparer team_ids
        const matchIds = this.diagnostic.matchesAnalysis.sampleTeamIds || []
        const featureIds = this.diagnostic.teamFeaturesAnalysis.sampleTeamIds || []
        const idIntersection = matchIds.filter(id => featureIds.includes(id))
        
        if (idIntersection.length === 0) {
            issues.push({
                type: 'TEAM_ID_MISMATCH',
                severity: 'CRITICAL',
                description: 'Aucun team_id commun entre tables',
                solution: 'Reconstruire complètement mapping team_id ou utiliser team names'
            })
        }
        
        this.diagnostic.relationshipIssues = issues
        
        console.log('  🚨 PROBLÈMES IDENTIFIÉS:')
        issues.forEach((issue, index) => {
            console.log(`    ${index + 1}. [${issue.severity}] ${issue.type}`)
            console.log(`       ${issue.description}`)
            console.log(`       Solution: ${issue.solution}`)
            console.log('')
        })
        
        if (issues.length === 0) {
            console.log('  ✅ Aucun problème structurel évident détecté')
            console.log('  🔍 Problème potentiel: données manquantes ou logique business')
        }
    }

    generateCorrectionPlan() {
        console.log('\n🔧 5. PLAN CORRECTION URGENTE')
        console.log('=============================')
        
        const solutions = []
        
        // Solutions basées sur les problèmes identifiés
        this.diagnostic.relationshipIssues.forEach(issue => {
            if (issue.type === 'TYPE_MISMATCH') {
                solutions.push({
                    priority: 1,
                    action: 'Normaliser types team_id',
                    steps: [
                        'ALTER TABLE team_features ALTER COLUMN team_id TYPE INTEGER',
                        'Vérifier cohérence post-conversion',
                        'Retest jointures'
                    ],
                    duration: '30 minutes'
                })
            }
            
            if (issue.type === 'SEASON_MISMATCH') {
                solutions.push({
                    priority: 2,
                    action: 'Recalculer team_features pour saisons manquantes',
                    steps: [
                        'Identifier saisons présentes dans matches',
                        'Calculer team_features depuis matches pour saisons manquantes',
                        'Valider données calculées'
                    ],
                    duration: '2-3 heures'
                })
            }
            
            if (issue.type === 'TEAM_ID_MISMATCH') {
                solutions.push({
                    priority: 1,
                    action: 'Reconstruction mapping team_id',
                    steps: [
                        'Identifier correspondance team names → team_id',
                        'Créer table mapping si nécessaire', 
                        'Mettre à jour team_features avec bons IDs',
                        'Valider 100% correspondance'
                    ],
                    duration: '4-6 heures'
                })
            }
        })
        
        // Solution de fallback
        if (solutions.length === 0 || this.diagnostic.relationshipIssues.some(i => i.severity === 'CRITICAL')) {
            solutions.push({
                priority: 0,
                action: 'SOLUTION FALLBACK: Reconstruction complète team_features',
                steps: [
                    'Calculer team_features directement depuis matches',
                    'Garantir team_id et season mapping 100%',
                    'Recalculer toutes les features de base',
                    'Valider relations avant ML development'
                ],
                duration: '1 jour complet',
                note: 'Solution robuste garantissant compatibilité'
            })
        }
        
        this.diagnostic.solutions = solutions
        
        console.log('  🚀 ACTIONS PRIORITAIRES:')
        solutions
            .sort((a, b) => a.priority - b.priority)
            .forEach((solution, index) => {
                console.log(`\n    ${index + 1}. ${solution.action}`)
                console.log(`       Durée: ${solution.duration}`)
                if (solution.note) {
                    console.log(`       Note: ${solution.note}`)
                }
                console.log(`       Étapes:`)
                solution.steps.forEach(step => {
                    console.log(`         • ${step}`)
                })
            })
        
        console.log('\n💡 RECOMMANDATION IMMÉDIATE:')
        console.log('============================')
        if (this.diagnostic.relationshipIssues.length === 0) {
            console.log('🔍 Approfondir diagnostic avec données complètes')
        } else {
            console.log('🔥 CRITIQUE: Bloquer développement ML jusqu\'à résolution')
            console.log('⚡ COMMENCER PAR: Action priorité 0 ou 1')
            console.log('🎯 OBJECTIF: 100% matches ↔ team_features coverage')
        }
    }
}

// Fonction principale
async function runRelationshipDiagnostic() {
    try {
        const diagnostic = new RelationshipDiagnostic()
        const results = await diagnostic.runDiagnostic()
        
        console.log('\n🏁 DIAGNOSTIC TERMINÉ')
        console.log('=====================')
        console.log(`🚨 Problèmes identifiés: ${results.relationshipIssues.length}`)
        console.log(`🔧 Solutions proposées: ${results.solutions.length}`)
        console.log('⚡ Action requise AVANT tout développement ML')
        
        return results
        
    } catch (error) {
        console.error('❌ Erreur diagnostic:', error)
        throw error
    }
}

// Exécution si appelé directement
if (require.main === module) {
    runRelationshipDiagnostic()
}

module.exports = { RelationshipDiagnostic, runRelationshipDiagnostic }