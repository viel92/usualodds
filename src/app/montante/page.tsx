import { createServerClient } from '@/lib/supabase';
import { MontanteSeries, MontanteBet } from '@/types/database';

async function getCurrentSeries(): Promise<MontanteSeries | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('montante_series')
    .select('*')
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching current series:', error);
  }

  return data || null;
}

async function getRecentBets(seriesId?: string): Promise<MontanteBet[]> {
  if (!seriesId) return [];
  
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('montante_bets')
    .select('*')
    .eq('series_id', seriesId)
    .order('placed_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching recent bets:', error);
    return [];
  }

  return data || [];
}

export default async function MontantePage() {
  const currentSeries = await getCurrentSeries();
  const recentBets = await getRecentBets(currentSeries?.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Montante System</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Current Series Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Current Series</h2>
          
          {currentSeries ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Initial Bankroll</p>
                  <p className="text-2xl font-bold text-green-600">
                    €{currentSeries.initial_bankroll.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Bankroll</p>
                  <p className="text-2xl font-bold">
                    €{currentSeries.max_bankroll.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Bets Placed</p>
                  <p className="text-lg font-semibold">{currentSeries.bet_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ROI</p>
                  <p className={`text-lg font-semibold ${
                    currentSeries.max_bankroll >= currentSeries.initial_bankroll 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {(((currentSeries.max_bankroll - currentSeries.initial_bankroll) / currentSeries.initial_bankroll) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Started</p>
                <p className="text-sm">
                  {new Date(currentSeries.started_at).toLocaleDateString()} at{' '}
                  {new Date(currentSeries.started_at).toLocaleTimeString()}
                </p>
              </div>
              
              <div className="pt-4 border-t">
                <button className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors">
                  End Current Series
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No active series</p>
              <button className="bg-green-600 text-white py-2 px-6 rounded hover:bg-green-700 transition-colors">
                Start New Series
              </button>
            </div>
          )}
        </div>

        {/* Recent Bets */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Bets</h2>
          
          {recentBets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No bets placed yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBets.map((bet) => (
                <div key={bet.id} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">€{bet.stake.toFixed(2)} @ {bet.product_odds.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">
                        EV: {(bet.expected_value * 100).toFixed(1)}%
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      bet.result === 'won' ? 'bg-green-100 text-green-800' :
                      bet.result === 'lost' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {bet.result}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>{bet.legs.length} leg{bet.legs.length > 1 ? 's' : ''}</p>
                    <p>Placed: {new Date(bet.placed_at).toLocaleDateString()}</p>
                  </div>
                  
                  {bet.bankroll_after && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">Result: </span>
                      <span className={bet.result === 'won' ? 'text-green-600' : 'text-red-600'}>
                        €{bet.bankroll_after.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Rules */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Montante Rules</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• Initial bankroll: €5.00</li>
          <li>• Stake 100% of current bankroll on each bet</li>
          <li>• Minimum odds: 1.50 per selection</li>
          <li>• Maximum 2-3 legs per bet (if uncorrelated)</li>
          <li>• Positive expected value required (EV &gt; 0)</li>
          <li>• Reset to €5.00 after any loss</li>
          <li>• Decisions made at T-1h window only</li>
        </ul>
      </div>
    </div>
  );
}