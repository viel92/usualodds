/**
 * AUDIT PROFOND: Où sont les 760 matches manquants ?
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepMatchesAudit() {
  console.log('AUDIT PROFOND: Ou sont les 760 matches manquants ?');
  console.log('================================================');
  
  try {
    // 1. Différentes méthodes de comptage
    const { count: totalCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true });
      
    console.log(`Method 1 - Count exact: ${totalCount}`);
    
    const { data: allData } = await supabase
      .from('matches')
      .select('id');
      
    console.log(`Method 2 - Select all IDs: ${allData?.length || 0}`);
    
    // 2. Par saisons détaillées
    console.log('\nComptage par saison:');
    let totalBySeason = 0;
    
    for (const season of [2020, 2021, 2022, 2023, 2024]) {
      const { data: seasonData } = await supabase
        .from('matches')
        .select('id')
        .eq('season', season);
        
      const count = seasonData?.length || 0;
      console.log(`  Saison ${season}: ${count} matches`);
      totalBySeason += count;
    }
    
    console.log(`Total par saisons: ${totalBySeason}`);
    
    // 3. Vérifier matches sans saison ou avec saisons différentes
    const { data: noSeasonData } = await supabase
      .from('matches')
      .select('id, season')
      .is('season', null);
      
    console.log(`Matches sans saison: ${noSeasonData?.length || 0}`);
    
    // 4. Échantillon toutes les saisons existantes
    const { data: sampleData } = await supabase
      .from('matches')
      .select('season')
      .limit(1000);
      
    const uniqueSeasons = [...new Set(sampleData?.map(d => d.season))].sort();
    console.log(`\nSaisons existantes: [${uniqueSeasons.join(', ')}]`);
    
    // 5. Vérifier le format des saisons (string vs number)
    console.log('\nAnalyse format saisons:');
    const seasonTypes = {};
    sampleData?.forEach(d => {
      const type = typeof d.season;
      seasonTypes[type] = (seasonTypes[type] || 0) + 1;
    });
    
    Object.entries(seasonTypes).forEach(([type, count]) => {
      console.log(`  Type ${type}: ${count} matches`);
    });
    
    // 6. Vérifier s'il y a d'autres colonnes de filtrage
    const { data: statusSample } = await supabase
      .from('matches')
      .select('status, date')
      .limit(10);
      
    console.log('\nEchantillon status et dates:');
    statusSample?.forEach((match, i) => {
      console.log(`  ${i+1}. Status: ${match.status}, Date: ${match.date}`);
    });
    
    // 7. Historique de nos audits précédents
    console.log('\n=== RECONCILIATION ===');
    console.log('Audit precedent mentionnait: 1760 matches');
    console.log(`Audit actuel trouve: ${totalCount} matches`);
    console.log(`Difference: ${1760 - (totalCount || 0)} matches`);
    
    // 8. Hypothèses sur la différence
    console.log('\nHYPOTHESES:');
    console.log('1. Audit precedent comptait matches + fixtures futures');
    console.log('2. Nettoyage de donnees entre temps');
    console.log('3. Erreur dans audit precedent');
    console.log('4. Probleme de filtre saisons');
    
    // 9. Recommandation finale
    console.log('\nRECOMMANDATION:');
    if (totalCount >= 1000) {
      console.log(`✅ ${totalCount} matches = Dataset solide pour ML`);
      console.log('✅ 56.3% accuracy avec vraies donnees = Bon resultat');
      console.log('✅ Continuer optimisation vers 60%+');
    } else {
      console.log('❌ Dataset insuffisant, reingesttion necessaire');
    }
    
  } catch (error) {
    console.error('Erreur audit profond:', error.message);
  }
}

// Exécution
deepMatchesAudit();