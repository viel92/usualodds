require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function calculateXGBatch() {
    console.log('🎯 CALCUL XG FEATURES (BATCH OPTIMISE)')
    console.log('=====================================')
    
    try {
        // Step 1: Get matches that need XG calculation (limit to batch size)
        const batchSize = 100
        console.log(`📊 Récupération batch de ${batchSize} matches...`)
        
        const { data: matches, error } = await supabase
            .from('matches')
            .select('id, home_team_id, away_team_id, home_team_name, away_team_name')
            .not('home_score', 'is', null)
            .not('away_score', 'is', null)
            .is('xg_home', null)  // Only matches without XG features yet
            .limit(batchSize)
            
        if (error) throw error
        
        if (!matches || matches.length === 0) {
            console.log('✅ Tous les matches ont déjà leurs XG features ou aucun match trouvé')
            return
        }
        
        console.log(`📈 ${matches.length} matches à traiter dans ce batch`)
        
        let processedMatches = 0
        const updates = []
        
        // Step 2: Process each match
        for (const match of matches) {
            try {
                // Get XG data for both teams
                const [homeXGResult, awayXGResult] = await Promise.all([
                    supabase
                        .from('match_statistics')
                        .select('expected_goals')
                        .eq('match_id', match.id)
                        .eq('team_id', match.home_team_id)
                        .single(),
                    supabase
                        .from('match_statistics')
                        .select('expected_goals')
                        .eq('match_id', match.id)
                        .eq('team_id', match.away_team_id)
                        .single()
                ])
                
                const homeXG = homeXGResult.data?.expected_goals
                const awayXG = awayXGResult.data?.expected_goals
                
                if (homeXG !== null && homeXG !== undefined && awayXG !== null && awayXG !== undefined) {
                    const homeXGFloat = parseFloat(homeXG)
                    const awayXGFloat = parseFloat(awayXG)
                    
                    const xgFeatures = {
                        xg_home: homeXGFloat,
                        xg_away: awayXGFloat,
                        xg_total: Number((homeXGFloat + awayXGFloat).toFixed(2)),
                        xg_diff: Number((homeXGFloat - awayXGFloat).toFixed(2)),
                        xg_ratio: awayXGFloat > 0 ? Number((homeXGFloat / awayXGFloat).toFixed(2)) : null,
                        xg_advantage_home: homeXGFloat > awayXGFloat ? 1 : 0,
                        xg_high_scoring: (homeXGFloat + awayXGFloat) > 2.5 ? 1 : 0
                    }
                    
                    // Prepare update
                    updates.push({
                        id: match.id,
                        features: xgFeatures,
                        name: `${match.home_team_name} vs ${match.away_team_name}`
                    })
                    
                    processedMatches++
                    
                    if (processedMatches % 20 === 0) {
                        console.log(`  ⚡ ${processedMatches}/${matches.length} matches traités...`)
                    }
                }
                
            } catch (matchError) {
                console.log(`  ❌ Erreur match ${match.home_team_name} vs ${match.away_team_name}: ${matchError.message}`)
            }
        }
        
        // Step 3: Batch update all matches
        if (updates.length > 0) {
            console.log(`\\n📤 Mise à jour de ${updates.length} matches en base...`)
            
            for (const update of updates) {
                const { error: updateError } = await supabase
                    .from('matches')
                    .update(update.features)
                    .eq('id', update.id)
                    
                if (updateError) {
                    console.log(`  ❌ Erreur update ${update.name}: ${updateError.message}`)
                }
            }
            
            console.log(`✅ ${updates.length} matches mis à jour avec XG features`)
        }
        
        // Step 4: Show progress
        const { data: totalWithXG } = await supabase
            .from('matches')
            .select('id')
            .not('xg_home', 'is', null)
            .limit(1000) // Just to get a sense of progress
            
        console.log(`\\n📊 PROGRESSION: ~${totalWithXG?.length || 0} matches ont maintenant des XG features`)
        console.log('🔄 Relancez le script pour traiter le batch suivant')
        
        return {
            processed: processedMatches,
            updated: updates.length,
            remaining: matches.length - updates.length
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
        throw error
    }
}

// Execute if run directly
if (require.main === module) {
    calculateXGBatch()
        .then(result => {
            if (result) {
                console.log(`\\n🏆 BATCH TERMINÉ: ${result.processed} traités, ${result.updated} mis à jour`)
            }
        })
        .catch(error => {
            console.error('Script failed:', error.message)
        })
}

module.exports = { calculateXGBatch }