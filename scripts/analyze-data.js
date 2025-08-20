#!/usr/bin/env node

/**
 * ANALYSE COMPLÈTE DES DONNÉES DISPONIBLES
 * 
 * Script pour examiner toutes les données en base et identifier
 * les features disponibles pour le nouveau moteur de prédiction
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function analyzeData() {
    console.log('🔍 ANALYSE COMPLÈTE DES DONNÉES DISPONIBLES')
    console.log('==========================================')
    
    // 1. Compter les données par table
    console.log('\n📊 DONNÉES EN BASE:')
    
    const tables = ['matches', 'team_features', 'player_features', 'match_statistics', 
                    'match_events', 'match_context', 'coach_features']
    
    const dataCounts = {}
    
    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
            
            if (error) throw error
            
            dataCounts[table] = count || 0
            console.log(`  📋 ${table.padEnd(20)}: ${count || 0} rows`)
        } catch (err) {
            dataCounts[table] = 0
            console.log(`  ❌ ${table.padEnd(20)}: erreur (${err.message})`)
        }
    }
    
    // 2. Analyser team_features en détail
    console.log('\n🏆 TEAM_FEATURES DÉTAIL:')
    const { data: teamFeatures, error: tfError } = await supabase
        .from('team_features')
        .select('*')
        .limit(3)
    
    if (tfError) {
        console.log('  ❌ Erreur récupération team_features:', tfError.message)
    } else if (teamFeatures?.[0]) {
        const sample = teamFeatures[0]
        console.log('  Colonnes disponibles:')
        
        const featureGroups = {
            'Stats de base': ['team_id', 'season', 'current_rank', 'points', 'games_played', 'wins', 'draws', 'losses'],
            'Attaque/Défense': ['goals_for', 'goals_against', 'goals_per_game', 'goals_conceded_per_game', 'shots_per_game', 'xg_for_avg', 'xg_against_avg'],
            'Style tactique': ['possession_avg', 'pressing_intensity', 'tempo_score', 'transition_speed', 'verticality_index'],
            'Motivation/Psycho': ['motivation_zone', 'motivation_score', 'pressure_score', 'expectation_score', 'big_game_mentality'],
            'Forme': ['form_5_points', 'form_10_points', 'volatility_index', 'elo_rating'],
            'Domicile/Extérieur': ['home_advantage', 'away_performance', 'home_wins', 'away_wins'],
            'Set-pieces': ['corners_for', 'corners_against', 'corner_conversion', 'penalties_scored', 'free_kicks_scored'],
            'Contexte': ['distance_from_cl', 'distance_from_europa', 'distance_from_relegation', 'is_title_contender']
        }
        
        Object.entries(featureGroups).forEach(([group, cols]) => {
            console.log(`\n    📈 ${group}:`)
            cols.forEach(col => {
                if (sample[col] !== undefined) {
                    const value = sample[col]
                    const type = typeof value
                    const displayValue = type === 'number' ? Number(value).toFixed(2) : value
                    console.log(`      ✅ ${col.padEnd(25)}: ${type} (${displayValue})`)
                } else {
                    console.log(`      ❌ ${col.padEnd(25)}: manquant`)
                }
            })
        })
    }
    
    // 3. Vérifier les saisons disponibles
    console.log('\n📅 SAISONS DISPONIBLES:')
    const { data: seasons } = await supabase
        .from('matches')
        .select('season')
        .not('season', 'is', null)
    
    const uniqueSeasons = [...new Set(seasons?.map(s => s.season) || [])]
    console.log('  Saisons matchs:', uniqueSeasons.join(', '))
    
    // 4. Stats équipes avec le plus de données
    console.log('\n🔥 ÉQUIPES AVEC LE PLUS DE DONNÉES:')
    const { data: topTeams } = await supabase
        .from('team_features')
        .select('team_id, season, goals_per_game, possession_avg, elo_rating, motivation_score, current_rank')
        .not('goals_per_game', 'is', null)
        .order('goals_per_game', { ascending: false })
        .limit(8)
    
    if (topTeams?.length) {
        topTeams.forEach(team => {
            console.log(`  🏆 Team ${String(team.team_id).padEnd(3)} (S${team.season}): ${team.goals_per_game} buts/match, ${team.possession_avg}% possess, ELO: ${team.elo_rating}, Rank: ${team.current_rank}`)
        })
    }
    
    // 5. Analyser la richesse des données match_statistics
    console.log('\n⚽ MATCH_STATISTICS SAMPLE:')
    const { data: matchStats } = await supabase
        .from('match_statistics')
        .select('*')
        .limit(2)
    
    if (matchStats?.[0]) {
        const statsSample = matchStats[0]
        console.log('  Features statistiques disponibles:')
        Object.keys(statsSample).forEach(key => {
            if (!['id', 'match_id', 'team_id', 'team_name', 'created_at', 'raw_data'].includes(key)) {
                console.log(`    📊 ${key.padEnd(25)}: ${statsSample[key]}`)
            }
        })
    }
    
    // 6. Analyser match_events pour patterns de buts
    console.log('\n⚽ EVENTS PATTERNS:')
    const { data: goalEvents } = await supabase
        .from('match_events')
        .select('type, time_elapsed, detail')
        .eq('type', 'Goal')
        .limit(5)
    
    if (goalEvents?.length) {
        console.log('  Échantillon buts:')
        goalEvents.forEach(goal => {
            console.log(`    ⚽ ${goal.time_elapsed}min - ${goal.detail}`)
        })
    }
    
    // 7. Recommandations basées sur les données
    console.log('\n💡 RECOMMANDATIONS POUR NOUVEAU MOTEUR:')
    console.log('=====================================')
    
    if (dataCounts.team_features > 0) {
        console.log('✅ Team features disponibles - Utiliser pour calculs avancés')
    }
    
    if (dataCounts.match_statistics > 0) {
        console.log('✅ Stats matchs disponibles - Intégrer xG, possession, tirs')
    }
    
    if (dataCounts.match_events > 0) {
        console.log('✅ Events disponibles - Analyser patterns temporels buts')
    }
    
    if (dataCounts.player_features > 0) {
        console.log('✅ Features joueurs - Personnaliser buteurs probables')
    }
    
    if (dataCounts.matches > 100) {
        console.log('✅ Historique suffisant - Implémenter backtesting')
    }
    
    console.log('\n🎯 PROCHAINES ÉTAPES:')
    console.log('1. Créer moteur basé sur team_features réelles')
    console.log('2. Intégrer xG et stats avancées pour probabilités')
    console.log('3. Utiliser historique pour calibrer avantage domicile')
    console.log('4. Implémenter scoring de confiance dynamique')
    console.log('5. Personnaliser analyses selon vraies caractéristiques')
}

// Exécution
analyzeData().catch(console.error)