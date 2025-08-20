/**
 * SMART ODDS COLLECTOR - USUALODDS 2025
 * ====================================
 * Collecte intelligente des cotes Unibet avec vérification de disponibilité
 * Système adaptatif : vérifie selon la proximité du match
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

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const UNIBET_ID = 16; // ID Unibet dans API Football

/**
 * Calcule la stratégie de vérification selon la distance du match
 */
function getCheckStrategy(matchDate) {
  const now = new Date();
  const match = new Date(matchDate);
  const hoursUntilMatch = (match - now) / (1000 * 60 * 60);
  const daysUntilMatch = hoursUntilMatch / 24;
  
  console.log(`⏰ Match dans ${daysUntilMatch.toFixed(1)} jours (${hoursUntilMatch.toFixed(1)}h)`);
  
  if (hoursUntilMatch <= 0) {
    return { shouldCheck: false, reason: 'Match déjà joué' };
  }
  
  // Stratégie intelligente selon la proximité
  if (daysUntilMatch > 7) {
    return { shouldCheck: false, reason: 'Match trop lointain (>7 jours)' };
  } else if (daysUntilMatch > 3) {
    return { shouldCheck: true, frequency: 'daily', reason: 'Vérification quotidienne' };
  } else if (daysUntilMatch > 1) {
    return { shouldCheck: true, frequency: 'every-6h', reason: 'Vérification toutes les 6h' };
  } else if (hoursUntilMatch > 6) {
    return { shouldCheck: true, frequency: 'hourly', reason: 'Vérification horaire' };
  } else if (hoursUntilMatch > 2) {
    return { shouldCheck: true, frequency: 'every-30min', reason: 'Vérification semi-horaire' };
  } else {
    return { shouldCheck: true, frequency: 'every-15min', reason: 'Vérification intensive' };
  }
}

/**
 * Vérifie si on a déjà les cotes récentes pour un match
 */
async function hasRecentOdds(supabase, matchId, maxAgeHours = 6) {
  const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('match_odds_timeline')
    .select('created_at')
    .eq('match_id', parseInt(matchId)) // matchId est ici l'api_id
    .eq('bookmaker', 'Unibet')
    .gte('created_at', cutoffTime.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  return !!data;
}

/**
 * Récupère les cotes depuis API Football
 */
async function fetchOddsFromAPI(matchApiId) {
  try {
    console.log(`🔍 Récupération cotes API pour match ${matchApiId}...`);
    
    const url = `https://v3.football.api-sports.io/odds?fixture=${matchApiId}&bookmaker=${UNIBET_ID}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': API_FOOTBALL_KEY,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Football error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.response || data.response.length === 0) {
      console.log(`⚠️ Aucune cote disponible pour match ${matchApiId}`);
      return null;
    }
    
    const oddsData = data.response[0];
    if (!oddsData.bookmakers || oddsData.bookmakers.length === 0) {
      console.log(`⚠️ Unibet non disponible pour match ${matchApiId}`);
      return null;
    }
    
    console.log(`✅ Cotes Unibet récupérées pour match ${matchApiId}`);
    return oddsData;
    
  } catch (error) {
    console.error(`❌ Erreur récupération cotes match ${matchApiId}:`, error.message);
    return null;
  }
}

/**
 * Extrait et formate les cotes selon la structure match_odds_timeline
 */
function extractMainOdds(oddsData) {
  const bookmaker = oddsData.bookmakers[0];
  const mainOdds = {
    odds_home: null,
    odds_draw: null,
    odds_away: null,
    odds_over_25: null,
    odds_under_25: null,
    odds_over_15: null,
    odds_under_15: null,
    odds_over_35: null,
    odds_under_35: null,
    odds_btts_yes: null,
    odds_btts_no: null
  };
  
  // Chercher les paris principaux
  for (const bet of bookmaker.bets) {
    switch (bet.name) {
      case 'Match Winner':
        const homeWin = bet.values.find(v => v.value === 'Home');
        const draw = bet.values.find(v => v.value === 'Draw');
        const awayWin = bet.values.find(v => v.value === 'Away');
        
        mainOdds.odds_home = homeWin ? parseFloat(homeWin.odd) : null;
        mainOdds.odds_draw = draw ? parseFloat(draw.odd) : null;
        mainOdds.odds_away = awayWin ? parseFloat(awayWin.odd) : null;
        break;
        
      case 'Goals Over/Under':
        const over15 = bet.values.find(v => v.value === 'Over 1.5');
        const under15 = bet.values.find(v => v.value === 'Under 1.5');
        const over25 = bet.values.find(v => v.value === 'Over 2.5');
        const under25 = bet.values.find(v => v.value === 'Under 2.5');
        const over35 = bet.values.find(v => v.value === 'Over 3.5');
        const under35 = bet.values.find(v => v.value === 'Under 3.5');
        
        mainOdds.odds_over_15 = over15 ? parseFloat(over15.odd) : null;
        mainOdds.odds_under_15 = under15 ? parseFloat(under15.odd) : null;
        mainOdds.odds_over_25 = over25 ? parseFloat(over25.odd) : null;
        mainOdds.odds_under_25 = under25 ? parseFloat(under25.odd) : null;
        mainOdds.odds_over_35 = over35 ? parseFloat(over35.odd) : null;
        mainOdds.odds_under_35 = under35 ? parseFloat(under35.odd) : null;
        break;
        
      case 'Both Teams Score':
        const btsYes = bet.values.find(v => v.value === 'Yes');
        const btsNo = bet.values.find(v => v.value === 'No');
        
        mainOdds.odds_btts_yes = btsYes ? parseFloat(btsYes.odd) : null;
        mainOdds.odds_btts_no = btsNo ? parseFloat(btsNo.odd) : null;
        break;
    }
  }
  
  return mainOdds;
}

/**
 * Calcule les probabilités implicites et la marge du marché
 */
function calculateProbabilities(odds_home, odds_draw, odds_away) {
  if (!odds_home || !odds_draw || !odds_away) {
    return {
      implied_prob_home: null,
      implied_prob_draw: null,
      implied_prob_away: null,
      market_margin: null
    };
  }
  
  // Probabilités implicites (1/cote)
  const prob_home = 1 / odds_home;
  const prob_draw = 1 / odds_draw;  
  const prob_away = 1 / odds_away;
  
  // Somme des probabilités (>1 à cause de la marge bookmaker)
  const total_prob = prob_home + prob_draw + prob_away;
  
  // Marge du marché (en pourcentage)
  const margin = ((total_prob - 1) * 100);
  
  return {
    implied_prob_home: parseFloat((prob_home * 100).toFixed(2)),
    implied_prob_draw: parseFloat((prob_draw * 100).toFixed(2)),
    implied_prob_away: parseFloat((prob_away * 100).toFixed(2)),
    market_margin: parseFloat(margin.toFixed(2))
  };
}

/**
 * Sauvegarde les cotes en base de données
 */
async function saveOdds(supabase, matchId, matchApiId, oddsData) {
  try {
    const mainOdds = extractMainOdds(oddsData);
    const bookmaker = oddsData.bookmakers[0];
    
    // Calculer probabilités et marge
    const probabilities = calculateProbabilities(
      mainOdds.odds_home, 
      mainOdds.odds_draw, 
      mainOdds.odds_away
    );
    
    const oddsRecord = {
      match_id: parseInt(matchApiId), // Utiliser api_id (integer) au lieu de UUID
      bookmaker: bookmaker.name,
      timestamp: oddsData.update || new Date().toISOString(),
      ...mainOdds,
      ...probabilities,
      player_odds: null, // Pour futures cotes joueurs
      raw_odds: oddsData,
      created_at: new Date().toISOString()
    };
    
    // Insert (pas d'upsert car table timeline)
    const { data, error } = await supabase
      .from('match_odds_timeline')
      .insert([oddsRecord])
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    console.log(`💾 Cotes sauvegardées : ${mainOdds.odds_home} / ${mainOdds.odds_draw} / ${mainOdds.odds_away}`);
    console.log(`📊 Marge marché : ${probabilities.market_margin}%`);
    return data;
    
  } catch (error) {
    console.error(`❌ Erreur sauvegarde cotes:`, error.message);
    throw error;
  }
}

/**
 * Traite un match pour collecter ses cotes
 */
async function processMatch(supabase, match) {
  const strategy = getCheckStrategy(match.date);
  
  console.log(`\n🔄 ${match.home_team_name} vs ${match.away_team_name}`);
  console.log(`📅 ${new Date(match.date).toLocaleString('fr-FR')}`);
  console.log(`🎯 Stratégie: ${strategy.reason}`);
  
  if (!strategy.shouldCheck) {
    console.log(`⏭️ Skip: ${strategy.reason}`);
    return { status: 'skipped', reason: strategy.reason };
  }
  
  // Vérifier si on a des cotes récentes
  try {
    const hasRecent = await hasRecentOdds(supabase, match.api_id);
    if (hasRecent && strategy.frequency !== 'every-15min') {
      console.log(`✅ Cotes récentes déjà disponibles`);
      return { status: 'has_recent', reason: 'Cotes récentes en cache' };
    }
  } catch (error) {
    console.log(`⚠️ Erreur vérification cache: ${error.message}`);
  }
  
  // Récupérer les cotes depuis l'API
  const oddsData = await fetchOddsFromAPI(match.api_id);
  
  if (!oddsData) {
    console.log(`❌ Cotes non disponibles`);
    return { status: 'no_odds', reason: 'Cotes non disponibles sur API' };
  }
  
  // Sauvegarder en base
  try {
    await saveOdds(supabase, match.api_id, match.api_id, oddsData);
    console.log(`✅ Cotes mises à jour avec succès`);
    return { status: 'success', reason: 'Cotes récupérées et sauvegardées' };
  } catch (error) {
    console.log(`❌ Erreur sauvegarde: ${error.message}`);
    return { status: 'error', reason: error.message };
  }
}

/**
 * Script principal
 */
async function main() {
  try {
    console.log('🚀 SMART ODDS COLLECTOR - UNIBET');
    console.log('================================');
    
    // Vérifier la clé API
    if (!API_FOOTBALL_KEY) {
      throw new Error('API_FOOTBALL_KEY manquante dans .env');
    }
    
    const supabase = createAdminClient();
    
    // Récupérer les matches à venir (prochains 30 jours)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    console.log(`📊 Récupération matches jusqu'au ${futureDate.toLocaleDateString('fr-FR')}...`);
    
    const { data: matches, error } = await supabase
      .from('matches')
      .select('id, api_id, home_team_name, away_team_name, date, status')
      .is('home_score', null)
      .is('away_score', null)
      .gte('date', new Date().toISOString())
      .lte('date', futureDate.toISOString())
      .order('date');
      
    if (error) {
      throw new Error(`Erreur Supabase: ${error.message}`);
    }
    
    console.log(`✅ ${matches.length} matches à venir trouvés`);
    
    // Statistiques
    const stats = {
      total: matches.length,
      processed: 0,
      success: 0,
      skipped: 0,
      no_odds: 0,
      has_recent: 0,
      errors: 0
    };
    
    // Traiter chaque match
    for (const match of matches) {
      const result = await processMatch(supabase, match);
      
      stats.processed++;
      stats[result.status]++;
      
      // Pause pour éviter rate limiting (1 seconde)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📊 RÉSUMÉ FINAL:');
    console.log(`✅ Matches traités: ${stats.processed}/${stats.total}`);
    console.log(`🎯 Succès: ${stats.success}`);
    console.log(`📦 Cache récent: ${stats.has_recent}`);
    console.log(`⏭️ Ignorés: ${stats.skipped}`);
    console.log(`❌ Cotes indispo: ${stats.no_odds}`);
    console.log(`💥 Erreurs: ${stats.errors}`);
    
    console.log('\n🎉 COLLECTE TERMINÉE!');
    
  } catch (error) {
    console.error('\n💥 ERREUR CRITIQUE:', error.message);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = { main };