require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function diagnosisXG() {
    console.log('=== DIAGNOSTIC XG SIMPLE ===')
    
    try {
        // 1. Échantillon match_statistics
        const { data: stats } = await supabase
            .from('match_statistics')
            .select('match_id, team_id, team_name, expected_goals')
            .limit(20)
            
        console.log('\\n1. ÉCHANTILLON MATCH_STATISTICS:')
        console.log('Total stats:', stats?.length || 0)
        
        const withXG = stats?.filter(s => s.expected_goals !== null && s.expected_goals !== undefined) || []
        console.log('Avec XG:', withXG.length)
        
        if (withXG.length > 0) {
            console.log('\\nPremiers avec XG:')
            withXG.slice(0, 3).forEach(stat => {
                console.log(`  Match ${stat.match_id}: ${stat.team_name} = ${stat.expected_goals} XG`)
            })
            
            // 2. Vérifier linkage avec matches
            const testMatchId = withXG[0].match_id
            const { data: match } = await supabase
                .from('matches')
                .select('id, home_team_id, away_team_id, home_team_name, away_team_name, season')
                .eq('id', testMatchId)
                .single()
                
            console.log('\\n2. VERIFICATION LINKAGE:')
            console.log(`Match ID ${testMatchId}:`, match ? 'TROUVÉ' : 'NON TROUVÉ')
            
            if (match) {
                console.log(`  ${match.home_team_name} vs ${match.away_team_name} (saison ${match.season})`)
                console.log(`  Home ID: ${match.home_team_id}, Away ID: ${match.away_team_id}`)
                
                // 3. Vérifier XG pour les deux équipes
                const { data: homeXG } = await supabase
                    .from('match_statistics')
                    .select('expected_goals')
                    .eq('match_id', testMatchId)
                    .eq('team_id', match.home_team_id)
                    .maybeSingle()
                    
                const { data: awayXG } = await supabase
                    .from('match_statistics')
                    .select('expected_goals')
                    .eq('match_id', testMatchId)
                    .eq('team_id', match.away_team_id)
                    .maybeSingle()
                    
                console.log('\\n3. XG POUR LES DEUX ÉQUIPES:')
                console.log(`  ${match.home_team_name} (home): ${homeXG?.expected_goals || 'MANQUANT'}`)
                console.log(`  ${match.away_team_name} (away): ${awayXG?.expected_goals || 'MANQUANT'}`)
                
                if (homeXG?.expected_goals && awayXG?.expected_goals) {
                    console.log('\\n✅ LINKAGE OK - Peut calculer features XG!')
                    console.log(`  XG Total: ${parseFloat(homeXG.expected_goals) + parseFloat(awayXG.expected_goals)}`)
                    console.log(`  XG Diff: ${parseFloat(homeXG.expected_goals) - parseFloat(awayXG.expected_goals)}`)
                } else {
                    console.log('\\n❌ LINKAGE PROBLÉMATIQUE - Données XG incomplètes')
                }
            }
        } else {
            console.log('\\n❌ Aucune donnée XG trouvée!')
        }
        
        // 4. Coverage globale
        const { data: totalStats } = await supabase
            .from('match_statistics')
            .select('expected_goals')
            .limit(1000)
            
        const totalWithXG = totalStats?.filter(s => s.expected_goals !== null && s.expected_goals !== undefined).length || 0
        console.log(`\\n4. COVERAGE GLOBALE:`)
        console.log(`  Stats totales (échantillon): ${totalStats?.length || 0}`)
        console.log(`  Avec XG: ${totalWithXG} (${totalStats?.length > 0 ? (totalWithXG/totalStats.length*100).toFixed(1) : 0}%)`)
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

diagnosisXG()