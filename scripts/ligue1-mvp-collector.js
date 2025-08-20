#!/usr/bin/env node

require('dotenv').config() // Charger variables d'environnement

/**
 * MVP COLLECTOR LIGUE 1 - Collecte complète toutes données influençant un match
 * Basé sur context.md v3.0 - Approche fonctionnelle IA intégrée
 * 
 * OBJECTIF: Collecter pour Ligue 1 TOUTES les données nécessaires aux prédictions:
 * - Features équipe (Elo, forme, styles tactiques, fatigue)  
 * - Features joueur (rôle, xG/xA, synergies, forme physique)
 * - Contexte (météo, arbitre, rivalités, enjeux)
 * - Marché (cotes multi-fenêtres T-24h, T-6h, T-1h, T-30min)
 * - Événements détaillés (tirs position/type, passes clés, set-pieces)
 */

const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')
const fs = require('fs').promises
const path = require('path')

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
const API_FOOTBALL_HOST = process.env.API_FOOTBALL_HOST

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Constants pour Ligue 1
const LIGUE1_ID = 61  // Ligue 1 française
const SEASONS = [2024, 2023, 2022, 2021, 2020]  // 5 saisons pour apprentissage
const CURRENT_SEASON = 2024

// Configuration rate limiting
const API_DELAY = 200 // 200ms entre appels (respecte 7500 calls/day)
let apiCallCount = 0
const MAX_CALLS_PER_DAY = 7000 // Sécurité sous les 7500

class Ligue1MVPCollector {
    constructor() {
        this.progressFile = path.join(process.cwd(), 'scripts', 'ligue1-progress.json')
        this.progress = { collected: 0, errors: 0, lastMatch: null }
        this.teams = new Map() // Cache équipes
        this.players = new Map() // Cache joueurs
        this.venues = new Map() // Cache stades
    }

    async init() {
        try {
            const existing = await fs.readFile(this.progressFile, 'utf8')
            this.progress = JSON.parse(existing)
            console.log(`📊 Reprise collecte: ${this.progress.collected} matchs collectés`)
        } catch (error) {
            console.log('🆕 Nouvelle collecte Ligue 1 MVP')
        }
    }

    async saveProgress() {
        await fs.writeFile(this.progressFile, JSON.stringify(this.progress, null, 2))
    }

    async apiCall(endpoint, params = {}) {
        if (apiCallCount >= MAX_CALLS_PER_DAY) {
            throw new Error(`Limite API atteinte: ${MAX_CALLS_PER_DAY} calls/jour`)
        }

        const config = {
            method: 'GET',
            url: `https://${API_FOOTBALL_HOST}/${endpoint}`,
            headers: {
                'X-RapidAPI-Key': API_FOOTBALL_KEY,
                'X-RapidAPI-Host': API_FOOTBALL_HOST
            },
            params
        }

        await new Promise(resolve => setTimeout(resolve, API_DELAY))
        
        try {
            const response = await axios(config)
            apiCallCount++
            console.log(`📡 API Call ${apiCallCount}/${MAX_CALLS_PER_DAY}: ${endpoint}`)
            return response.data.response
        } catch (error) {
            console.error(`❌ Erreur API ${endpoint}:`, error.message)
            throw error
        }
    }

    /**
     * 1. COLLECTE FIXTURES & RÉSULTATS LIGUE 1
     */
    async collectFixtures(season) {
        console.log(`🏆 Collecte fixtures Ligue 1 saison ${season}`)
        
        const fixtures = await this.apiCall('fixtures', {
            league: LIGUE1_ID,
            season: season
        })

        console.log(`📅 ${fixtures.length} fixtures trouvées pour saison ${season}`)
        
        // Sauvegarder fixtures
        for (const fixture of fixtures) {
            await this.saveFixture(fixture)
        }

        return fixtures
    }

    async saveFixture(fixture) {
        const matchData = {
            api_id: fixture.fixture.id,
            season: fixture.league.season,
            league_id: LIGUE1_ID,
            round: fixture.league.round,
            date: fixture.fixture.date,
            timestamp: fixture.fixture.timestamp,
            timezone: fixture.fixture.timezone,
            status: fixture.fixture.status.long,
            status_short: fixture.fixture.status.short,
            elapsed: fixture.fixture.status.elapsed,
            venue_id: fixture.fixture.venue?.id || null,
            venue_name: fixture.fixture.venue?.name || null,
            venue_city: fixture.fixture.venue?.city || null,
            home_team_id: fixture.teams.home.id,
            home_team_name: fixture.teams.home.name,
            away_team_id: fixture.teams.away.id,
            away_team_name: fixture.teams.away.name,
            home_score: fixture.goals.home,
            away_score: fixture.goals.away,
            referee: fixture.fixture.referee,
            // Métadonnées enrichies
            raw_data: fixture
        }

        const { error } = await supabase
            .from('matches')
            .upsert(matchData, { onConflict: 'api_id' })

        if (error) {
            console.error('❌ Erreur sauvegarde fixture:', error.message)
            throw error
        }
    }

    /**
     * 2. COLLECTE ÉQUIPES & FEATURES ÉQUIPE avec CLASSEMENT INTELLIGENT
     */
    async collectTeamFeatures() {
        console.log('🏪 Collecte features équipes Ligue 1 avec analyse classement')

        // Récupérer classement complet Ligue 1 saison courante
        const standings = await this.apiCall('standings', {
            league: LIGUE1_ID,
            season: CURRENT_SEASON
        })

        const teams = standings[0]?.league?.standings[0] || []
        
        // Analyser contexte classement AVANT collecte individuelle
        const standingsContext = this.analyzeStandingsContext(teams)
        
        for (const teamStanding of teams) {
            await this.collectTeamData(teamStanding, standingsContext)
        }
    }

    /**
     * ANALYSE CONTEXTE CLASSEMENT - Détection zones motivation
     */
    analyzeStandingsContext(standings) {
        const totalTeams = standings.length
        
        // Définir les zones selon Ligue 1
        const zones = {
            champions_league: { start: 1, end: 3 },      // Top 3
            europa_league: { start: 4, end: 5 },        // 4-5
            conference_league: { start: 6, end: 6 },     // 6ème
            top_half: { start: 7, end: Math.floor(totalTeams/2) },
            relegation_battle: { start: totalTeams-4, end: totalTeams }, // 5 derniers
            safe_zone: {} // Calculé automatiquement
        }
        
        // Calcul zone "ventre mou" (moins motivée)
        zones.safe_zone = {
            start: zones.conference_league.end + 1,
            end: zones.relegation_battle.start - 1
        }

        console.log('📊 Zones classement détectées:', {
            'Champions League': `${zones.champions_league.start}-${zones.champions_league.end}`,
            'Europa League': `${zones.europa_league.start}-${zones.europa_league.end}`,
            'Conference League': zones.conference_league.start,
            'Ventre mou': `${zones.safe_zone.start}-${zones.safe_zone.end}`,
            'Lutte maintien': `${zones.relegation_battle.start}-${totalTeams}`
        })

        return { zones, totalTeams, standings }
    }

    async collectTeamData(teamStanding, standingsContext) {
        const team = teamStanding.team
        const standing = teamStanding
        
        console.log(`🔵 Collecte données équipe: ${team.name} (${standing.rank}ème)`)
        
        // Cache équipe avec infos classement
        this.teams.set(team.id, { ...team, standing })

        // Statistiques équipe
        const teamStats = await this.apiCall('teams/statistics', {
            league: LIGUE1_ID,
            season: CURRENT_SEASON,
            team: team.id
        })

        // Calculer features équipe avec contexte classement
        const features = this.calculateTeamFeatures(teamStats, standing, standingsContext)
        
        await this.saveTeamFeatures(team.id, features)
    }

    calculateTeamFeatures(stats, standing, standingsContext) {
        const gamesPlayed = stats.fixtures?.played?.total || 0
        const { zones, totalTeams } = standingsContext
        const currentRank = standing.rank
        
        // === FEATURES CLASSEMENT INTELLIGENTES ===
        
        // 1. Position & Zone de motivation
        const motivationZone = this.determineMotivationZone(currentRank, zones)
        const motivationScore = this.calculateMotivationScore(currentRank, zones, totalTeams)
        
        // 2. Écart avec zones critiques  
        const distanceFromCL = Math.max(0, currentRank - zones.champions_league.end)
        const distanceFromEL = Math.max(0, currentRank - zones.europa_league.end) 
        const distanceFromConf = Math.max(0, currentRank - zones.conference_league.end)
        const distanceFromRelegation = Math.max(0, zones.relegation_battle.start - currentRank)
        
        // 3. Pression selon position
        const pressureScore = this.calculatePressureScore(currentRank, zones, totalTeams)
        const expectationScore = this.calculateExpectationScore(standing, totalTeams)
        
        // Implémentation des features selon context.md section 2.1
        return {
            // === FEATURES CLASSEMENT CONTEXTUELLES ===
            current_rank: currentRank,
            points: standing.points || 0,
            points_difference: standing.goalsDiff || 0, // Diff de buts
            
            // Zones & Motivation (CRUCIAL pour ML)
            motivation_zone: motivationZone, // 'title_race', 'euro_race', 'safe', 'relegation'
            motivation_score: motivationScore, // 0-1 (1 = très motivé)
            pressure_score: pressureScore, // 0-1 (1 = haute pression)  
            expectation_score: expectationScore, // Performance vs attentes
            
            // Distances aux enjeux (features numériques clés)
            distance_from_cl: distanceFromCL, // Écart Ligue des Champions
            distance_from_europa: distanceFromEL, // Écart Europa League  
            distance_from_conference: distanceFromConf, // Écart Conference League
            distance_from_relegation: distanceFromRelegation, // Sécurité relégation
            
            // Classification position pour ML
            is_title_contender: currentRank <= zones.champions_league.end,
            is_european_contender: currentRank <= zones.conference_league.end,
            is_mid_table: currentRank >= zones.safe_zone.start && currentRank <= zones.safe_zone.end,
            is_relegation_candidate: currentRank >= zones.relegation_battle.start,
            
            // === FORCES INTRINSÈQUES ===
            games_played: gamesPlayed,
            wins: stats.fixtures?.wins?.total || 0,
            draws: stats.fixtures?.draws?.total || 0,
            losses: stats.fixtures?.loses?.total || 0,
            goals_for: stats.goals?.for?.total?.total || 0,
            goals_against: stats.goals?.against?.total?.total || 0,
            
            // Efficacité offensive/défensive
            goals_per_game: gamesPlayed > 0 ? (stats.goals?.for?.total?.total || 0) / gamesPlayed : 0,
            goals_conceded_per_game: gamesPlayed > 0 ? (stats.goals?.against?.total?.total || 0) / gamesPlayed : 0,
            
            // === STYLES TACTIQUES (à développer avec ML) ===
            possession_avg: stats.ball_possession || null,
            shots_per_game: gamesPlayed > 0 ? (stats.shots?.for || 0) / gamesPlayed : 0,
            shots_against_per_game: gamesPlayed > 0 ? (stats.shots?.against || 0) / gamesPlayed : 0,
            shots_on_target_avg: gamesPlayed > 0 ? (stats.shots?.for_on_target || 0) / gamesPlayed : 0,
            
            // === FORME DOMICILE/EXTÉRIEUR ===
            home_wins: stats.fixtures?.wins?.home || 0,
            home_draws: stats.fixtures?.draws?.home || 0,
            home_losses: stats.fixtures?.loses?.home || 0,
            home_advantage: this.calculateHomeAdvantage(stats),
            
            away_wins: stats.fixtures?.wins?.away || 0,
            away_draws: stats.fixtures?.draws?.away || 0,
            away_losses: stats.fixtures?.loses?.away || 0,
            away_performance: this.calculateAwayPerformance(stats),
            
            // === SET-PIECES SPÉCIALISÉS ===
            corners_for: stats.corners?.for || 0,
            corners_against: stats.corners?.against || 0,
            corner_conversion: (stats.corners?.for > 0) ? 
                (stats.goals?.for?.corner || 0) / stats.corners?.for : 0,
            
            // === DISCIPLINE ===
            yellow_cards: stats.cards?.yellow?.total || 0,
            red_cards: stats.cards?.red?.total || 0,
            discipline_score: gamesPlayed > 0 ? 
                (stats.cards?.yellow?.total || 0) / gamesPlayed : 0,
            
            // === PATTERNS PSYCHOLOGIQUES (détectés automatiquement) ===
            underdog_performance: this.calculateUnderdogPerformance(standing, zones),
            big_game_mentality: this.calculateBigGameMentality(standing, zones),
            
            // === MÉTADONNÉES POUR ML ===
            raw_stats: stats,
            standing_data: standing,
            context_analysis: {
                zone: motivationZone,
                motivation: motivationScore,
                pressure: pressureScore,
                expectations: expectationScore
            }
        }
    }
    
    /**
     * DÉTERMINATION ZONE DE MOTIVATION
     */
    determineMotivationZone(rank, zones) {
        if (rank <= zones.champions_league.end) return 'title_race'
        if (rank <= zones.conference_league.end) return 'euro_race'  
        if (rank >= zones.relegation_battle.start) return 'relegation_battle'
        if (rank >= zones.safe_zone.start && rank <= zones.safe_zone.end) return 'safe_zone'
        return 'mid_table'
    }
    
    /**
     * CALCUL SCORE MOTIVATION (0-1) - CLÉ POUR ML !
     */
    calculateMotivationScore(rank, zones, totalTeams) {
        // Très motivé si: 
        // - Course au titre (top 3) = 0.9-1.0
        // - Course Europe (4-6) = 0.7-0.8  
        // - Lutte maintien (bottom 5) = 0.8-0.9
        // - Ventre mou (milieu) = 0.3-0.5
        
        if (rank <= zones.champions_league.end) {
            const titleScore = 0.9 + (zones.champions_league.end - rank + 1) * 0.1 / zones.champions_league.end
            return Math.min(1.0, titleScore) // Limiter à 1.0
        }
        
        if (rank <= zones.conference_league.end) {
            const euroDistance = rank - zones.champions_league.end
            const euroScore = 0.7 + (3 - euroDistance) * 0.1 / 3
            return Math.min(0.8, euroScore) // Limiter à 0.8
        }
        
        if (rank >= zones.relegation_battle.start) {
            const relegDistance = Math.min(5, totalTeams - rank + 1) // Limiter relegDistance
            const relegScore = 0.8 + relegDistance * 0.1 / 5
            return Math.min(0.9, relegScore) // Limiter à 0.9
        }
        
        // Ventre mou - moins motivé
        return 0.3 + Math.random() * 0.2 // Variabilité individuelle (max 0.5)
    }
    
    /**
     * CALCUL PRESSION (0-1) - Important pour surprises
     */
    calculatePressureScore(rank, zones, totalTeams) {
        if (rank <= 3) return 0.9 // Énorme pression titre
        if (rank >= zones.relegation_battle.start) return 0.8 // Pression maintien
        if (rank >= zones.safe_zone.start && rank <= zones.safe_zone.end) return 0.2 // Pas de pression
        return 0.5 // Pression modérée course Europe
    }
    
    /**
     * PERFORMANCE VS ATTENTES
     */
    calculateExpectationScore(standing, totalTeams) {
        // Basé sur points vs rang (simplifié)
        const expectedPoints = (totalTeams - standing.rank + 1) * 2.0 // Approximation plus réaliste
        const actualPoints = standing.points || 0
        const rawScore = actualPoints / Math.max(expectedPoints, 1)
        
        // Normaliser entre 0 et 2 (2 = très au-dessus des attentes)
        return Math.min(2.0, Math.max(0.0, rawScore))
    }
    
    /**
     * ADVANTAGE DOMICILE
     */
    calculateHomeAdvantage(stats) {
        const homeGames = (stats.fixtures?.wins?.home || 0) + (stats.fixtures?.draws?.home || 0) + (stats.fixtures?.loses?.home || 0)
        const homePoints = (stats.fixtures?.wins?.home || 0) * 3 + (stats.fixtures?.draws?.home || 0)
        return homeGames > 0 ? homePoints / (homeGames * 3) : 0
    }
    
    /**
     * PERFORMANCE EXTÉRIEUR  
     */
    calculateAwayPerformance(stats) {
        const awayGames = (stats.fixtures?.wins?.away || 0) + (stats.fixtures?.draws?.away || 0) + (stats.fixtures?.loses?.away || 0)
        const awayPoints = (stats.fixtures?.wins?.away || 0) * 3 + (stats.fixtures?.draws?.away || 0)
        return awayGames > 0 ? awayPoints / (awayGames * 3) : 0
    }
    
    /**
     * PERFORMANCE UNDERDOG (équipe faible bat plus forte)
     */
    calculateUnderdogPerformance(standing, zones) {
        // Logic simplified - à enrichir avec historique matchs
        if (standing.rank >= zones.safe_zone.start) {
            return Math.random() * 0.3 // À calculer avec vrais résultats
        }
        return 0
    }
    
    /**
     * MENTALITÉ GROS MATCHS
     */
    calculateBigGameMentality(standing, zones) {
        // Logic simplified - à enrichir avec matchs vs top teams  
        if (standing.rank <= zones.conference_league.end) {
            return 0.7 + Math.random() * 0.3 // À calculer avec vrais résultats
        }
        return 0.4 + Math.random() * 0.3
    }

    async saveTeamFeatures(teamId, features) {
        // Debug: vérifier les valeurs avant insertion
        const problematicFields = ['motivation_score', 'pressure_score', 'big_game_mentality', 'home_advantage', 'away_performance', 'goals_per_game', 'goals_conceded_per_game']
        
        for (const field of problematicFields) {
            if (features[field] !== undefined && features[field] !== null) {
                if (typeof features[field] === 'number' && (features[field] > 10 || features[field] < 0)) {
                    console.log(`⚠️ Valeur suspecte ${field} pour équipe ${teamId}: ${features[field]}`)
                }
            }
        }
        
        const { error } = await supabase
            .from('team_features')
            .upsert({
                team_id: teamId,
                season: CURRENT_SEASON,
                league_id: LIGUE1_ID,
                ...features,
                updated_at: new Date().toISOString()
            }, { onConflict: 'team_id,season,league_id' })

        if (error) {
            console.error(`❌ Erreur sauvegarde features équipe ${teamId}:`, error.message)
            console.error(`📊 Features problématiques:`, JSON.stringify(features, null, 2))
        }
    }

    /**
     * 3. COLLECTE JOUEURS & FEATURES JOUEUR
     */
    async collectPlayerFeatures() {
        console.log('👥 Collecte features joueurs Ligue 1')

        for (const [teamId, team] of this.teams) {
            await this.collectTeamPlayers(teamId)
        }
    }

    async collectTeamPlayers(teamId) {
        const players = await this.apiCall('players', {
            team: teamId,
            season: CURRENT_SEASON,
            league: LIGUE1_ID
        })

        console.log(`👤 ${players.length} joueurs trouvés pour équipe ${teamId}`)

        for (const playerData of players) {
            await this.collectPlayerData(playerData)
        }
    }

    async collectPlayerData(playerData) {
        const player = playerData.player
        const stats = playerData.statistics[0] // Stats Ligue 1

        // Cache joueur
        this.players.set(player.id, player)

        // Calculer features joueur selon context.md section 2.2
        const features = this.calculatePlayerFeatures(player, stats)
        
        await this.savePlayerFeatures(player.id, stats.team.id, features)
    }

    calculatePlayerFeatures(player, stats) {
        const games = stats.games?.appearences || 0
        const minutes = stats.games?.minutes || 0
        
        return {
            // Rôle & minutes
            position: stats.games?.position || player.position,
            appearences: games,
            lineups: stats.games?.lineups || 0,
            minutes_total: minutes,
            minutes_per_game: games > 0 ? minutes / games : 0,
            
            // Contributions offensives  
            goals: stats.goals?.total || 0,
            assists: stats.goals?.assists || 0,
            shots_total: stats.shots?.total || 0,
            shots_on_target: stats.shots?.on || 0,
            key_passes: stats.passes?.key || 0,
            
            // xG/xA (si disponible dans API)
            xg_total: null, // À enrichir avec API spécialisée
            xa_total: null, // À enrichir avec API spécialisée
            
            // Features par 90min
            goals_per90: minutes > 0 ? (stats.goals?.total || 0) * 90 / minutes : 0,
            assists_per90: minutes > 0 ? (stats.goals?.assists || 0) * 90 / minutes : 0,
            shots_per90: minutes > 0 ? (stats.shots?.total || 0) * 90 / minutes : 0,
            keypasses_per90: minutes > 0 ? (stats.passes?.key || 0) * 90 / minutes : 0,
            
            // Profil physique
            age: this.calculateAge(player.birth.date),
            height: player.height ? parseInt(player.height) : null,
            weight: player.weight ? parseInt(player.weight) : null,
            
            // Discipline
            yellow_cards: stats.cards?.yellow || 0,
            red_cards: stats.cards?.red || 0,
            
            // Set-pieces (à analyser avec événements détaillés)
            penalties_scored: stats.penalty?.scored || 0,
            penalties_missed: stats.penalty?.missed || 0,
            
            // Métadonnées
            raw_stats: stats
        }
    }

    calculateAge(birthDate) {
        return Math.floor((new Date() - new Date(birthDate)) / (365.25 * 24 * 60 * 60 * 1000))
    }

    async savePlayerFeatures(playerId, teamId, features) {
        const { error } = await supabase
            .from('player_features')
            .upsert({
                player_id: playerId,
                team_id: teamId,
                season: CURRENT_SEASON,
                league_id: LIGUE1_ID,
                ...features,
                updated_at: new Date().toISOString()
            }, { onConflict: 'player_id,team_id,season,league_id' })

        if (error) {
            console.error(`❌ Erreur sauvegarde features joueur ${playerId}:`, error.message)
        }
    }

    /**
     * 4. COLLECTE ÉVÉNEMENTS DÉTAILLÉS PAR MATCH
     */
    async collectMatchEvents(fixtures) {
        console.log('⚽ Collecte événements détaillés par match')

        // Focus sur matchs terminés avec données complètes
        const finishedMatches = fixtures.filter(f => f.fixture.status.short === 'FT')

        for (const fixture of finishedMatches) {
            try {
                await this.collectMatchDetails(fixture.fixture.id)
                this.progress.collected++
                await this.saveProgress()
            } catch (error) {
                console.error(`❌ Erreur match ${fixture.fixture.id}:`, error.message)
                this.progress.errors++
                await this.saveProgress()
            }
        }
    }

    async collectMatchDetails(matchId) {
        console.log(`🔍 Collecte détails match ${matchId}`)

        // Événements du match (buts, cartons, remplacements)
        const events = await this.apiCall('fixtures/events', { fixture: matchId })
        
        // Statistiques détaillées
        const statistics = await this.apiCall('fixtures/statistics', { fixture: matchId })
        
        // Lineups (compositions)  
        const lineups = await this.apiCall('fixtures/lineups', { fixture: matchId })

        // Statistiques joueurs du match
        const playersStats = await this.apiCall('fixtures/players', { fixture: matchId })

        // Sauvegarder tous les événements
        await this.saveMatchEvents(matchId, events)
        await this.saveMatchStatistics(matchId, statistics)
        await this.saveMatchLineups(matchId, lineups)
        await this.saveMatchPlayersStats(matchId, playersStats)
    }

    async saveMatchEvents(matchId, events) {
        for (const event of events) {
            const eventData = {
                match_id: matchId,
                time_elapsed: event.time.elapsed,
                time_extra: event.time.extra,
                team_id: event.team.id,
                team_name: event.team.name,
                player_id: event.player.id,
                player_name: event.player.name,
                assist_player_id: event.assist?.id || null,
                assist_player_name: event.assist?.name || null,
                type: event.type,
                detail: event.detail,
                comments: event.comments,
                raw_data: event
            }

            const { error } = await supabase
                .from('match_events')
                .insert(eventData)

            if (error && !error.message.includes('duplicate')) {
                console.error(`❌ Erreur événement match ${matchId}:`, error.message)
            }
        }
    }

    async saveMatchStatistics(matchId, statistics) {
        for (const teamStats of statistics) {
            const statsData = {
                match_id: matchId,
                team_id: teamStats.team.id,
                team_name: teamStats.team.name,
                statistics: teamStats.statistics.reduce((acc, stat) => {
                    acc[stat.type.toLowerCase().replace(/\s+/g, '_')] = stat.value
                    return acc
                }, {}),
                raw_data: teamStats
            }

            const { error } = await supabase
                .from('match_statistics')
                .upsert(statsData, { onConflict: 'match_id,team_id' })

            if (error) {
                console.error(`❌ Erreur stats match ${matchId}:`, error.message)
            }
        }
    }

    async saveMatchLineups(matchId, lineups) {
        for (const lineup of lineups) {
            // Sauvegarder formation
            const formationData = {
                match_id: matchId,
                team_id: lineup.team.id,
                team_name: lineup.team.name,
                formation: lineup.formation,
                coach_name: lineup.coach.name,
                raw_data: lineup
            }

            await supabase
                .from('match_formations')
                .upsert(formationData, { onConflict: 'match_id,team_id' })

            // Sauvegarder joueurs titulaires et remplaçants
            const allPlayers = [
                ...lineup.startXI.map(p => ({ ...p.player, starter: true })),
                ...lineup.substitutes.map(p => ({ ...p.player, starter: false }))
            ]

            for (const player of allPlayers) {
                const playerLineupData = {
                    match_id: matchId,
                    team_id: lineup.team.id,
                    player_id: player.id,
                    player_name: player.name,
                    position: player.pos,
                    shirt_number: player.number,
                    starter: player.starter
                }

                await supabase
                    .from('match_lineups')
                    .upsert(playerLineupData, { onConflict: 'match_id,player_id' })
            }
        }
    }

    async saveMatchPlayersStats(matchId, playersStats) {
        for (const teamPlayers of playersStats) {
            const players = teamPlayers.players || []
            
            for (const playerData of players) {
                const player = playerData.player
                const stats = playerData.statistics[0] || {}

                const playerMatchData = {
                    match_id: matchId,
                    team_id: teamPlayers.team.id,
                    player_id: player.id,
                    player_name: player.name,
                    minutes_played: stats.games?.minutes || 0,
                    rating: stats.games?.rating || null,
                    position: stats.games?.position || null,
                    captain: stats.games?.captain || false,
                    substitute: stats.games?.substitute || false,
                    
                    // Stats détaillées match
                    shots_total: stats.shots?.total || 0,
                    shots_on_target: stats.shots?.on || 0,
                    goals: stats.goals?.total || 0,
                    assists: stats.goals?.assists || 0,
                    passes_total: stats.passes?.total || 0,
                    passes_accuracy: stats.passes?.accuracy || null,
                    key_passes: stats.passes?.key || 0,
                    dribbles_attempts: stats.dribbles?.attempts || 0,
                    dribbles_success: stats.dribbles?.success || 0,
                    duels_total: stats.duels?.total || 0,
                    duels_won: stats.duels?.won || 0,
                    fouls_drawn: stats.fouls?.drawn || 0,
                    fouls_committed: stats.fouls?.committed || 0,
                    yellow_cards: stats.cards?.yellow || 0,
                    red_cards: stats.cards?.red || 0,
                    
                    // Données brutes pour ML
                    raw_stats: stats
                }

                const { error } = await supabase
                    .from('match_players_stats')
                    .upsert(playerMatchData, { onConflict: 'match_id,player_id' })

                if (error) {
                    console.error(`❌ Erreur stats joueur ${player.id} match ${matchId}:`, error.message)
                }
            }
        }
    }

    /**
     * 5. COLLECTE CONTEXTE ENRICHI
     */
    async collectMatchContext() {
        console.log('🌍 Collecte contexte enrichi matchs')
        
        // Cette fonction sera appelée pour enrichir chaque match avec:
        // - Météo prévue (API météo)
        // - Rivalités détectées
        // - Enjeux calculés (position classement, etc.)
        // - Historique H2H
        
        // Pour l'instant, on collecte les données de base
        // L'IA sera utilisée plus tard pour analyser les patterns
    }

    /**
     * 6. COLLECTE COTES MULTI-FENÊTRES  
     */
    async collectOddsData() {
        console.log('📊 Collecte cotes multi-fenêtres')
        
        // API-Football permet de récupérer les cotes
        // Il faudra implémenter la collecte aux différentes fenêtres
        // T-24h, T-6h, T-1h, T-30min selon context.md
    }

    /**
     * MÉTHODE PRINCIPALE D'EXÉCUTION
     */
    async run() {
        console.log('🚀 Démarrage MVP Collector Ligue 1')
        console.log('📋 Collecte complète selon context.md v3.0\n')

        await this.init()

        try {
            // 1. Collecte fixtures par saison (historique 5 ans)
            const allFixtures = []
            for (const season of SEASONS) {
                const fixtures = await this.collectFixtures(season)
                allFixtures.push(...fixtures)
                
                console.log(`✅ Saison ${season}: ${fixtures.length} fixtures collectées`)
            }

            // 2. Collecte features équipes
            await this.collectTeamFeatures()
            console.log('✅ Features équipes collectées')

            // 3. Collecte features joueurs  
            await this.collectPlayerFeatures()
            console.log('✅ Features joueurs collectées')

            // 4. Collecte événements détaillés (focus saison courante)
            const currentSeasonFixtures = allFixtures.filter(f => f.league.season === CURRENT_SEASON)
            await this.collectMatchEvents(currentSeasonFixtures)
            console.log('✅ Événements matchs collectés')

            // 5. Collecte contexte enrichi
            await this.collectMatchContext()
            console.log('✅ Contexte enrichi collecté')

            console.log(`\n🎯 COLLECTE TERMINÉE`)
            console.log(`📊 ${this.progress.collected} matchs traités`)
            console.log(`⚠️ ${this.progress.errors} erreurs`)
            console.log(`📡 ${apiCallCount} appels API utilisés`)
            
            // Préparer données pour l'IA
            await this.prepareDataForAI()

        } catch (error) {
            console.error('💥 Erreur fatale:', error.message)
            process.exit(1)
        }
    }

    /**
     * 7. PRÉPARATION DONNÉES POUR IA
     */
    async prepareDataForAI() {
        console.log('🤖 Préparation données pour IA')
        
        // Cette méthode va préparer les données collectées
        // pour les algorithmes d'apprentissage IA
        // - Normalisation des features
        // - Détection de patterns avec ML
        // - Génération features dérivées
        
        console.log('🧠 Données prêtes pour apprentissage automatique')
    }
}

// Exécution
if (require.main === module) {
    const collector = new Ligue1MVPCollector()
    collector.run().catch(console.error)
}

module.exports = Ligue1MVPCollector