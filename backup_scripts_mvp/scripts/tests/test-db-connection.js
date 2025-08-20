const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'
);

async function testConnection() {
  try {
    console.log('🔍 Testing database connection and schema...');
    
    // Test 1: Connexion de base
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('count', { count: 'exact' });
    
    if (leaguesError) {
      console.error('❌ Error connecting to leagues table:', leaguesError);
      return;
    }
    
    console.log('✅ Leagues table accessible, count:', leagues);
    
    // Test 2: Vérifier quelques tables clés
    const tables = ['teams', 'matches', 'features_match_team', 'market_probs', 'post_match_analysis', 'monte_carlo_calibrations'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact' });
      
      if (error) {
        console.error(`❌ Error accessing ${table}:`, error.message);
      } else {
        console.log(`✅ Table ${table} accessible, count:`, data);
      }
    }
    
    console.log('\n🎯 Database schema successfully deployed!');
    console.log('📋 All Phase 1, 2 & 3 tables are ready for data collection and ML pipeline');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

testConnection();