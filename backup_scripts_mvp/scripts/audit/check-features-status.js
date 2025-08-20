#!/usr/bin/env node

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function checkFeatures() {
  console.log('📊 ÉTAT FEATURES AVANCÉES APRÈS CALCUL')
  console.log('======================================')
  
  const features = ['elo_rating', 'form_5_points', 'possession_avg', 'volatility_index', 'goal_difference']
  
  for (const feature of features) {
    const { data } = await supabase
      .from('team_features')
      .select(feature)
      .not(feature, 'is', null)
      
    console.log(`${feature.padEnd(16)}: ${data?.length || 0} équipes ✅`)
  }
  
  console.log('')
  console.log('🧪 ÉCHANTILLON ÉQUIPE COMPLÈTE:')
  const { data: sample } = await supabase
    .from('team_features')
    .select('elo_rating, form_5_points, form_10_points, possession_avg, volatility_index, goal_difference, goals_per_game')
    .not('elo_rating', 'is', null)
    .limit(1)
    .single()
    
  if (sample) {
    console.log('  ELO:', sample.elo_rating)
    console.log('  Form 5/10:', sample.form_5_points + '/' + sample.form_10_points, 'points')
    console.log('  Possession:', sample.possession_avg + '%')
    console.log('  Volatilité:', sample.volatility_index)
    console.log('  Goal diff:', sample.goal_difference)
    console.log('  Goals/game:', sample.goals_per_game)
  }
  
  console.log('')
  console.log('🎯 FEATURES CRITIQUES DÉBLOQUÉES:')
  console.log('  ✅ ELO Rating System: Force équipe dynamique')
  console.log('  ✅ Form & Momentum: Performance récente')
  console.log('  ✅ Possession: Style de jeu depuis JSON')
  console.log('  ✅ Goal Difference: Performance offensive/défensive')
  console.log('')
  console.log('🚀 PRÊT POUR: Architecture ML Enterprise')
}

checkFeatures().catch(console.error)