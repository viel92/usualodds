#!/usr/bin/env node

/**
 * PRÉDICTIONS MATCHS À VENIR - USUAL ODDS
 * 
 * Récupère les prochains matchs Ligue 1 et génère prédictions IA complètes
 * Système de mise à jour T-24h, T-6h, T-1h comme spécifié
 */

require('dotenv').config()
const { AdvancedAIPredictionEngine } = require('./advanced-ai-prediction-engine')
const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
const API_FOOTBALL_HOST = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io'

class UpcomingMatchPredictor {
    constructor() {
        this.aiEngine = new AdvancedAIPredictionEngine()
        this.predictions = new Map()
        this.updateWindows = ['T-24h', 'T-6h', 'T-1h', 'T-30min']
    }

    /**
     * 1. RÉCUPÉRER PROCHAINS MATCHS LIGUE 1
     */
    async fetchUpcomingMatches() {
        console.log('📡 Récupération prochains matchs Ligue 1...')
        
        try {
            // Récupérer fixtures des 7 prochains jours
            const response = await axios.get(`https://${API_FOOTBALL_HOST}/fixtures`, {
                params: {
                    league: 61, // Ligue 1
                    season: 2025,
                    next: 10 // Prochains 10 matchs
                },
                headers: {
                    'X-RapidAPI-Key': API_FOOTBALL_KEY,
                    'X-RapidAPI-Host': API_FOOTBALL_HOST
                }
            })

            const fixtures = response.data.response || []
            console.log(`✅ ${fixtures.length} matchs à venir récupérés`)

            // Enrichir avec contexte de nos données
            const enrichedMatches = []
            
            for (const fixture of fixtures) {
                const enriched = await this.enrichMatchContext(fixture)
                if (enriched) enrichedMatches.push(enriched)
            }

            return enrichedMatches

        } catch (error) {
            console.error('❌ Erreur récupération matchs:', error.message)
            return []
        }
    }

    /**
     * 2. ENRICHIR CONTEXTE MATCH AVEC NOS DONNÉES
     */
    async enrichMatchContext(fixture) {
        const homeTeamId = fixture.teams.home.id
        const awayTeamId = fixture.teams.away.id
        
        // Récupérer nos team_features
        const { data: teams, error } = await supabase
            .from('team_features')
            .select('*')
            .eq('season', 2024)
            .in('team_id', [homeTeamId, awayTeamId])

        if (error || !teams || teams.length < 2) {
            console.log(`⚠️ Données manquantes pour match ${homeTeamId} vs ${awayTeamId}`)
            return null
        }

        const homeTeam = teams.find(t => t.team_id === homeTeamId)
        const awayTeam = teams.find(t => t.team_id === awayTeamId)

        if (!homeTeam || !awayTeam) {
            console.log(`⚠️ Équipe manquante pour match ${homeTeamId} vs ${awayTeamId}`)
            return null
        }

        // Enrichir avec contexte
        return {
            fixture_id: fixture.fixture.id,
            date: fixture.fixture.date,
            round: fixture.league.round,
            venue: fixture.fixture.venue.name,
            home_team: homeTeam,
            away_team: awayTeam,
            context: {
                round_number: this.extractRoundNumber(fixture.league.round),
                is_weekend: this.isWeekend(fixture.fixture.date),
                time_until_match: this.calculateTimeUntil(fixture.fixture.date),
                importance: this.calculateMatchImportance(homeTeam, awayTeam),
                derby: this.isDebyMatch(homeTeam, awayTeam),
                fixture_original: fixture
            }
        }
    }

    /**
     * 3. GÉNÉRER PRÉDICTIONS POUR TOUS LES MATCHS
     */
    async generatePredictionsForUpcomingMatches() {
        console.log('🚀 GÉNÉRATION PRÉDICTIONS MATCHS À VENIR')
        console.log('========================================')

        const upcomingMatches = await this.fetchUpcomingMatches()
        
        if (upcomingMatches.length === 0) {
            console.log('❌ Aucun match à venir trouvé')
            return
        }

        console.log(`🎯 Génération prédictions pour ${upcomingMatches.length} matchs`)

        const predictions = []

        for (const match of upcomingMatches) {
            console.log(`\n⚽ MATCH: ${match.home_team.team_id} vs ${match.away_team.team_id}`)
            console.log(`📅 Date: ${new Date(match.date).toLocaleString('fr-FR')}`)
            console.log(`🏟️ Venue: ${match.venue}`)
            console.log(`⏰ Dans: ${match.context.time_until_match}`)

            try {
                // Générer prédiction IA complète
                const prediction = await this.aiEngine.predictMatch(
                    match.home_team,
                    match.away_team, 
                    match.context
                )

                // Enrichir avec infos match
                const enrichedPrediction = {
                    match_info: {
                        fixture_id: match.fixture_id,
                        date: match.date,
                        round: match.round,
                        home_team_name: match.home_team.team_id,
                        away_team_name: match.away_team.team_id,
                        venue: match.venue
                    },
                    prediction,
                    update_window: this.getUpdateWindow(match.date),
                    generated_at: new Date().toISOString()
                }

                predictions.push(enrichedPrediction)

                // Afficher résumé prédiction
                this.displayPredictionSummary(enrichedPrediction)

                // Sauvegarder prédiction
                await this.savePrediction(enrichedPrediction)

            } catch (error) {
                console.error(`❌ Erreur prédiction ${match.fixture_id}:`, error.message)
            }
        }

        console.log(`\n✅ ${predictions.length} prédictions générées et sauvegardées`)
        console.log('🔄 Système prêt pour mise à jour fenêtres temporelles')

        return predictions
    }

    /**
     * 4. SYSTÈME DE MISE À JOUR FENÊTRES TEMPORELLES
     */
    async updatePredictionsAtTimeWindow(window) {
        console.log(`🕐 Mise à jour prédictions fenêtre ${window}`)
        
        // Récupérer prédictions à mettre à jour
        const { data: existingPredictions, error } = await supabase
            .from('ai_predictions_upcoming')
            .select('*')
            .gte('match_date', new Date().toISOString())
            .order('match_date', { ascending: true })

        if (error) {
            console.error('❌ Erreur récupération prédictions:', error.message)
            return
        }

        console.log(`📊 ${existingPredictions?.length || 0} prédictions à mettre à jour`)

        for (const predictionRecord of existingPredictions || []) {
            const timeUntil = this.calculateTimeUntil(predictionRecord.match_date)
            const currentWindow = this.getUpdateWindow(predictionRecord.match_date)

            if (currentWindow === window) {
                console.log(`🔄 Mise à jour ${predictionRecord.fixture_id} (${window})`)
                
                // Regénérer prédiction avec données fraîches
                await this.regeneratePrediction(predictionRecord)
            }
        }
    }

    /**
     * 5. AFFICHAGE ET SAUVEGARDE
     */
    displayPredictionSummary(prediction) {
        const p = prediction.prediction
        
        console.log('📊 PRÉDICTION:')
        console.log(`   1X2: ${(p.result_1x2.home_win*100).toFixed(1)}% - ${(p.result_1x2.draw*100).toFixed(1)}% - ${(p.result_1x2.away_win*100).toFixed(1)}%`)
        console.log(`   Over 2.5: ${(p.total_goals.over_2_5*100).toFixed(1)}%`)
        console.log(`   Confiance: ${p.analysis.overall_confidence}%`)
        console.log(`   Facteurs clés: ${p.analysis.key_factors.slice(0,2).join(', ')}`)
        
        if (p.analysis.matchup_analysis.upset_potential > 30) {
            console.log(`   ⚠️  Potentiel surprise élevé: ${p.analysis.matchup_analysis.upset_potential}%`)
        }
    }

    async savePrediction(prediction) {
        const { error } = await supabase
            .from('ai_predictions_upcoming')
            .upsert({
                fixture_id: prediction.match_info.fixture_id,
                match_date: prediction.match_info.date,
                home_team_id: prediction.match_info.home_team_name,
                away_team_id: prediction.match_info.away_team_name,
                prediction_data: prediction.prediction,
                update_window: prediction.update_window,
                confidence: prediction.prediction.analysis.overall_confidence,
                created_at: prediction.generated_at
            })

        if (error) {
            console.error('❌ Erreur sauvegarde:', error.message)
        }
    }

    // === UTILITAIRES ===

    calculateTimeUntil(matchDate) {
        const now = new Date()
        const match = new Date(matchDate)
        const diffMs = match - now
        const diffHours = Math.round(diffMs / (1000 * 60 * 60))
        
        if (diffHours < 1) return 'Imminent'
        if (diffHours < 24) return `${diffHours}h`
        if (diffHours < 48) return '1 jour'
        return `${Math.round(diffHours/24)} jours`
    }

    getUpdateWindow(matchDate) {
        const now = new Date()
        const match = new Date(matchDate)
        const diffHours = (match - now) / (1000 * 60 * 60)
        
        if (diffHours <= 0.5) return 'T-30min'
        if (diffHours <= 1) return 'T-1h'
        if (diffHours <= 6) return 'T-6h'
        if (diffHours <= 24) return 'T-24h'
        return 'Early'
    }

    calculateMatchImportance(homeTeam, awayTeam) {
        const avgRank = (homeTeam.current_rank + awayTeam.current_rank) / 2
        const motivationSum = (homeTeam.motivation_score || 0.5) + (awayTeam.motivation_score || 0.5)
        
        if (avgRank <= 6 && motivationSum > 1.5) return 'high'
        if (avgRank >= 15 && motivationSum > 1.5) return 'high' // Relégation battle
        if (avgRank <= 10) return 'medium'
        return 'normal'
    }

    isWeekend(date) {
        const day = new Date(date).getDay()
        return day === 0 || day === 6 // Dimanche ou Samedi
    }

    isDebyMatch(homeTeam, awayTeam) {
        // Simplification: vérifier si équipes proche géographiquement
        // Dans un vrai système, avoir une base des rivalités
        return false // À implémenter avec données géo
    }

    extractRoundNumber(round) {
        const match = round.match(/(\d+)/)
        return match ? parseInt(match[1]) : 1
    }
}

async function main() {
    const predictor = new UpcomingMatchPredictor()
    await predictor.generatePredictionsForUpcomingMatches()
}

module.exports = { UpcomingMatchPredictor }

if (require.main === module) {
    main().catch(console.error)
}