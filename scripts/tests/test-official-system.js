#!/usr/bin/env node

/**
 * TEST SYSTÈME OFFICIEL TYPESCRIPT
 * =================================
 * Tester si le CollectionOrchestrator fonctionne correctement
 */

require('ts-node/register');

async function testOfficialSystem() {
    console.log('🧪 TEST SYSTÈME OFFICIEL TYPESCRIPT');
    console.log('=' .repeat(40));
    
    try {
        // Import du système officiel TypeScript
        const { CollectionOrchestrator } = require('./src/lib/collectors/index.ts');
        
        console.log('✅ Import CollectionOrchestrator réussi');
        
        const orchestrator = new CollectionOrchestrator();
        console.log('✅ Instanciation réussie');
        
        // Test basique - juste voir si ça marche
        console.log('📋 Système officiel prêt à l\'utilisation');
        console.log('🎯 Actions disponibles:');
        console.log('   - initializeDatabase()');
        console.log('   - collectDailyData()'); 
        console.log('   - collectHistoricalData(seasons)');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erreur système officiel:', error.message);
        return false;
    }
}

if (require.main === module) {
    testOfficialSystem();
}