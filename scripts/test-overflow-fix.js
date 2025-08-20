const { createClient } = require('@supabase/supabase-js')

// Test rapide pour reproduire l'erreur numeric field overflow
async function testOverflow() {
    console.log('🔍 Test ciblé numeric field overflow...')
    
    const supabase = createClient(
        'https://agysfqhijfbnqzzooyeo.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    )
    
    // Simuler les calculs du collecteur MVP pour identifier les valeurs problématiques
    const zones = {
        champions_league: { end: 3 },
        conference_league: { end: 6 },
        relegation_battle: { start: 14 },
        safe_zone: { start: 7, end: 13 }
    }
    
    function calculateMotivationScore(rank, zones, totalTeams) {
        if (rank <= zones.champions_league.end) {
            const titleScore = 0.9 + (zones.champions_league.end - rank + 1) * 0.1 / zones.champions_league.end
            return Math.min(1.0, titleScore)
        }
        
        if (rank <= zones.conference_league.end) {
            const euroDistance = rank - zones.champions_league.end
            const euroScore = 0.7 + (3 - euroDistance) * 0.1 / 3
            return Math.min(0.8, euroScore)
        }
        
        if (rank >= zones.relegation_battle.start) {
            const relegDistance = Math.min(5, totalTeams - rank + 1)
            const relegScore = 0.8 + relegDistance * 0.1 / 5
            return Math.min(0.9, relegScore)
        }
        
        return 0.3 + Math.random() * 0.2
    }
    
    // Test avec les rangs de Ligue 1
    console.log('📊 Tests calculs motivation:')
    for (let rank = 1; rank <= 18; rank++) {
        const score = calculateMotivationScore(rank, zones, 18)
        console.log(`Rang ${rank}: motivation_score = ${score}`)
        
        if (score > 1.0) {
            console.log(`❌ OVERFLOW détecté: ${score} > 1.0`)
        }
    }
    
    // Test avec des valeurs extrêmes comme dans l'erreur
    const problematicData = {
        team_id: 99998, // ID de test pour éviter conflit
        season: 2024,
        league_id: 61,
        motivation_score: calculateMotivationScore(1, zones, 18), // Rang 1
        pressure_score: 0.9,
        big_game_mentality: 0.7 + Math.random() * 0.3,
        goals_per_game: 75 / 34, // goals_for / games_played
        goals_conceded_per_game: 40 / 34
    }
    
    console.log('\n📋 Test insertion équipe 1063:')
    console.log('Données:', problematicData)
    
    try {
        const { error } = await supabase
            .from('team_features')
            .upsert(problematicData)
        
        if (error) {
            console.error('❌ Erreur reproduction:', error.message)
            
            // Test des valeurs individuellement
            console.log('\n🔍 Test valeurs individuelles:')
            for (const [key, value] of Object.entries(problematicData)) {
                if (typeof value === 'number' && key !== 'team_id' && key !== 'season' && key !== 'league_id') {
                    console.log(`${key}: ${value} (${typeof value})`)
                    if (value > 99.99) {
                        console.log(`❌ ${key} trop grand: ${value} > 99.99 (limite DECIMAL(6,2))`)
                    }
                }
            }
        } else {
            console.log('✅ Insertion réussie!')
        }
    } catch (err) {
        console.error('❌ Exception:', err.message)
    }
}

testOverflow().catch(console.error)