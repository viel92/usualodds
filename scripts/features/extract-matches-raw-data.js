#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function extractMatchesRawData() {
    console.log('\n=== EXTRACTION MATCHES.RAW_DATA - 1760 RECORDS ===\n')
    
    try {
        // 1. Récupérer tous les matches avec raw_data
        console.log('1. 📊 RÉCUPÉRATION MATCHES RAW_DATA:')
        
        let allMatches = []
        let page = 0
        const pageSize = 1000
        
        while (true) {
            const { data: pageData, error: pageError } = await supabase
                .from('matches')
                .select('id, home_team_name, away_team_name, date, season, raw_data')
                .not('raw_data', 'is', null)
                .range(page * pageSize, (page + 1) * pageSize - 1)
            
            if (pageError) {
                console.log(`   ❌ Erreur page ${page + 1}: ${pageError.message}`)
                break
            }
            
            if (!pageData || pageData.length === 0) break
            allMatches.push(...pageData)
            
            console.log(`   Page ${page + 1}: ${pageData.length} matches (total: ${allMatches.length})`)
            
            if (pageData.length < pageSize) break
            page++
        }
        
        console.log(`   ✅ Total matches avec raw_data: ${allMatches.length}`)
        
        // 2. Analyser structure raw_data
        console.log('\n2. 🔍 ANALYSE STRUCTURE RAW_DATA:')
        
        if (allMatches.length > 0) {
            const sampleRawData = allMatches[0].raw_data
            console.log(`   Échantillon match: ${allMatches[0].home_team_name} vs ${allMatches[0].away_team_name}`)
            console.log('   📋 Structure JSON:')
            
            function exploreRawData(obj, indent = '     ') {
                Object.entries(obj).forEach(([key, value]) => {
                    if (typeof value === 'object' && value !== null) {
                        console.log(`${indent}${key}:`)
                        if (Array.isArray(value)) {
                            console.log(`${indent}  [array: ${value.length} items]`)
                            if (value.length > 0 && typeof value[0] === 'object') {
                                console.log(`${indent}    Sample: ${Object.keys(value[0]).join(', ')}`)
                            }
                        } else {
                            Object.entries(value).slice(0, 3).forEach(([subKey, subValue]) => {
                                console.log(`${indent}  ${subKey}: ${JSON.stringify(subValue).substring(0, 50)}...`)
                            })
                        }
                    } else {
                        console.log(`${indent}${key}: ${JSON.stringify(value)}`)
                    }
                })
            }
            
            exploreRawData(sampleRawData)
        }
        
        // 3. Extraction des features ML critiques
        console.log('\n3. 🔧 EXTRACTION FEATURES ML:')
        
        const extractedMatches = []
        
        allMatches.forEach(match => {
            if (match.raw_data) {
                const rawData = match.raw_data
                
                // Helper pour accéder aux nested values
                const getValue = (obj, path) => {
                    try {
                        return path.split('.').reduce((current, key) => current?.[key], obj)
                    } catch {
                        return null
                    }
                }
                
                // Extraire features critiques du raw_data
                const extractedFeatures = {
                    match_id: match.id,
                    home_team_name: match.home_team_name,
                    away_team_name: match.away_team_name,
                    match_date: match.date,
                    season: match.season,
                    
                    // Scores détaillés (goals object)
                    goals_home: getValue(rawData, 'goals.home'),
                    goals_away: getValue(rawData, 'goals.away'),
                    
                    // Scores par période (score object)
                    halftime_home: getValue(rawData, 'score.halftime.home'),
                    halftime_away: getValue(rawData, 'score.halftime.away'),
                    fulltime_home: getValue(rawData, 'score.fulltime.home'), 
                    fulltime_away: getValue(rawData, 'score.fulltime.away'),
                    extratime_home: getValue(rawData, 'score.extratime.home'),
                    extratime_away: getValue(rawData, 'score.extratime.away'),
                    penalty_home: getValue(rawData, 'score.penalty.home'),
                    penalty_away: getValue(rawData, 'score.penalty.away'),
                    
                    // Teams metadata (teams object)
                    home_team_id: getValue(rawData, 'teams.home.id'),
                    home_team_logo: getValue(rawData, 'teams.home.logo'),
                    away_team_id: getValue(rawData, 'teams.away.id'),
                    away_team_logo: getValue(rawData, 'teams.away.logo'),
                    
                    // Fixture info
                    fixture_id: getValue(rawData, 'fixture.id'),
                    fixture_referee: getValue(rawData, 'fixture.referee'),
                    fixture_timezone: getValue(rawData, 'fixture.timezone'),
                    fixture_timestamp: getValue(rawData, 'fixture.timestamp'),
                    fixture_venue_id: getValue(rawData, 'fixture.venue.id'),
                    fixture_venue_name: getValue(rawData, 'fixture.venue.name'),
                    fixture_venue_city: getValue(rawData, 'fixture.venue.city'),
                    fixture_status: getValue(rawData, 'fixture.status.long'),
                    fixture_round: getValue(rawData, 'fixture.round'),
                    
                    // League info
                    league_id: getValue(rawData, 'league.id'),
                    league_name: getValue(rawData, 'league.name'),
                    league_country: getValue(rawData, 'league.country'),
                    league_logo: getValue(rawData, 'league.logo'),
                    league_flag: getValue(rawData, 'league.flag'),
                    league_season: getValue(rawData, 'league.season'),
                    
                    // Derived metrics
                    total_goals: (getValue(rawData, 'goals.home') || 0) + (getValue(rawData, 'goals.away') || 0),
                    goal_difference: (getValue(rawData, 'goals.home') || 0) - (getValue(rawData, 'goals.away') || 0),
                    
                    match_result: (() => {
                        const homeGoals = getValue(rawData, 'goals.home') || 0
                        const awayGoals = getValue(rawData, 'goals.away') || 0
                        if (homeGoals > awayGoals) return 'H'
                        if (awayGoals > homeGoals) return 'A' 
                        return 'D'
                    })(),
                    
                    halftime_result: (() => {
                        const htHome = getValue(rawData, 'score.halftime.home') || 0
                        const htAway = getValue(rawData, 'score.halftime.away') || 0
                        if (htHome > htAway) return 'H'
                        if (htAway > htHome) return 'A'
                        return 'D' 
                    })(),
                    
                    both_teams_scored: (getValue(rawData, 'goals.home') || 0) > 0 && (getValue(rawData, 'goals.away') || 0) > 0,
                    over_2_5: ((getValue(rawData, 'goals.home') || 0) + (getValue(rawData, 'goals.away') || 0)) > 2.5,
                    clean_sheet_home: (getValue(rawData, 'goals.away') || 0) === 0,
                    clean_sheet_away: (getValue(rawData, 'goals.home') || 0) === 0,
                    
                    has_penalty: getValue(rawData, 'score.penalty.home') !== null || getValue(rawData, 'score.penalty.away') !== null,
                    has_extratime: getValue(rawData, 'score.extratime.home') !== null || getValue(rawData, 'score.extratime.away') !== null,
                    
                    created_at: new Date().toISOString()
                }
                
                extractedMatches.push(extractedFeatures)
            }
        })
        
        console.log(`   ✅ Features ML extraites: ${extractedMatches.length} matches`)
        
        // 4. Analyse qualité des données extraites
        console.log('\n4. 📈 QUALITÉ DONNÉES EXTRAITES:')
        
        const qualityMetrics = {
            total_matches: extractedMatches.length,
            with_goals: extractedMatches.filter(m => m.goals_home !== null && m.goals_away !== null).length,
            with_halftime: extractedMatches.filter(m => m.halftime_home !== null && m.halftime_away !== null).length,
            with_referee: extractedMatches.filter(m => m.fixture_referee !== null).length,
            with_venue: extractedMatches.filter(m => m.fixture_venue_name !== null).length,
            with_team_ids: extractedMatches.filter(m => m.home_team_id !== null && m.away_team_id !== null).length,
            complete_matches: extractedMatches.filter(m => 
                m.goals_home !== null && 
                m.goals_away !== null && 
                m.home_team_id !== null && 
                m.away_team_id !== null &&
                m.fixture_referee !== null
            ).length
        }
        
        Object.entries(qualityMetrics).forEach(([metric, count]) => {
            const percentage = extractedMatches.length > 0 
                ? Math.round((count / extractedMatches.length) * 100) 
                : 0
            console.log(`   ${metric}: ${count}/${extractedMatches.length} (${percentage}%)`)
        })
        
        // 5. Distribution des résultats
        console.log('\n5. ⚽ DISTRIBUTION RÉSULTATS:')
        
        const resultDistribution = {
            'H': extractedMatches.filter(m => m.match_result === 'H').length,
            'D': extractedMatches.filter(m => m.match_result === 'D').length, 
            'A': extractedMatches.filter(m => m.match_result === 'A').length
        }
        
        Object.entries(resultDistribution).forEach(([result, count]) => {
            const percentage = extractedMatches.length > 0 
                ? Math.round((count / extractedMatches.length) * 100) 
                : 0
            const label = result === 'H' ? 'Victoires domicile' : result === 'D' ? 'Matchs nuls' : 'Victoires extérieur'
            console.log(`   ${label}: ${count} (${percentage}%)`)
        })
        
        // Autres métriques intéressantes
        const bttsCount = extractedMatches.filter(m => m.both_teams_scored).length
        const over25Count = extractedMatches.filter(m => m.over_2_5).length
        const penaltyCount = extractedMatches.filter(m => m.has_penalty).length
        
        console.log(`\n   📊 Metrics spéciaux:`)
        console.log(`   Both Teams Scored: ${bttsCount} (${Math.round((bttsCount/extractedMatches.length)*100)}%)`)
        console.log(`   Over 2.5 Goals: ${over25Count} (${Math.round((over25Count/extractedMatches.length)*100)}%)`)
        console.log(`   Penalties: ${penaltyCount} (${Math.round((penaltyCount/extractedMatches.length)*100)}%)`)
        
        // 6. Top équipes par victoires
        console.log('\n6. 🏆 TOP ÉQUIPES PERFORMANCE:')
        
        const teamWins = {}
        extractedMatches.forEach(match => {
            const homeTeam = match.home_team_name
            const awayTeam = match.away_team_name
            
            if (!teamWins[homeTeam]) teamWins[homeTeam] = { wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0 }
            if (!teamWins[awayTeam]) teamWins[awayTeam] = { wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0 }
            
            teamWins[homeTeam].goals_for += match.goals_home || 0
            teamWins[homeTeam].goals_against += match.goals_away || 0
            teamWins[awayTeam].goals_for += match.goals_away || 0
            teamWins[awayTeam].goals_against += match.goals_home || 0
            
            if (match.match_result === 'H') {
                teamWins[homeTeam].wins++
                teamWins[awayTeam].losses++
            } else if (match.match_result === 'A') {
                teamWins[awayTeam].wins++
                teamWins[homeTeam].losses++
            } else {
                teamWins[homeTeam].draws++
                teamWins[awayTeam].draws++
            }
        })
        
        const topTeams = Object.entries(teamWins)
            .map(([team, stats]) => ({
                team,
                ...stats,
                total_matches: stats.wins + stats.draws + stats.losses,
                points: stats.wins * 3 + stats.draws,
                win_rate: stats.wins + stats.draws + stats.losses > 0 
                    ? Math.round((stats.wins / (stats.wins + stats.draws + stats.losses)) * 100)
                    : 0
            }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 10)
        
        console.log('   🥇 Top 10 équipes (par points):')
        topTeams.forEach((team, i) => {
            console.log(`   ${i+1}. ${team.team}: ${team.points}pts (${team.wins}V-${team.draws}N-${team.losses}D) - ${team.win_rate}% wins`)
        })
        
        // 7. Génération SQL pour match_details table
        console.log('\n7. 📄 GÉNÉRATION SQL MATCH_DETAILS:')
        
        const createTableSQL = `
CREATE TABLE IF NOT EXISTS match_details (
    id SERIAL PRIMARY KEY,
    match_id UUID REFERENCES matches(id),
    
    -- Scores détaillés
    goals_home INTEGER,
    goals_away INTEGER,
    halftime_home INTEGER,
    halftime_away INTEGER,
    fulltime_home INTEGER,
    fulltime_away INTEGER,
    
    -- Teams API IDs
    home_team_api_id INTEGER,
    away_team_api_id INTEGER,
    home_team_logo VARCHAR(500),
    away_team_logo VARCHAR(500),
    
    -- Fixture info
    fixture_api_id INTEGER,
    referee VARCHAR(255),
    venue_name VARCHAR(255),
    venue_city VARCHAR(255),
    fixture_status VARCHAR(100),
    fixture_round VARCHAR(100),
    
    -- League info
    league_api_id INTEGER,
    league_country VARCHAR(100),
    
    -- Derived metrics
    total_goals INTEGER,
    goal_difference INTEGER,
    match_result CHAR(1),
    halftime_result CHAR(1),
    both_teams_scored BOOLEAN,
    over_2_5 BOOLEAN,
    has_penalty BOOLEAN,
    has_extratime BOOLEAN,
    
    created_at TIMESTAMP DEFAULT NOW()
);`
        
        console.log('   📋 SQL Création table:')
        console.log(createTableSQL)
        
        // 8. Générer échantillon SQL insert
        if (extractedMatches.length > 0) {
            const sampleSize = Math.min(10, extractedMatches.length)
            const sampleData = extractedMatches.slice(0, sampleSize)
            
            let sqlInsert = 'INSERT INTO match_details (\n'
            sqlInsert += '  match_id, goals_home, goals_away, halftime_home, halftime_away,\n'
            sqlInsert += '  home_team_api_id, away_team_api_id, referee, venue_name,\n'
            sqlInsert += '  total_goals, match_result, both_teams_scored, over_2_5\n'
            sqlInsert += ') VALUES\n'
            
            const insertValues = sampleData.map(match => {
                return `('${match.match_id}', ${match.goals_home}, ${match.goals_away}, ${match.halftime_home}, ${match.halftime_away}, ${match.home_team_id}, ${match.away_team_id}, ${match.fixture_referee ? "'" + match.fixture_referee.replace(/'/g, "''") + "'" : 'NULL'}, ${match.fixture_venue_name ? "'" + match.fixture_venue_name.replace(/'/g, "''") + "'" : 'NULL'}, ${match.total_goals}, '${match.match_result}', ${match.both_teams_scored}, ${match.over_2_5})`
            }).join(',\n')
            
            sqlInsert += insertValues + ';'
            
            const fs = require('fs')
            
            // Sauvegarder échantillon
            fs.writeFileSync('./match_details_sample.sql', sqlInsert)
            console.log('   📄 Sample SQL sauvé: ./match_details_sample.sql')
            
            // Sauvegarder données complètes en JSON pour analyse
            fs.writeFileSync('./extracted_matches_data.json', JSON.stringify({
                extractedAt: new Date().toISOString(),
                totalMatches: extractedMatches.length,
                qualityMetrics,
                resultDistribution,
                topTeams: topTeams.slice(0, 5),
                sampleData: extractedMatches.slice(0, 10)
            }, null, 2))
            console.log('   📄 Données complètes sauvées: ./extracted_matches_data.json')
        }
        
        // 9. Résumé final
        console.log('\n8. 📊 RÉSUMÉ EXTRACTION MATCHES:')
        console.log(`   Raw_data traités: ${allMatches.length}`)
        console.log(`   Match details extraits: ${extractedMatches.length}`)
        console.log(`   Features par match: ${Object.keys(extractedMatches[0] || {}).length}`)
        console.log(`   Complétude générale: ${qualityMetrics.complete_matches}/${extractedMatches.length} (${Math.round((qualityMetrics.complete_matches/extractedMatches.length)*100)}%)`)
        console.log(`   Distribution: ${resultDistribution.H}H-${resultDistribution.D}D-${resultDistribution.A}A`)
        console.log(`   BTTS: ${Math.round((bttsCount/extractedMatches.length)*100)}% | O2.5: ${Math.round((over25Count/extractedMatches.length)*100)}%`)
        
        console.log('\n🎉 EXTRACTION MATCHES.RAW_DATA TERMINÉE!')
        console.log('📊 1760 matches API Football → Features ML-ready disponibles')
        
    } catch (error) {
        console.error('❌ Erreur extraction:', error.message)
    }
}

extractMatchesRawData()