import { createServerClient } from '@/lib/supabase';
import { Match } from '@/types/database';

async function getMatches(): Promise<Match[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!home_team_id(*),
      away_team:teams!away_team_id(*),
      season:seasons(*)
    `)
    .eq('status', 'scheduled')
    .gte('match_date', new Date().toISOString())
    .order('match_date', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Error fetching matches:', error);
    return [];
  }

  return data || [];
}

export default async function MatchesPage() {
  const matches = await getMatches();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Upcoming Matches</h1>
      
      <div className="grid gap-6">
        {matches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No upcoming matches found.</p>
            <p className="text-sm text-gray-500 mt-2">
              Matches will appear here once data collection is set up.
            </p>
          </div>
        ) : (
          matches.map((match) => (
            <div key={match.id} className="border rounded-lg p-6 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-semibold">{match.home_team?.name || 'TBD'}</p>
                    <p className="text-sm text-gray-500">Home</p>
                  </div>
                  <div className="text-2xl font-bold text-gray-400">VS</div>
                  <div className="text-left">
                    <p className="font-semibold">{match.away_team?.name || 'TBD'}</p>
                    <p className="text-sm text-gray-500">Away</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold">
                    {new Date(match.match_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(match.match_date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              
              {match.venue && (
                <div className="mt-4 text-sm text-gray-600">
                  📍 {match.venue}
                </div>
              )}
              
              <div className="mt-4 flex space-x-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {match.status}
                </span>
                {match.referee && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                    Ref: {match.referee}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}