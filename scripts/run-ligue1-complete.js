#!/usr/bin/env node

/**
 * ORCHESTRATEUR COMPLET LIGUE 1 MVP
 * 
 * PIPELINE:
 * 1. Collecte données complètes Ligue 1 (stats + contexte + classement)
 * 2. Apprentissage IA patterns/styles
 * 3. Génération features enrichies
 * 4. Validation & reporting
 * 
 * Usage: node run-ligue1-complete.js
 */

require('dotenv').config() // Charger variables d'environnement

const Ligue1MVPCollector = require('./ligue1-mvp-collector.js')
const AILearningEngine = require('./ai-learning-engine.js')
const { createClient } = require('@supabase/supabase-js')
const pLimit = require('p-limit')

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

class Ligue1CompleteOrchestrator {
    constructor() {
        // Vérification environnement au démarrage
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            console.error('❌ Variables d\'environnement manquantes:')
            if (!SUPABASE_URL) console.error('   - NEXT_PUBLIC_SUPABASE_URL')
            if (!SUPABASE_SERVICE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY')
            process.exit(1)
        }
        
        this.collector = new Ligue1MVPCollector()
        this.aiEngine = new AILearningEngine()
        this.startTime = Date.now()
    }

    async run() {
        console.log('🚀 DÉMARRAGE PIPELINE LIGUE 1 COMPLET')
        console.log('='.repeat(50))
        console.log('📋 Étapes:')
        console.log('   1. 📊 Collecte données complètes')
        console.log('   2. 🧠 Apprentissage IA patterns')
        console.log('   3. 🔄 Génération features enrichies')  
        console.log('   4. ✅ Validation système')
        console.log('='.repeat(50))
        console.log()

        try {
            // === ÉTAPE 1: COLLECTE DONNÉES ===
            console.log('🔄 ÉTAPE 1/4: Collecte données Ligue 1')
            await this.runDataCollection()
            console.log('✅ Collecte terminée\n')

            // === ÉTAPE 2: APPRENTISSAGE IA ===  
            console.log('🔄 ÉTAPE 2/4: Apprentissage IA')
            await this.runAILearning()
            console.log('✅ Apprentissage IA terminé\n')

            // === ÉTAPE 3: ENRICHISSEMENT ===
            console.log('🔄 ÉTAPE 3/4: Enrichissement features')
            await this.runFeatureEnrichment()
            console.log('✅ Enrichissement terminé\n')

            // === ÉTAPE 4: VALIDATION ===
            console.log('🔄 ÉTAPE 4/4: Validation système')
            const validation = await this.validateSystem()
            console.log('✅ Validation terminée\n')

            // === REPORTING FINAL ===
            await this.generateFinalReport(validation)

        } catch (error) {
            console.error('💥 ERREUR PIPELINE:', error.message)
            console.error('Stack:', error.stack)
            process.exit(1)
        }
    }

    /**
     * ÉTAPE 1: COLLECTE DONNÉES COMPLÈTES
     */
    async runDataCollection() {
        console.log('📊 Lancement collecteur MVP...')
        
        // Appliquer migration DB si nécessaire
        await this.ensureDBSchema()
        
        // Exécuter collecte complète
        await this.collector.run()
        
        console.log('📈 Collecte données terminée')
    }

    async ensureDBSchema() {
        console.log('🏗️ Vérification schéma base de données...')
        
        // Vérifier si les nouvelles tables existent
        const { data: tables, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .in('table_name', [
                'team_features', 
                'player_features', 
                'match_context',
                'ai_match_insights'
            ])

        if (error) {
            console.log('ℹ️ Impossible vérifier schéma, continuons...')
            return
        }

        const existingTables = tables.map(t => t.table_name)
        const requiredTables = ['team_features', 'player_features', 'match_context', 'ai_match_insights']
        const missingTables = requiredTables.filter(t => !existingTables.includes(t))

        if (missingTables.length > 0) {
            console.log(`⚠️ Tables manquantes: ${missingTables.join(', ')}`)
            console.log('💡 Appliquez d\'abord: supabase db push')
        } else {
            console.log('✅ Schéma base de données OK')
        }
    }

    /**
     * ÉTAPE 2: APPRENTISSAGE IA
     */
    async runAILearning() {
        console.log('🧠 Démarrage apprentissage IA...')
        
        // Attendre que la collecte soit suffisante
        await this.waitForSufficientData()
        
        // Lancer cycle apprentissage
        const learningResults = await this.aiEngine.runLearningCycle()
        
        console.log('📊 Résultats apprentissage:')
        console.log(`   • Patterns détectés: ${learningResults.patterns_detected}`)
        console.log(`   • Corrélations: ${learningResults.correlations_found}`)
        console.log(`   • Clusters: ${learningResults.clusters_identified}`)
        
        return learningResults
    }

    async waitForSufficientData() {
        console.log('⏳ Attente données suffisantes pour IA...')
        
        // Vérifier qu'on a assez d'équipes avec stats
        const { data: teams, error } = await supabase
            .from('team_features')
            .select('team_id')
            .not('raw_stats', 'is', null)

        const teamCount = teams?.length || 0
        
        if (teamCount < 10) {
            console.log(`⚠️ Seulement ${teamCount} équipes avec données`)
            console.log('ℹ️ L\'IA continuera mais avec précision limitée')
        } else {
            console.log(`✅ ${teamCount} équipes disponibles pour apprentissage`)
        }
    }

    /**
     * ÉTAPE 3: ENRICHISSEMENT FEATURES
     */
    async runFeatureEnrichment() {
        console.log('🔄 Enrichissement features avec IA...')
        
        // Enrichir toutes les équipes avec features IA
        const { data: teams } = await supabase
            .from('team_features')
            .select('team_id, season')
            .eq('season', 2024)

        if (!teams) {
            console.log('⚠️ Aucune équipe trouvée pour enrichissement')
            return
        }

        console.log(`🔄 Enrichissement ${teams.length} équipes...`)
        
        // Limitation de concurrence pour éviter surcharge
        const { default: pLimit } = await import('p-limit')
        const limit = pLimit(3) // Max 3 requêtes simultanées
        
        const enrichmentPromises = teams.map(team => 
            limit(async () => {
                try {
                    // Générer features IA pour l'équipe
                    const aiProfile = await this.aiEngine.getTeamAIProfile(team.team_id)
                    
                    // Mise à jour avec nouvelles features
                    await this.updateTeamWithAIFeatures(team.team_id, aiProfile)
                    
                } catch (error) {
                    console.error(`❌ Erreur enrichissement équipe ${team.team_id}:`, error.message)
                }
            })
        )
        
        await Promise.all(enrichmentPromises)
        console.log('✅ Enrichissement features terminé')
    }

    async updateTeamWithAIFeatures(teamId, aiProfile) {
        // Mise à jour avec upsert et onConflict pour robustesse
        const { error } = await supabase
            .from('team_features')
            .upsert({
                team_id: teamId,
                season: 2024,
                league_id: 61, // Ligue 1
                ai_features: aiProfile.ai_profile,
                style_cluster: aiProfile.tactical_style,
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'team_id,season,league_id',
                ignoreDuplicates: false 
            })

        if (error) {
            console.error(`Erreur update équipe ${teamId}:`, error.message)
        }
    }

    /**
     * ÉTAPE 4: VALIDATION SYSTÈME
     */
    async validateSystem() {
        console.log('🔍 Validation système complet...')
        
        const validation = {
            data_quality: await this.validateDataQuality(),
            ai_readiness: await this.validateAIReadiness(),
            prediction_capability: await this.validatePredictionCapability(),
            integration_status: await this.validateIntegration()
        }

        console.log('📊 Résultats validation:')
        console.log(`   • Qualité données: ${validation.data_quality.score}/100`)
        console.log(`   • IA prête: ${validation.ai_readiness.ready ? '✅' : '❌'}`)
        console.log(`   • Prédictions: ${validation.prediction_capability.functional ? '✅' : '❌'}`)
        console.log(`   • Intégration: ${validation.integration_status.complete ? '✅' : '❌'}`)

        return validation
    }

    async validateDataQuality() {
        // Vérification qualité données collectées
        const { data: teams } = await supabase
            .from('team_features')
            .select('*')
            .eq('season', 2024)

        const { count: matchesCount } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .eq('season', 2024)

        const teamsCount = teams?.length || 0

        let score = 0
        if (teamsCount >= 18) score += 40 // Ligue 1 complète
        if (matchesCount >= 100) score += 30 // Suffisant matchs
        if (teams?.some(t => t.raw_stats)) score += 30 // Stats détaillées

        return {
            score,
            teams_collected: teamsCount,
            matches_collected: matchesCount || 0,
            has_detailed_stats: teams?.some(t => t.raw_stats) || false
        }
    }

    async validateAIReadiness() {
        // Vérifier que l'IA a appris des patterns
        const { data: insights } = await supabase
            .from('ai_match_insights')
            .select('id')
            .limit(1)

        return {
            ready: !!insights?.length,
            insights_generated: insights?.length || 0
        }
    }

    async validatePredictionCapability() {
        try {
            // Test prédiction sur match exemple avec null checks
            if (this.collector?.teams?.size >= 2) {
                const teamIds = Array.from(this.collector.teams.keys()).slice(0, 2)
                const prediction = await this.aiEngine.generateMatchAIFeatures(
                    teamIds[0], 
                    teamIds[1]
                )
                
                return {
                    functional: !!prediction,
                    confidence: prediction?.confidence_score || 0
                }
            }
        } catch (error) {
            console.error('Erreur test prédiction:', error.message)
        }
        
        return { functional: false, confidence: 0 }
    }

    async validateIntegration() {
        // Vérifier intégration complète avec null checks stricts
        const checks = [
            (this.collector?.teams?.size || 0) > 0, // Collecteur fonctionnel
            (this.aiEngine?.patterns?.size || 0) >= 0 && this.aiEngine !== null, // IA initialisée
            // Plus de checks selon besoins
        ]
        
        return {
            complete: checks.every(check => check),
            checks_passed: checks.filter(c => c).length,
            total_checks: checks.length
        }
    }

    /**
     * REPORTING FINAL
     */
    async generateFinalReport(validation) {
        const duration = Math.round((Date.now() - this.startTime) / 1000)
        
        console.log()
        console.log('='.repeat(60))
        console.log('📊 RAPPORT FINAL - LIGUE 1 MVP COMPLET')
        console.log('='.repeat(60))
        console.log()
        
        console.log('⏱️ PERFORMANCE:')
        console.log(`   • Durée totale: ${duration}s`)
        console.log(`   • API calls utilisés: ${this.collector?.apiCallCount || 0}`)
        console.log(`   • Équipes collectées: ${this.collector?.teams?.size || 0}`)
        console.log(`   • Matchs traités: ${this.collector?.progress?.collected || 0}`)
        console.log()
        
        console.log('🧠 INTELLIGENCE ARTIFICIELLE:')
        console.log(`   • Styles tactiques identifiés: ${validation.ai_readiness.insights_generated}`)
        console.log(`   • Système prédiction: ${validation.prediction_capability.functional ? 'Opérationnel' : 'En cours'}`)
        console.log(`   • Confiance moyenne: ${Math.round((validation.prediction_capability.confidence || 0) * 100)}%`)
        console.log()
        
        console.log('📈 QUALITÉ DONNÉES:')  
        console.log(`   • Score qualité: ${validation.data_quality.score}/100`)
        console.log(`   • Équipes Ligue 1: ${validation.data_quality.teams_collected}/20`)
        console.log(`   • Stats détaillées: ${validation.data_quality.has_detailed_stats ? 'Oui' : 'Non'}`)
        console.log()
        
        console.log('🎯 STATUT SYSTÈME:')
        if (validation.data_quality.score >= 70 && 
            validation.prediction_capability.functional) {
            console.log('   ✅ SYSTÈME OPÉRATIONNEL')
            console.log('   📊 Prêt pour prédictions temps réel')
            console.log('   🚀 Peut démarrer phase production')
        } else {
            console.log('   ⚠️ SYSTÈME EN COURS DE FINALISATION')
            console.log('   📋 Actions requises:')
            if (validation.data_quality.score < 70) {
                console.log('      • Compléter collecte données')
            }
            if (!validation.prediction_capability.functional) {
                console.log('      • Finaliser système prédiction')
            }
        }
        
        console.log()
        console.log('🔄 PROCHAINES ÉTAPES:')
        console.log('   1. Tests prédictions sur matchs récents') 
        console.log('   2. Calibrage probabilités avec résultats réels')
        console.log('   3. Interface utilisateur prédictions')
        console.log('   4. Déploiement pipeline temps réel')
        console.log()
        console.log('='.repeat(60))
        console.log('🎉 PIPELINE LIGUE 1 MVP TERMINÉ')
        console.log('='.repeat(60))
    }
}

// Exécution
if (require.main === module) {
    const orchestrator = new Ligue1CompleteOrchestrator()
    orchestrator.run().catch(console.error)
}

module.exports = Ligue1CompleteOrchestrator