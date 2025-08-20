/**
 * TEST ODDS AVAILABILITY - USUALODDS 2025
 * =======================================
 * Test simple pour voir quels matches ont des cotes disponibles
 * Sans base de données - juste logs pour analyse
 */

const { config } = require('dotenv');
config();

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const UNIBET_ID = 16;

/**
 * Test de disponibilité des cotes pour un match
 */
async function testOddsAvailability(matchApiId, matchName, matchDate) {
  try {
    const url = `https://v3.football.api-sports.io/odds?fixture=${matchApiId}&bookmaker=${UNIBET_ID}`;
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': API_FOOTBALL_KEY,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
      }
    });
    
    const data = await response.json();
    const daysUntil = Math.round((new Date(matchDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    if (data.response?.[0]?.bookmakers?.[0]) {
      const bookmaker = data.response[0].bookmakers[0];
      const matchWinner = bookmaker.bets.find(b => b.name === 'Match Winner');
      
      if (matchWinner) {
        const odds = matchWinner.values.map(v => `${v.value}: ${v.odd}`).join(' | ');
        console.log(`✅ ${matchName}`);
        console.log(`   📅 Dans ${daysUntil} jours`);
        console.log(`   🎯 Cotes: ${odds}`);
        console.log(`   ⏰ Maj: ${data.response[0].update}`);
        return true;
      }
    }
    
    console.log(`❌ ${matchName}`);
    console.log(`   📅 Dans ${daysUntil} jours - Cotes non disponibles`);
    return false;
    
  } catch (error) {
    console.log(`💥 ${matchName} - Erreur: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🎯 TEST DISPONIBILITÉ COTES UNIBET');
  console.log('==================================');
  
  // Test avec nos matches à venir (quelques exemples)
  const testMatches = [
    { apiId: 1387713, name: 'PSG vs Angers', date: '2025-08-22T18:45:00Z' },
    { apiId: 1387711, name: 'Marseille vs Paris FC', date: '2025-08-23T15:00:00Z' },
    { apiId: 1387712, name: 'Nice vs Auxerre', date: '2025-08-23T17:00:00Z' },
    { apiId: 1387810, name: 'Lille vs Rennes', date: '2025-11-04T16:00:00Z' },
    { apiId: 1387850, name: 'Lyon vs Le Havre', date: '2025-12-14T16:00:00Z' }
  ];
  
  let available = 0;
  let total = testMatches.length;
  
  for (const match of testMatches) {
    const hasOdds = await testOddsAvailability(match.apiId, match.name, match.date);
    if (hasOdds) available++;
    
    console.log(''); // Ligne vide
    
    // Pause pour éviter rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('📊 RÉSUMÉ:');
  console.log(`✅ Matches avec cotes: ${available}/${total}`);
  console.log(`📈 Taux disponibilité: ${Math.round(available/total*100)}%`);
  
  if (available > 0) {
    console.log('\\n🎉 Excellent! Certains matches ont des cotes disponibles.');
    console.log('💡 Stratégie recommandée: Vérifier quotidiennement les matches < 7 jours');
  } else {
    console.log('\\n⚠️ Aucune cote disponible pour l\'instant.');
    console.log('💡 Normal pour matches lointains - réessayer dans quelques jours');
  }
}

main().catch(console.error);