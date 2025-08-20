#!/usr/bin/env node

/**
 * PIPELINE DE PRÉDICTION ENRICHI AVEC GPT-5
 * 
 * INTÉGRATION: Combine votre MVP existant + Puissance GPT-5 
 * - Collecte données MVP (stats + classement + IA basique)
 * - Enrichissement GPT (tactique + psychologie + patterns)
 * - Fusion intelligente pour prédictions finales optimisées
 */

require('dotenv').config()
const Ligue1MVPCollector = require('./ligue1-mvp-collector.js')
const AILearningEngine = require('./ai-learning-engine.js') 
const GPTAdvancedAnalyzer = require('./gpt-advanced-analyzer.js')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

class EnhancedPredictionPipeline {
    constructor() {
        this.collector = new Ligue1MVPCollector()
        this.aiEngine = new AILearningEngine()
        this.gptAnalyzer = new GPTAdvancedAnalyzer()
        this.startTime = Date.now()
    }

    /**
     * PIPELINE COMPLET: MVP + GPT-5
     */
    async runEnhancedPrediction(homeTeamId, awayTeamId, matchDate) {
        console.log('🚀 PIPELINE PRÉDICTION ENRICHI GPT-5')
        console.log(`⚽ Match: ${homeTeamId} vs ${awayTeamId}`)
        console.log('='.repeat(60))

        try {
            // === ÉTAPE 1: DONNÉES DE BASE (MVP) ===
            console.log('📊 ÉTAPE 1/4: Collecte données MVP')
            const baseData = await this.collectBaseData(homeTeamId, awayTeamId)
            console.log('✅ Données MVP collectées')

            // === ÉTAPE 2: ANALYSE IA INTERNE ===  
            console.log('🧠 ÉTAPE 2/4: Analyse IA interne')
            const internalAI = await this.runInternalAI(baseData)
            console.log('✅ IA interne terminée')

            // === ÉTAPE 3: ANALYSE GPT-5 AVANCÉE ===
            console.log('🤖 ÉTAPE 3/4: Analyse GPT-5 avancée')
            const gptAnalysis = await this.runGPTAnalysis(baseData)
            console.log('✅ Analyse GPT-5 terminée')

            // === ÉTAPE 4: FUSION INTELLIGENTE ===
            console.log('🎯 ÉTAPE 4/4: Fusion prédictions')
            const finalPrediction = await this.fusePredictions(baseData, internalAI, gptAnalysis)
            console.log('✅ Prédiction finale générée')

            // === SAUVEGARDE & REPORTING ===
            await this.saveFinalPrediction(finalPrediction)
            this.generateReport(finalPrediction)

            return finalPrediction

        } catch (error) {
            console.error('💥 Erreur pipeline enrichi:', error.message)
            throw error
        }
    }

    /**
     * COLLECTE DONNÉES MVP 
     */
    async collectBaseData(homeTeamId, awayTeamId) {
        console.log('📈 Récupération données MVP...')
        
        const [homeTeam, awayTeam, recentMatches, standings] = await Promise.all([
            this.getTeamFeatures(homeTeamId),
            this.getTeamFeatures(awayTeamId),
            this.getRecentMatches(homeTeamId, awayTeamId),
            this.getCurrentStandings()
        ])

        // Enrichir avec contexte classement avancé
        const enrichedData = {
            home_team: this.enrichTeamWithContext(homeTeam, standings),
            away_team: this.enrichTeamWithContext(awayTeam, standings),
            recent_matches: recentMatches,
            h2h_history: await this.getH2HHistory(homeTeamId, awayTeamId),
            season_context: await this.getSeasonContext()
        }

        console.log(`📊 Données collectées: ${homeTeam.name} (${homeTeam.current_rank}ème) vs ${awayTeam.name} (${awayTeam.current_rank}ème)`)
        return enrichedData
    }

    /**
     * ANALYSE IA INTERNE (votre système existant)
     */
    async runInternalAI(baseData) {
        console.log('🔄 Exécution IA interne...')
        
        // Utiliser votre AI Learning Engine existant
        const internalInsights = await this.aiEngine.generateMatchAIFeatures(
            baseData.home_team.team_id,
            baseData.away_team.team_id,
            {
                is_derby: this.detectDerby(baseData.home_team, baseData.away_team),
                importance: this.calculateMatchImportance(baseData),
                season_stage: this.getSeasonStage()
            }
        )

        console.log('🧠 Patterns IA internes détectés:', internalInsights.key_factors?.length || 0)
        return internalInsights
    }

    /**
     * ANALYSE GPT-5 AVANCÉE
     */
    async runGPTAnalysis(baseData) {
        console.log('🤖 Lancement analyse GPT-5 avancée...')
        
        // Mock matchId pour GPT (en production, utiliser vrai matchId)
        const mockMatchId = `${baseData.home_team.team_id}_vs_${baseData.away_team.team_id}_${Date.now()}`
        
        const gptInsights = await this.gptAnalyzer.runCompleteGPTAnalysis(
            mockMatchId,
            baseData.home_team.team_id,
            baseData.away_team.team_id
        )

        console.log('🎯 Analyse GPT-5 terminée avec confiance:', Math.round((gptInsights.confidence || 0.5) * 100) + '%')
        return gptInsights
    }

    /**
     * FUSION INTELLIGENTE DES PRÉDICTIONS
     */
    async fusePredictions(baseData, internalAI, gptAnalysis) {
        console.log('🔄 Fusion intelligente des analyses...')
        
        // === PROBABILITÉS DE BASE (STATS PURES) ===
        const baseProbabilities = this.calculateBaseProbabilities(baseData)
        
        // === AJUSTEMENTS IA INTERNE ===
        let homeWin = baseProbabilities.home_win
        let draw = baseProbabilities.draw
        let awayWin = baseProbabilities.away_win

        // Ajustements motivationnels (votre IA)
        if (internalAI?.motivational_factors) {
            homeWin += internalAI.motivational_factors.home_motivation_adjustment || 0
            awayWin += internalAI.motivational_factors.away_motivation_adjustment || 0
        }

        // === AJUSTEMENTS GPT-5 AVANCÉS ===
        if (gptAnalysis?.tactical?.probability_adjustments) {
            const gptAdj = gptAnalysis.tactical.probability_adjustments
            homeWin += gptAdj.home_win_adjustment || 0
            draw += gptAdj.draw_adjustment || 0  
            awayWin += gptAdj.away_win_adjustment || 0
        }

        // Facteurs psychologiques GPT
        if (gptAnalysis?.psychological?.mental_adjustments) {
            const psychAdj = gptAnalysis.psychological.mental_adjustments
            homeWin += psychAdj.home_mental_boost || 0
            awayWin += psychAdj.away_mental_boost || 0
        }

        // === NORMALISATION ===
        const total = homeWin + draw + awayWin
        homeWin /= total
        draw /= total
        awayWin /= total

        // === CALCUL CONFIANCE GLOBALE ===
        const overallConfidence = this.calculateOverallConfidence(baseData, internalAI, gptAnalysis)

        // === PRÉDICTION FINALE ===
        const finalPrediction = {
            match_info: {
                home_team: baseData.home_team.name,
                away_team: baseData.away_team.name,
                date: new Date().toISOString()
            },
            probabilities: {
                home_win: Math.max(0.05, Math.min(0.85, homeWin)),
                draw: Math.max(0.15, Math.min(0.4, draw)),
                away_win: Math.max(0.05, Math.min(0.85, awayWin))
            },
            confidence_score: overallConfidence,
            
            // === INSIGHTS DÉTAILLÉS ===
            insights: {
                base_factors: baseProbabilities.factors,
                internal_ai_factors: internalAI?.key_factors || [],
                gpt_tactical_factors: gptAnalysis?.tactical?.key_differentiators || [],
                gpt_psychological_factors: gptAnalysis?.psychological?.key_factors || [],
                detected_patterns: gptAnalysis?.patterns?.significant_patterns || []
            },
            
            // === RECOMMANDATIONS ===
            recommendations: {
                primary_bet: this.getPrimaryBet(homeWin, draw, awayWin),
                value_opportunities: this.identifyValueOpportunities(homeWin, draw, awayWin),
                risk_level: this.calculateRiskLevel(overallConfidence, gptAnalysis),
                key_watch_points: this.generateWatchPoints(gptAnalysis)
            },

            // === MÉTADONNÉES ===
            meta: {
                model_version: 'mvp_gpt5_fusion_v1.0',
                processing_time: Date.now() - this.startTime,
                data_sources: ['mvp_stats', 'internal_ai', 'gpt5_analysis']
            }
        }

        console.log('✅ Prédiction finale fusionnée')
        console.log(`🎯 Résultat: ${finalPrediction.recommendations.primary_bet}`)
        console.log(`📊 Confiance: ${Math.round(overallConfidence * 100)}%`)

        return finalPrediction
    }

    /**
     * CALCULS PROBABILITÉS DE BASE
     */
    calculateBaseProbabilities(baseData) {
        const homeTeam = baseData.home_team
        const awayTeam = baseData.away_team
        
        // Force relative basée sur performance
        const homeStrength = (homeTeam.goals_per_game || 1) / Math.max(homeTeam.goals_conceded_per_game || 1, 0.5)
        const awayStrength = (awayTeam.goals_per_game || 1) / Math.max(awayTeam.goals_conceded_per_game || 1, 0.5)
        
        // Avantage domicile
        const homeAdvantage = homeTeam.home_advantage || 0.6
        
        // Ajustement motivation classement  
        const homeMotivation = homeTeam.motivation_score || 0.5
        const awayMotivation = awayTeam.motivation_score || 0.5
        
        // Calcul probas base
        let homeBase = (homeStrength / (homeStrength + awayStrength)) * homeAdvantage * homeMotivation
        let awayBase = (awayStrength / (homeStrength + awayStrength)) * awayMotivation
        
        // Normalisation avec draw
        const total = homeBase + awayBase + 0.25
        
        return {
            home_win: homeBase / total,
            draw: 0.25 / total,
            away_win: awayBase / total,
            factors: ['strength_ratio', 'home_advantage', 'motivation_classement']
        }
    }

    calculateOverallConfidence(baseData, internalAI, gptAnalysis) {
        let confidence = 0.5 // Base
        
        // Confiance basée sur quantité données
        const dataQuality = this.assessDataQuality(baseData)
        confidence += dataQuality * 0.3
        
        // Confiance IA interne
        confidence += (internalAI?.confidence_score || 0.5) * 0.3
        
        // Confiance GPT
        confidence += (gptAnalysis?.confidence || 0.5) * 0.4
        
        return Math.max(0.3, Math.min(0.95, confidence))
    }

    getPrimaryBet(homeWin, draw, awayWin) {
        if (homeWin > 0.5) return `Victoire ${this.baseData?.home_team?.name || 'Domicile'}`
        if (awayWin > 0.5) return `Victoire ${this.baseData?.away_team?.name || 'Extérieur'}`
        if (draw > 0.35) return 'Match Nul'
        return 'Incertitude - Éviter'
    }

    /**
     * MÉTHODES UTILITAIRES
     */
    async getTeamFeatures(teamId) {
        const { data } = await supabase
            .from('team_features')
            .select('*')
            .eq('team_id', teamId)
            .eq('season', 2024)
            .single()
        return data
    }

    async getCurrentStandings() {
        const { data } = await supabase
            .from('team_features')
            .select('team_id, current_rank, points, motivation_zone')
            .eq('season', 2024)
            .order('current_rank')
        return data || []
    }

    enrichTeamWithContext(team, standings) {
        const teamStanding = standings.find(s => s.team_id === team.team_id)
        return {
            ...team,
            league_context: teamStanding || {},
            position_analysis: this.analyzePosition(team.current_rank || 10, standings.length)
        }
    }

    detectDerby(homeTeam, awayTeam) {
        // Logique simple derby (à enrichir)
        const parisTeams = [85, 243] // PSG, autres Paris
        const marseilleteams = [81] // OM
        const lyonTeams = [80] // OL
        
        return (parisTeams.includes(homeTeam.team_id) && parisTeams.includes(awayTeam.team_id)) ||
               (marseilleteams.includes(homeTeam.team_id) && parisTeams.includes(awayTeam.team_id)) ||
               (parisTeams.includes(homeTeam.team_id) && marseilleteams.includes(awayTeam.team_id))
    }

    async saveFinalPrediction(prediction) {
        const { error } = await supabase
            .from('enhanced_predictions')
            .insert({
                match_signature: `${prediction.match_info.home_team}_vs_${prediction.match_info.away_team}`,
                probabilities: prediction.probabilities,
                confidence: prediction.confidence_score,
                insights: prediction.insights,
                recommendations: prediction.recommendations,
                model_version: prediction.meta.model_version,
                created_at: new Date().toISOString()
            })

        if (error) {
            console.error('Erreur sauvegarde prédiction:', error.message)
        }
    }

    generateReport(prediction) {
        console.log()
        console.log('='.repeat(80))
        console.log('📊 RAPPORT PRÉDICTION ENRICHIE GPT-5')
        console.log('='.repeat(80))
        console.log()
        console.log(`⚽ MATCH: ${prediction.match_info.home_team} vs ${prediction.match_info.away_team}`)
        console.log()
        console.log('🎯 PROBABILITÉS FINALES:')
        console.log(`   • Victoire Domicile: ${Math.round(prediction.probabilities.home_win * 100)}%`)
        console.log(`   • Match Nul: ${Math.round(prediction.probabilities.draw * 100)}%`) 
        console.log(`   • Victoire Extérieur: ${Math.round(prediction.probabilities.away_win * 100)}%`)
        console.log()
        console.log(`📈 CONFIANCE GLOBALE: ${Math.round(prediction.confidence_score * 100)}%`)
        console.log()
        console.log(`🎲 RECOMMANDATION: ${prediction.recommendations.primary_bet}`)
        console.log(`⚠️ NIVEAU RISQUE: ${prediction.recommendations.risk_level}`)
        console.log()
        console.log('🧠 INSIGHTS CLÉS:')
        prediction.insights.gpt_tactical_factors.forEach(factor => {
            console.log(`   • ${factor}`)
        })
        console.log()
        console.log('='.repeat(80))
    }
}

module.exports = EnhancedPredictionPipeline

// Exécution autonome
if (require.main === module) {
    const pipeline = new EnhancedPredictionPipeline()
    
    // Test avec des équipes exemple (remplacer par vrais IDs)
    const homeTeamId = 85 // PSG par exemple
    const awayTeamId = 81 // OM par exemple
    
    pipeline.runEnhancedPrediction(homeTeamId, awayTeamId, new Date())
        .then(result => {
            console.log('✅ Pipeline enrichi terminé avec succès')
        })
        .catch(console.error)
}