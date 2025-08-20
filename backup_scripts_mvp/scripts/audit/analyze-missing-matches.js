/**
 * ANALYSE: Vérifier les 760 matches manquants (1760 attendus - 1000 avec scores)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeMissingMatches() {
  console.log('ANALYSE: 760 matches manquants (scores NULL)');
  console.log('=============================================');
  
  try {
    // 1. Total matches dans la DB
    const { data: totalMatches } = await supabase
      .from('matches')
      .select('id, season, home_team_name, away_team_name, home_score, away_score, date, status');
      
    console.log(`Total matches en DB: ${totalMatches?.length || 0}`);
    
    // 2. Matches AVEC scores
    const matchesWithScores = totalMatches?.filter(m => 
      m.home_score !== null && m.away_score !== null
    ) || [];
    
    console.log(`Matches AVEC scores: ${matchesWithScores.length}`);
    
    // 3. Matches SANS scores (les manquants!)
    const matchesWithoutScores = totalMatches?.filter(m => 
      m.home_score === null || m.away_score === null
    ) || [];
    
    console.log(`Matches SANS scores: ${matchesWithoutScores.length}`);
    console.log(`Pourcentage manquant: ${((matchesWithoutScores.length / totalMatches.length) * 100).toFixed(1)}%`);
    
    // 4. Analyser les matches sans scores par saison
    console.log(`\nAnalyse matches SANS scores par saison:`);
    
    const missingBySeason = {};
    matchesWithoutScores.forEach(m => {
      missingBySeason[m.season] = (missingBySeason[m.season] || 0) + 1;
    });
    
    Object.entries(missingBySeason).forEach(([season, count]) => {
      const totalForSeason = totalMatches.filter(m => m.season === season).length;
      const percentage = ((count / totalForSeason) * 100).toFixed(1);
      console.log(`  - ${season}: ${count}/${totalForSeason} manquants (${percentage}%)`);
    });
    
    // 5. Analyser les statuts des matches sans scores
    console.log(`\nAnalyse STATUS des matches sans scores:`);
    
    const statusCounts = {};
    matchesWithoutScores.forEach(m => {
      const status = m.status || 'NULL';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - Status "${status}": ${count} matches`);
    });
    
    // 6. Échantillon des matches sans scores
    console.log(`\nEchantillon matches SANS scores (10 premiers):`);
    
    matchesWithoutScores.slice(0, 10).forEach((match, i) => {
      const dateStr = match.date ? new Date(match.date).toLocaleDateString() : 'Date inconnue';
      console.log(`  ${i+1}. ${match.home_team_name} vs ${match.away_team_name}`);
      console.log(`     Saison: ${match.season}, Date: ${dateStr}, Status: ${match.status || 'NULL'}`);
      console.log(`     Scores: ${match.home_score} - ${match.away_score}`);
    });
    
    // 7. Analyser les dates des matches sans scores
    console.log(`\nAnalyse DATES des matches sans scores:`);
    
    const currentDate = new Date();
    let futureMatches = 0;
    let pastMatches = 0;
    let noDateMatches = 0;
    
    matchesWithoutScores.forEach(match => {
      if (!match.date) {
        noDateMatches++;
      } else {
        const matchDate = new Date(match.date);
        if (matchDate > currentDate) {
          futureMatches++;
        } else {
          pastMatches++;
        }
      }
    });
    
    console.log(`  - Matches futurs (non joues): ${futureMatches}`);
    console.log(`  - Matches passes (scores manques): ${pastMatches}`);
    console.log(`  - Matches sans date: ${noDateMatches}`);
    
    // 8. Recommandations
    console.log(`\nRECOMMANDATIONS:`);
    console.log(`================`);
    
    if (futureMatches > 0) {
      console.log(`1. ${futureMatches} matches futurs - NORMAL (pas encore joues)`);
    }
    
    if (pastMatches > 0) {
      console.log(`2. ${pastMatches} matches passes sans scores - PROBLEME INGESTION`);
      console.log(`   Action: Re-executer collectors pour ces matches`);
    }
    
    if (noDateMatches > 0) {
      console.log(`3. ${noDateMatches} matches sans date - PROBLEME DATA`);
      console.log(`   Action: Nettoyer ces records`);
    }
    
    const usablePercentage = ((matchesWithScores.length / totalMatches.length) * 100).toFixed(1);
    console.log(`\nSTATUT GLOBAL:`);
    console.log(`- ${usablePercentage}% des matches utilisables pour ML`);
    
    if (usablePercentage >= 70) {
      console.log(`- QUALITE: BONNE (>70% utilisable)`);
    } else if (usablePercentage >= 50) {
      console.log(`- QUALITE: MOYENNE (50-70% utilisable)`);
    } else {
      console.log(`- QUALITE: FAIBLE (<50% utilisable)`);
    }
    
  } catch (error) {
    console.error('Erreur analyse:', error.message);
  }
}

// Exécution
analyzeMissingMatches();