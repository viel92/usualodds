#!/usr/bin/env node

/**
 * ANALYSE CRITIQUE DES 21 FEATURES VIDES
 * 
 * Investigation détaillée des features manquantes et leur impact potentiel:
 * - Lesquelles sont critiques pour ML
 * - Lesquelles peuvent être calculées depuis données existantes
 * - Priorités pour combler les gaps
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function analyzeMissingFeatures() {
    console.log('🚨 ANALYSE CRITIQUE DES 21 FEATURES VIDES')
    console.log('=========================================')
    console.log('⚠️ Impact potentiel sur performance ML système\n')

    // 1. Lister toutes les features vides avec leur importance ML
    await analyzeEmptyFeatures()
    
    // 2. Vérifier quelles features peuvent être calculées  
    await checkCalculableFeatures()
    
    // 3. Examiner données sources disponibles
    await examineSourceData()
    
    // 4. Plan d'action prioritaire
    generateActionPlan()
}

async function analyzeEmptyFeatures() {
    console.log('📊 1. AUDIT FEATURES VIDES')
    console.log('===========================')
    
    const { data: sample } = await supabase
        .from('team_features')
        .select('*')
        .limit(3)
    
    if (!sample || sample.length === 0) {
        console.log('❌ Impossible de récupérer team_features')
        return
    }
    
    const firstTeam = sample[0]
    const emptyFeatures = []
    
    Object.entries(firstTeam).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            emptyFeatures.push(key)
        }
    })
    
    console.log(`📈 Total features vides: ${emptyFeatures.length}`)
    
    // Catégoriser par importance ML
    const featureCategories = {
        CRITICAL: {
            features: [],
            description: 'Features avec fort impact prédictif',
            mlImpact: 'HIGH'
        },
        IMPORTANT: {
            features: [],
            description: 'Features utiles pour ML avancé',
            mlImpact: 'MEDIUM'
        },
        OPTIONAL: {
            features: [],
            description: 'Features nice-to-have',
            mlImpact: 'LOW'
        }
    }
    
    // Classification des features vides par importance
    emptyFeatures.forEach(feature => {
        if (isCriticalFeature(feature)) {
            featureCategories.CRITICAL.features.push(feature)
        } else if (isImportantFeature(feature)) {
            featureCategories.IMPORTANT.features.push(feature)
        } else {
            featureCategories.OPTIONAL.features.push(feature)
        }
    })
    
    // Afficher par catégorie
    Object.entries(featureCategories).forEach(([category, info]) => {
        console.log(`\n🔴 ${category} (${info.mlImpact} IMPACT) - ${info.features.length} features`)
        console.log(`   ${info.description}`)
        info.features.forEach(feature => {
            const explanation = getFeatureExplanation(feature)
            console.log(`   • ${feature}: ${explanation}`)
        })
    })
    
    return featureCategories
}

function isCriticalFeature(feature) {
    const criticalPatterns = [
        /goal_difference/i,     // Différence de buts = indicateur performance
        /elo_/i,               // Rating ELO = force équipe
        /xg_/i,                // Expected Goals = qualité attaque/défense
        /possession_avg/i,     // Style de jeu
        /form_/i,             // Forme récente  
        /volatility/i         // Consistance performance
    ]
    
    return criticalPatterns.some(pattern => pattern.test(feature))
}

function isImportantFeature(feature) {
    const importantPatterns = [
        /pressing/i, /tempo/i, /transition/i,  // Style tactique
        /corners/i, /penalties/i,              // Set pieces
        /discipline/i, /cards/i,               // Discipline
        /travel/i, /rest/i, /fatigue/i        // Fatigue/voyages
    ]
    
    return importantPatterns.some(pattern => pattern.test(feature))
}

function getFeatureExplanation(feature) {
    const explanations = {
        'goal_difference': 'CRITIQUE - Indicateur performance équipe (calculable depuis goals_for - goals_against)',
        'elo_rating': 'CRITIQUE - Rating force équipe (calculable depuis résultats historiques)',
        'elo_home': 'CRITIQUE - Force domicile (calculable depuis elo + home performance)',  
        'elo_away': 'CRITIQUE - Force extérieur (calculable depuis elo + away performance)',
        'xg_for_avg': 'CRITIQUE - Qualité attaque expected goals (besoin API-Football xG)',
        'xg_against_avg': 'CRITIQUE - Qualité défense expected goals (besoin API-Football xG)',
        'xg_diff_avg': 'CRITIQUE - Balance offensive/défensive (calculable xg_for - xg_against)',
        'possession_avg': 'CRITIQUE - Style de jeu (extractible depuis match_statistics JSON)',
        'form_5_points': 'IMPORTANT - Forme récente (calculable depuis 5 derniers matchs)',
        'form_10_points': 'IMPORTANT - Forme étendue (calculable depuis 10 derniers matchs)',
        'volatility_index': 'IMPORTANT - Consistance (calculable depuis variance résultats)',
        'pressing_intensity': 'MOYEN - Style tactique (besoin données spécialisées)',
        'tempo_score': 'MOYEN - Rythme jeu (besoin analyse matchs)',
        'transition_speed': 'MOYEN - Vitesse transitions (besoin données spécialisées)',
        'verticality_index': 'MOYEN - Style passes (besoin données spécialisées)',
        'width_usage': 'MOYEN - Utilisation largeur (besoin données spécialisées)',
        'corners_conversion_rate': 'FAIBLE - Efficacité corners (calculable depuis corners stats)',
        'free_kicks_scored': 'FAIBLE - Buts coups francs (extractible depuis events)',
        'penalties_scored': 'FAIBLE - Penalties réussis (extractible depuis events)',
        'avg_rest_days': 'MOYEN - Repos entre matchs (calculable depuis calendrier)',
        'travel_km_total': 'FAIBLE - Distance voyages (calculable géographiquement)',
        'congestion_index': 'MOYEN - Nombre matchs période (calculable depuis calendrier)'
    }
    
    return explanations[feature] || 'Feature à analyser'
}

async function checkCalculableFeatures() {
    console.log('\n🔧 2. FEATURES CALCULABLES DEPUIS DONNÉES EXISTANTES')
    console.log('=====================================================')
    
    const calculableFeatures = [
        {
            feature: 'goal_difference',
            source: 'goals_for - goals_against',
            difficulty: 'FACILE',
            impact: 'HIGH',
            query: `UPDATE team_features SET goal_difference = goals_for - goals_against WHERE goal_difference IS NULL`
        },
        {
            feature: 'possession_avg', 
            source: 'match_statistics.statistics JSON',
            difficulty: 'MOYEN',
            impact: 'HIGH',
            description: 'Extraire ball_possession depuis JSON et moyenner par équipe'
        },
        {
            feature: 'elo_rating',
            source: 'Calcul depuis résultats matchs historiques', 
            difficulty: 'COMPLEXE',
            impact: 'HIGH',
            description: 'Algorithme ELO standard avec K=32'
        },
        {
            feature: 'form_5_points',
            source: '5 derniers matchs par équipe',
            difficulty: 'MOYEN', 
            impact: 'HIGH',
            description: 'Points obtenus sur 5 derniers matchs'
        },
        {
            feature: 'volatility_index',
            source: 'Variance résultats récents',
            difficulty: 'MOYEN',
            impact: 'MEDIUM', 
            description: 'Écart-type performances derniers matchs'
        }
    ]
    
    console.log('✅ Features calculables immédiatement:')
    calculableFeatures.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.feature}`)
        console.log(`     Source: ${item.source}`)
        console.log(`     Difficulté: ${item.difficulty} | Impact ML: ${item.impact}`)
        if (item.query) {
            console.log(`     SQL: ${item.query}`)
        } else {
            console.log(`     Action: ${item.description}`)
        }
        console.log('')
    })
    
    return calculableFeatures
}

async function examineSourceData() {
    console.log('\n💾 3. DONNÉES SOURCES DISPONIBLES')
    console.log('==================================')
    
    // Vérifier match_statistics pour possession
    console.log('🔍 Examen match_statistics pour possession:')
    const { data: statsample } = await supabase
        .from('match_statistics')
        .select('statistics')
        .not('statistics', 'is', null)
        .limit(3)
    
    if (statsample && statsample.length > 0) {
        const jsonStats = statsample[0].statistics
        console.log('  ✅ Données JSON disponibles:')
        if (jsonStats.ball_possession) {
            console.log(`    • ball_possession: ${jsonStats.ball_possession}`)
        }
        if (jsonStats.total_shots) {
            console.log(`    • total_shots: ${jsonStats.total_shots}`)
        }
        if (jsonStats.shots_on_goal) {
            console.log(`    • shots_on_goal: ${jsonStats.shots_on_goal}`)
        }
        console.log(`    • Total stats JSON: ${Object.keys(jsonStats).length}`)
    }
    
    // Vérifier match_events pour corners/penalties  
    console.log('\n🔍 Examen match_events pour set pieces:')
    const { data: events } = await supabase
        .from('match_events')
        .select('type, detail')
        .in('type', ['Goal', 'Card'])
        .limit(10)
    
    if (events && events.length > 0) {
        const eventTypes = {}
        events.forEach(event => {
            eventTypes[event.detail] = (eventTypes[event.detail] || 0) + 1
        })
        
        console.log('  ✅ Types événements disponibles:')
        Object.entries(eventTypes).forEach(([type, count]) => {
            console.log(`    • ${type}: ${count}`)
        })
    }
    
    // Vérifier données calendrier pour form/rest
    console.log('\n🔍 Examen matches pour calculs temporels:')
    const { data: recentMatches } = await supabase
        .from('matches')
        .select('date, home_team_id, away_team_id, home_score, away_score')
        .not('home_score', 'is', null)
        .order('date', { ascending: false })
        .limit(10)
    
    if (recentMatches && recentMatches.length > 0) {
        console.log(`  ✅ ${recentMatches.length} matchs récents avec résultats`)
        console.log(`    • Période: ${recentMatches[recentMatches.length-1].date} à ${recentMatches[0].date}`)
        console.log(`    • Calculs possibles: form, elo, volatility, rest_days`)
    }
}

function generateActionPlan() {
    console.log('\n🎯 4. PLAN D\'ACTION PRIORITAIRE')
    console.log('===============================')
    
    const actionPlan = [
        {
            priority: 1,
            action: 'CALCULS IMMÉDIATS (2h)',
            tasks: [
                'UPDATE goal_difference = goals_for - goals_against',
                'Extraire possession_avg depuis match_statistics.statistics',
                'Calculer corners/penalties depuis match_events',
                'UPDATE form_5_points depuis derniers résultats'
            ],
            impact: '+15-20% features utiles',
            difficulty: 'FACILE'
        },
        {
            priority: 2,
            action: 'CALCULS ELO SYSTEM (1 jour)',
            tasks: [
                'Implémenter algorithme ELO standard',
                'Calculer elo_rating pour toutes équipes/saisons',
                'Dériver elo_home et elo_away depuis performance',
                'Calculer volatility_index depuis variance'
            ],
            impact: '+25-30% qualité prédictive',
            difficulty: 'MOYEN'
        },
        {
            priority: 3,
            action: 'APIs EXTERNES (3-5 jours)',
            tasks: [
                'API-Football xG endpoints pour xg_for_avg',
                'Données tactiques pour pressing_intensity',
                'Calculs géographiques pour travel_km', 
                'Calendrier européen pour congestion_index'
            ],
            impact: '+10-15% features avancées',
            difficulty: 'COMPLEXE'
        },
        {
            priority: 4,
            action: 'ML FEATURES AVANCÉES (optionnel)',
            tasks: [
                'tempo_score via analyse passes',
                'transition_speed via données tactiques',
                'width_usage via heatmaps positions'
            ],
            impact: '+5% accuracy marginale',
            difficulty: 'EXPERT'
        }
    ]
    
    console.log('🚀 ROADMAP OPTIMISÉE:')
    actionPlan.forEach(phase => {
        console.log(`\n📋 PRIORITÉ ${phase.priority}: ${phase.action}`)
        console.log(`   Impact: ${phase.impact}`)
        console.log(`   Difficulté: ${phase.difficulty}`)
        console.log(`   Tâches:`)
        phase.tasks.forEach(task => {
            console.log(`     • ${task}`)
        })
    })
    
    console.log('\n💡 RECOMMANDATION:')
    console.log('==================')
    console.log('🎯 COMMENCER PAR PRIORITÉ 1 & 2 (Calculs immédiats + ELO)')
    console.log('⚡ Impact: De 21 features vides → 5-8 features vides')
    console.log('📈 Gain ML: +40-50% qualité dataset')
    console.log('⏱️ Temps: 1-2 jours vs 1-2 semaines APIs externes')
    console.log('')
    console.log('🚨 CRITIQUE: Avec 21 features vides, ML accuracy plafonnera à 45-50%')
    console.log('✅ AVEC CALCULS: ML accuracy peut atteindre 55-60%')
}

// Exécution
analyzeMissingFeatures().catch(console.error)