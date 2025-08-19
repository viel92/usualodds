'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const runCollection = async (action: string) => {
    setIsLoading(true);
    setResult('');
    
    try {
      let endpoint = '/api/collect';
      if (action === 'execute_scheduled') {
        endpoint = '/api/features';
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(`✅ ${data.message}`);
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runLearning = async (action: string) => {
    setIsLoading(true);
    setResult('');
    
    try {
      const response = await fetch('/api/learning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(`✅ ${data.message}`);
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runEnsemble = async (action: string) => {
    setIsLoading(true);
    setResult('');
    
    try {
      const response = await fetch('/api/ensemble', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      
      if (data.success) {
        if (action === 'performance_status' && data.status) {
          const status = data.status;
          setResult(`✅ Ensemble Performance Status:\n\nSystem Health: ${status.system_health?.status} (${(status.system_health?.score * 100).toFixed(1)}%)\n\nCurrent Weights:\n${status.current_weights.map((w: any) => `${w.window}: ${w.dominant_model} (${(JSON.parse(w.weights)[w.dominant_model] * 100).toFixed(1)}%)`).join('\n')}\n\nModels Needing Retraining: ${status.models_needing_retraining?.length || 0}\n\nIssues:\n${status.system_health?.issues?.join('\n') || 'None'}`);
        } else {
          setResult(`✅ ${data.message}`);
        }
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runBacktest = async (action: string) => {
    setIsLoading(true);
    setResult('');
    
    try {
      const requestBody = action === 'run_backtest' ? {
        action,
        seasons: ['2022', '2023'],
        model: 'ensemble',
        window: 'T1',
        markets: ['1X2'],
        minConfidence: 0.6,
        maxMatches: 100
      } : { action };

      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      if (data.success) {
        if (action === 'run_backtest' && data.globalSummary) {
          const summary = data.globalSummary;
          setResult(`✅ Backtest Results:\n\nTotal Predictions: ${summary.totalPredictions}\nAverage Accuracy: ${(summary.avgAccuracy * 100).toFixed(1)}%\nAverage ROI: ${(summary.avgROI * 100).toFixed(1)}%\nBrier Score: ${summary.avgBrierScore.toFixed(3)}\nSharpe Ratio: ${summary.avgSharpeRatio.toFixed(2)}\n\nBest Period: ${summary.bestPeriod}\nWorst Period: ${summary.worstPeriod}\nConsistency Score: ${(summary.consistencyScore * 100).toFixed(1)}%\n\nRecommendation: ${summary.overallRecommendation}`);
        } else if (action === 'performance_analysis' && data.analysis) {
          const analysis = data.analysis;
          const insights = analysis.insights?.join('\n') || 'No insights available';
          setResult(`✅ Performance Analysis:\n\nSeasonal Performance: ${analysis.seasonalPerformance?.length || 0} seasons\nWindow Analysis: ${analysis.windowPerformance?.length || 0} windows\nModel Evolution: ${analysis.modelEvolution?.length || 0} versions\n\nKey Insights:\n${insights}`);
        } else {
          setResult(`✅ ${data.message}`);
        }
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runSimulation = async (action: string, fixtureId?: string) => {
    setIsLoading(true);
    setResult('');
    
    try {
      const url = `/api/simulation?action=${action}${fixtureId ? `&fixture_id=${fixtureId}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.error) {
        if (action === 'run_simulation' && data.scenarios) {
          setResult(`🎲 Monte Carlo Simulation Results:\n\nFixture ID: ${data.fixture_id}\nTotal Scenarios: ${data.total_scenarios}\nTop 10 Scenarios:\n${data.scenarios.slice(0, 10).map((s: any) => `${s.homeGoals}-${s.awayGoals}: ${(s.probability * 100).toFixed(2)}% (${s.outcome})`).join('\n')}\n\nMetrics:\nExpected Value: ${data.metrics?.expectedValue || 'N/A'}\nVariance: ${data.metrics?.variance || 'N/A'}\nConfidence Interval: [${data.metrics?.confidenceInterval?.[0] || 'N/A'}, ${data.metrics?.confidenceInterval?.[1] || 'N/A'}]`);
        } else if (action === 'calculate_fair_odds' && data.fair_odds) {
          setResult(`⚖️ Fair Odds Calculated:\n\nFixture ID: ${data.fixture_id}\nConfidence Average: ${(data.confidence_avg * 100).toFixed(1)}%\n\nFair Odds:\n${data.fair_odds.map((fo: any) => `${fo.market}: ${fo.fairOdds.toFixed(2)} (${(fo.fairProbability * 100).toFixed(1)}%)`).join('\n')}`);
        } else if (action === 'identify_value' && data.opportunities) {
          setResult(`🎯 Value Opportunities Found:\n\nFixture ID: ${data.fixture_id}\nTotal Opportunities: ${data.total_opportunities}\nStrong Bets: ${data.strong_bets}\nValue Bets: ${data.value_bets}\n\nTop Opportunities:\n${data.opportunities.slice(0, 5).map((o: any) => `${o.market} @ ${o.bookmaker}: Edge ${(o.edge * 100).toFixed(2)}% (${o.recommendation})`).join('\n')}`);
        } else if (action === 'market_efficiency' && data.markets) {
          setResult(`📊 Market Efficiency Analysis:\n\nAverage Overround: ${(data.summary.avg_overround * 100).toFixed(2)}%\n\nBest Opportunities:\n${data.summary.best_opportunities.map((o: any) => `${o.market}: ${(o.profit_opportunity * 100).toFixed(2)}%`).join('\n')}\n\nAll Markets:\n${data.markets.slice(0, 5).map((m: any) => `${m.market}: Overround ${(m.overround * 100).toFixed(2)}%`).join('\n')}`);
        } else if (action === 'calibration_metrics' && data.metrics) {
          setResult(`📈 Calibration Metrics:\n\nTotal Calibrations: ${data.metrics.total_calibrations}\nAvg Strength Adjustment: ${(data.metrics.avg_strength_adjustment * 100).toFixed(2)}%\nAvg Variance Adjustment: ${(data.metrics.avg_variance_adjustment * 100).toFixed(2)}%\nAvg Tail Risk Adjustment: ${(data.metrics.avg_tail_risk_adjustment * 100).toFixed(2)}%\n\nRecent Period: ${data.metrics.recent_period}\n\nTop Learning Insights:\n${Object.entries(data.metrics.top_insights).slice(0, 5).map(([insight, count]: [string, any]) => `• ${insight} (${count}x)`).join('\n')}`);
        } else {
          setResult(`✅ ${JSON.stringify(data, null, 2)}`);
        }
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Data Collection */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Data Collection</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Initialize Database</h3>
              <p className="text-sm text-gray-600 mb-3">
                Collect leagues, teams, and current players. Run this first.
              </p>
              <button
                onClick={() => runCollection('initialize')}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Initialize'}
              </button>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Daily Collection</h3>
              <p className="text-sm text-gray-600 mb-3">
                Collect upcoming fixtures and T24 odds.
              </p>
              <button
                onClick={() => runCollection('daily')}
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Collect Daily'}
              </button>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Odds Updates</h3>
              <p className="text-sm text-gray-600 mb-3">
                Update odds for T6, T1, and T30 windows.
              </p>
              <button
                onClick={() => runCollection('odds')}
                disabled={isLoading}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Update Odds'}
              </button>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Historical Data</h3>
              <p className="text-sm text-gray-600 mb-3">
                Collect last 5 seasons of data for training.
              </p>
              <button
                onClick={() => runCollection('historical')}
                disabled={isLoading}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Collect Historical'}
              </button>
            </div>

            <div>
              <h3 className="font-medium mb-2">Enhanced Daily Pipeline</h3>
              <p className="text-sm text-gray-600 mb-3">
                Full pipeline with weather, lineups, and context data.
              </p>
              <button
                onClick={() => runCollection('enhanced_daily')}
                disabled={isLoading}
                className="w-full bg-emerald-600 text-white py-2 px-4 rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Enhanced Pipeline'}
              </button>
            </div>

            <div>
              <h3 className="font-medium mb-2">Nightly Enrichment</h3>
              <p className="text-sm text-gray-600 mb-3">
                Batch enrichment process (optimal: 2h-5h).
              </p>
              <button
                onClick={() => runCollection('nightly_enrichment')}
                disabled={isLoading}
                className="w-full bg-slate-600 text-white py-2 px-4 rounded hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Nightly Enrichment'}
              </button>
            </div>
          </div>
        </div>

        {/* Temporal Features & Validation */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Temporal Features & ML</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Execute Scheduled Pipelines</h3>
              <p className="text-sm text-gray-600 mb-3">
                Run scheduled T-24h, T-6h, T-1h, T-30min pipelines.
              </p>
              <button
                onClick={() => runCollection('execute_scheduled')}
                disabled={isLoading}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Execute Pipelines'}
              </button>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Learning Analysis</h3>
              <p className="text-sm text-gray-600 mb-3">
                Analyze finished matches and generate learning insights.
              </p>
              <button
                onClick={() => runLearning('analyze_finished_matches')}
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Analyze Matches'}
              </button>
            </div>

            <div>
              <h3 className="font-medium mb-2">Ensemble Retraining</h3>
              <p className="text-sm text-gray-600 mb-3">
                Retrain adaptive ensemble models based on recent errors.
              </p>
              <button
                onClick={() => runEnsemble('nightly_retrain')}
                disabled={isLoading}
                className="w-full bg-amber-600 text-white py-2 px-4 rounded hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Retrain Ensemble'}
              </button>
            </div>

            <div>
              <h3 className="font-medium mb-2">Model Performance</h3>
              <p className="text-sm text-gray-600 mb-3">
                Check current ensemble model performance status.
              </p>
              <button
                onClick={() => runEnsemble('performance_status')}
                disabled={isLoading}
                className="w-full bg-teal-600 text-white py-2 px-4 rounded hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Check Performance'}
              </button>
            </div>

            <div>
              <h3 className="font-medium mb-2">Run Backtest</h3>
              <p className="text-sm text-gray-600 mb-3">
                Execute temporal validation backtest on historical data.
              </p>
              <button
                onClick={() => runBacktest('run_backtest')}
                disabled={isLoading}
                className="w-full bg-violet-600 text-white py-2 px-4 rounded hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Run Backtest'}
              </button>
            </div>

            <div>
              <h3 className="font-medium mb-2">Performance Analysis</h3>
              <p className="text-sm text-gray-600 mb-3">
                Comprehensive analysis across all backtests and models.
              </p>
              <button
                onClick={() => runBacktest('performance_analysis')}
                disabled={isLoading}
                className="w-full bg-cyan-600 text-white py-2 px-4 rounded hover:bg-cyan-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Performance Analysis'}
              </button>
            </div>
          </div>
        </div>

        {/* Monte Carlo Simulation - PHASE 3 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Monte Carlo Simulation (Phase 3)</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Run Simulation</h3>
              <p className="text-sm text-gray-600 mb-3">
                Execute Monte Carlo simulation for specific fixture.
              </p>
              <button
                onClick={() => runSimulation('run_simulation', '1035242')}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Run Simulation'}
              </button>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Calculate Fair Odds</h3>
              <p className="text-sm text-gray-600 mb-3">
                Compute fair odds from simulation results.
              </p>
              <button
                onClick={() => runSimulation('calculate_fair_odds', '1035242')}
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Calculate Fair Odds'}
              </button>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Identify Value</h3>
              <p className="text-sm text-gray-600 mb-3">
                Find value opportunities vs market odds.
              </p>
              <button
                onClick={() => runSimulation('identify_value', '1035242')}
                disabled={isLoading}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Identify Value'}
              </button>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Market Efficiency</h3>
              <p className="text-sm text-gray-600 mb-3">
                Analyze market efficiency across all markets.
              </p>
              <button
                onClick={() => runSimulation('market_efficiency')}
                disabled={isLoading}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Market Efficiency'}
              </button>
            </div>

            <div>
              <h3 className="font-medium mb-2">Calibration Metrics</h3>
              <p className="text-sm text-gray-600 mb-3">
                Review post-match learning calibrations.
              </p>
              <button
                onClick={() => runSimulation('calibration_metrics')}
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Running...' : 'Calibration Metrics'}
              </button>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">API Football</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                Not Configured
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Supabase</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                Not Configured
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Database Schema</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                Ready
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Collectors</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                Ready
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">Monte Carlo Engine</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                Ready
              </span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-medium text-blue-900 mb-2">Setup Required</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Set NEXT_PUBLIC_SUPABASE_URL in .env.local</li>
              <li>• Set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local</li>
              <li>• Set API_FOOTBALL_KEY in .env.local</li>
              <li>• Run Supabase migration</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className="mt-8 p-4 rounded bg-gray-50 border">
          <h3 className="font-medium mb-2">Result</h3>
          <pre className="text-sm whitespace-pre-wrap">{result}</pre>
        </div>
      )}

      {/* Environment Variables */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Environment Setup</h2>
        
        <div className="bg-gray-100 p-4 rounded text-sm font-mono">
          <p className="mb-2"># .env.local</p>
          <p>NEXT_PUBLIC_SUPABASE_URL=your_supabase_url</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key</p>
          <p>API_FOOTBALL_KEY=your_api_football_key</p>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>API Football:</strong> Get your free key at <a href="https://rapidapi.com/api-sports/api/api-football" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">RapidAPI</a></p>
          <p><strong>Supabase:</strong> Create a project at <a href="https://supabase.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">supabase.com</a></p>
        </div>
      </div>
    </div>
  );
}