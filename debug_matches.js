const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugMatches() {
  console.log('🔍 DEBUG MATCHES 2025...');
  
  // Total matches 2025
  const { data: total2025, error: e1 } = await supabase
    .from('matches')
    .select('id, date, home_team_name, away_team_name, home_score, away_score, status')
    .eq('season', '2025')
    .order('date')
    .limit(5);
  
  console.log('📊 5 premiers matches saison 2025:');
  if (total2025) {
    total2025.forEach(m => {
      const scores = `[${m.home_score || 'null'}-${m.away_score || 'null'}]`;
      console.log(`- ${m.date}: ${m.home_team_name} vs ${m.away_team_name} ${scores} (${m.status})`);
    });
  }
  
  // Matches futurs (conditions API exactes)
  const { data: future, error: e2 } = await supabase
    .from('matches')
    .select('id, date, home_team_name, away_team_name, home_score, away_score, status')
    .is('home_score', null)
    .is('away_score', null)
    .gte('date', '2025-08-20T00:00:00')
    .order('date')
    .limit(5);
    
  console.log('\n⚡ Matches futurs (conditions API exactes):');
  console.log('Trouvés:', future?.length || 0);
  if (future?.length > 0) {
    future.forEach(m => {
      console.log(`- ${m.date}: ${m.home_team_name} vs ${m.away_team_name} (${m.status})`);
    });
  }

  // Vérifier avec date actuelle
  const now = new Date().toISOString();
  console.log('\nDate actuelle système:', now);
  
  const { data: futureNow } = await supabase
    .from('matches')
    .select('id')
    .is('home_score', null)
    .is('away_score', null)
    .gte('date', now)
    .limit(1);
    
  console.log('Matches >= maintenant:', futureNow?.length || 0);
}

debugMatches().catch(console.error);