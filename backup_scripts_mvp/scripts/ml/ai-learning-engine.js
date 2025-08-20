#!/usr/bin/env node

/**
 * MOTEUR D'APPRENTISSAGE IA - Integration ML dans collecte données
 * Objectif: Détecter automatiquement patterns, styles, corrélations
 * 
 * PHILOSOPHY: L'IA ne remplace pas les stats, elle les enrichit !
 * - Stats = faits bruts  
 * - IA = patterns cachés, corrélations non-linéaires, contexte
 * - Ensemble = prédictions plus fines
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs').promises

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

class AILearningEngine {
    constructor() {
        this.patterns = new Map() // Cache patterns détectés
        this.correlations = new Map() // Cache corrélations
        this.clusters = new Map() // Clusters tactiques
    }

    /**
     * 1. DÉTECTION STYLES TACTIQUES PAR IA
     * À partir des stats brutes, identifier clusters de styles
     */
    async detectTacticalStyles() {
        console.log('🧠 IA: Analyse styles tactiques')
        
        // Récupérer toutes les équipes avec stats
        const { data: teams, error } = await supabase
            .from('team_features')
            .select('*')
            .not('raw_stats', 'is', null)

        if (error) {
            console.error('Erreur lecture données:', error.message)
            return
        }

        console.log(`📊 Analyse ${teams.length} équipes pour styles tactiques`)

        for (const team of teams) {
            const tacticalProfile = this.analyzeTacticalProfile(team)
            const styleCluster = this.assignTacticalCluster(tacticalProfile)
            
            // Sauvegarder style détecté par IA
            await this.updateTeamAIFeatures(team.team_id, team.season, {
                tactical_style: styleCluster.name,
                style_confidence: styleCluster.confidence,
                tactical_profile: tacticalProfile
            })
        }
    }

    /**
     * ANALYSE PROFIL TACTIQUE d'une équipe
     */
    analyzeTacticalProfile(team) {
        const stats = team.raw_stats || {}
        
        // Calculer indices tactiques avec IA
        const profile = {
            // Possession & Control
            possession_dominance: this.calculatePossessionDominance(team, stats),
            tempo_intensity: this.calculateTempoIntensity(team, stats),
            
            // Style offensif  
            attacking_directness: this.calculateAttackingDirectness(team, stats),
            creativity_index: this.calculateCreativityIndex(team, stats),
            set_piece_reliance: this.calculateSetPieceReliance(team, stats),
            
            // Style défensif
            defensive_compactness: this.calculateDefensiveCompactness(team, stats),
            pressing_intensity: this.calculatePressingIntensity(team, stats),
            defensive_aggression: this.calculateDefensiveAggression(team, stats),
            
            // Transition
            counter_attack_efficiency: this.calculateCounterEfficiency(team, stats),
            transition_speed: this.calculateTransitionSpeed(team, stats),
            
            // Métacaractéristiques
            tactical_flexibility: this.calculateTacticalFlexibility(team, stats),
            big_game_adaptation: this.calculateBigGameAdaptation(team, stats)
        }

        return profile
    }

    calculatePossessionDominance(team, stats) {
        const possession = team.possession_avg || 50
        const passAccuracy = stats.passes?.accuracy || 80
        const shortPasses = stats.passes?.short_total || 0
        const longPasses = stats.passes?.long_total || 0
        
        // IA: Pondérer possession par qualité passes
        const qualityFactor = (passAccuracy / 100) * (shortPasses / Math.max(longPasses, 1))
        return Math.min(1.0, (possession / 50) * qualityFactor)
    }

    calculateTempoIntensity(team, stats) {
        const shotsPerGame = team.shots_per_game || 0
        const cornersPerGame = (team.corners_for || 0) / Math.max(team.games_played, 1)
        const attacks = stats.attacks?.total || 0
        
        // IA: Tempo = fréquence actions offensives
        return Math.min(1.0, (shotsPerGame + cornersPerGame * 2 + attacks / 100) / 20)
    }

    calculateAttackingDirectness(team, stats) {
        const longBalls = stats.passes?.long_total || 0  
        const shortPasses = stats.passes?.short_total || 0
        const totalShots = team.shots_per_game || 0
        
        if (shortPasses === 0) return 0.5 // Défaut
        
        // IA: Direct = ratio passes longues + tirs rapides
        const directnessRatio = longBalls / (shortPasses + longBalls)
        const shotDirectness = Math.min(1.0, totalShots / 15)
        
        return (directnessRatio + shotDirectness) / 2
    }

    calculateCreativityIndex(team, stats) {
        const keyPasses = stats.passes?.key_total || 0
        const assists = stats.goals?.assists || 0
        const crosses = stats.crosses?.total || 0
        
        // IA: Créativité = passes créatives variées
        return Math.min(1.0, (keyPasses + assists * 3 + crosses) / 50)
    }

    calculateSetPieceReliance(team, stats) {
        const cornerGoals = stats.goals?.corner || 0
        const freeKickGoals = stats.goals?.free_kick || 0
        const totalGoals = team.goals_for || 1
        
        // IA: Dépendance coups de pied arrêtés
        return (cornerGoals + freeKickGoals) / totalGoals
    }

    calculateDefensiveCompactness(team, stats) {
        const goalsAgainst = team.goals_against || 0
        const shotsAgainst = stats.shots?.against || 1
        const defensiveActions = (stats.tackles?.total || 0) + (stats.interceptions?.total || 0)
        
        // IA: Compacité = peu de tirs concédés + actions défensives
        const shotRestriction = 1 - Math.min(1.0, shotsAgainst / 20)
        const actionDensity = Math.min(1.0, defensiveActions / 100)
        
        return (shotRestriction + actionDensity) / 2
    }

    calculatePressingIntensity(team, stats) {
        const fouls = stats.fouls?.total || 0
        const cards = team.yellow_cards || 0
        const duelsWon = stats.duels?.won || 0
        
        // IA: Pressing = fouls + duels + intensité physique
        return Math.min(1.0, (fouls + cards * 2 + duelsWon) / 80)
    }

    calculateDefensiveAggression(team, stats) {
        const redCards = team.red_cards || 0
        const foulsPerGame = (stats.fouls?.total || 0) / Math.max(team.games_played, 1)
        const tacklesWon = stats.tackles?.won || 0
        
        // IA: Agressivité défensive
        return Math.min(1.0, (redCards * 10 + foulsPerGame * 5 + tacklesWon) / 50)
    }

    calculateCounterEfficiency(team, stats) {
        const counterGoals = stats.goals?.counter_attack || 0
        const totalGoals = team.goals_for || 1
        const fastBreaks = stats.fast_breaks || 0
        
        // IA: Efficacité contre-attaque
        return (counterGoals / totalGoals) + Math.min(0.3, fastBreaks / 20)
    }

    calculateTransitionSpeed(team, stats) {
        const quickPasses = stats.passes?.quick || 0
        const possession = team.possession_avg || 50
        
        // IA: Vitesse transition = passes rapides / possession
        if (possession === 0) return 0.5
        return Math.min(1.0, (quickPasses / possession) * 2)
    }

    calculateTacticalFlexibility(team, stats) {
        // IA: Flexibilité basée sur variance performance
        const volatility = team.volatility_index || 0.5
        const homeAwayDiff = Math.abs((team.home_advantage || 0.5) - (team.away_performance || 0.5))
        
        // Plus de variance = plus flexible tactiquement
        return Math.min(1.0, volatility + homeAwayDiff)
    }

    calculateBigGameAdaptation(team, stats) {
        const bigGamePerf = team.big_game_mentality || 0.5
        const pressureHandling = 1 - (team.pressure_score || 0.5)
        
        // IA: Adaptation gros matchs
        return (bigGamePerf + pressureHandling) / 2
    }

    /**
     * ATTRIBUTION CLUSTER TACTIQUE
     */
    assignTacticalCluster(profile) {
        const clusters = [
            {
                name: 'possession_dominant',
                pattern: { possession_dominance: 0.7, creativity_index: 0.6 },
                description: 'Contrôle du jeu par la possession'
            },
            {
                name: 'counter_attack',
                pattern: { counter_attack_efficiency: 0.6, attacking_directness: 0.7 },
                description: 'Spécialiste contre-attaque'
            },
            {
                name: 'defensive_compact',
                pattern: { defensive_compactness: 0.7, pressing_intensity: 0.8 },
                description: 'Bloc défensif solide'
            },
            {
                name: 'high_tempo',
                pattern: { tempo_intensity: 0.7, pressing_intensity: 0.6 },
                description: 'Jeu haute intensité'
            },
            {
                name: 'set_piece_specialist',
                pattern: { set_piece_reliance: 0.4, defensive_compactness: 0.6 },
                description: 'Spécialiste coups de pied arrêtés'
            },
            {
                name: 'tactical_flexible',
                pattern: { tactical_flexibility: 0.7, big_game_adaptation: 0.6 },
                description: 'Adaptable tactiquement'
            }
        ]

        let bestMatch = { name: 'balanced', confidence: 0.3 }
        
        for (const cluster of clusters) {
            const similarity = this.calculateClusterSimilarity(profile, cluster.pattern)
            if (similarity > bestMatch.confidence) {
                bestMatch = {
                    name: cluster.name,
                    confidence: similarity,
                    description: cluster.description
                }
            }
        }

        return bestMatch
    }

    calculateClusterSimilarity(profile, pattern) {
        let similarity = 0
        let weights = 0
        
        for (const [key, targetValue] of Object.entries(pattern)) {
            if (profile[key] !== undefined) {
                const diff = Math.abs(profile[key] - targetValue)
                similarity += (1 - diff) * 1 // Poids égal pour simplifier
                weights += 1
            }
        }
        
        return weights > 0 ? similarity / weights : 0
    }

    /**
     * 2. DÉTECTION PATTERNS MOTIVATIONNELS PAR IA
     */
    async detectMotivationalPatterns() {
        console.log('🧠 IA: Analyse patterns motivationnels')
        
        // Récupérer matchs avec contexte
        const { data: matches, error } = await supabase
            .from('ml_match_features')
            .select('*')
            .limit(1000)

        if (error) {
            console.error('Erreur lecture matchs:', error.message)
            return
        }

        // Analyser patterns par IA
        const patterns = this.analyzeMotivationalPatterns(matches)
        await this.saveLearningInsights('motivational_patterns', patterns)
        
        console.log(`📊 ${patterns.length} patterns motivationnels détectés`)
    }

    analyzeMotivationalPatterns(matches) {
        const patterns = []
        
        // Pattern 1: "Barragiste Motivé"
        const relegationUpsets = matches.filter(m => 
            m.away_motivation_zone === 'relegation_battle' &&
            m.home_motivation_zone === 'safe_zone' &&
            (m.away_score > m.home_score) // Victoire outsider
        )
        
        if (relegationUpsets.length > 0) {
            patterns.push({
                name: 'relegation_motivation_boost',
                description: 'Équipes en lutte pour le maintien surperforment contre ventre mou',
                frequency: relegationUpsets.length / matches.length,
                confidence: Math.min(0.95, relegationUpsets.length / 10),
                conditions: {
                    away_motivation_zone: 'relegation_battle',
                    home_motivation_zone: 'safe_zone'
                },
                impact: +0.15 // Boost probabilité victoire extérieur
            })
        }

        // Pattern 2: "Pression Titre"  
        const titlePressure = matches.filter(m =>
            m.home_motivation_zone === 'title_race' &&
            m.home_pressure_score > 0.8 &&
            m.home_score < m.away_score // Défaite sous pression
        )
        
        if (titlePressure.length > 0) {
            patterns.push({
                name: 'title_pressure_choke',
                description: 'Prétendants au titre craquent sous forte pression',
                frequency: titlePressure.length / matches.length,
                confidence: Math.min(0.9, titlePressure.length / 8),
                conditions: {
                    motivation_zone: 'title_race',
                    pressure_score: { '>': 0.8 }
                },
                impact: -0.12 // Malus performance équipe favorite
            })
        }

        // Pattern 3: "Derby Effect"
        const derbyMatches = matches.filter(m => m.is_derby)
        const derbyUpsets = derbyMatches.filter(m => 
            Math.abs(m.home_rank - m.away_rank) > 5 && // Écart classement
            ((m.home_rank > m.away_rank && m.home_score > m.away_score) ||
             (m.away_rank > m.home_rank && m.away_score > m.home_score)) // Outsider gagne
        )
        
        if (derbyUpsets.length > 0 && derbyMatches.length > 0) {
            patterns.push({
                name: 'derby_equalizer_effect',
                description: 'Les derbys nivellent les différences de niveau',
                frequency: derbyUpsets.length / derbyMatches.length,
                confidence: Math.min(0.85, derbyUpsets.length / 5),
                conditions: {
                    is_derby: true,
                    rank_difference: { '>': 5 }
                },
                impact: +0.2 // Forte augmentation probabilité surprise
            })
        }

        return patterns
    }

    /**
     * 3. APPRENTISSAGE CORRÉLATIONS CACHÉES
     */
    async detectHiddenCorrelations() {
        console.log('🧠 IA: Détection corrélations cachées')
        
        // Analyse corrélations non-évidentes
        const correlations = await this.findUnexpectedCorrelations()
        await this.saveLearningInsights('hidden_correlations', correlations)
        
        console.log(`🔍 ${correlations.length} corrélations cachées trouvées`)
    }

    async findUnexpectedCorrelations() {
        // Exemple: Météo vs style tactique
        const { data: weatherMatches } = await supabase
            .from('match_context')
            .select(`
                weather_impact_score,
                match_id,
                matches!inner(home_score, away_score)
            `)
            .not('weather_impact_score', 'is', null)

        const correlations = []
        
        // Corrélation: Pluie favorise équipes défensives
        const rainMatches = weatherMatches?.filter(m => m.weather_impact_score > 0.6) || []
        if (rainMatches.length > 5) {
            const lowScores = rainMatches.filter(m => 
                (m.matches.home_score + m.matches.away_score) < 2.5
            ).length
            
            correlations.push({
                name: 'weather_defensive_advantage',
                description: 'Mauvais temps favorise équipes défensives (moins de buts)',
                correlation_strength: lowScores / rainMatches.length,
                sample_size: rainMatches.length,
                insight: 'Ajuster probabilité Under 2.5 par +0.1 si pluie forte'
            })
        }

        return correlations
    }

    /**
     * 4. MISE À JOUR FEATURES IA ÉQUIPES
     */
    async updateTeamAIFeatures(teamId, season, aiFeatures) {
        // Préparer les données en évitant l'erreur de type sur style_cluster
        const updateData = {
            ai_features: aiFeatures,
            updated_at: new Date().toISOString()
        }
        
        // Ajouter style_cluster seulement s'il s'agit d'une string valide
        if (aiFeatures.tactical_style && typeof aiFeatures.tactical_style === 'string') {
            // Utiliser upsert au lieu d'update pour gérer les conflits de type
            const { error } = await supabase
                .from('team_features')
                .upsert({
                    team_id: teamId,
                    season: season,
                    league_id: 61, // Ligue 1
                    ...updateData,
                    style_cluster: aiFeatures.tactical_style
                }, {
                    onConflict: 'team_id,season,league_id',
                    ignoreDuplicates: false
                })

            if (error) {
                console.error(`Erreur upsert IA équipe ${teamId}:`, error.message)
            }
        } else {
            // Fallback: update simple sans style_cluster
            const { error } = await supabase
                .from('team_features')
                .update(updateData)
                .eq('team_id', teamId)
                .eq('season', season)

            if (error) {
                console.error(`Erreur update IA équipe ${teamId}:`, error.message)
            }
        }
    }

    /**
     * 5. SAUVEGARDE INSIGHTS APPRENTISSAGE
     */
    async saveLearningInsights(type, insights) {
        const { error } = await supabase
            .from('ai_match_insights')
            .insert({
                match_id: null, // Global insights
                key_factors: { type, insights },
                model_version: '1.0_mvp',
                features_importance: insights,
                created_at: new Date().toISOString()
            })

        if (error) {
            console.error('Erreur sauvegarde insights:', error.message)
        }
    }

    /**
     * 6. GÉNÉRATION FEATURES MATCH AVEC IA
     */
    async generateMatchAIFeatures(homeTeamId, awayTeamId, matchContext = {}) {
        console.log(`🤖 Génération features IA pour match ${homeTeamId} vs ${awayTeamId}`)
        
        // Récupérer profiles équipes
        const [homeProfile, awayProfile] = await Promise.all([
            this.getTeamAIProfile(homeTeamId),
            this.getTeamAIProfile(awayTeamId)
        ])

        // Analyser match-up tactique avec IA
        const tacticalMatchup = this.analyzeTacticalMatchup(homeProfile, awayProfile)
        
        // Appliquer patterns motivationnels
        const motivationalAdjustment = this.applyMotivationalPatterns(
            homeProfile, awayProfile, matchContext
        )
        
        // Calculer prédictions IA enrichies
        const aiPrediction = this.generateAIPrediction(
            homeProfile, awayProfile, tacticalMatchup, motivationalAdjustment
        )

        return {
            tactical_matchup: tacticalMatchup,
            motivational_factors: motivationalAdjustment,
            ai_prediction: aiPrediction,
            confidence_score: aiPrediction.confidence,
            key_factors: aiPrediction.key_factors
        }
    }

    async getTeamAIProfile(teamId) {
        const { data: team } = await supabase
            .from('team_features')
            .select('*')
            .eq('team_id', teamId)
            .eq('season', 2024)
            .single()

        return {
            ...team,
            ai_profile: team?.ai_features || {},
            tactical_style: team?.style_cluster || 'balanced'
        }
    }

    analyzeTacticalMatchup(homeProfile, awayProfile) {
        // IA: Analyse compatibilité/incompatibilité styles
        const homeStyle = homeProfile.tactical_style
        const awayStyle = awayProfile.tactical_style
        
        const styleMatchups = {
            'possession_dominant_vs_counter_attack': {
                advantage: 'away', 
                factor: 0.15,
                reason: 'Contre-attaque efficace vs possession'
            },
            'defensive_compact_vs_high_tempo': {
                advantage: 'home',
                factor: 0.12,
                reason: 'Bloc défensif résiste au pressing'
            },
            'counter_attack_vs_high_tempo': {
                advantage: 'draw',
                factor: 0.08,
                reason: 'Styles similaires, match équilibré'
            }
        }

        const matchupKey = `${homeStyle}_vs_${awayStyle}`
        return styleMatchups[matchupKey] || {
            advantage: 'neutral',
            factor: 0,
            reason: 'Pas de pattern tactique spécifique identifié'
        }
    }

    applyMotivationalPatterns(homeProfile, awayProfile, context) {
        let homeBoost = 0
        let awayBoost = 0
        const reasons = []

        // Pattern: Barragiste motivé
        if (awayProfile.motivation_zone === 'relegation_battle' && 
            homeProfile.motivation_zone === 'safe_zone') {
            awayBoost += 0.15
            reasons.push('Équipe visiteur en lutte maintien très motivée')
        }

        // Pattern: Pression titre
        if (homeProfile.motivation_zone === 'title_race' && 
            homeProfile.pressure_score > 0.8) {
            homeBoost -= 0.12
            reasons.push('Pression titre peut affecter performance domicile')
        }

        // Pattern: Derby
        if (context.is_derby) {
            const rankDiff = Math.abs((homeProfile.current_rank || 10) - (awayProfile.current_rank || 10))
            if (rankDiff > 5) {
                // Avantage à l'outsider en derby
                if (homeProfile.current_rank > awayProfile.current_rank) {
                    homeBoost += 0.18
                } else {
                    awayBoost += 0.18
                }
                reasons.push('Effect derby nivelle les différences')
            }
        }

        return {
            home_motivation_adjustment: homeBoost,
            away_motivation_adjustment: awayBoost,
            reasons
        }
    }

    generateAIPrediction(homeProfile, awayProfile, tacticalMatchup, motivationalFactors) {
        // Base: forces relatives équipes
        const homeStrength = (homeProfile.goals_per_game || 1) / Math.max(homeProfile.goals_conceded_per_game || 1, 0.5)
        const awayStrength = (awayProfile.goals_per_game || 1) / Math.max(awayProfile.goals_conceded_per_game || 1, 0.5)
        
        // Ajustement domicile
        const homeAdvantage = homeProfile.home_advantage || 0.6
        
        // Application facteurs IA
        let homeProbBase = homeStrength / (homeStrength + awayStrength) * homeAdvantage
        let awayProbBase = 1 - homeProbBase - 0.25 // 25% draw base
        
        // Ajustements tactiques
        if (tacticalMatchup.advantage === 'home') {
            homeProbBase += tacticalMatchup.factor
        } else if (tacticalMatchup.advantage === 'away') {
            awayProbBase += tacticalMatchup.factor
        }
        
        // Ajustements motivationnels
        homeProbBase += motivationalFactors.home_motivation_adjustment
        awayProbBase += motivationalFactors.away_motivation_adjustment
        
        // Normalisation
        const total = homeProbBase + awayProbBase + 0.25
        const homeProb = homeProbBase / total
        const awayProb = awayProbBase / total  
        const drawProb = 0.25 / total

        return {
            home_win_probability: Math.max(0.05, Math.min(0.85, homeProb)),
            draw_probability: Math.max(0.15, Math.min(0.4, drawProb)),
            away_win_probability: Math.max(0.05, Math.min(0.85, awayProb)),
            confidence: this.calculatePredictionConfidence(homeProfile, awayProfile),
            key_factors: [
                tacticalMatchup.reason,
                ...motivationalFactors.reasons,
                `Force domicile: ${Math.round(homeAdvantage * 100)}%`
            ]
        }
    }

    calculatePredictionConfidence(homeProfile, awayProfile) {
        // Confiance basée sur:
        // - Nombre de matchs joués (sample size)
        // - Stabilité performance (faible volatilité = haute confiance)
        // - Qualité données IA
        
        const homeGames = homeProfile.games_played || 0
        const awayGames = awayProfile.games_played || 0
        const minGames = Math.min(homeGames, awayGames)
        
        const homeVolatility = homeProfile.volatility_index || 0.5
        const awayVolatility = awayProfile.volatility_index || 0.5
        const avgVolatility = (homeVolatility + awayVolatility) / 2
        
        // Confiance = f(échantillon, stabilité)
        let confidence = Math.min(0.95, minGames / 20) // Max 95% si 20+ matchs
        confidence *= (1 - avgVolatility) // Réduction si volatil
        confidence = Math.max(0.3, confidence) // Min 30%
        
        return Math.round(confidence * 1000) / 1000
    }

    /**
     * MÉTHODE PRINCIPALE - APPRENTISSAGE COMPLET
     */
    async runLearningCycle() {
        console.log('🚀 Démarrage cycle apprentissage IA complet')
        
        try {
            // 1. Analyse styles tactiques
            await this.detectTacticalStyles()
            
            // 2. Patterns motivationnels
            await this.detectMotivationalPatterns()
            
            // 3. Corrélations cachées
            await this.detectHiddenCorrelations()
            
            console.log('✅ Cycle apprentissage IA terminé avec succès')
            console.log('🧠 L\'IA est maintenant intégrée au processus de prédiction')
            
            return {
                status: 'success',
                patterns_detected: this.patterns.size,
                correlations_found: this.correlations.size,
                clusters_identified: this.clusters.size
            }
            
        } catch (error) {
            console.error('❌ Erreur cycle apprentissage IA:', error.message)
            throw error
        }
    }
}

// Export pour utilisation dans d'autres scripts
module.exports = AILearningEngine

// Exécution autonome si appelé directement
if (require.main === module) {
    const aiEngine = new AILearningEngine()
    aiEngine.runLearningCycle().catch(console.error)
}