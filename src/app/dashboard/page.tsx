'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button-premium'
import { Card } from '@/components/ui/card-premium'
import { Badge, ConfidenceBadge } from '@/components/ui/badge-premium'
import { PredictionCardSkeleton } from '@/components/ui/loading-states'
import { LazyStatsGrid } from '@/components/dashboard/lazy-stats'
import { usePredictions, useRefreshPredictions } from '@/lib/hooks/use-predictions'
import { 
  TrendingUp, Target, RefreshCw, Calendar, MapPin, BarChart3, 
  Eye, ArrowRight, Activity, Play, Crown, Flame, Trophy,
  Star, Clock, Shield, Users, Zap, ChevronRight
} from 'lucide-react'

/**
 * DASHBOARD STYLE SOFASCORE
 * Interface moderne et compacte inspirée de SofaScore
 */

export default function DashboardPage() {
  // Utilisation de React Query pour cache et optimisation
  const { data, isLoading, error, refetch } = usePredictions(10, 50)
  const refreshMutation = useRefreshPredictions()

  // Rafraîchir les prédictions
  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync()
    } catch (err) {
      console.error('Dashboard refresh error:', err)
    }
  }

  // Loading state style SofaScore
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">Impossible de charger les données</p>
          <Button onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Style SofaScore */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                <span className="flex items-center">
                  <Activity className="w-3 h-3 mr-1 text-green-500" />
                  En direct
                </span>
                <span>•</span>
                <span>{data?.predictions?.length || 0} prédictions actives</span>
                <span>•</span>
                <span>Ligue 1 2024-25</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                disabled={refreshMutation.isPending}
                className="px-3"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Link href="/predictions">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                  <Eye className="w-4 h-4 mr-2" />
                  Voir tout
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Overview Style SofaScore */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {data?.predictions?.length || 0}
                </div>
                <div className="text-sm text-gray-500">Prédictions</div>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">54.2%</div>
                <div className="text-sm text-gray-500">Précision</div>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {data?.predictions?.filter(p => p.prediction?.confidence >= 75).length || 0}
                </div>
                <div className="text-sm text-gray-500">Haute conf.</div>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {data?.stats?.avg_confidence ? Math.round(data.stats.avg_confidence) : 0}%
                </div>
                <div className="text-sm text-gray-500">Conf. moy.</div>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Layout 2 colonnes Style SofaScore */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale - Prédictions récentes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Prédictions Récentes</h2>
                  <Link href="/predictions">
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="divide-y">
                {data?.predictions?.slice(0, 8).map((prediction) => (
                  <div key={prediction.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-center min-w-[60px]">
                          <div className="text-xs text-gray-500">
                            {new Date(prediction.match_date).toLocaleDateString('fr-FR', { 
                              weekday: 'short', 
                              day: '2-digit', 
                              month: 'short' 
                            })}
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            {new Date(prediction.match_date).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {prediction.home_team}
                            </span>
                            <span className="text-sm font-bold text-blue-600">
                              {prediction.prediction?.home_win_prob || 0}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              {prediction.away_team}
                            </span>
                            <span className="text-sm font-bold text-blue-600">
                              {prediction.prediction?.away_win_prob || 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                          (prediction.prediction?.confidence || 0) >= 80 
                            ? 'bg-green-50 text-green-600'
                            : (prediction.prediction?.confidence || 0) >= 65
                            ? 'bg-yellow-50 text-yellow-600'
                            : 'bg-gray-50 text-gray-600'
                        }`}>
                          {prediction.prediction?.confidence || 0}%
                        </div>
                        <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs font-bold">
                          {(prediction.prediction?.home_win_prob || 0) > (prediction.prediction?.away_win_prob || 0) ? '1' : '2'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {data?.predictions && data.predictions.length > 8 && (
                <div className="p-4 border-t bg-gray-50">
                  <Link href="/predictions">
                    <Button variant="ghost" className="w-full">
                      Voir toutes les prédictions
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Widgets */}
          <div className="space-y-6">
            {/* Top Predictions Widget */}
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
                  Top Confiance
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {data?.predictions
                  ?.sort((a, b) => (b.prediction?.confidence || 0) - (a.prediction?.confidence || 0))
                  .slice(0, 3)
                  .map((pred, idx) => (
                    <div key={pred.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {pred.home_team} vs {pred.away_team}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(pred.match_date).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-green-50 text-green-600 px-2 py-1 rounded-full text-xs">
                        {pred.prediction?.confidence || 0}%
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>

            {/* System Status Widget */}
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-green-500" />
                  Système ML
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Statut</span>
                  <span className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    En ligne
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Modèle</span>
                  <span className="font-medium">XGBoost v2.1</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Précision</span>
                  <span className="font-medium text-green-600">54.2%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Dernière MAJ</span>
                  <span className="font-medium">Il y a 2h</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Actions Rapides</h3>
              </div>
              <div className="p-4 space-y-3">
                <Link href="/predictions">
                  <Button variant="ghost" className="w-full justify-start">
                    <Eye className="w-4 h-4 mr-2" />
                    Toutes les prédictions
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={handleRefresh}
                  disabled={refreshMutation.isPending}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                  Actualiser les données
                </Button>
                <Button variant="ghost" className="w-full justify-start" disabled>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics (Bientôt)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}