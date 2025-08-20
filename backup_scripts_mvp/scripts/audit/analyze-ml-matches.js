/**
 * ANALYSE: Pourquoi 1000 matches au lieu de 1760 dans ML ?
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeMatchesVsFeatures() {
  console.log('ANALYSE: Pourquoi 1000 matches au lieu de 1760 ?');
  console.log('==============================================');
  
  try {
    // 1. Total matches avec scores
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id, season, home_team_id, away_team_id, home_score, away_score')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null);
      
    console.log(`Total matches avec scores: ${allMatches?.length || 0}`);
    
    // 2. Matches par saison
    const seasonCounts = {};
    allMatches?.forEach(m => {
      seasonCounts[m.season] = (seasonCounts[m.season] || 0) + 1;
    });
    
    console.log('\nRepartition matches par saison:');
    Object.entries(seasonCounts).forEach(([season, count]) => {
      console.log(`  - ${season}: ${count} matches`);
    });
    
    // 3. Team features disponibles
    const { data: teamFeatures } = await supabase
      .from('team_features')
      .select('team_id, season, elo_rating');
      
    console.log(`\nTotal team_features: ${teamFeatures?.length || 0}`);
    
    const featureSeasons = {};
    const featureTeams = new Set();
    teamFeatures?.forEach(f => {
      featureSeasons[f.season] = (featureSeasons[f.season] || 0) + 1;
      featureTeams.add(`${f.team_id}_${f.season}`);
    });
    
    console.log('\nTeam features par saison:');
    Object.entries(featureSeasons).forEach(([season, count]) => {
      console.log(`  - ${season}: ${count} equipes`);
    });
    
    // 4. Analyser matches sans features correspondantes
    let matchesWithFeatures = 0;
    let matchesWithoutFeatures = 0;
    const problemMatches = [];
    
    for (const match of allMatches || []) {
      const homeKey = `${match.home_team_id}_${match.season}`;
      const awayKey = `${match.away_team_id}_${match.season}`;
      
      const hasHomeFeature = featureTeams.has(homeKey);
      const hasAwayFeature = featureTeams.has(awayKey);
      
      if (hasHomeFeature && hasAwayFeature) {
        matchesWithFeatures++;
      } else {
        matchesWithoutFeatures++;
        if (problemMatches.length < 5) {
          problemMatches.push({
            season: match.season,
            home_team_id: match.home_team_id,
            away_team_id: match.away_team_id,
            homeFeature: hasHomeFeature,
            awayFeature: hasAwayFeature
          });
        }
      }
    }
    
    console.log(`\nAnalyse complete:`);
    console.log(`  Matches AVEC features: ${matchesWithFeatures}`);
    console.log(`  Matches SANS features: ${matchesWithoutFeatures}`);
    console.log(`  Pourcentage utilisable: ${((matchesWithFeatures / allMatches.length) * 100).toFixed(1)}%`);
    
    console.log(`\nExemples matches problematiques:`);
    problemMatches.forEach((match, i) => {
      console.log(`  ${i+1}. Saison ${match.season}: team ${match.home_team_id} vs ${match.away_team_id}`);
      console.log(`     Home feature: ${match.homeFeature}, Away feature: ${match.awayFeature}`);
    });
    
    // 5. Équipes manquantes par saison
    console.log(`\nAnalyse equipes manquantes:`);
    for (const season of [2020, 2021, 2022, 2023, 2024]) {
      const matchTeams = new Set();
      allMatches?.filter(m => m.season === season).forEach(m => {
        matchTeams.add(m.home_team_id);
        matchTeams.add(m.away_team_id);
      });
      
      const featureTeamsForSeason = new Set();
      teamFeatures?.filter(f => f.season === season).forEach(f => {
        featureTeamsForSeason.add(f.team_id);
      });
      
      const missingTeams = [...matchTeams].filter(t => !featureTeamsForSeason.has(t));
      
      console.log(`  Saison ${season}:`);
      console.log(`    - Teams dans matches: ${matchTeams.size}`);
      console.log(`    - Teams avec features: ${featureTeamsForSeason.size}`);
      console.log(`    - Teams manquantes: ${missingTeams.length} ${missingTeams.length > 0 ? `(${missingTeams.slice(0,3).join(', ')})` : ''}`);
    }
    
  } catch (error) {
    console.error('Erreur analyse:', error.message);
  }
}

// Exécution
analyzeMatchesVsFeatures();