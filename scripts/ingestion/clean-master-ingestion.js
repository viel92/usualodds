#!/usr/bin/env node

/**
 * 🎯 MASTER INGESTION SCRIPT - SYSTÈME UNIQUE OFFICIEL
 * ===================================================
 * Script maître utilisant uniquement le système TypeScript officiel
 * Remplace tous les scripts obsolètes JS redondants
 * 
 * Usage:
 *   node clean-master-ingestion.js --action=initialize
 *   node clean-master-ingestion.js --action=historical --seasons=2020,2021,2022,2023,2024
 *   node clean-master-ingestion.js --action=daily
 */

const axios = require('axios');

class MasterIngestionOrchestrator {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.apiEndpoint = '/api/collect';
        console.log('🎯 MASTER INGESTION - Système Officiel Unique');
        console.log('=' .repeat(50));
    }

    async callOfficialAPI(action, params = {}) {
        try {
            console.log(`📡 Appel API officielle: ${action}`);
            
            const response = await axios.post(
                `${this.baseURL}${this.apiEndpoint}`,
                { action, ...params },
                { timeout: 300000 } // 5 minutes timeout
            );

            if (response.data.success) {
                console.log(`✅ ${response.data.message}`);
                return response.data;
            } else {
                throw new Error(response.data.error || 'API call failed');
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.error('❌ Serveur Next.js non démarré');
                console.log('💡 Démarrer avec: npm run dev');
            } else {
                console.error(`❌ Erreur API ${action}:`, error.message);
            }
            throw error;
        }
    }

    async initializeComplete() {
        console.log('🚀 INITIALISATION COMPLÈTE');
        console.log('- Leagues → Teams → Players → Base Setup');
        
        try {
            const result = await this.callOfficialAPI('initialize');
            console.log('✅ Initialisation terminée');
            return result;
        } catch (error) {
            console.error('❌ Échec initialisation:', error.message);
            throw error;
        }
    }

    async ingestHistoricalData(seasons = ['2020', '2021', '2022', '2023', '2024']) {
        console.log('📊 INGESTION DONNÉES HISTORIQUES');
        console.log(`- Saisons: ${seasons.join(', ')}`);
        
        try {
            const result = await this.callOfficialAPI('historical', { seasons });
            console.log(`✅ Données historiques ingérées: ${seasons.length} saisons`);
            return result;
        } catch (error) {
            console.error('❌ Échec ingestion historique:', error.message);
            throw error;
        }
    }

    async collectDailyUpdates() {
        console.log('📅 COLLECTE DONNÉES QUOTIDIENNES');
        console.log('- Fixtures + Odds + Updates');
        
        try {
            const result = await this.callOfficialAPI('daily');
            console.log('✅ Données quotidiennes collectées');
            return result;
        } catch (error) {
            console.error('❌ Échec collecte quotidienne:', error.message);
            throw error;
        }
    }

    async enhancedDailyPipeline() {
        console.log('🚀 PIPELINE ENRICHI QUOTIDIEN');
        console.log('- Weather + Lineups + Context + Advanced Features');
        
        try {
            const result = await this.callOfficialAPI('enhanced_daily');
            console.log('✅ Pipeline enrichi terminé');
            console.log(`📊 Collections: ${result.results ? 'Détails disponibles' : 'Basique'}`);
            return result;
        } catch (error) {
            console.error('❌ Échec pipeline enrichi:', error.message);
            throw error;
        }
    }

    async collectInjuriesAndSuspensions() {
        console.log('🏥 COLLECTE BLESSURES & SUSPENSIONS');
        console.log('- Injuries + Suspensions + Team Availability');
        
        try {
            const result = await this.callOfficialAPI('injuries_suspensions');
            console.log('✅ Collecte blessures terminée');
            return result;
        } catch (error) {
            console.error('❌ Échec collecte blessures:', error.message);
            throw error;
        }
    }

    async collectMarketSentiment() {
        console.log('📊 COLLECTE SENTIMENT MARCHÉ');
        console.log('- Odds Movement + Volume + Market Trends');
        
        try {
            const result = await this.callOfficialAPI('market_sentiment');
            console.log('✅ Collecte sentiment marché terminée');
            return result;
        } catch (error) {
            console.error('❌ Échec collecte sentiment:', error.message);
            throw error;
        }
    }

    async calculateAdvancedFeatures() {
        console.log('🧠 CALCUL FEATURES AVANCÉES ML');
        console.log('- ELO Interactions + Form Combinations + Context Features');
        
        try {
            const result = await this.callOfficialAPI('advanced_features');
            console.log('✅ Features avancées calculées');
            return result;
        } catch (error) {
            console.error('❌ Échec calcul features:', error.message);
            throw error;
        }
    }

    async nightlyEnrichment() {
        console.log('🌙 ENRICHISSEMENT NOCTURNE');
        console.log('- Calculs lourds + Features avancées + ML prep');
        
        try {
            const result = await this.callOfficialAPI('nightly_enrichment');
            console.log('✅ Enrichissement nocturne terminé');
            return result;
        } catch (error) {
            console.error('❌ Échec enrichissement nocturne:', error.message);
            throw error;
        }
    }

    async runFullPipeline() {
        console.log('🎯 PIPELINE COMPLET - ZERO TO HERO');
        console.log('=' .repeat(50));
        
        try {
            // 1. Initialize base
            await this.initializeComplete();
            await this.sleep(5000);
            
            // 2. Historical data
            await this.ingestHistoricalData();
            await this.sleep(5000);
            
            // 3. Enhanced pipeline
            await this.enhancedDailyPipeline();
            await this.sleep(5000);
            
            // 4. Injuries & Suspensions
            await this.collectInjuriesAndSuspensions();
            await this.sleep(3000);
            
            // 5. Market sentiment
            await this.collectMarketSentiment();
            await this.sleep(3000);
            
            // 6. Advanced features calculation
            await this.calculateAdvancedFeatures();
            await this.sleep(3000);
            
            // 7. Nightly enrichment
            await this.nightlyEnrichment();
            
            console.log('🎉 PIPELINE COMPLET TERMINÉ AVEC SUCCÈS');
            
        } catch (error) {
            console.error('💥 Échec pipeline complet:', error.message);
            throw error;
        }
    }

    async runMLOptimizedPipeline() {
        console.log('🤖 PIPELINE OPTIMISÉ POUR ML');
        console.log('=' .repeat(50));
        
        try {
            // 1. Données de base
            await this.enhancedDailyPipeline();
            await this.sleep(2000);
            
            // 2. Données critiques ML
            await this.collectInjuriesAndSuspensions();
            await this.sleep(2000);
            
            // 3. Sentiment marché
            await this.collectMarketSentiment();
            await this.sleep(2000);
            
            // 4. Features avancées
            await this.calculateAdvancedFeatures();
            
            console.log('🎯 PIPELINE ML OPTIMISÉ TERMINÉ');
            
        } catch (error) {
            console.error('💥 Échec pipeline ML:', error.message);
            throw error;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showUsage() {
        console.log('📖 USAGE:');
        console.log('  --action=initialize           : Setup leagues/teams/players');
        console.log('  --action=historical          : Données historiques (2020-2024)');
        console.log('  --action=daily               : Collecte quotidienne');
        console.log('  --action=enhanced            : Pipeline enrichi');
        console.log('  --action=injuries            : Blessures & suspensions');
        console.log('  --action=market              : Sentiment marché');
        console.log('  --action=features            : Features avancées ML');
        console.log('  --action=nightly             : Enrichissement nocturne');
        console.log('  --action=full                : Pipeline complet (tout)');
        console.log('  --action=ml                  : Pipeline optimisé ML');
        console.log('  --seasons=2020,2021,2022     : Spécifier saisons (historical)');
    }
}

async function main() {
    const args = process.argv.slice(2);
    const orchestrator = new MasterIngestionOrchestrator();
    
    // Parse arguments
    let action = null;
    let seasons = ['2020', '2021', '2022', '2023', '2024'];
    
    for (const arg of args) {
        if (arg.startsWith('--action=')) {
            action = arg.split('=')[1];
        }
        if (arg.startsWith('--seasons=')) {
            seasons = arg.split('=')[1].split(',');
        }
    }
    
    if (!action) {
        orchestrator.showUsage();
        return;
    }
    
    try {
        switch (action) {
            case 'initialize':
                await orchestrator.initializeComplete();
                break;
            case 'historical':
                await orchestrator.ingestHistoricalData(seasons);
                break;
            case 'daily':
                await orchestrator.collectDailyUpdates();
                break;
            case 'enhanced':
                await orchestrator.enhancedDailyPipeline();
                break;
            case 'injuries':
                await orchestrator.collectInjuriesAndSuspensions();
                break;
            case 'market':
                await orchestrator.collectMarketSentiment();
                break;
            case 'features':
                await orchestrator.calculateAdvancedFeatures();
                break;
            case 'nightly':
                await orchestrator.nightlyEnrichment();
                break;
            case 'full':
                await orchestrator.runFullPipeline();
                break;
            case 'ml':
                await orchestrator.runMLOptimizedPipeline();
                break;
            default:
                console.error(`❌ Action inconnue: ${action}`);
                orchestrator.showUsage();
        }
    } catch (error) {
        console.error('💥 Erreur fatale:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}