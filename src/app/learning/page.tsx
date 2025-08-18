'use client';

import { useState, useEffect } from 'react';

interface LearningInsight {
  id: string;
  pattern: string;
  frequency: number;
  impact: number;
  confidence: number;
  actionable: boolean;
  description: string;
  suggested_features: string[];
  model_adjustment: Record<string, number>;
  generated_at: string;
}

interface PerformanceMetrics {
  totalPredictions: number;
  overallBrierScore: number;
  calibrationError: number;
  windowPerformance: Record<string, { count: number; avgBrier: number }>;
  marketPerformance: Record<string, { count: number; avgBrier: number }>;
  errorTypeDistribution: Record<string, number>;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

export default function LearningPage() {
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load learning insights
      const insightsResponse = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_learning_insights', days: 30 })
      });
      const insightsData = await insightsResponse.json();
      if (insightsData.success) {
        setInsights(insightsData.data || []);
      }

      // Load performance metrics
      const metricsResponse = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_performance_metrics', days: 7 })
      });
      const metricsData = await metricsResponse.json();
      if (metricsData.success) {
        setMetrics(metricsData.data);
      }

    } catch (error) {
      console.error('Error loading learning data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze_finished_matches' })
      });
      
      const data = await response.json();
      if (data.success) {
        setLastAnalysis(new Date().toLocaleString());
        await loadData(); // Reload data after analysis
      } else {
        console.error('Analysis failed:', data.error);
      }
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  const formatBrierScore = (score: number) => {
    return score.toFixed(4);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Apprentissage Adaptatif</h1>
        <button
          onClick={runAnalysis}
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Analyse...' : 'Analyser Matchs Terminés'}
        </button>
      </div>

      {lastAnalysis && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800">
            ✅ Dernière analyse: {lastAnalysis}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Métriques de Performance (7 jours)</h2>
          
          {metrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Prédictions</p>
                  <p className="text-2xl font-bold">{metrics.totalPredictions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Brier Score Global</p>
                  <p className="text-2xl font-bold">{formatBrierScore(metrics.overallBrierScore)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Erreur de Calibration</p>
                <p className="text-lg font-semibold">{formatBrierScore(metrics.calibrationError)}</p>
              </div>

              {/* Window Performance */}
              <div>
                <h3 className="font-medium mb-2">Performance par Fenêtre</h3>
                <div className="space-y-2">
                  {Object.entries(metrics.windowPerformance).map(([window, perf]) => (
                    <div key={window} className="flex justify-between text-sm">
                      <span>{window}:</span>
                      <span>{formatBrierScore(perf.avgBrier)} ({perf.count} prédictions)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Type Distribution */}
              <div>
                <h3 className="font-medium mb-2">Distribution Types d'Erreur</h3>
                <div className="space-y-2">
                  {Object.entries(metrics.errorTypeDistribution).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="capitalize">{type.replace('_', ' ')}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              {isLoading ? 'Chargement...' : 'Aucune donnée disponible'}
            </div>
          )}
        </div>

        {/* Learning Insights */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Insights d'Apprentissage (30 jours)</h2>
          
          {insights.length > 0 ? (
            <div className="space-y-4">
              {insights.slice(0, 5).map((insight) => (
                <div 
                  key={insight.id} 
                  className={`p-4 rounded border-l-4 ${
                    insight.actionable ? 'border-l-green-500 bg-green-50' : 'border-l-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium capitalize">
                      {insight.pattern.replace('_', ' ')}
                    </h3>
                    <div className="text-right text-sm">
                      <div>Impact: {insight.impact.toFixed(3)}</div>
                      <div>Confiance: {formatConfidence(insight.confidence)}</div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">
                    {insight.description}
                  </p>
                  
                  {insight.actionable && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Actionnable
                      </span>
                    </div>
                  )}
                  
                  {insight.suggested_features?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Features suggérées:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {insight.suggested_features.slice(0, 3).map((feature, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-xs rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {insights.length > 5 && (
                <div className="text-center text-sm text-gray-600">
                  ... et {insights.length - 5} autres insights
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              {isLoading ? 'Chargement...' : 'Aucun insight disponible'}
            </div>
          )}
        </div>
      </div>

      {/* Market Performance Detail */}
      {metrics && Object.keys(metrics.marketPerformance).length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Performance par Marché</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(metrics.marketPerformance).map(([market, perf]) => (
              <div key={market} className="p-4 border rounded">
                <h3 className="font-medium capitalize mb-2">
                  {market.replace('_', ' ')}
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Brier Score:</span>
                    <span className="font-medium">{formatBrierScore(perf.avgBrier)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prédictions:</span>
                    <span>{perf.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Status */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">État du Système d'Apprentissage</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Post-Match Analyzer: Actif</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Insights Generator: Actif</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm">Auto-Retraining: À implémenter</span>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>• Analyse post-match: 2h après fin du match</p>
          <p>• Génération d'insights: Quotidienne à 3h du matin</p>
          <p>• Apprentissage incrémental: En développement</p>
        </div>
      </div>
    </div>
  );
}