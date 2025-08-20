/**
 * COMPOSANT STATISTIQUES PRÉDICTIONS EN TEMPS RÉEL PREMIUM
 * Dashboard avec métriques de performance et alertes
 * VERSION PREMIUM AVEC DESIGN SYSTEM
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, StatCard } from '@/components/ui/card-premium';
import { Badge, StatusBadge, TrendBadge } from '@/components/ui/badge-premium';
import { Progress } from '@/components/ui/loading-states';
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
  Activity
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

  // Simulated real-time data
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
        { market: 'O/U 2.5', accuracy: 71.8, predictions: 143, trend: 'stable' },
        { market: 'BTTS', accuracy: 68.9, predictions: 128, trend: 'down' },
        { market: 'Handicap', accuracy: 76.2, predictions: 89, trend: 'up' }
      ],
      alerts: [
        {
          id: '1',
          type: 'high_value',
          message: 'PSG vs Marseille: Value bet détecté (+12.3%)',
          severity: 'info',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          type: 'performance',
          message: 'Précision 1X2 en hausse (+2.1% cette semaine)',
          severity: 'info',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          type: 'system',
          message: 'Modèle mis à jour avec nouvelles données',
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
      // Here you would fetch real data
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getAlertVariant = (severity: string) => {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'success';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-success-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-error-500" />;
      default: return <Activity className="w-4 h-4 text-neutral-500" />;
    }
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-neutral-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-neutral-200 rounded w-20"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-display-md font-black text-neutral-900">Statistiques Temps Réel</h2>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status="online" />
            <Badge variant="secondary" size="sm">
              <Clock className="w-3 h-3 mr-1" />
              Dernière MAJ: {lastUpdate.toLocaleTimeString('fr-FR')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Matchs Aujourd'hui"
          value={stats.todayMatches.toString()}
          icon={<Calendar className="w-5 h-5" />}
          trend="neutral"
        />

        <StatCard
          title="Haute Confiance"
          value={stats.highConfidencePredictions.toString()}
          change={`${Math.round((stats.highConfidencePredictions / stats.todayMatches) * 100)}%`}
          icon={<Target className="w-5 h-5" />}
          trend="up"
        />

        <StatCard
          title="Value Bets"
          value={stats.valueOpportunities.toString()}
          icon={<DollarSign className="w-5 h-5" />}
          trend="up"
        />

        <StatCard
          title="Précision Semaine"
          value={`${stats.weeklyAccuracy}%`}
          change="+2.1%"
          icon={<Trophy className="w-5 h-5" />}
          trend="up"
        />
      </div>

      {/* Performance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Performance */}
        <Card variant="elevated">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              <h3 className="text-headline-md font-bold">Performance Récente</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-body-md text-neutral-600">24h</span>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">
                    {stats.recentPerformance.last24h.correct}/{stats.recentPerformance.last24h.total}
                  </div>
                  <Badge variant="success" size="sm">
                    {Math.round((stats.recentPerformance.last24h.correct / stats.recentPerformance.last24h.total) * 100)}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-body-md text-neutral-600">7 jours</span>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">
                    {stats.recentPerformance.last7d.correct}/{stats.recentPerformance.last7d.total}
                  </div>
                  <Badge variant="success" size="sm">
                    {Math.round((stats.recentPerformance.last7d.correct / stats.recentPerformance.last7d.total) * 100)}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-body-md text-neutral-600">30 jours</span>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">
                    {stats.recentPerformance.last30d.correct}/{stats.recentPerformance.last30d.total}
                  </div>
                  <Badge variant="success" size="sm">
                    {Math.round((stats.recentPerformance.last30d.correct / stats.recentPerformance.last30d.total) * 100)}%
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Market Performance */}
        <Card variant="elevated">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h3 className="text-headline-md font-bold">Performance par Marché</h3>
            </div>

            <div className="space-y-4">
              {stats.marketPerformance.map((market, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTrendIcon(market.trend)}
                    <span className="text-body-md font-medium">{market.market}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-600">{market.predictions} pred.</span>
                    <Badge variant="primary" size="sm">
                      {market.accuracy}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Confidence Distribution */}
      <Card variant="elevated">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-primary-600" />
            <h3 className="text-headline-md font-bold">Distribution Confiance</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600 mb-1">{stats.confidenceDistribution.veryHigh}%</div>
              <Badge variant="success" size="sm">Très Haute</Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600 mb-1">{stats.confidenceDistribution.high}%</div>
              <Badge variant="primary" size="sm">Haute</Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning-600 mb-1">{stats.confidenceDistribution.medium}%</div>
              <Badge variant="warning" size="sm">Moyenne</Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-600 mb-1">{stats.confidenceDistribution.low}%</div>
              <Badge variant="default" size="sm">Faible</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Live Alerts */}
      <Card variant="elevated">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-primary-600" />
            <h3 className="text-headline-md font-bold">Alertes Temps Réel</h3>
          </div>

          <div className="space-y-3">
            {stats.alerts.slice(0, 5).map((alert) => (
              <Card key={alert.id} variant="default" padding="sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={getAlertVariant(alert.severity)} size="sm">
                      {alert.type === 'high_value' && <DollarSign className="w-3 h-3 mr-1" />}
                      {alert.type === 'performance' && <TrendingUp className="w-3 h-3 mr-1" />}
                      {alert.type === 'system' && <Activity className="w-3 h-3 mr-1" />}
                      {alert.type}
                    </Badge>
                    <span className="text-sm text-neutral-900">{alert.message}</span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {new Date(alert.timestamp).toLocaleTimeString('fr-FR')}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}