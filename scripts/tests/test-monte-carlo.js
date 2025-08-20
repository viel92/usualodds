// Test simple du système Monte Carlo sans dépendances DB
console.log('🎲 Test Monte Carlo System');

// Simulation basique locale
function basicMonteCarloTest() {
    console.log('Début test Monte Carlo...');
    
    const scenarios = [];
    const iterations = 1000;
    
    // Génération basique de scénarios
    for (let i = 0; i < iterations; i++) {
        const homeGoals = Math.floor(Math.random() * 5);
        const awayGoals = Math.floor(Math.random() * 5);
        
        const outcome = homeGoals > awayGoals ? '1' : 
                       homeGoals < awayGoals ? '2' : 'X';
        
        const scenario = {
            id: `${homeGoals}-${awayGoals}`,
            homeGoals,
            awayGoals,
            outcome,
            probability: 0,
            under25: (homeGoals + awayGoals) < 2.5,
            over25: (homeGoals + awayGoals) > 2.5,
            btts: homeGoals > 0 && awayGoals > 0,
            weight: 1.0
        };
        
        scenarios.push(scenario);
    }
    
    // Calcul des probabilités
    const scenarioCounts = {};
    scenarios.forEach(s => {
        const key = s.id;
        scenarioCounts[key] = (scenarioCounts[key] || 0) + 1;
    });
    
    const uniqueScenarios = [];
    Object.keys(scenarioCounts).forEach(key => {
        const [homeGoals, awayGoals] = key.split('-').map(Number);
        const count = scenarioCounts[key];
        const probability = count / iterations;
        
        uniqueScenarios.push({
            id: key,
            homeGoals,
            awayGoals,
            probability,
            outcome: homeGoals > awayGoals ? '1' : 
                    homeGoals < awayGoals ? '2' : 'X',
            under25: (homeGoals + awayGoals) < 2.5,
            over25: (homeGoals + awayGoals) > 2.5,
            btts: homeGoals > 0 && awayGoals > 0,
            weight: 1.0
        });
    });
    
    // Tri par probabilité
    uniqueScenarios.sort((a, b) => b.probability - a.probability);
    
    console.log(`✅ Généré ${uniqueScenarios.length} scénarios uniques`);
    console.log('Top 5 scénarios les plus probables :');
    uniqueScenarios.slice(0, 5).forEach((s, i) => {
        console.log(`  ${i+1}. ${s.homeGoals}-${s.awayGoals} (${s.outcome}) : ${(s.probability*100).toFixed(1)}%`);
    });
    
    // Calcul fair odds pour 1X2
    const outcomes = { home: 0, draw: 0, away: 0 };
    uniqueScenarios.forEach(s => {
        switch(s.outcome) {
            case '1': outcomes.home += s.probability; break;
            case 'X': outcomes.draw += s.probability; break;
            case '2': outcomes.away += s.probability; break;
        }
    });
    
    const total = outcomes.home + outcomes.draw + outcomes.away;
    const fairOdds = {
        '1': total / outcomes.home,
        'X': total / outcomes.draw,
        '2': total / outcomes.away
    };
    
    console.log('\n📊 Fair Odds 1X2 :');
    console.log(`  Victoire Domicile : ${fairOdds['1'].toFixed(2)} (${(outcomes.home*100).toFixed(1)}%)`);
    console.log(`  Match Nul : ${fairOdds['X'].toFixed(2)} (${(outcomes.draw*100).toFixed(1)}%)`);
    console.log(`  Victoire Extérieur : ${fairOdds['2'].toFixed(2)} (${(outcomes.away*100).toFixed(1)}%)`);
    
    // Test O/U 2.5
    const goalProbs = { under25: 0, over25: 0 };
    uniqueScenarios.forEach(s => {
        if (s.under25) goalProbs.under25 += s.probability;
        if (s.over25) goalProbs.over25 += s.probability;
    });
    
    console.log('\n⚽ Marchés buts :');
    console.log(`  Under 2.5 : ${(1/goalProbs.under25).toFixed(2)} (${(goalProbs.under25*100).toFixed(1)}%)`);
    console.log(`  Over 2.5 : ${(1/goalProbs.over25).toFixed(2)} (${(goalProbs.over25*100).toFixed(1)}%)`);
    
    return {
        scenarios: uniqueScenarios.slice(0, 10),
        fairOdds,
        metrics: {
            totalScenarios: uniqueScenarios.length,
            iterations,
            outcomes,
            goalProbs
        }
    };
}

// Exécution du test
try {
    const result = basicMonteCarloTest();
    console.log('\n🎯 Test Monte Carlo réussi !');
    console.log(`Résultats : ${result.scenarios.length} scénarios, fair odds calculées`);
} catch (error) {
    console.error('❌ Erreur test Monte Carlo :', error);
}