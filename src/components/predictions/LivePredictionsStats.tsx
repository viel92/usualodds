/**
 * COMPOSANT STATISTIQUES PRÉDICTIONS EN TEMPS RÉEL
 * Dashboard avec métriques de performance et alertes
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
          message: 'Modèle météo mis à jour avec nouvelles données',
          severity: 'info',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }
      ]
    };

    setTimeout(() => {
      setStats(mockStats);
      setLoading(false);
    }, 1000);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // In real app, this would fetch updated stats
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 75) return 'text-green-600';
    if (accuracy >= 65) return 'text-blue-600';
    if (accuracy >= 55) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyBgColor = (accuracy: number) => {
    if (accuracy >= 75) return 'bg-green-100';
    if (accuracy >= 65) return 'bg-blue-100';
    if (accuracy >= 55) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'high_value': return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'performance': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'system': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Matchs aujourd'hui</p>
                <p className="text-2xl font-bold">{stats.todayMatches}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Haute confiance</p>
                <p className="text-2xl font-bold">{stats.highConfidencePredictions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Zap className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Value bets</p>
                <p className="text-2xl font-bold">{stats.valueOpportunities}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getAccuracyBgColor(stats.weeklyAccuracy)}`}>
                <Trophy className={`h-5 w-5 ${getAccuracyColor(stats.weeklyAccuracy)}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Précision 7j</p>
                <p className={`text-2xl font-bold ${getAccuracyColor(stats.weeklyAccuracy)}`}>
                  {stats.weeklyAccuracy.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Récente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Récente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">24 dernières heures</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {stats.recentPerformance.last24h.correct}/{stats.recentPerformance.last24h.total}
                  </span>
                  <Badge variant="outline" className={getAccuracyColor((stats.recentPerformance.last24h.correct / stats.recentPerformance.last24h.total) * 100)}>
                    {Math.round((stats.recentPerformance.last24h.correct / stats.recentPerformance.last24h.total) * 100)}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={(stats.recentPerformance.last24h.correct / stats.recentPerformance.last24h.total) * 100}
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">7 derniers jours</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {stats.recentPerformance.last7d.correct}/{stats.recentPerformance.last7d.total}
                  </span>
                  <Badge variant="outline" className={getAccuracyColor((stats.recentPerformance.last7d.correct / stats.recentPerformance.last7d.total) * 100)}>
                    {Math.round((stats.recentPerformance.last7d.correct / stats.recentPerformance.last7d.total) * 100)}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={(stats.recentPerformance.last7d.correct / stats.recentPerformance.last7d.total) * 100}
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">30 derniers jours</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {stats.recentPerformance.last30d.correct}/{stats.recentPerformance.last30d.total}
                  </span>
                  <Badge variant="outline" className={getAccuracyColor((stats.recentPerformance.last30d.correct / stats.recentPerformance.last30d.total) * 100)}>
                    {Math.round((stats.recentPerformance.last30d.correct / stats.recentPerformance.last30d.total) * 100)}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={(stats.recentPerformance.last30d.correct / stats.recentPerformance.last30d.total) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance par Marché */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Performance par Marché
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.marketPerformance.map((market, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTrendIcon(market.trend)}
                    <div>
                      <div className="font-medium">{market.market}</div>
                      <div className="text-sm text-gray-600">{market.predictions} prédictions</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={getAccuracyColor(market.accuracy)}>
                    {market.accuracy.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes Temps Réel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertes Temps Réel
            <Badge variant="outline" className="ml-auto">
              Dernière MAJ: {lastUpdate.toLocaleTimeString('fr-FR')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-3 border rounded-lg ${getAlertColor(alert.severity)}`}
              >
                <div className="flex items-center gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {stats.alerts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Aucune alerte en cours</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}