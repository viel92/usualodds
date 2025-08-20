/**
 * UPCOMING MATCHES COLLECTOR - USUALODDS 2025
 * ==========================================
 * Collecte les matches à venir de Ligue 1 via API Football
 * Pour alimenter le système de prédictions live
 */

const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');

// Charger les variables d'environnement
config();

// Client administrateur Supabase
const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

const RAPIDAPI_KEY = process.env.API_FOOTBALL_KEY;
const LIGUE_1_ID = 61; // ID Ligue 1 dans API Football
const CURRENT_SEASON = 2025;

/**
 * Récupère les matches à venir de Ligue 1
 */
async function fetchUpcomingMatches() {
  try {
    console.log('🔍 Récupération matches à venir Ligue 1...');
    
    const url = `https://v3.football.api-sports.io/fixtures?league=${LIGUE_1_ID}&season=${CURRENT_SEASON}&status=NS`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Football error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.response || data.response.length === 0) {
      console.log('⚠️ Aucun match à venir trouvé');
      return [];
    }
    
    console.log(`✅ ${data.response.length} matches à venir récupérés`);
    return data.response;
    
  } catch (error) {
    console.error('❌ Erreur récupération matches:', error.message);
    throw error;
  }
}

/**
 * Traite et formate un match pour insertion en base
 */
function formatMatchData(apiMatch) {
  const fixture = apiMatch.fixture;
  const teams = apiMatch.teams;
  const league = apiMatch.league;
  
  return {
    api_id: fixture.id,
    home_team_name: teams.home.name,
    away_team_name: teams.away.name,
    home_team_id: teams.home.id,
    away_team_id: teams.away.id,
    date: fixture.date,
    status: fixture.status.short,
    season: CURRENT_SEASON.toString(),
    round: league.round || 'Regular Season',
    venue_name: fixture.venue?.name || 'Unknown',
    referee: fixture.referee || null,
    league_id: 1, // ID de la Ligue 1 dans notre base
    raw_data: apiMatch // Garder toutes les données brutes
  };
}

/**
 * Vérifie si un match existe déjà en base
 */
async function matchExists(supabase, apiId, date) {
  const { data, error } = await supabase
    .from('matches')
    .select('id')
    .eq('api_id', apiId)
    .single();
    
  if (error && error.code !== 'PGRST116') { // Pas une erreur "not found"
    throw error;
  }
  
  return !!data;
}

/**
 * Insère les matches à venir en base de données
 */
async function insertUpcomingMatches(matches) {
  try {
    console.log('💾 Insertion matches en base de données...');
    
    const supabase = createAdminClient();
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const match of matches) {
      const formattedMatch = formatMatchData(match);
      
      // Vérifier si le match existe déjà
      const exists = await matchExists(supabase, formattedMatch.api_id, formattedMatch.date);
      
      if (exists) {
        console.log(`⏭️ Match déjà existant: ${formattedMatch.home_team_name} vs ${formattedMatch.away_team_name}`);
        skippedCount++;
        continue;
      }
      
      // Insérer le nouveau match
      const { data, error } = await supabase
        .from('matches')
        .insert([formattedMatch])
        .select()
        .single();
        
      if (error) {
        console.error(`❌ Erreur insertion match ${formattedMatch.api_id}:`, error.message);
        continue;
      }
      
      console.log(`✅ Match inséré: ${formattedMatch.home_team_name} vs ${formattedMatch.away_team_name} (${new Date(formattedMatch.date).toLocaleString('fr-FR')})`);
      insertedCount++;
    }
    
    console.log('\n📊 RÉSUMÉ INSERTION:');
    console.log(`✅ Matches insérés: ${insertedCount}`);
    console.log(`⏭️ Matches existants: ${skippedCount}`);
    console.log(`📈 Total traités: ${matches.length}`);
    
    return { insertedCount, skippedCount };
    
  } catch (error) {
    console.error('❌ Erreur insertion matches:', error.message);
    throw error;
  }
}

/**
 * Collecte et insère les équipes si nécessaires
 */
async function ensureTeamsExist(matches) {
  try {
    console.log('👥 Vérification équipes en base...');
    
    const supabase = createAdminClient();
    
    // Récupérer toutes les équipes uniques des matches
    const teams = new Set();
    matches.forEach(match => {
      teams.add(JSON.stringify({
        id: match.teams.home.id,
        name: match.teams.home.name,
        logo: match.teams.home.logo
      }));
      teams.add(JSON.stringify({
        id: match.teams.away.id,
        name: match.teams.away.name,
        logo: match.teams.away.logo
      }));
    });
    
    const uniqueTeams = Array.from(teams).map(t => JSON.parse(t));
    
    let insertedTeams = 0;
    
    for (const team of uniqueTeams) {
      // Vérifier si l'équipe existe
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('api_id', team.id)
        .single();
        
      if (!existingTeam) {
        // Insérer l'équipe
        const { error } = await supabase
          .from('teams')
          .insert([{
            api_id: team.id,
            name: team.name,
            logo: team.logo,
            country: 'France', // Ligue 1
            league_id: 1 // Par défaut
          }]);
          
        if (!error) {
          console.log(`✅ Équipe ajoutée: ${team.name}`);
          insertedTeams++;
        }
      }
    }
    
    console.log(`👥 ${insertedTeams} nouvelles équipes ajoutées`);
    
  } catch (error) {
    console.error('❌ Erreur gestion équipes:', error.message);
    // Ne pas faire planter le script pour les équipes
  }
}

/**
 * Script principal
 */
async function main() {
  try {
    console.log('🚀 DÉMARRAGE COLLECTE MATCHES À VENIR');
    console.log('====================================');
    
    // Vérifier la clé API
    if (!RAPIDAPI_KEY) {
      throw new Error('API_FOOTBALL_KEY manquante dans .env');
    }
    
    // 1. Récupérer les matches à venir
    const upcomingMatches = await fetchUpcomingMatches();
    
    if (upcomingMatches.length === 0) {
      console.log('✨ Aucun nouveau match à traiter');
      return;
    }
    
    // 2. S'assurer que les équipes existent
    await ensureTeamsExist(upcomingMatches);
    
    // 3. Insérer les matches
    const result = await insertUpcomingMatches(upcomingMatches);
    
    console.log('\n🎉 COLLECTE TERMINÉE AVEC SUCCÈS!');
    console.log(`📈 ${result.insertedCount} nouveaux matches prêts pour prédictions`);
    
  } catch (error) {
    console.error('\n💥 ERREUR CRITIQUE:', error.message);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = { collectUpcomingMatches: main };