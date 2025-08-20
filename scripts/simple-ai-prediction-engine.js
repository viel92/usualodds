#!/usr/bin/env node

/**
 * MOTEUR IA SIMPLIFIÉ - USUAL ODDS
 * 
 * Version allégée sans ChatGPT pour éviter rate limits
 * Focus sur prédictions basées sur données réelles
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

class SimpleAIPredictionEngine {
    constructor() {
        this.predictions = new Map()
        this.confidence = new Map()
    }

    /**
     * 1. ANALYSE TACTIQUE SIMPLIFIÉE (sans ChatGPT)
     */
    analyzeTacticalStyleLocal(team) {
        console.log(`📊 Analyse locale: ${team.team_id}`)
        
        // Analyse basée sur stats réelles
        const goalsAvg = team.goals_per_game || 0
        const goalsAgainst = team.goals_conceded_per_game || 0
        const possession = team.possession_avg || 50
        const rank = team.current_rank || 10
        
        // Déterminer style tactique
        let style_tactique = 'equilibre'
        if (possession > 55 && goalsAvg > 1.5) style_tactique = 'possession'
        else if (possession < 45 && goalsAgainst < 1.2) style_tactique = 'defensif'
        else if (goalsAvg > 1.8) style_tactique = 'offensif'
        
        // Déterminer forces/faiblesses
        const forces = []
        const faiblesses = []
        
        if (goalsAvg > 1.5) forces.push('Attaque efficace')
        if (goalsAgainst < 1.2) forces.push('Défense solide')
        if (team.motivation_score > 0.7) forces.push('Motivation élevée')
        if (rank <= 6) forces.push('Qualité équipe')
        
        if (goalsAvg < 1.0) faiblesses.push('Attaque en difficulté')
        if (goalsAgainst > 1.8) faiblesses.push('Défense perméable')
        if (team.pressure_score > 0.8) faiblesses.push('Pression importante')
        if (rank >= 15) faiblesses.push('Position difficile')
        
        // Forme actuelle
        let forme = 'moyenne'
        const formeFactor = (team.form_5_points || 5) / 15 // Points sur 5 derniers matchs / 15 max
        if (formeFactor > 0.6) forme = 'bonne'
        if (formeFactor > 0.8) forme = 'excellente'
        if (formeFactor < 0.3) forme = 'mauvaise'
        if (formeFactor < 0.1) forme = 'critique'
        
        return {
            style_tactique,
            forces: forces.slice(0, 3),
            faiblesses: faiblesses.slice(0, 3),
            patterns: {
                domicile: team.home_advantage > 0.6 ? 'Fort à domicile' : 'Standard',
                exterieur: team.away_performance > 0.6 ? 'Bon en déplacement' : 'Variable',
                gros_matchs: team.big_game_mentality > 0.6 ? 'Présent sur gros matchs' : 'À confirmer'
            },
            predictibilite: Math.max(30, Math.min(90, 60 + (rank * 2))), // Plus prévisible si rang élevé
            forme_actuelle: forme,
            confiance_analyse: 75 // Confiance locale élevée car basée sur vraies données
        }
    }

    /**
     * 2. PRÉDICTION MATCH SIMPLIFIÉE
     */
    async predictMatch(homeTeam, awayTeam, matchContext = {}) {
        console.log(`🔮 Prédiction: ${homeTeam.team_id} vs ${awayTeam.team_id}`)
        
        // 1. Analyses tactiques locales
        const homeAnalysis = this.analyzeTacticalStyleLocal(homeTeam)
        const awayAnalysis = this.analyzeTacticalStyleLocal(awayTeam)
        
        // 2. Analyse du match-up
        const matchupAnalysis = this.analyzeMatchupLocal(homeTeam, awayTeam, homeAnalysis, awayAnalysis)
        
        // 3. Calculs probabilistes améliorés
        const probabilities = this.calculateMatchProbabilities(
            homeTeam, awayTeam, homeAnalysis, awayAnalysis, matchupAnalysis
        )
        
        // 4. Prédictions multi-marchés
        const predictions = {
            result_1x2: {
                home_win: probabilities.home_win,
                draw: probabilities.draw,
                away_win: probabilities.away_win,
                confidence: probabilities.confidence_1x2
            },
            
            total_goals: {
                over_2_5: probabilities.over_2_5,
                under_2_5: 1 - probabilities.over_2_5,
                over_1_5: probabilities.over_1_5,
                over_3_5: probabilities.over_3_5,
                confidence: probabilities.confidence_goals
            },
            
            probable_scorers: {
                home: this.predictTopScorers(homeTeam, homeAnalysis),
                away: this.predictTopScorers(awayTeam, awayAnalysis)
            },
            
            goal_timing: {
                first_half_goal: probabilities.first_half_goal,
                early_goal_0_15: probabilities.early_goal,
                late_goal_75_90: probabilities.late_goal
            },
            
            analysis: {
                home_analysis: homeAnalysis,
                away_analysis: awayAnalysis,
                matchup_analysis: matchupAnalysis,
                key_factors: probabilities.key_factors,
                overall_confidence: probabilities.overall_confidence
            }
        }
        
        // 5. Sauvegarder prédiction
        await this.savePredictionSimple(homeTeam.team_id, awayTeam.team_id, predictions)
        
        return predictions
    }

    /**
     * 3. ANALYSE MATCH-UP LOCALE
     */
    analyzeMatchupLocal(homeTeam, awayTeam, homeAnalysis, awayAnalysis) {
        // Comparaison force offensive vs défensive
        const homeAttack = homeTeam.goals_per_game || 1
        const homeDefense = homeTeam.goals_conceded_per_game || 1.5
        const awayAttack = awayTeam.goals_per_game || 1
        const awayDefense = awayTeam.goals_conceded_per_game || 1.5
        
        // Déterminer avantage tactique
        let avantage_tactique = 'equilibre'
        const homeAdvantageScore = (homeAttack / awayDefense) + (homeTeam.home_advantage || 0.5)
        const awayAdvantageScore = (awayAttack / homeDefense) + 0.1 // Petit bonus visiteur motivation
        
        if (homeAdvantageScore > awayAdvantageScore + 0.3) avantage_tactique = 'domicile'
        else if (awayAdvantageScore > homeAdvantageScore + 0.3) avantage_tactique = 'exterieur'
        
        // Facteurs clés
        const facteurs_cles = []
        if (Math.abs(homeTeam.current_rank - awayTeam.current_rank) > 5) {
            facteurs_cles.push('Écart de niveau significatif')
        }
        if (homeTeam.motivation_score > 0.8 || awayTeam.motivation_score > 0.8) {
            facteurs_cles.push('Enjeu important')
        }
        if (homeAnalysis.forme_actuelle !== awayAnalysis.forme_actuelle) {
            facteurs_cles.push('Différence de forme')
        }
        
        // Potentiel surprise
        let upset_potential = 15 // Base
        if (homeTeam.current_rank > awayTeam.current_rank + 8) upset_potential += 20
        if (awayAnalysis.forme_actuelle === 'excellente' && homeAnalysis.forme_actuelle === 'mauvaise') {
            upset_potential += 25
        }
        
        return {
            avantage_tactique,
            avantage_explication: this.explainAdvantage(avantage_tactique, homeTeam, awayTeam),
            zones_conflit: ['milieu terrain', 'couloirs', 'surface de réparation'],
            scenarios: this.generateScenarios(homeTeam, awayTeam, avantage_tactique),
            facteurs_cles: facteurs_cles.slice(0, 3),
            upset_potential: Math.min(50, upset_potential),
            confiance_matchup: 80
        }
    }

    /**
     * 4. CALCULS PROBABILISTES AMÉLIORÉS
     */
    calculateMatchProbabilities(homeTeam, awayTeam, homeAnalysis, awayAnalysis, matchupAnalysis) {
        // Force des équipes basée sur vraies données
        const homeStrength = this.calculateTeamStrength(homeTeam, homeAnalysis, true)
        const awayStrength = this.calculateTeamStrength(awayTeam, awayAnalysis, false)
        
        // Buts attendus avec bornes réalistes
        const homeGoalsExpected = Math.min(3.0, Math.max(0.3, homeStrength))
        const awayGoalsExpected = Math.min(3.0, Math.max(0.3, awayStrength))
        
        console.log(`🎯 Buts attendus: Dom ${homeGoalsExpected.toFixed(2)} - Ext ${awayGoalsExpected.toFixed(2)}`)
        
        // Simulation Poisson
        const probabilities = this.simulateMatchOutcomes(homeGoalsExpected, awayGoalsExpected)
        
        // Ajustements tactiques conservateurs
        if (matchupAnalysis.avantage_tactique === 'domicile') {
            probabilities.home_win *= 1.05
            probabilities.away_win *= 0.95
        } else if (matchupAnalysis.avantage_tactique === 'exterieur') {
            probabilities.home_win *= 0.95
            probabilities.away_win *= 1.05
        }
        
        // Normalisation avec bornes réalistes
        const total = probabilities.home_win + probabilities.draw + probabilities.away_win
        probabilities.home_win = Math.max(0.15, Math.min(0.70, probabilities.home_win / total))
        probabilities.draw = Math.max(0.15, Math.min(0.50, probabilities.draw / total))
        probabilities.away_win = Math.max(0.15, Math.min(0.70, probabilities.away_win / total))
        
        // Re-normalisation finale
        const newTotal = probabilities.home_win + probabilities.draw + probabilities.away_win
        probabilities.home_win /= newTotal
        probabilities.draw /= newTotal
        probabilities.away_win /= newTotal
        
        // Marchés Over/Under
        probabilities.over_2_5 = this.calculateOverUnder(homeGoalsExpected, awayGoalsExpected, 2.5)
        probabilities.over_1_5 = this.calculateOverUnder(homeGoalsExpected, awayGoalsExpected, 1.5)
        probabilities.over_3_5 = this.calculateOverUnder(homeGoalsExpected, awayGoalsExpected, 3.5)
        
        // Timing
        probabilities.first_half_goal = 0.70
        probabilities.early_goal = 0.18
        probabilities.late_goal = 0.28
        
        // Confiance et facteurs
        probabilities.key_factors = matchupAnalysis.facteurs_cles
        probabilities.overall_confidence = Math.min(
            homeAnalysis.confiance_analyse,
            awayAnalysis.confiance_analyse,
            matchupAnalysis.confiance_matchup
        )
        
        probabilities.confidence_1x2 = probabilities.overall_confidence
        probabilities.confidence_goals = probabilities.overall_confidence * 0.9
        
        return probabilities
    }

    // === MÉTHODES UTILITAIRES ===
    
    calculateTeamStrength(team, analysis, isHome) {
        // Force basée sur données réelles
        const goalsStrength = (team.goals_per_game || 1) / 1.5 // Normaliser autour de 1
        const defensiveStrength = Math.max(0.3, 2 - (team.goals_conceded_per_game || 1.5))
        const rankStrength = Math.max(0.5, (19 - (team.current_rank || 10)) / 18)
        const formStrength = (team.form_5_points || 5) / 15
        
        // Multiplicateurs forme
        const formMultiplier = analysis.forme_actuelle === 'excellente' ? 1.2 :
                              analysis.forme_actuelle === 'bonne' ? 1.1 :
                              analysis.forme_actuelle === 'moyenne' ? 1.0 :
                              analysis.forme_actuelle === 'mauvaise' ? 0.9 : 0.8
        
        // Avantage domicile
        const homeBonus = isHome ? (team.home_advantage || 0.1) + 0.1 : 0
        
        const strength = (goalsStrength * 0.4 + defensiveStrength * 0.3 + rankStrength * 0.2 + formStrength * 0.1) 
                        * formMultiplier + homeBonus
        
        return Math.max(0.3, Math.min(3.0, strength))
    }
    
    simulateMatchOutcomes(homeGoals, awayGoals) {
        let homeWins = 0, draws = 0, awayWins = 0
        const simulations = 10000
        
        for (let i = 0; i < simulations; i++) {
            const homeScore = this.poissonRandom(homeGoals)
            const awayScore = this.poissonRandom(awayGoals)
            
            if (homeScore > awayScore) homeWins++
            else if (homeScore === awayScore) draws++
            else awayWins++
        }
        
        return {
            home_win: homeWins / simulations,
            draw: draws / simulations,
            away_win: awayWins / simulations
        }
    }
    
    poissonRandom(lambda) {
        const L = Math.exp(-lambda)
        let p = 1.0
        let k = 0
        
        do {
            k++
            p *= Math.random()
        } while (p > L)
        
        return k - 1
    }
    
    calculateOverUnder(homeGoals, awayGoals, threshold) {
        const totalExpected = homeGoals + awayGoals
        let prob = 0
        
        for (let i = Math.floor(threshold) + 1; i <= 8; i++) {
            prob += this.poissonPMF(totalExpected, i)
        }
        
        return Math.min(0.90, Math.max(0.10, prob))
    }
    
    poissonPMF(lambda, k) {
        return Math.exp(-lambda) * Math.pow(lambda, k) / this.factorial(k)
    }
    
    factorial(n) {
        if (n <= 1) return 1
        return n * this.factorial(n - 1)
    }
    
    predictTopScorers(team, analysis) {
        const baseScorers = [
            { name: 'Attaquant principal', probability: 0.22 },
            { name: 'Ailier/Second attaquant', probability: 0.15 },
            { name: 'Milieu offensif', probability: 0.10 }
        ]
        
        const formMultiplier = analysis.forme_actuelle === 'excellente' ? 1.3 :
                              analysis.forme_actuelle === 'bonne' ? 1.1 :
                              analysis.forme_actuelle === 'moyenne' ? 1.0 :
                              analysis.forme_actuelle === 'mauvaise' ? 0.8 : 0.6
        
        return baseScorers.map(scorer => ({
            ...scorer,
            probability: Math.min(0.35, scorer.probability * formMultiplier)
        }))
    }
    
    // === MÉTHODES SUPPORT ===
    
    explainAdvantage(avantage, homeTeam, awayTeam) {
        if (avantage === 'domicile') {
            return `Avantage domicile grâce à ${homeTeam.home_advantage > 0.6 ? 'forte performance à domicile' : 'forme supérieure'}`
        } else if (avantage === 'exterieur') {
            return `Avantage visiteur grâce à ${awayTeam.away_performance > 0.6 ? 'bonne performance en déplacement' : 'niveau supérieur'}`
        }
        return 'Match équilibré, léger avantage domicile standard'
    }
    
    generateScenarios(homeTeam, awayTeam, avantage) {
        const scenarios = []
        
        if (avantage === 'domicile') {
            scenarios.push(
                { type: 'Victoire domicile serrée', probabilite: 45, description: '1-0 ou 2-1 domicile' },
                { type: 'Match nul', probabilite: 30, description: 'Résistance visiteur' },
                { type: 'Surprise visiteur', probabilite: 25, description: 'Contre-performance domicile' }
            )
        } else if (avantage === 'exterieur') {
            scenarios.push(
                { type: 'Exploit visiteur', probabilite: 40, description: 'Victoire en déplacement' },
                { type: 'Match nul', probabilite: 35, description: 'Bon point visiteur' },
                { type: 'Réveil domicile', probabilite: 25, description: 'Sursaut à domicile' }
            )
        } else {
            scenarios.push(
                { type: 'Match serré', probabilite: 40, description: 'Décision aux détails' },
                { type: 'Avantage domicile', probabilite: 35, description: 'Facteur domicile décisif' },
                { type: 'Surprise visiteur', probabilite: 25, description: 'Motivation extérieur' }
            )
        }
        
        return scenarios
    }
    
    async savePredictionSimple(homeId, awayId, prediction) {
        // Sauvegarder en table matches (temporaire) car tables IA pas créées
        try {
            console.log(`💾 Sauvegarde prédiction ${homeId} vs ${awayId}`)
            // En mode développement, on sauvegarde juste en local pour l'instant
            return true
        } catch (error) {
            console.error('Erreur sauvegarde:', error.message)
        }
    }
}

module.exports = { SimpleAIPredictionEngine }