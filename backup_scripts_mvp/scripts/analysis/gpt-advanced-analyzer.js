#!/usr/bin/env node

/**
 * GPT ADVANCED ANALYZER - Exploitation de la puissance complète de GPT-5
 * 
 * PHILOSOPHIE: GPT comme analyste football professionnel niveau élite
 * - Analyse multi-dimensionnelle avec données contextuelles précises
 * - Raisonnement probabiliste avancé sur patterns complexes
 * - Intégration théories tactiques modernes (Guardiola, Klopp, etc.)
 * - Calculs micro-adjustements basés sur psychologie du sport
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL  
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

class GPTAdvancedAnalyzer {
    constructor() {
        this.model = 'gpt-4' // Sera mis à jour vers gpt-5 quand disponible
        this.apiUrl = 'https://api.openai.com/v1/chat/completions'
        
        // Base de connaissances football intégrée
        this.footballKnowledge = {
            formations: require('./data/formations-tactical-data.json') || {},
            coaches: require('./data/coaches-philosophy.json') || {},
            venues: require('./data/venues-characteristics.json') || {}
        }
    }

    /**
     * 1. ANALYSE TACTIQUE HYPER-PRÉCISE
     * Exploitation maximale des capacités GPT pour décortiquer les matchups
     */
    async analyzeTacticalMatchupAdvanced(homeTeam, awayTeam, context) {
        console.log('🧠 GPT-5: Analyse tactique niveau professionnel')

        const systemPrompt = this.buildTacticalSystemPrompt()
        const userPrompt = this.buildAdvancedTacticalPrompt(homeTeam, awayTeam, context)

        try {
            const response = await this.callGPT([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], {
                temperature: 0.1, // Précision maximale
                max_tokens: 2000,
                top_p: 0.9
            })

            return this.parseAdvancedTacticalResponse(response)
            
        } catch (error) {
            console.error('❌ Erreur GPT Tactique:', error.message)
            return null
        }
    }

    buildTacticalSystemPrompt() {
        return `Tu es un analyste tactique football de niveau mondial, combinant:

EXPERTISE TECHNIQUE:
- Maîtrise complète des systèmes tactiques modernes (4-3-3 false 9, 3-4-2-1 diamant, 4-2-3-1 asymétrique, etc.)
- Connaissance approfondie des phases de jeu: construction, transition offensive, pressing, transition défensive
- Analyse micro-tactique: mouvements sans ballon, couvertures, décrochages, appels de balle
- Principes Guardiola (positional play), Klopp (gegenpressing), Conte (3-5-2 wing-backs)

ANALYSE PROBABILISTE:
- Calcul précis des probabilités d'efficacité tactique selon matchup
- Quantification de l'avantage tactique en pourcentages exploitables
- Identification des zones de vulnérabilité avec coefficients de risque
- Prédiction des adaptations en cours de match

PSYCHOLOGIE DU SPORT:
- Impact motivation sur exécution tactique
- Effet pression sur qualité technique et prise de décision
- Facteurs mentaux influençant cohésion collective

MÉTHODE D'ANALYSE:
1. Décortique les systèmes de jeu des 2 équipes avec précision technique
2. Identifie les batailles tactiques clés et leurs probabilités de succès  
3. Quantifie l'avantage/désavantage avec calculs précis
4. Prédit les adaptations tactiques probables des entraîneurs
5. Calcule l'impact final sur les probabilités de résultat

IMPORTANT: Tes analyses doivent être précises, quantifiées et exploitables par un algorithme de prédiction.`
    }

    buildAdvancedTacticalPrompt(homeTeam, awayTeam, context) {
        return `
MISSION: Analyse tactique ultra-précise du match ${homeTeam.name} vs ${awayTeam.name}

=== DONNÉES ÉQUIPE DOMICILE (${homeTeam.name}) ===

SYSTÈME TACTIQUE:
- Formation: ${homeTeam.formation || this.inferFormation(homeTeam)}
- Style de jeu: ${homeTeam.tactical_style || 'À déterminer'}
- Possession moyenne: ${homeTeam.possession_avg || 'N/A'}%
- Tempo (passes/min): ${this.calculateTempo(homeTeam)}
- Verticalité (passes longues/courtes): ${this.calculateVerticalplay(homeTeam)}

MÉTRIQUES OFFENSIVES AVANCÉES:
- xG/match: ${homeTeam.goals_per_game} (${this.getxGContext(homeTeam)})
- Conversion tirs: ${this.calculateShotConversion(homeTeam)}%
- Créativité (passes clés/match): ${homeTeam.key_passes || 'N/A'}
- Efficacité dernière passe: ${this.calculateFinalPassEfficiency(homeTeam)}%
- Polyvalence offensive: ${this.calculateOffensivePolyvalence(homeTeam)}

MÉTRIQUES DÉFENSIVES AVANCÉES:
- xGA/match: ${homeTeam.goals_conceded_per_game} (contexte: ${this.getxGAContext(homeTeam)})
- Intensité pressing: ${homeTeam.pressing_intensity || this.calculatePressingFromStats(homeTeam)}
- Compacité défensive: ${this.calculateDefensiveCompactness(homeTeam)}
- Efficacité duels: ${this.calculateDuelSuccess(homeTeam)}%
- Récupération haute: ${this.calculateHighTurnovers(homeTeam)}%

TRANSITIONS & SET-PIECES:
- Vitesse transition OFF: ${this.calculateTransitionSpeed(homeTeam)}
- Efficacité contre-attaque: ${this.calculateCounterEfficiency(homeTeam)}
- Dangerosité corners: ${homeTeam.corner_conversion || this.calculateCornerThreat(homeTeam)}
- Vulnérabilité coups francs: ${this.calculateSetPieceVulnerability(homeTeam)}

=== DONNÉES ÉQUIPE EXTÉRIEUR (${awayTeam.name}) ===

[Même structure détaillée pour équipe extérieur]

SYSTÈME TACTIQUE:
- Formation: ${awayTeam.formation || this.inferFormation(awayTeam)}
- Style de jeu: ${awayTeam.tactical_style || 'À déterminer'}
- Possession moyenne: ${awayTeam.possession_avg || 'N/A'}%
- Adaptation extérieur: ${this.calculateAwayAdaptation(awayTeam)}

[...données complètes awayTeam...]

=== CONTEXTE MATCH AVANCÉ ===

ENVIRONNEMENT:
- Stade: ${context.venue_name} (capacité: ${context.venue_capacity})
- Dimensions terrain: ${context.pitch_dimensions || 'Standard'}
- Surface: ${context.surface_quality || 'Herbe naturelle'}
- Météo: ${context.weather} (impact estimé: ${this.calculateWeatherImpact(context.weather)})
- Température: ${context.temperature}°C (impact physique: ${this.calculateTempImpact(context.temperature)})
- Vent: ${context.wind} (impact jeu aérien: ${this.calculateWindImpact(context.wind)})

PSYCHOLOGIQUE & MOTIVATIONNEL:
- Pression domicile: ${homeTeam.pressure_score}/1.0 (${this.interpretPressure(homeTeam.pressure_score)})
- Motivation domicile: ${homeTeam.motivation_score}/1.0 (zone: ${homeTeam.motivation_zone})
- Pression extérieur: ${awayTeam.pressure_score}/1.0 (${this.interpretPressure(awayTeam.pressure_score)})
- Motivation extérieur: ${awayTeam.motivation_score}/1.0 (zone: ${awayTeam.motivation_zone})
- Enjeu match: ${context.importance} (impact mental: ${this.calculateStakeImpact(context.importance)})

HISTORIQUE & TENDANCES:
- H2H récent: ${context.h2h_recent || 'À analyser'}
- Forme domicile 5 derniers: ${homeTeam.home_form || this.calculateRecentForm(homeTeam, 'home')}
- Forme extérieur 5 derniers: ${awayTeam.away_form || this.calculateRecentForm(awayTeam, 'away')}

=== DEMANDE D'ANALYSE ULTRA-PRÉCISE ===

Effectue une analyse tactique de niveau professionnel en 6 phases:

**PHASE 1: DÉCONSTRUCTION TACTIQUE**
- Analyse détaillée des 2 systèmes de jeu avec positions spécifiques
- Identification des rôles de chaque ligne (défense, milieu, attaque)  
- Points forts et faiblesses structurelles de chaque formation

**PHASE 2: BATAILLES TACTIQUES CLÉS**
- Identifie les 3-4 duels tactiques décisifs du match
- Pour chacun: probabilité de succès, impact sur le jeu, coefficients
- Zones du terrain où se joueront les moments clés

**PHASE 3: AVANTAGES/DÉSAVANTAGES QUANTIFIÉS**
- Calcule l'avantage tactique précis (en %) pour chaque équipe
- Quantifie l'impact de chaque facteur (formation, style, adaptation)
- Coefficients d'ajustement probabilistes exploitables

**PHASE 4: SCÉNARIOS TACTIQUES PROBABLES**  
- 3 scénarios tactiques les plus probables avec %
- Adaptations attendues des entraîneurs selon évolution
- Timeline tactique du match (0-30min, 30-60min, 60-90min)

**PHASE 5: FACTEURS DIFFÉRENCIANTS**
- Éléments tactiques qui feront la différence
- Joueurs clés dans le contexte tactique spécifique
- Moments de match critiques d'un point de vue tactique

**PHASE 6: PRÉDICTION TACTIQUE FINALE**
- Impact tactique sur probabilités 1N2
- Ajustements recommandés aux cotes de base
- Niveau de confiance dans l'analyse (0-100%)

**FORMAT DE RÉPONSE EXIGÉ (JSON exploitable):**
{
  "tactical_analysis": {
    "home_system": "description précise formation + rôles",
    "away_system": "description précise formation + rôles", 
    "key_battles": [
      {
        "zone": "milieu central",
        "matchup": "4v3 possession vs pressing",
        "advantage": "home|away|neutral",
        "success_probability": 0.65,
        "impact_coefficient": 0.12
      }
    ]
  },
  "quantified_advantages": {
    "tactical_advantage_home": 0.08,
    "tactical_advantage_away": -0.03,
    "formation_compatibility": 0.73,
    "style_matchup_factor": 0.15
  },
  "match_scenarios": [
    {
      "scenario": "Domination possession home face bloc bas away",
      "probability": 0.45,
      "tactical_adaptations": "Switch milieux créatifs, élargir jeu"
    }
  ],
  "probability_adjustments": {
    "home_win_adjustment": +0.12,
    "draw_adjustment": -0.05,
    "away_win_adjustment": -0.07,
    "confidence": 0.84
  },
  "key_differentiators": ["Vitesse transition", "Efficacité pressing", "Qualité centres"],
  "critical_moments": ["0-15min test intensité", "60-75min fatigue", "80-90min changements"]
}
        `
    }

    /**
     * 2. ANALYSE PSYCHOLOGIQUE AVANCÉE 
     * GPT exploite sa compréhension de la psychologie humaine
     */
    async analyzePsychologicalFactors(homeTeam, awayTeam, context, recentEvents = []) {
        console.log('🧠 GPT-5: Analyse psychologique approfondie')

        const systemPrompt = `Tu es un psychologue du sport spécialisé dans le football de haut niveau.

EXPERTISE:
- Psychologie de la performance sous pression
- Dynamiques de groupe et cohésion d'équipe  
- Impact des enjeux sur la mentalité
- Gestion de l'adversité et résilience mentale
- Facteurs motivationnels selon contexte (classement, objectifs)
- Analyse comportementale des profils d'équipe

MÉTHODE:
1. Évalue l'état mental des 2 équipes avec précision
2. Quantifie l'impact psychologique de chaque facteur
3. Prédit les réactions sous pression/adversité
4. Calcule les ajustements de performance selon mental
5. Identifie les leviers psychologiques décisifs

Tes analyses doivent être scientifiques, quantifiées et exploitables.`

        const userPrompt = this.buildPsychologicalPrompt(homeTeam, awayTeam, context, recentEvents)

        try {
            const response = await this.callGPT([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], {
                temperature: 0.15,
                max_tokens: 1500
            })

            return this.parsePsychologicalResponse(response)
            
        } catch (error) {
            console.error('❌ Erreur GPT Psychologique:', error.message)
            return null
        }
    }

    /**
     * 3. ANALYSE PATTERNS CONTEXTUELS ULTRA-AVANCÉE
     * GPT détecte des patterns que l'analyse statistique pure rate
     */
    async detectAdvancedPatterns(matchData, historicalContext) {
        console.log('🔍 GPT-5: Détection patterns contextuels avancés')

        const systemPrompt = `Tu es un expert en analyse de patterns dans le football professionnel.

CAPACITÉS SPÉCIALISÉES:
- Détection de patterns cachés dans les données
- Corrélations non-linéaires entre facteurs multiples
- Analyse séquentielle de comportements d'équipe
- Identification de signatures tactiques/psychologiques
- Patterns temporels (début/fin saison, périodes spécifiques)
- Méta-patterns (patterns de patterns)

MÉTHODOLOGIE:
1. Analyse multi-dimensionnelle des données fournies
2. Croisement avec connaissances football théoriques
3. Détection d'anomalies et patterns exceptionnels
4. Quantification de la significativité statistique
5. Traduction en insights exploitables pour prédictions

Focus: Trouve des patterns que l'analyse traditionnelle ne détecte pas.`

        const userPrompt = this.buildPatternDetectionPrompt(matchData, historicalContext)

        try {
            const response = await this.callGPT([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], {
                temperature: 0.2,
                max_tokens: 1800
            })

            return this.parsePatternResponse(response)
            
        } catch (error) {
            console.error('❌ Erreur GPT Patterns:', error.message)
            return null
        }
    }

    /**
     * 4. SYNTHÈSE INTELLIGENTE MULTI-FACTEURS
     * GPT fusionne tous les éléments pour une prédiction enrichie
     */
    async generateEnhancedPrediction(matchId, tacticalAnalysis, psychologicalAnalysis, patterns) {
        console.log('🎯 GPT-5: Synthèse prédiction enrichie')

        const systemPrompt = `Tu es un prédicteur football d'élite combinant:
- Analyse tactique de niveau professionnel
- Psychologie du sport avancée  
- Détection de patterns complexes
- Modélisation probabiliste précise

OBJECTIF: Fusionner tous les éléments d'analyse pour générer une prédiction finale optimisée.

CONTRAINTES:
- Probabilités finales cohérentes (somme = 1.0)
- Justifications précises et quantifiées
- Niveaux de confiance calibrés
- Exploitable par algorithmes de trading`

        const fusionPrompt = this.buildFusionPrompt(tacticalAnalysis, psychologicalAnalysis, patterns)

        try {
            const response = await this.callGPT([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: fusionPrompt }
            ], {
                temperature: 0.05, // Maximum de précision
                max_tokens: 1200
            })

            const enhancedPrediction = this.parseFusionResponse(response)
            
            // Sauvegarde dans DB
            await this.saveGPTInsights(matchId, {
                tactical: tacticalAnalysis,
                psychological: psychologicalAnalysis,
                patterns: patterns,
                final_prediction: enhancedPrediction
            })

            return enhancedPrediction
            
        } catch (error) {
            console.error('❌ Erreur GPT Fusion:', error.message)
            return null
        }
    }

    /**
     * MÉTHODES UTILITAIRES POUR CALCULS AVANCÉS
     */
    inferFormation(team) {
        // Inférence formation basée sur stats
        const possession = team.possession_avg || 50
        const defensiveActions = (team.tackles || 0) + (team.interceptions || 0)
        
        if (possession > 60) return "4-3-3 possession"
        if (defensiveActions > 20) return "5-4-1 défensif"
        return "4-2-3-1 équilibré"
    }

    calculateTempo(team) {
        const shotsPerGame = team.shots_per_game || 10
        const possession = team.possession_avg || 50
        return Math.round((shotsPerGame / possession) * 100)
    }

    calculateVerticalplay(team) {
        // Simulation ratio passes longues/courtes
        const directness = team.attacking_directness || 0.5
        return Math.round(directness * 100)
    }

    calculateShotConversion(team) {
        const goals = team.goals_for || 0
        const shots = (team.shots_per_game || 10) * (team.games_played || 1)
        return shots > 0 ? Math.round((goals / shots) * 100) : 15
    }

    getxGContext(team) {
        const goalsPerGame = team.goals_per_game || 1
        if (goalsPerGame > 1.8) return "Attaque très efficace"
        if (goalsPerGame > 1.3) return "Attaque correcte"
        return "Attaque en difficulté"
    }

    interpretPressure(pressureScore) {
        if (pressureScore > 0.8) return "Pression maximale"
        if (pressureScore > 0.6) return "Pression élevée" 
        if (pressureScore > 0.4) return "Pression modérée"
        return "Pas de pression particulière"
    }

    calculateWeatherImpact(weather) {
        if (weather?.includes('pluie')) return "Défavorise jeu technique (-0.1)"
        if (weather?.includes('vent')) return "Impacte jeu aérien (-0.05)"
        return "Impact négligeable"
    }

    /**
     * APPEL API GPT OPTIMISÉ
     */
    async callGPT(messages, options = {}) {
        const defaultOptions = {
            model: this.model,
            temperature: 0.1,
            max_tokens: 1500,
            top_p: 0.9,
            presence_penalty: 0.1,
            frequency_penalty: 0.1
        }

        const config = {
            method: 'POST',
            url: this.apiUrl,
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            data: {
                ...defaultOptions,
                ...options,
                messages
            }
        }

        const response = await axios(config)
        return response.data.choices[0].message.content
    }

    /**
     * PARSERS DE RÉPONSES SPÉCIALISÉS
     */
    parseAdvancedTacticalResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0])
            }
            
            // Fallback: extraction manuelle si JSON mal formé
            return this.extractTacticalDataFallback(response)
        } catch (error) {
            console.error('Erreur parsing tactique:', error.message)
            return null
        }
    }

    parsePsychologicalResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/)
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null
        } catch (error) {
            console.error('Erreur parsing psychologique:', error.message)
            return null
        }
    }

    parsePatternResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/)
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null
        } catch (error) {
            console.error('Erreur parsing patterns:', error.message)
            return null
        }
    }

    parseFusionResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/)
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null
        } catch (error) {
            console.error('Erreur parsing fusion:', error.message)
            return null
        }
    }

    /**
     * SAUVEGARDE INSIGHTS GPT
     */
    async saveGPTInsights(matchId, allInsights) {
        const { error } = await supabase
            .from('ai_match_insights')
            .upsert({
                match_id: matchId,
                key_factors: allInsights.tactical?.key_differentiators || [],
                model_version: 'gpt5_advanced_v1.0',
                predictions: allInsights.final_prediction?.probabilities || {},
                tactical_analysis: allInsights.tactical,
                psychological_analysis: allInsights.psychological,
                pattern_analysis: allInsights.patterns,
                confidence_score: allInsights.final_prediction?.confidence || 0.5,
                created_at: new Date().toISOString()
            })

        if (error) {
            console.error('Erreur sauvegarde GPT insights:', error.message)
        }
    }

    /**
     * MÉTHODE PRINCIPALE - ANALYSE COMPLÈTE GPT
     */
    async runCompleteGPTAnalysis(matchId, homeTeamId, awayTeamId) {
        console.log(`🚀 GPT-5 Analyse complète match ${matchId}`)
        
        try {
            // 1. Récupération données
            const [homeTeam, awayTeam, context, historicalData] = await Promise.all([
                this.getTeamAdvancedData(homeTeamId),
                this.getTeamAdvancedData(awayTeamId),
                this.getMatchAdvancedContext(matchId),
                this.getHistoricalPatterns(homeTeamId, awayTeamId)
            ])

            console.log('📊 Données récupérées, lancement analyses GPT...')

            // 2. Analyses parallèles GPT
            const [tacticalAnalysis, psychologicalAnalysis, patterns] = await Promise.all([
                this.analyzeTacticalMatchupAdvanced(homeTeam, awayTeam, context),
                this.analyzePsychologicalFactors(homeTeam, awayTeam, context),
                this.detectAdvancedPatterns({ homeTeam, awayTeam, context }, historicalData)
            ])

            console.log('🧠 Analyses GPT terminées, génération prédiction finale...')

            // 3. Synthèse finale
            const enhancedPrediction = await this.generateEnhancedPrediction(
                matchId, tacticalAnalysis, psychologicalAnalysis, patterns
            )

            console.log('✅ Analyse GPT-5 complète terminée')
            return {
                tactical: tacticalAnalysis,
                psychological: psychologicalAnalysis,
                patterns: patterns,
                prediction: enhancedPrediction,
                confidence: enhancedPrediction?.confidence || 0.5
            }

        } catch (error) {
            console.error('💥 Erreur analyse GPT complète:', error.message)
            throw error
        }
    }

    // Méthodes de récupération données (à implémenter selon votre DB)
    async getTeamAdvancedData(teamId) {
        const { data } = await supabase
            .from('team_features')
            .select('*')
            .eq('team_id', teamId)
            .eq('season', 2024)
            .single()
        return data
    }

    async getMatchAdvancedContext(matchId) {
        const { data } = await supabase
            .from('match_context')
            .select('*')
            .eq('match_id', matchId)
            .single()
        return data || {}
    }

    async getHistoricalPatterns(homeTeamId, awayTeamId) {
        const { data } = await supabase
            .from('matches')
            .select('*')
            .or(`home_team_id.eq.${homeTeamId},away_team_id.eq.${homeTeamId}`)
            .or(`home_team_id.eq.${awayTeamId},away_team_id.eq.${awayTeamId}`)
            .order('date', { ascending: false })
            .limit(10)
        return data || []
    }
}

module.exports = GPTAdvancedAnalyzer

// Test autonome  
if (require.main === module) {
    const analyzer = new GPTAdvancedAnalyzer()
    console.log('🧠 GPT Advanced Analyzer initialisé - Puissance GPT-5 maximale')
    
    // Test avec données exemple
    // analyzer.runCompleteGPTAnalysis('test-match', 'team1', 'team2').then(console.log)
}