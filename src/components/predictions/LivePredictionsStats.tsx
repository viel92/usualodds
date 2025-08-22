/**
 * PROFESSIONAL LIVE PREDICTIONS STATS COMPONENT
 * Real-time dashboard with performance metrics and alerts
 * Clean, data-focused design with professional visual hierarchy
 */

'use client';

import { useState, useEffect } from 'react';
import { DESIGN_TOKENS } from '@/lib/design-system-professional';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Calendar,
  Trophy,
  DollarSign,
  Activity,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface PredictionStats {
  todayMatches: number;
  highConfidencePredictions: number;
  valueOpportunities: number;
  weeklyAccuracy: number;
  recentPerformance: {
    last24h: { correct: number; total: number; };
    last7d: { correct: number; total: number; };
    last30d: { correct: number; total: number; };
  };
  confidenceDistribution: {
    veryHigh: number;
    high: number;
    medium: number;
    low: number;
  };
  marketPerformance: {
    market: string;
    accuracy: number;
    predictions: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  alerts: {
    id: string;
    type: 'high_value' | 'low_confidence' | 'system' | 'performance';
    message: string;
    severity: 'info' | 'warning' | 'error';
    timestamp: string;
  }[];
}

export default function LivePredictionsStats() {
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Real-time data simulation
  useEffect(() => {
    const mockStats: PredictionStats = {
      todayMatches: 12,
      highConfidencePredictions: 7,
      valueOpportunities: 4,
      weeklyAccuracy: 73.2,
      recentPerformance: {
        last24h: { correct: 8, total: 11 },
        last7d: { correct: 52, total: 71 },
        last30d: { correct: 198, total: 267 }
      },
      confidenceDistribution: {
        veryHigh: 15,
        high: 28,
        medium: 35,
        low: 22
      },
      marketPerformance: [
        { market: '1X2', accuracy: 74.5, predictions: 156, trend: 'up' },
        { market: 'Plus/Moins 2.5', accuracy: 71.8, predictions: 143, trend: 'stable' },
        { market: 'BTTS', accuracy: 68.9, predictions: 128, trend: 'down' },
        { market: 'Handicap', accuracy: 76.2, predictions: 89, trend: 'up' }
      ],
      alerts: [
        {
          id: '1',
          type: 'high_value',
          message: 'PSG vs Marseille: Opportunité de valeur détectée (+12.3%)',
          severity: 'info',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          type: 'performance',
          message: 'Précision 1X2 en amélioration (+2.1% cette semaine)',
          severity: 'info',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          type: 'system',
          message: 'Modèle ML mis à jour avec nouvelles données d\'entraînement',
          severity: 'info',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
        }
      ]
    };

    setStats(mockStats);
    setLoading(false);
    setLastUpdate(new Date());

    // Simulate real-time updates
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // Here you would fetch real data from API
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'high_value': return <DollarSign className="w-4 h-4" />;
      case 'performance': return <TrendingUp className="w-4 h-4" />;
      case 'system': return <Shield className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case 'down': return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-neutral-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600 bg-green-50';
      case 'down': return 'text-red-600 bg-red-50';
      default: return 'text-neutral-600 bg-neutral-50';
    }
  };

  if (loading || !stats) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-64 mb-2"></div>
          <div className="h-5 bg-neutral-200 rounded w-48"></div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 bg-neutral-200 rounded"></div>
                  <div className="h-4 bg-neutral-200 rounded w-16"></div>
                </div>
                <div className="h-8 bg-neutral-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-neutral-200 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900">Statistiques temps réel</h2>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-sm font-medium text-green-600">Système opérationnel</span>
            </div>
            <span className="text-sm text-neutral-500">•</span>
            <div className="flex items-center text-sm text-neutral-500">
              <Clock className="w-4 h-4 mr-1" />
              Mis à jour: {lastUpdate.toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-neutral-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">AUJOURD'HUI</span>
          </div>
          <div className="text-3xl font-bold text-neutral-900 mb-1">
            {stats.todayMatches}
          </div>
          <p className="text-sm text-neutral-600">Matchs programmés</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
              +{Math.round((stats.highConfidencePredictions / stats.todayMatches) * 100)}%
            </span>
          </div>
          <div className="text-3xl font-bold text-green-600 mb-1">
            {stats.highConfidencePredictions}
          </div>
          <p className="text-sm text-neutral-600">Haute confiance</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">VALUE</span>
          </div>
          <div className="text-3xl font-bold text-yellow-600 mb-1">
            {stats.valueOpportunities}
          </div>
          <p className="text-sm text-neutral-600">Opportunités détectées</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">+2.1%</span>
          </div>
          <div className="text-3xl font-bold text-purple-600 mb-1">
            {stats.weeklyAccuracy}%
          </div>
          <p className="text-sm text-neutral-600">Précision hebdomadaire</p>
        </div>
      </div>

      {/* Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Performance */}
        <div className="bg-white border border-neutral-200 rounded-lg">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 text-primary-600 mr-3" />
              <h3 className="text-xl font-semibold text-neutral-900">Performance récente</h3>
            </div>
            <p className="text-sm text-neutral-500 mt-1">Taux de réussite sur différentes périodes</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-neutral-900">Dernières 24h</div>
                <div className="text-xs text-neutral-500">{stats.recentPerformance.last24h.total} prédictions</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-neutral-900">
                  {stats.recentPerformance.last24h.correct}/{stats.recentPerformance.last24h.total}
                </div>
                <div className="text-lg font-bold text-green-600">
                  {Math.round((stats.recentPerformance.last24h.correct / stats.recentPerformance.last24h.total) * 100)}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-neutral-900">7 derniers jours</div>
                <div className="text-xs text-neutral-500">{stats.recentPerformance.last7d.total} prédictions</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-neutral-900">
                  {stats.recentPerformance.last7d.correct}/{stats.recentPerformance.last7d.total}
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {Math.round((stats.recentPerformance.last7d.correct / stats.recentPerformance.last7d.total) * 100)}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-neutral-900">30 derniers jours</div>
                <div className="text-xs text-neutral-500">{stats.recentPerformance.last30d.total} prédictions</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-neutral-900">
                  {stats.recentPerformance.last30d.correct}/{stats.recentPerformance.last30d.total}
                </div>
                <div className="text-lg font-bold text-purple-600">
                  {Math.round((stats.recentPerformance.last30d.correct / stats.recentPerformance.last30d.total) * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Market Performance */}
        <div className="bg-white border border-neutral-200 rounded-lg">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 text-primary-600 mr-3" />
              <h3 className="text-xl font-semibold text-neutral-900">Performance par marché</h3>
            </div>
            <p className="text-sm text-neutral-500 mt-1">Analyse détaillée par type de pari</p>
          </div>

          <div className="p-6 space-y-4">
            {stats.marketPerformance.map((market, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getTrendIcon(market.trend)}
                  <div>
                    <div className="text-sm font-medium text-neutral-900">{market.market}</div>
                    <div className="text-xs text-neutral-500">{market.predictions} prédictions</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    market.accuracy >= 75 ? 'text-green-600' : 
                    market.accuracy >= 65 ? 'text-blue-600' : 'text-yellow-600'
                  }`}>
                    {market.accuracy}%
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTrendColor(market.trend)}`}>
                    {market.trend === 'up' ? 'En hausse' : market.trend === 'down' ? 'En baisse' : 'Stable'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confidence Distribution */}
      <div className="bg-white border border-neutral-200 rounded-lg">
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center">
            <Target className="w-5 h-5 text-primary-600 mr-3" />
            <h3 className="text-xl font-semibold text-neutral-900">Répartition des niveaux de confiance</h3>
          </div>
          <p className="text-sm text-neutral-500 mt-1">Distribution des prédictions par niveau de certitude</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl font-bold text-green-600 mb-2">{stats.confidenceDistribution.veryHigh}%</div>
              <div className="text-sm font-medium text-green-700">Très haute</div>
              <div className="text-xs text-green-600 mt-1">≥ 75%</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">{stats.confidenceDistribution.high}%</div>
              <div className="text-sm font-medium text-blue-700">Haute</div>
              <div className="text-xs text-blue-600 mt-1">65-74%</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{stats.confidenceDistribution.medium}%</div>
              <div className="text-sm font-medium text-yellow-700">Moyenne</div>
              <div className="text-xs text-yellow-600 mt-1">55-64%</div>
            </div>
            <div className="text-center p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="text-3xl font-bold text-neutral-600 mb-2">{stats.confidenceDistribution.low}%</div>
              <div className="text-sm font-medium text-neutral-700">Faible</div>
              <div className="text-xs text-neutral-600 mt-1">&lt; 55%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Alerts */}
      <div className="bg-white border border-neutral-200 rounded-lg">
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center">
            <Zap className="w-5 h-5 text-orange-500 mr-3" />
            <h3 className="text-xl font-semibold text-neutral-900">Alertes système</h3>
          </div>
          <p className="text-sm text-neutral-500 mt-1">Notifications et événements importants en temps réel</p>
        </div>

        <div className="divide-y divide-neutral-200">
          {stats.alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="p-6 hover:bg-neutral-50 transition-colors duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    alert.severity === 'error' ? 'bg-red-100 text-red-600' :
                    alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900">
                      {alert.message}
                    </p>
                    <div className="flex items-center mt-1 text-xs text-neutral-500">
                      <span className="capitalize">{alert.type.replace('_', ' ')}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(alert.timestamp).toLocaleTimeString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}