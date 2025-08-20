#!/usr/bin/env node

/**
 * SIMPLE LIGUE 1 COLLECTOR - Format CommonJS qui fonctionne
 * Collecte basique données Ligue 1 avec features classement
 */

require('dotenv').config() // Charger variables d'environnement
const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')
const fs = require('fs').promises

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
const API_FOOTBALL_HOST = process.env.API_FOOTBALL_HOST

// Vérifications environnement
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !API_FOOTBALL_KEY) {
    console.error('❌ Variables d\'environnement manquantes')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Constants
const LIGUE1_ID = 61
const CURRENT_SEASON = 2024
const API_DELAY = 200
let apiCallCount = 0

class SimpleLigue1Collector {
    constructor() {
        this.teams = new Map()
        this.progress = { collected: 0, errors: 0 }
    }

    async apiCall(endpoint, params = {}) {
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
            console.log(`📡 API Call ${apiCallCount}: ${endpoint}`)
            return response.data.response
        } catch (error) {
            console.error(`❌ Erreur API ${endpoint}:`, error.message)
            throw error
        }
    }

    async collectFixtures() {
        console.log(`🏆 Collecte fixtures Ligue 1 saison ${CURRENT_SEASON}`)
        
        const fixtures = await this.apiCall('fixtures', {
            league: LIGUE1_ID,
            season: CURRENT_SEASON
        })

        console.log(`📅 ${fixtures.length} fixtures trouvées`)
        
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

    async collectTeamFeatures() {
        console.log('🏪 Collecte équipes & classement Ligue 1')

        // Récupérer classement Ligue 1
        const standings = await this.apiCall('standings', {
            league: LIGUE1_ID,
            season: CURRENT_SEASON
        })

        const teams = standings[0]?.league?.standings[0] || []
        console.log(`📊 ${teams.length} équipes trouvées`)

        for (const teamStanding of teams) {
            await this.collectTeamData(teamStanding)
        }
    }

    async collectTeamData(teamStanding) {
        const team = teamStanding.team
        const standing = teamStanding
        
        console.log(`🔵 Collecte équipe: ${team.name} (${standing.rank}ème)`)
        
        // Stats équipe
        const teamStats = await this.apiCall('teams/statistics', {
            league: LIGUE1_ID,
            season: CURRENT_SEASON,
            team: team.id
        })

        // Calculer features avec classement
        const features = this.calculateTeamFeatures(teamStats, standing)
        
        await this.saveTeamFeatures(team.id, features)
    }

    calculateTeamFeatures(stats, standing) {
        const gamesPlayed = stats.fixtures?.played?.total || 0
        const currentRank = standing.rank
        
        // Calculs motivation selon position
        let motivationZone = 'mid_table'
        let motivationScore = 0.5
        
        if (currentRank <= 3) {
            motivationZone = 'title_race'
            motivationScore = 0.9
        } else if (currentRank <= 6) {
            motivationZone = 'euro_race'
            motivationScore = 0.7
        } else if (currentRank >= 17) {
            motivationZone = 'relegation_battle'
            motivationScore = 0.85
        } else {
            motivationZone = 'safe_zone'
            motivationScore = 0.3 // Ventre mou moins motivé !
        }

        return {
            // FEATURES CLASSEMENT ESSENTIELLES
            current_rank: currentRank,
            points: standing.points || 0,
            points_difference: standing.goalsDiff || 0,
            
            // Motivation & Pression (CLÉ pour surprises)
            motivation_zone: motivationZone,
            motivation_score: motivationScore,
            pressure_score: currentRank <= 3 ? 0.9 : currentRank >= 17 ? 0.8 : 0.3,
            
            // Classifications importantes pour ML
            is_title_contender: currentRank <= 3,
            is_european_contender: currentRank <= 6,
            is_mid_table: currentRank >= 7 && currentRank <= 16,
            is_relegation_candidate: currentRank >= 17,
            
            // Stats basiques
            games_played: gamesPlayed,
            wins: stats.fixtures?.wins?.total || 0,
            draws: stats.fixtures?.draws?.total || 0,
            losses: stats.fixtures?.loses?.total || 0,
            goals_for: stats.goals?.for?.total?.total || 0,
            goals_against: stats.goals?.against?.total?.total || 0,
            
            // Performance calculée
            goals_per_game: gamesPlayed > 0 ? (stats.goals?.for?.total?.total || 0) / gamesPlayed : 0,
            goals_conceded_per_game: gamesPlayed > 0 ? (stats.goals?.against?.total?.total || 0) / gamesPlayed : 0,
            
            // Métadonnées
            raw_stats: stats
        }
    }

    async saveTeamFeatures(teamId, features) {
        const { error } = await supabase
            .from('team_features')
            .upsert({
                team_id: teamId,
                season: CURRENT_SEASON,
                league_id: LIGUE1_ID,
                ...features,
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'team_id,season,league_id',
                ignoreDuplicates: false 
            })

        if (error) {
            console.error(`❌ Erreur sauvegarde équipe ${teamId}:`, error.message)
        }
    }

    async run() {
        console.log('🚀 DÉMARRAGE SIMPLE COLLECTOR LIGUE 1')
        console.log('='.repeat(50))
        
        try {
            // 1. Collecte fixtures
            const fixtures = await this.collectFixtures()
            console.log('✅ Fixtures collectées')
            
            // 2. Collecte équipes avec classement
            await this.collectTeamFeatures()
            console.log('✅ Features équipes collectées')
            
            console.log('\n🎯 COLLECTE TERMINÉE')
            console.log(`📊 ${fixtures.length} matchs collectés`)
            console.log(`📡 ${apiCallCount} appels API utilisés`)
            console.log('✅ Système prêt pour ML avec features classement !')
            
        } catch (error) {
            console.error('💥 Erreur:', error.message)
            process.exit(1)
        }
    }
}

// Exécution
const collector = new SimpleLigue1Collector()
collector.run().catch(console.error)