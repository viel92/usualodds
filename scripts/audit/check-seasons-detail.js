const { createClient } = require('@supabase/supabase-js')

async function checkSeasonsDetail() {
    console.log('📅 ANALYSE DÉTAILLÉE DES SAISONS')
    console.log('=================================')
    
    const supabase = createClient(
        'https://agysfqhijfbnqzzooyeo.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    )
    
    try {
        // Analyser chaque saison en détail
        console.log('🔍 Analyse par saison...\n')
        
        for (const season of [2020, 2021, 2022, 2023, 2024]) {
            console.log(`📊 SAISON ${season}:`)
            
            // Compter les matchs
            const { count: matchCount } = await supabase
                .from('matches')
                .select('*', { count: 'exact', head: true })
                .eq('season', season)
            
            console.log(`   Matchs: ${matchCount || 0}`)
            
            // Analyser le statut des matchs
            const { data: statusData } = await supabase
                .from('matches')
                .select('status')
                .eq('season', season)
                .then(({ data }) => {
                    const statuses = {}
                    data?.forEach(match => {
                        statuses[match.status] = (statuses[match.status] || 0) + 1
                    })
                    return { data: statuses }
                })
            
            if (statusData && Object.keys(statusData).length > 0) {
                console.log(`   Statuts:`, statusData)
            }
            
            // Vérifier les équipes pour cette saison
            const { count: teamCount } = await supabase
                .from('team_features')
                .select('*', { count: 'exact', head: true })
                .eq('season', season)
            
            console.log(`   Équipes: ${teamCount || 0}`)
            
            // Analyser période des matchs
            if (matchCount > 0) {
                const { data: dateRange } = await supabase
                    .from('matches')
                    .select('date')
                    .eq('season', season)
                    .order('date', { ascending: true })
                    .limit(1)
                    .then(async ({ data: first }) => {
                        const { data: last } = await supabase
                            .from('matches')
                            .select('date')
                            .eq('season', season)
                            .order('date', { ascending: false })
                            .limit(1)
                        
                        return { 
                            data: { 
                                first: first?.[0]?.date, 
                                last: last?.[0]?.date 
                            } 
                        }
                    })
                
                if (dateRange?.data) {
                    console.log(`   Période: ${dateRange.data.first?.split('T')[0]} → ${dateRange.data.last?.split('T')[0]}`)
                }
            }
            
            console.log('')
        }
        
        // Récapitulatif avec recommandations
        console.log('📋 RÉCAPITULATIF & ACTIONS:')
        console.log('=' .repeat(40))
        
        const totalMatches = await supabase
            .from('matches')
            .select('season')
            .then(({ data }) => {
                const seasons = {}
                data?.forEach(match => {
                    seasons[match.season] = (seasons[match.season] || 0) + 1
                })
                return seasons
            })
        
        // Analyse des saisons manquantes/incomplètes
        const expectedMatchesPerSeason = 380 // Ligue 1 standard
        
        Object.entries(totalMatches).forEach(([season, count]) => {
            const completion = (count / expectedMatchesPerSeason * 100).toFixed(1)
            
            if (count >= expectedMatchesPerSeason * 0.9) {
                console.log(`✅ Saison ${season}: ${count} matchs (${completion}%) - COMPLÈTE`)
            } else if (count >= expectedMatchesPerSeason * 0.5) {
                console.log(`🟡 Saison ${season}: ${count} matchs (${completion}%) - PARTIELLE`)
            } else if (count > 0) {
                console.log(`🔴 Saison ${season}: ${count} matchs (${completion}%) - INCOMPLÈTE`)
            }
        })
        
        // Identifier les saisons manquantes
        const presentSeasons = Object.keys(totalMatches).map(s => parseInt(s))
        const expectedSeasons = [2020, 2021, 2022, 2023, 2024]
        const missingSeasons = expectedSeasons.filter(s => !presentSeasons.includes(s))
        
        if (missingSeasons.length > 0) {
            console.log(`❌ Saisons manquantes: ${missingSeasons.join(', ')}`)
        }
        
        console.log('\n🎯 PROCHAINES ACTIONS PRIORITAIRES:')
        
        // Recommandations spécifiques
        if (totalMatches[2022] < expectedMatchesPerSeason * 0.9) {
            console.log('1. Compléter saison 2022 (actuellement partielle)')
        }
        
        if (missingSeasons.includes(2023)) {
            console.log('2. Collecter saison 2023 complète')
        }
        
        if (missingSeasons.includes(2024)) {
            console.log('3. Collecter saison 2024 complète')
        }
        
        console.log('4. Extraire données manquantes depuis raw_stats')
        console.log('5. Finaliser pipeline complet')
        console.log('6. PUIS → Prédictions 2025')
        
    } catch (error) {
        console.error('❌ Erreur analyse saisons:', error.message)
    }
}

checkSeasonsDetail().catch(console.error)