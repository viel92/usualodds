#!/usr/bin/env node

/**
 * PRÉDICTIONS MATCHS À VENIR - VERSION SIMPLIFIÉE
 * 
 * Génère prédictions pour prochains matchs Ligue 1 sans ChatGPT
 */

require('dotenv').config()
const { SimpleAIPredictionEngine } = require('./simple-ai-prediction-engine')
const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
const API_FOOTBALL_HOST = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io'

class SimpleUpcomingPredictor {
    constructor() {
        this.aiEngine = new SimpleAIPredictionEngine()
        this.predictions = []
    }

    /**
     * 1. RÉCUPÉRER PROCHAINS MATCHS LIGUE 1
     */
    async fetchUpcomingMatches() {
        console.log('📡 Récupération prochains matchs Ligue 1...')
        
        try {
            const response = await axios.get(`https://${API_FOOTBALL_HOST}/fixtures`, {
                params: {
                    league: 61, // Ligue 1
                    season: 2025,
                    next: 10
                },
                headers: {
                    'X-RapidAPI-Key': API_FOOTBALL_KEY,
                    'X-RapidAPI-Host': API_FOOTBALL_HOST
                }
            })

            const fixtures = response.data.response || []
            console.log(`✅ ${fixtures.length} matchs à venir récupérés`)
            
            return fixtures

        } catch (error) {
            console.error('❌ Erreur API-Football:', error.message)
            console.log('🔄 Utilisation matchs factices pour test...')
            return this.generateMockFixtures()
        }
    }

    /**
     * 2. ENRICHIR AVEC NOS DONNÉES
     */
    async enrichMatchesWithOurData(fixtures) {
        console.log('🔗 Enrichissement avec nos données...')
        
        // Récupérer toutes nos team_features
        const { data: teams, error } = await supabase
            .from('team_features')
            .select('*')
            .eq('season', 2024)
            .not('current_rank', 'is', null)

        if (error || !teams) {
            console.error('❌ Erreur récupération équipes:', error?.message)
            return []
        }

        console.log(`📊 ${teams.length} équipes dans notre base`)
        
        const enrichedMatches = []
        
        for (const fixture of fixtures) {
            const homeTeamId = fixture.teams.home.id
            const awayTeamId = fixture.teams.away.id
            
            const homeTeam = teams.find(t => t.team_id === homeTeamId)
            const awayTeam = teams.find(t => t.team_id === awayTeamId)
            
            if (homeTeam && awayTeam) {
                enrichedMatches.push({
                    fixture_id: fixture.fixture.id,
                    date: fixture.fixture.date,
                    round: fixture.league.round,
                    venue: fixture.fixture.venue?.name || 'Stade',
                    home_team: homeTeam,
                    away_team: awayTeam,
                    home_team_name: fixture.teams.home.name,
                    away_team_name: fixture.teams.away.name,
                    context: {
                        time_until_match: this.calculateTimeUntil(fixture.fixture.date),
                        importance: this.calculateMatchImportance(homeTeam, awayTeam),
                        round_info: fixture.league.round
                    }
                })
            } else {
                console.log(`⚠️ Équipes manquantes: ${homeTeamId} vs ${awayTeamId}`)
            }
        }
        
        console.log(`✅ ${enrichedMatches.length} matchs enrichis`)
        return enrichedMatches
    }

    /**
     * 3. GÉNÉRER PRÉDICTIONS
     */
    async generatePredictions() {
        console.log('🚀 GÉNÉRATION PRÉDICTIONS SIMPLIFIÉES')
        console.log('======================================')

        // Récupérer matchs à venir
        const fixtures = await this.fetchUpcomingMatches()
        const matches = await this.enrichMatchesWithOurData(fixtures)
        
        if (matches.length === 0) {
            console.log('❌ Aucun match enrichi trouvé')
            return []
        }

        console.log(`🎯 Génération prédictions pour ${matches.length} matchs`)
        
        for (const match of matches) {
            console.log(`\n⚽ MATCH: ${match.home_team_name} vs ${match.away_team_name}`)
            console.log(`📅 Date: ${new Date(match.date).toLocaleString('fr-FR')}`)
            console.log(`🏟️ Venue: ${match.venue}`)
            console.log(`⏰ Dans: ${match.context.time_until_match}`)
            console.log(`🎲 Importance: ${match.context.importance}`)

            try {
                // Générer prédiction
                const prediction = await this.aiEngine.predictMatch(
                    match.home_team,
                    match.away_team,
                    match.context
                )

                // Enrichir prédiction
                const enrichedPrediction = {
                    match_info: {
                        fixture_id: match.fixture_id,
                        date: match.date,
                        round: match.round,
                        home_team_name: match.home_team_name,
                        away_team_name: match.away_team_name,
                        venue: match.venue
                    },
                    prediction,
                    generated_at: new Date().toISOString()
                }

                this.predictions.push(enrichedPrediction)

                // Afficher résumé
                this.displayPredictionSummary(enrichedPrediction)

            } catch (error) {
                console.error(`❌ Erreur prédiction ${match.fixture_id}:`, error.message)
            }
        }

        console.log(`\n✅ ${this.predictions.length} prédictions générées`)
        
        // Sauvegarder toutes les prédictions
        await this.savePredictions()
        
        return this.predictions
    }

    /**
     * 4. AFFICHAGE RÉSUMÉ
     */
    displayPredictionSummary(pred) {
        const p = pred.prediction
        const info = pred.match_info
        
        console.log('📊 PRÉDICTION:')
        console.log(`   1X2: ${(p.result_1x2.home_win*100).toFixed(1)}% - ${(p.result_1x2.draw*100).toFixed(1)}% - ${(p.result_1x2.away_win*100).toFixed(1)}%`)
        console.log(`   Over 2.5: ${(p.total_goals.over_2_5*100).toFixed(1)}%`)
        console.log(`   Confiance: ${p.analysis.overall_confidence}%`)
        
        // Conseil de paris
        const conseil = this.generateBettingAdvice(p)
        if (conseil) {
            console.log(`   💡 Conseil: ${conseil}`)
        }
        
        if (p.analysis.matchup_analysis.upset_potential > 25) {
            console.log(`   ⚠️  Attention: Potentiel surprise ${p.analysis.matchup_analysis.upset_potential}%`)
        }
    }

    /**
     * 5. GÉNÉRATION CONSEILS PARIS
     */
    generateBettingAdvice(prediction) {
        const p1x2 = prediction.result_1x2
        const goals = prediction.total_goals
        const confidence = prediction.analysis.overall_confidence
        
        const advices = []
        
        // Marché 1X2
        if (p1x2.home_win > 0.55 && confidence > 70) {
            advices.push(`Victoire domicile (${(p1x2.home_win*100).toFixed(0)}%)`)
        } else if (p1x2.away_win > 0.50 && confidence > 70) {
            advices.push(`Victoire extérieur (${(p1x2.away_win*100).toFixed(0)}%)`)
        } else if (p1x2.draw > 0.35) {
            advices.push(`Nul possible (${(p1x2.draw*100).toFixed(0)}%)`)
        }
        
        // Marché buts
        if (goals.over_2_5 > 0.65) {
            advices.push(`Over 2.5 buts`)
        } else if (goals.over_2_5 < 0.35) {
            advices.push(`Under 2.5 buts`)
        }
        
        // Sécurité
        if (confidence < 60) {
            advices.push(`⚠️ Confiance faible - Éviter`)
        }
        
        return advices.slice(0, 2).join(', ')
    }

    /**
     * 6. SAUVEGARDE
     */
    async savePredictions() {
        console.log('💾 Sauvegarde prédictions...')
        
        // Créer fichier JSON avec toutes les prédictions
        const fs = require('fs')
        const predictionsData = {
            generated_at: new Date().toISOString(),
            total_predictions: this.predictions.length,
            predictions: this.predictions
        }
        
        const filename = `predictions_${new Date().toISOString().split('T')[0]}.json`
        const filepath = `./predictions/${filename}`
        
        // Créer dossier si nécessaire
        if (!fs.existsSync('./predictions')) {
            fs.mkdirSync('./predictions')
        }
        
        fs.writeFileSync(filepath, JSON.stringify(predictionsData, null, 2))
        console.log(`✅ Prédictions sauvegardées: ${filepath}`)
        
        // Résumé final
        this.displayFinalSummary()
    }

    /**
     * 7. RÉSUMÉ FINAL
     */
    displayFinalSummary() {
        console.log('\n🎯 RÉSUMÉ PRÉDICTIONS')
        console.log('====================')
        
        const stats = {
            total: this.predictions.length,
            homeWins: 0,
            draws: 0,
            awayWins: 0,
            over25: 0,
            highConfidence: 0
        }
        
        this.predictions.forEach(pred => {
            const p = pred.prediction.result_1x2
            const goals = pred.prediction.total_goals
            const conf = pred.prediction.analysis.overall_confidence
            
            if (p.home_win > p.draw && p.home_win > p.away_win) stats.homeWins++
            else if (p.draw > p.away_win) stats.draws++
            else stats.awayWins++
            
            if (goals.over_2_5 > 0.5) stats.over25++
            if (conf > 75) stats.highConfidence++
        })
        
        console.log(`📊 ${stats.total} prédictions générées`)
        console.log(`🏠 Victoires domicile prédites: ${stats.homeWins}`)
        console.log(`🤝 Nuls prédits: ${stats.draws}`)
        console.log(`✈️  Victoires extérieur prédites: ${stats.awayWins}`)
        console.log(`⚽ Matchs Over 2.5 prédits: ${stats.over25}`)
        console.log(`🎯 Prédictions haute confiance: ${stats.highConfidence}`)
        
        console.log('\n🚀 SYSTÈME USUAL ODDS OPÉRATIONNEL!')
        console.log('✅ Prédictions prêtes pour analyse')
    }

    // === UTILITAIRES ===

    calculateTimeUntil(matchDate) {
        const now = new Date()
        const match = new Date(matchDate)
        const diffHours = Math.round((match - now) / (1000 * 60 * 60))
        
        if (diffHours < 1) return 'Imminent'
        if (diffHours < 24) return `${diffHours}h`
        if (diffHours < 48) return '1 jour'
        return `${Math.round(diffHours/24)} jours`
    }

    calculateMatchImportance(homeTeam, awayTeam) {
        const avgRank = (homeTeam.current_rank + awayTeam.current_rank) / 2
        const motivationSum = (homeTeam.motivation_score || 0.5) + (awayTeam.motivation_score || 0.5)
        
        if (avgRank <= 6 && motivationSum > 1.5) return 'high'
        if (avgRank >= 15 && motivationSum > 1.5) return 'high'
        if (avgRank <= 10) return 'medium'
        return 'normal'
    }

    generateMockFixtures() {
        // Matchs factices pour test
        return [
            {
                fixture: { id: 999001, date: new Date(Date.now() + 86400000).toISOString(), venue: { name: 'Stade Test' } },
                teams: { home: { id: 81, name: 'PSG' }, away: { id: 80, name: 'Lyon' } },
                league: { round: 'Journée 21' }
            },
            {
                fixture: { id: 999002, date: new Date(Date.now() + 172800000).toISOString(), venue: { name: 'Stade Test 2' } },
                teams: { home: { id: 96, name: 'Marseille' }, away: { id: 1063, name: 'Strasbourg' } },
                league: { round: 'Journée 21' }
            }
        ]
    }
}

async function main() {
    const predictor = new SimpleUpcomingPredictor()
    await predictor.generatePredictions()
}

module.exports = { SimpleUpcomingPredictor }

if (require.main === module) {
    main().catch(console.error)
}