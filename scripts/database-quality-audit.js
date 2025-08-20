#!/usr/bin/env node

/**
 * DATABASE QUALITY AUDIT - Analyse complète qualité données
 * 
 * OBJECTIF: Identifier quelles données sont bien collectées vs vides/par défaut
 * - Audit colonnes remplies vs vides par table
 * - Détection valeurs par défaut (0, false, null)
 * - Analyse couverture données par équipe/match
 * - Recommandations amélioration collecte
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs').promises

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

class DatabaseQualityAuditor {
    constructor() {
        this.auditResults = {}
        this.recommendations = []
        this.tables = [
            'team_features',
            'player_features', 
            'matches',
            'match_statistics',
            'match_events',
            'match_context',
            'ai_match_insights',
            'match_players_stats'
        ]
    }

    /**
     * 1. AUDIT TEAM_FEATURES - Table principale ML
     */
    async auditTeamFeatures() {
        console.log('🔍 AUDIT TEAM_FEATURES...')
        
        const { data: teams, error } = await supabase
            .from('team_features')
            .select('*')
            .eq('season', 2024)

        if (error) {
            console.error('Erreur lecture team_features:', error.message)
            return
        }

        console.log(`📊 ${teams?.length || 0} équipes à analyser`)

        if (!teams?.length) {
            console.log('⚠️ Aucune donnée team_features')
            return
        }

        // Analyser chaque colonne
        const columnAnalysis = {}
        const firstTeam = teams[0]
        const totalTeams = teams.length

        // Liste colonnes importantes à vérifier
        const importantColumns = [
            // Classement 
            'current_rank', 'points', 'motivation_zone', 'motivation_score', 'pressure_score',
            
            // Stats basiques
            'games_played', 'wins', 'draws', 'losses', 'goals_for', 'goals_against',
            'goals_per_game', 'goals_conceded_per_game',
            
            // Domicile/Extérieur
            'home_wins', 'home_draws', 'home_losses', 'home_advantage',
            'away_wins', 'away_draws', 'away_losses', 'away_performance',
            
            // Tactique
            'possession_avg', 'shots_per_game', 'shots_against_per_game',
            
            // Set-pieces
            'corners_for', 'corners_against', 'corner_conversion',
            
            // Discipline
            'yellow_cards', 'red_cards', 'discipline_score',
            
            // Patterns psychologiques
            'underdog_performance', 'big_game_mentality',
            
            // Features avancées
            'elo_rating', 'xg_for_avg', 'tempo_score', 'pressing_intensity',
            
            // Métadonnées
            'raw_stats', 'ai_features', 'style_cluster', 'context_analysis'
        ]

        for (const column of importantColumns) {
            if (!(column in firstTeam)) {
                columnAnalysis[column] = { status: 'COLONNE_INEXISTANTE', coverage: 0 }
                continue
            }

            const filledCount = teams.filter(team => {
                const value = team[column]
                return value !== null && 
                       value !== undefined && 
                       value !== 0 && 
                       value !== false && 
                       value !== '' &&
                       value !== '0' &&
                       !(typeof value === 'object' && Object.keys(value || {}).length === 0)
            }).length

            const coverage = Math.round((filledCount / totalTeams) * 100)
            
            columnAnalysis[column] = {
                status: this.getColumnStatus(coverage),
                coverage: coverage,
                filled: filledCount,
                total: totalTeams,
                sample_values: teams.slice(0, 3).map(t => t[column])
            }
        }

        this.auditResults.team_features = {
            total_teams: totalTeams,
            column_analysis: columnAnalysis,
            summary: this.generateTableSummary(columnAnalysis)
        }

        this.displayTeamFeaturesResults(columnAnalysis, totalTeams)
    }

    /**
     * 2. AUDIT MATCHES - Données matches de base
     */
    async auditMatches() {
        console.log('\n🔍 AUDIT MATCHES...')
        
        const { data: matches, error } = await supabase
            .from('matches')
            .select('*')
            .eq('season', 2024)
            .limit(100) // Sample pour performance

        if (error) {
            console.error('Erreur lecture matches:', error.message)
            return
        }

        console.log(`📊 ${matches?.length || 0} matchs analysés (sample)`)

        if (!matches?.length) {
            console.log('⚠️ Aucune donnée matches')
            return
        }

        const columnAnalysis = {}
        const importantColumns = [
            'api_id', 'season', 'league_id', 'round', 'date', 'status',
            'home_team_id', 'home_team_name', 'away_team_id', 'away_team_name',
            'home_score', 'away_score', 'referee', 'venue_name', 'raw_data'
        ]

        for (const column of importantColumns) {
            if (!(column in matches[0])) {
                columnAnalysis[column] = { status: 'COLONNE_INEXISTANTE', coverage: 0 }
                continue
            }

            const filledCount = matches.filter(match => {
                const value = match[column]
                return value !== null && value !== undefined && value !== '' && value !== 0
            }).length

            const coverage = Math.round((filledCount / matches.length) * 100)
            
            columnAnalysis[column] = {
                status: this.getColumnStatus(coverage),
                coverage: coverage,
                filled: filledCount,
                total: matches.length
            }
        }

        this.auditResults.matches = {
            total_matches: matches.length,
            column_analysis: columnAnalysis,
            summary: this.generateTableSummary(columnAnalysis)
        }

        this.displayMatchesResults(columnAnalysis, matches.length)
    }

    /**
     * 3. AUDIT MATCH_STATISTICS - Stats détaillées matchs
     */
    async auditMatchStatistics() {
        console.log('\n🔍 AUDIT MATCH_STATISTICS...')
        
        const { data: stats, error } = await supabase
            .from('match_statistics')
            .select('*')
            .limit(50) // Sample

        if (error) {
            console.error('Erreur lecture match_statistics:', error.message)
            return
        }

        console.log(`📊 ${stats?.length || 0} entrées stats matchs`)

        if (!stats?.length) {
            console.log('⚠️ Aucune donnée match_statistics')
            return
        }

        // Vérifier si les données sont dans statistics JSON ou colonnes individuelles
        const hasJsonStats = stats.some(s => s.statistics && Object.keys(s.statistics).length > 0)
        const hasIndividualColumns = stats.some(s => s.ball_possession !== null)

        this.auditResults.match_statistics = {
            total_entries: stats.length,
            has_json_stats: hasJsonStats,
            has_individual_columns: hasIndividualColumns,
            json_stats_sample: hasJsonStats ? stats[0]?.statistics : null
        }

        console.log(`   JSON stats: ${hasJsonStats ? '✅' : '❌'}`)
        console.log(`   Colonnes individuelles: ${hasIndividualColumns ? '✅' : '❌'}`)
    }

    /**
     * 4. AUDIT PLAYER_FEATURES 
     */
    async auditPlayerFeatures() {
        console.log('\n🔍 AUDIT PLAYER_FEATURES...')
        
        const { data: players, error } = await supabase
            .from('player_features')
            .select('*')
            .eq('season', 2024)
            .limit(50) // Sample

        if (error) {
            console.error('Erreur lecture player_features:', error.message)
            return
        }

        console.log(`📊 ${players?.length || 0} joueurs analysés`)

        if (!players?.length) {
            console.log('⚠️ Aucune donnée player_features')
            return
        }

        const importantColumns = [
            'appearences', 'minutes_total', 'goals', 'assists', 'shots_total',
            'age', 'height', 'weight', 'yellow_cards', 'red_cards',
            'fatigue_level', 'raw_stats'
        ]

        const columnAnalysis = {}
        for (const column of importantColumns) {
            if (!(column in players[0])) {
                columnAnalysis[column] = { status: 'COLONNE_INEXISTANTE', coverage: 0 }
                continue
            }

            const filledCount = players.filter(player => {
                const value = player[column]
                return value !== null && value !== undefined && value !== 0 && value !== ''
            }).length

            const coverage = Math.round((filledCount / players.length) * 100)
            columnAnalysis[column] = {
                status: this.getColumnStatus(coverage),
                coverage: coverage
            }
        }

        this.auditResults.player_features = {
            total_players: players.length,
            column_analysis: columnAnalysis
        }

        this.displayPlayerFeaturesResults(columnAnalysis, players.length)
    }

    /**
     * 5. AUDIT AI_MATCH_INSIGHTS
     */
    async auditAIInsights() {
        console.log('\n🔍 AUDIT AI_MATCH_INSIGHTS...')
        
        const { data: insights, error } = await supabase
            .from('ai_match_insights')
            .select('*')

        if (error) {
            console.error('Erreur lecture ai_match_insights:', error.message)
            return
        }

        console.log(`📊 ${insights?.length || 0} insights IA`)

        this.auditResults.ai_match_insights = {
            total_insights: insights?.length || 0,
            has_data: (insights?.length || 0) > 0
        }
    }

    /**
     * MÉTHODES UTILITAIRES
     */
    getColumnStatus(coverage) {
        if (coverage >= 90) return 'EXCELLENT'
        if (coverage >= 70) return 'BON'
        if (coverage >= 40) return 'MOYEN'
        if (coverage >= 10) return 'FAIBLE'
        return 'VIDE'
    }

    generateTableSummary(columnAnalysis) {
        const columns = Object.keys(columnAnalysis)
        const summary = {
            excellent: columns.filter(c => columnAnalysis[c].status === 'EXCELLENT').length,
            bon: columns.filter(c => columnAnalysis[c].status === 'BON').length,
            moyen: columns.filter(c => columnAnalysis[c].status === 'MOYEN').length,
            faible: columns.filter(c => columnAnalysis[c].status === 'FAIBLE').length,
            vide: columns.filter(c => columnAnalysis[c].status === 'VIDE').length,
            inexistantes: columns.filter(c => columnAnalysis[c].status === 'COLONNE_INEXISTANTE').length
        }
        return summary
    }

    /**
     * AFFICHAGE RÉSULTATS
     */
    displayTeamFeaturesResults(columnAnalysis, totalTeams) {
        console.log('\n📊 RÉSULTATS TEAM_FEATURES:')
        console.log(`   Total équipes: ${totalTeams}`)
        console.log('\n🟢 COLONNES EXCELLENTES (90%+):')
        this.displayColumnsByStatus(columnAnalysis, 'EXCELLENT')
        
        console.log('\n🟡 COLONNES MOYENNES (40-89%):')
        this.displayColumnsByStatus(columnAnalysis, 'MOYEN', 'BON')
        
        console.log('\n🔴 COLONNES PROBLÉMATIQUES (<40%):')
        this.displayColumnsByStatus(columnAnalysis, 'FAIBLE', 'VIDE')
        
        console.log('\n❌ COLONNES MANQUANTES:')
        this.displayColumnsByStatus(columnAnalysis, 'COLONNE_INEXISTANTE')
    }

    displayMatchesResults(columnAnalysis, totalMatches) {
        console.log('\n📊 RÉSULTATS MATCHES:')
        console.log(`   Total matchs: ${totalMatches}`)
        
        console.log('\n🟢 COLONNES REMPLIES:')
        this.displayColumnsByStatus(columnAnalysis, 'EXCELLENT', 'BON')
        
        console.log('\n🔴 COLONNES PROBLÉMATIQUES:')
        this.displayColumnsByStatus(columnAnalysis, 'MOYEN', 'FAIBLE', 'VIDE')
    }

    displayPlayerFeaturesResults(columnAnalysis, totalPlayers) {
        console.log('\n📊 RÉSULTATS PLAYER_FEATURES:')
        console.log(`   Total joueurs: ${totalPlayers}`)
        
        console.log('\n🟢 COLONNES REMPLIES:')
        this.displayColumnsByStatus(columnAnalysis, 'EXCELLENT', 'BON')
        
        console.log('\n🔴 COLONNES PROBLÉMATIQUES:')
        this.displayColumnsByStatus(columnAnalysis, 'MOYEN', 'FAIBLE', 'VIDE')
    }

    displayColumnsByStatus(columnAnalysis, ...statuses) {
        const columns = Object.keys(columnAnalysis).filter(col => 
            statuses.includes(columnAnalysis[col].status)
        )

        if (columns.length === 0) {
            console.log('   Aucune')
            return
        }

        columns.forEach(column => {
            const analysis = columnAnalysis[column]
            if (analysis.status === 'COLONNE_INEXISTANTE') {
                console.log(`   ❌ ${column} - MANQUANTE`)
            } else {
                console.log(`   • ${column}: ${analysis.coverage}% (${analysis.filled}/${analysis.total})`)
                if (analysis.sample_values) {
                    console.log(`     Échantillon: ${analysis.sample_values.map(v => v === null ? 'null' : String(v).slice(0, 50)).join(', ')}`)
                }
            }
        })
    }

    /**
     * 6. GÉNÉRATION RECOMMANDATIONS
     */
    generateRecommendations() {
        console.log('\n💡 GÉNÉRATION RECOMMANDATIONS...')
        
        const recommendations = []
        
        // Analyse team_features
        if (this.auditResults.team_features) {
            const teamAnalysis = this.auditResults.team_features.column_analysis
            
            // Colonnes vides importantes
            const emptyImportant = Object.keys(teamAnalysis).filter(col => 
                ['shots_per_game', 'possession_avg', 'elo_rating', 'xg_for_avg'].includes(col) &&
                teamAnalysis[col].status === 'VIDE'
            )
            
            if (emptyImportant.length > 0) {
                recommendations.push({
                    priority: 'HIGH',
                    category: 'DATA_COLLECTION',
                    issue: `Colonnes importantes vides: ${emptyImportant.join(', ')}`,
                    solution: 'Vérifier logique de collecte dans ligue1-mvp-collector.js',
                    impact: 'Affect ML model performance'
                })
            }
        }

        // Analyse player_features
        if (this.auditResults.player_features && this.auditResults.player_features.total_players === 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'DATA_COLLECTION',
                issue: 'Aucune donnée joueur collectée',
                solution: 'Vérifier méthode collectPlayerFeatures()',
                impact: 'Missing player-level features pour ML'
            })
        }

        this.recommendations = recommendations
        return recommendations
    }

    /**
     * 7. RAPPORT FINAL
     */
    async generateReport() {
        console.log('\n' + '='.repeat(80))
        console.log('📋 RAPPORT AUDIT QUALITÉ BASE DE DONNÉES')
        console.log('='.repeat(80))

        // Résumé global
        console.log('\n🎯 RÉSUMÉ GLOBAL:')
        
        const teamFeatures = this.auditResults.team_features?.summary
        if (teamFeatures) {
            console.log(`   TEAM_FEATURES: ${teamFeatures.excellent + teamFeatures.bon}/${teamFeatures.excellent + teamFeatures.bon + teamFeatures.moyen + teamFeatures.faible + teamFeatures.vide} colonnes OK`)
        }
        
        console.log(`   MATCHES: ${this.auditResults.matches?.total_matches || 0} matchs`)
        console.log(`   PLAYERS: ${this.auditResults.player_features?.total_players || 0} joueurs`)
        console.log(`   AI_INSIGHTS: ${this.auditResults.ai_match_insights?.total_insights || 0} insights`)

        // Recommandations prioritaires
        console.log('\n🚨 RECOMMANDATIONS PRIORITAIRES:')
        const highPrioRecs = this.recommendations.filter(r => r.priority === 'HIGH')
        
        if (highPrioRecs.length === 0) {
            console.log('   ✅ Aucun problème critique détecté')
        } else {
            highPrioRecs.forEach((rec, i) => {
                console.log(`   ${i + 1}. ${rec.issue}`)
                console.log(`      Solution: ${rec.solution}`)
                console.log(`      Impact: ${rec.impact}`)
            })
        }

        // Score qualité global
        const qualityScore = this.calculateGlobalQualityScore()
        console.log(`\n📊 SCORE QUALITÉ GLOBAL: ${qualityScore}/100`)
        
        if (qualityScore >= 80) console.log('   🟢 EXCELLENTE qualité données')
        else if (qualityScore >= 60) console.log('   🟡 BONNE qualité données')
        else console.log('   🔴 Qualité données à AMÉLIORER')

        console.log('\n' + '='.repeat(80))

        // Sauvegarder rapport
        await this.saveReport()
    }

    calculateGlobalQualityScore() {
        let totalScore = 0
        let components = 0

        // Score team_features (50% du total)
        if (this.auditResults.team_features) {
            const summary = this.auditResults.team_features.summary
            const totalColumns = summary.excellent + summary.bon + summary.moyen + summary.faible + summary.vide
            if (totalColumns > 0) {
                const teamScore = (summary.excellent * 100 + summary.bon * 75 + summary.moyen * 50 + summary.faible * 25) / totalColumns
                totalScore += teamScore * 0.5
                components += 0.5
            }
        }

        // Score matches (25% du total)
        if (this.auditResults.matches && this.auditResults.matches.total_matches > 0) {
            totalScore += 75 * 0.25 // Assume good match data
            components += 0.25
        }

        // Score autres tables (25% du total)
        const hasPlayerData = (this.auditResults.player_features?.total_players || 0) > 0
        const hasAIData = (this.auditResults.ai_match_insights?.total_insights || 0) > 0
        
        if (hasPlayerData || hasAIData) {
            totalScore += 50 * 0.25
            components += 0.25
        }

        return components > 0 ? Math.round(totalScore / components) : 0
    }

    async saveReport() {
        const report = {
            generated_at: new Date().toISOString(),
            audit_results: this.auditResults,
            recommendations: this.recommendations,
            quality_score: this.calculateGlobalQualityScore()
        }

        try {
            await fs.writeFile(
                './database-quality-audit-report.json',
                JSON.stringify(report, null, 2)
            )
            console.log('📄 Rapport sauvegardé: database-quality-audit-report.json')
        } catch (error) {
            console.error('Erreur sauvegarde rapport:', error.message)
        }
    }

    /**
     * MÉTHODE PRINCIPALE
     */
    async runCompleteAudit() {
        console.log('🚀 DÉMARRAGE AUDIT QUALITÉ BASE DE DONNÉES')
        console.log('=' .repeat(60))
        
        try {
            await this.auditTeamFeatures()
            await this.auditMatches()
            await this.auditMatchStatistics()
            await this.auditPlayerFeatures()
            await this.auditAIInsights()
            
            this.generateRecommendations()
            await this.generateReport()
            
            console.log('✅ Audit terminé avec succès')
            
        } catch (error) {
            console.error('💥 Erreur audit:', error.message)
            throw error
        }
    }
}

// Exécution
if (require.main === module) {
    const auditor = new DatabaseQualityAuditor()
    auditor.runCompleteAudit().catch(console.error)
}

module.exports = DatabaseQualityAuditor