/**
 * DÉBOGAGE URGENT: ELO ratings bloqués à 1500
 * =============================================
 * 
 * Script pour identifier pourquoi les données team_features (100 records avec vrais ELOs)
 * ne sont PAS récupérées par l'API predictions/route.ts
 */

const { createAdminClient } = require('./src/lib/supabase');

async function debugEloIssue() {
  console.log('🔍 DÉBOGAGE - ELO ratings bloqués à 1500');
  console.log('==========================================\n');
  
  const supabase = createAdminClient();
  
  try {
    // 1. VÉRIFIER STRUCTURE TABLE team_features
    console.log('1. Structure de la table team_features:');
    const { data: structure, error: structError } = await supabase
      .from('team_features')
      .select('*')
      .limit(1);
    
    if (structError) {
      console.error('❌ Erreur structure team_features:', structError);
    } else {
      console.log('✅ Structure OK, colonnes disponibles:', Object.keys(structure[0] || {}));
    }
    
    // 2. VÉRIFIER NOMBRE TOTAL D'ENREGISTREMENTS
    console.log('\n2. Nombre total d\'enregistrements team_features:');
    const { count, error: countError } = await supabase
      .from('team_features')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erreur count:', countError);
    } else {
      console.log(`✅ Total: ${count} enregistrements`);
    }
    
    // 3. VÉRIFIER ÉCHANTILLON DE DONNÉES ELO
    console.log('\n3. Échantillon données ELO (top 10):');
    const { data: samples, error: samplesError } = await supabase
      .from('team_features')
      .select('team_id, team_name, elo_rating, season')
      .order('elo_rating', { ascending: false })
      .limit(10);
    
    if (samplesError) {
      console.error('❌ Erreur échantillon:', samplesError);
    } else {
      samples?.forEach(team => {
        console.log(`  - ${team.team_name} (ID: ${team.team_id}): ELO ${team.elo_rating} (Saison ${team.season})`);
      });
    }
    
    // 4. RÉCUPÉRER QUELQUES MATCHES À VENIR POUR TEST
    console.log('\n4. Récupération matches à venir pour test:');
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('id, home_team_id, away_team_id, home_team_name, away_team_name, date')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(3);
    
    if (matchesError) {
      console.error('❌ Erreur matches:', matchesError);
      return;
    } else {
      console.log(`✅ ${matches?.length || 0} matches trouvés`);
    }
    
    // 5. TESTER LES REQUÊTES EXACTES DE L'API POUR CHAQUE MATCH
    console.log('\n5. Test requêtes API exactes pour chaque match:');
    
    for (const match of matches || []) {
      console.log(`\n🔬 MATCH TEST: ${match.home_team_name} vs ${match.away_team_name}`);
      console.log(`   IDs: Home=${match.home_team_id}, Away=${match.away_team_id}`);
      
      // REQUÊTE EXACTE DE L'API - HOME TEAM
      console.log('\n   🏠 Requête HOME team (copie exacte API):');
      const homeQuery = supabase
        .from('team_features')
        .select(`
          elo_rating, 
          form_5_points, 
          possession_avg,
          goals_per_game,
          goals_conceded_per_game,
          xg_for_avg,
          xg_against_avg,
          shots_per_game,
          shots_against_per_game,
          shots_on_target_avg,
          corners_for,
          corners_against,
          corners_conversion_rate,
          yellow_cards,
          red_cards,
          discipline_index,
          pressing_intensity,
          tempo_score,
          season
        `)
        .eq('team_id', match.home_team_id)
        .order('season', { ascending: false })
        .limit(1)
        .single();
      
      const { data: homeData, error: homeError } = await homeQuery;
      
      if (homeError) {
        console.log(`   ❌ HOME ERROR: ${homeError.message}`);
        console.log(`   Code: ${homeError.code}, Details: ${homeError.details}`);
        
        // Test si team_id existe du tout
        const { data: teamExists } = await supabase
          .from('team_features')
          .select('team_id, team_name, elo_rating')
          .eq('team_id', match.home_team_id);
        
        console.log(`   🔍 Team ${match.home_team_id} existe? ${teamExists?.length || 0} records`);
        if (teamExists && teamExists.length > 0) {
          console.log(`       - Trouvé: ${teamExists[0].team_name}, ELO: ${teamExists[0].elo_rating}`);
        }
        
      } else {
        console.log(`   ✅ HOME SUCCESS: ELO ${homeData.elo_rating}, Form ${homeData.form_5_points}`);
      }
      
      // REQUÊTE EXACTE DE L'API - AWAY TEAM  
      console.log('\n   🏃 Requête AWAY team (copie exacte API):');
      const { data: awayData, error: awayError } = await supabase
        .from('team_features')
        .select(`
          elo_rating, 
          form_5_points, 
          possession_avg,
          goals_per_game,
          goals_conceded_per_game,
          xg_for_avg,
          xg_against_avg,
          shots_per_game,
          shots_against_per_game,
          shots_on_target_avg,
          corners_for,
          corners_against,
          corners_conversion_rate,
          yellow_cards,
          red_cards,
          discipline_index,
          pressing_intensity,
          tempo_score,
          season
        `)
        .eq('team_id', match.away_team_id)
        .order('season', { ascending: false })
        .limit(1)
        .single();
      
      if (awayError) {
        console.log(`   ❌ AWAY ERROR: ${awayError.message}`);
        console.log(`   Code: ${awayError.code}, Details: ${awayError.details}`);
        
        // Test si team_id existe du tout
        const { data: teamExists } = await supabase
          .from('team_features')
          .select('team_id, team_name, elo_rating')
          .eq('team_id', match.away_team_id);
        
        console.log(`   🔍 Team ${match.away_team_id} existe? ${teamExists?.length || 0} records`);
        if (teamExists && teamExists.length > 0) {
          console.log(`       - Trouvé: ${teamExists[0].team_name}, ELO: ${teamExists[0].elo_rating}`);
        }
        
      } else {
        console.log(`   ✅ AWAY SUCCESS: ELO ${awayData.elo_rating}, Form ${awayData.form_5_points}`);
      }
      
      // RÉCAPITULATIF MATCH
      const homeElo = homeData?.elo_rating || 1500;
      const awayElo = awayData?.elo_rating || 1500;
      
      console.log(`\n   📊 RÉSULTAT: ${match.home_team_name} (${homeElo}) vs ${match.away_team_name} (${awayElo})`);
      
      if (homeElo === 1500 && awayElo === 1500) {
        console.log(`   ⚠️ PROBLÈME DÉTECTÉ: Les deux équipes utilisent ELO par défaut!`);
      }
    }
    
    // 6. VÉRIFICATION SUPPLÉMENTAIRE: Distribution des saisons
    console.log('\n6. Distribution des saisons dans team_features:');
    const { data: seasons, error: seasonsError } = await supabase
      .from('team_features')
      .select('season')
      .not('season', 'is', null);
    
    if (!seasonsError && seasons) {
      const seasonCounts = {};
      seasons.forEach(s => {
        seasonCounts[s.season] = (seasonCounts[s.season] || 0) + 1;
      });
      
      Object.entries(seasonCounts).forEach(([season, count]) => {
        console.log(`   - Saison ${season}: ${count} teams`);
      });
    }
    
    console.log('\n🏁 DÉBOGAGE TERMINÉ');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le débogage
debugEloIssue().catch(console.error);