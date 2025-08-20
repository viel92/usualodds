#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

async function checkPlayersData() {
    console.log('\n=== AUDIT DONNÉES JOUEURS ===\n')
    
    try {
        // 1. Count total joueurs
        const { count: totalPlayers } = await supabase
            .from('player_features')
            .select('*', { count: 'exact', head: true })
        
        console.log(`📊 TOTAL JOUEURS: ${totalPlayers}`)
        
        // 2. Top buteurs actuels
        console.log('\n⚽ TOP 10 BUTEURS ACTUELS:')
        const { data: topScorers } = await supabase
            .from('player_features')
            .select('player_name, goals, team_id, season')
            .gt('goals', 0)
            .order('goals', { ascending: false })
            .limit(10)
        
        if (topScorers && topScorers.length > 0) {
            topScorers.forEach((player, i) => {
                console.log(`   ${i+1}. ${player.player_name || 'Nom manquant'}: ${player.goals} buts (${player.season})`)
            })
        } else {
            console.log('   ❌ Aucun buteur trouvé')
        }
        
        // 3. Recherche Dembélé spécifiquement
        console.log('\n🔍 RECHERCHE DEMBÉLÉ:')
        const { data: dembeles } = await supabase
            .from('player_features')
            .select('player_name, goals, assists, team_id, season')
            .ilike('player_name', '%dembele%')
        
        if (dembeles && dembeles.length > 0) {
            dembeles.forEach(player => {
                console.log(`   ${player.player_name}: ${player.goals} buts, ${player.assists} assists (${player.season})`)
            })
        } else {
            console.log('   ❌ Aucun Dembélé trouvé')
            
            // Cherchons d'autres variantes
            const { data: variants } = await supabase
                .from('player_features')
                .select('player_name, goals, assists')
                .or('player_name.ilike.%demb%,player_name.ilike.%ousmane%')
            
            if (variants && variants.length > 0) {
                console.log('   Variantes trouvées:')
                variants.forEach(p => console.log(`     ${p.player_name}: ${p.goals} buts`))
            }
        }
        
        // 4. Distribution des buts
        console.log('\n📊 DISTRIBUTION DES BUTS:')
        const { data: goalDistrib } = await supabase
            .from('player_features')
            .select('goals')
            .gt('goals', 0)
        
        if (goalDistrib) {
            const goals = goalDistrib.map(p => p.goals).sort((a, b) => b - a)
            console.log(`   Joueurs avec buts: ${goals.length}`)
            console.log(`   Maximum: ${goals[0] || 0} buts`)
            console.log(`   Moyenne: ${Math.round(goals.reduce((s, g) => s + g, 0) / goals.length * 10) / 10}`)
            console.log(`   Médiane: ${goals[Math.floor(goals.length / 2)] || 0}`)
        }
        
        // 5. Saisons couvertes
        console.log('\n📅 SAISONS COUVERTES JOUEURS:')
        const { data: seasons } = await supabase
            .from('player_features')
            .select('season')
        
        if (seasons) {
            const seasonCounts = {}
            seasons.forEach(s => {
                seasonCounts[s.season] = (seasonCounts[s.season] || 0) + 1
            })
            
            Object.entries(seasonCounts).sort().forEach(([season, count]) => {
                console.log(`   ${season}: ${count} joueurs`)
            })
        }
        
        // 6. Problèmes identifiés
        console.log('\n🚨 PROBLÈMES IDENTIFIÉS:')
        
        const { data: noNames } = await supabase
            .from('player_features')
            .select('*', { count: 'exact', head: true })
            .or('player_name.is.null,player_name.eq.Unknown Player')
        
        console.log(`   Joueurs sans nom: ${noNames.count}`)
        
        const { data: noGoals } = await supabase
            .from('player_features')
            .select('*', { count: 'exact', head: true })
            .eq('goals', 0)
        
        console.log(`   Joueurs à 0 but: ${noGoals.count}`)
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

checkPlayersData()