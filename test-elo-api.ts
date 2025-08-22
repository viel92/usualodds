/**
 * Test des requêtes Supabase pour l'ELO dans l'API TypeScript
 */

import { createClient } from '@supabase/supabase-js';

async function testEloQueries() {
  console.log('TEST ELO API TypeScript');
  console.log('='.repeat(60));
  
  // Configuration Supabase directe
  const supabaseUrl = 'https://agysfqhijfbnqzzooyeo.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 1. Récupérer un match test avec PSG (ID 85 qu'on sait avoir des données)
  console.log('\n1. Récupération d\'un match test avec PSG...');
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, home_team_name, away_team_name')
    .eq('home_team_id', 85)
    .order('date', { ascending: false })
    .limit(1);
  
  if (matchError || !matches || matches.length === 0) {
    console.error('Erreur récupération match:', matchError);
    return;
  }
  
  const match = matches[0];
  console.log(`Match: ${match.home_team_name} vs ${match.away_team_name}`);
  console.log(`IDs: Home=${match.home_team_id}, Away=${match.away_team_id}`);
  
  // 2. Test requête pour home team (exactement comme dans route.ts)
  console.log(`\n2. Test requête home team (ID ${match.home_team_id})...`);
  
  const { data: homeFeatures, error: homeError } = await supabase
    .from('team_features')
    .select(`
      elo_rating, 
      form_5_points, 
      season
    `)
    .eq('team_id', match.home_team_id)
    .order('season', { ascending: false })
    .limit(1);
  
  console.log('Résultat home:');
  console.log('  - Error:', homeError);
  console.log('  - Data:', homeFeatures);
  
  if (homeFeatures && homeFeatures.length > 0) {
    const homeData = homeFeatures[0];
    console.log(`  - ELO: ${homeData.elo_rating}`);
    console.log(`  - Season: ${homeData.season}`);
    console.log(`  - Form: ${homeData.form_5_points}`);
  }
  
  // 3. Test avec .single() (peut-être le problème?)
  console.log(`\n3. Test avec .single()...`);
  
  const { data: homeSingle, error: homeSingleError } = await supabase
    .from('team_features')
    .select('elo_rating, form_5_points, season')
    .eq('team_id', match.home_team_id)
    .order('season', { ascending: false })
    .limit(1)
    .single();
  
  console.log('Résultat avec .single():');
  console.log('  - Error:', homeSingleError);
  console.log('  - Data:', homeSingle);
  
  // 4. Test direct sans order/limit
  console.log(`\n4. Test direct sans order/limit...`);
  
  const { data: homeDirect, error: homeDirectError } = await supabase
    .from('team_features')
    .select('elo_rating, season')
    .eq('team_id', match.home_team_id);
  
  console.log('Résultat direct:');
  console.log('  - Error:', homeDirectError);
  console.log('  - Nombre de records:', homeDirect?.length);
  if (homeDirect && homeDirect.length > 0) {
    homeDirect.forEach((record: any, index: number) => {
      console.log(`  - Record ${index + 1}: Season ${record.season}, ELO ${record.elo_rating}`);
    });
  }
  
  // 5. Vérifier le type du team_id
  console.log(`\n5. Vérification types...`);
  console.log(`  - Type de match.home_team_id: ${typeof match.home_team_id}`);
  console.log(`  - Valeur: ${match.home_team_id}`);
  
  // Test avec conversion explicite
  const teamIdAsNumber = Number(match.home_team_id);
  console.log(`  - Après Number(): ${teamIdAsNumber} (type: ${typeof teamIdAsNumber})`);
  
  const { data: homeWithNumber, error: homeNumberError } = await supabase
    .from('team_features')
    .select('elo_rating')
    .eq('team_id', teamIdAsNumber)
    .limit(1);
  
  console.log('\nRésultat avec Number():');
  console.log('  - Error:', homeNumberError);
  console.log('  - Data:', homeWithNumber);
  
  console.log('\n' + '='.repeat(60));
  console.log('FIN DU TEST');
}

// Exécuter le test
testEloQueries().catch(console.error);