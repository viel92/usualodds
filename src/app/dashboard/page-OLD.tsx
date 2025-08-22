'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button-premium'
import { Badge } from '@/components/ui/badge-premium'
import { usePredictions, useRefreshPredictions } from '@/lib/hooks/use-predictions'
import { 
  TrendingUp, Target, RefreshCw, BarChart3, 
  Eye, ArrowRight, Activity, Flame, Trophy,
  Shield, ChevronRight
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
              <div key={i} className="bg-white rounded-lg border p-4">
                <div className="animate-pulse">
                  <div className="w-8 h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
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
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Button onClick={() => refetch()} className="btn-primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return <div>Aucune donnée disponible</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Style SofaScore */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                Dashboard Analytics
              </h1>
              <p className="text-sm text-gray-500">
                Dernière mise à jour: {new Date(data.meta.lastUpdate).toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="success" className="bg-green-50 text-green-700">
                <Activity className="w-3 h-3 mr-1" />
                {data.meta.modelAccuracy} précision
              </Badge>
              <Button 
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
                className="btn-secondary"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Grid Style SofaScore */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{data.predictions.length}</p>
                <p className="text-sm text-gray-500">Prédictions</p>
              </div>
              <Target className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{data.meta.avgConfidence}%</p>
                <p className="text-sm text-gray-500">Confiance moy.</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{data.meta.modelAccuracy}</p>
                <p className="text-sm text-gray-500">Précision ML</p>
              </div>
              <Activity className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{data.pagination.total}</p>
                <p className="text-sm text-gray-500">Total matches</p>
              </div>
              <Trophy className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Prédictions récentes */}
        <div className="bg-white rounded-lg border mb-6">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center">
              <Flame className="w-5 h-5 mr-2 text-red-500" />
              Prédictions à haute confiance
            </h2>
            <Link href="/predictions">
              <Button variant="ghost" size="sm">
                Voir tout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="divide-y">
            {data.predictions.slice(0, 5).map((prediction) => (
              <div key={prediction.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">{prediction.homeTeam}</span>
                      <span className="text-gray-400 text-xs">vs</span>
                      <span className="font-medium text-sm">{prediction.awayTeam}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{new Date(prediction.date).toLocaleDateString('fr-FR')}</span>
                      <span>•</span>
                      <span>{prediction.venue}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={prediction.prediction === 'home' ? 'success' : 
                              prediction.prediction === 'draw' ? 'warning' : 'secondary'}
                      className="text-xs"
                    >
                      {prediction.prediction === 'home' ? '1' : 
                       prediction.prediction === 'draw' ? 'X' : '2'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {prediction.confidence}%
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {prediction.probabilities.home}% - {prediction.probabilities.draw}% - {prediction.probabilities.away}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Eye className="w-5 h-5 mr-2 text-blue-500" />
              Actions rapides
            </h3>
            <div className="space-y-2">
              <Link href="/predictions">
                <Button variant="ghost" className="w-full justify-start" size="sm">
                  <Target className="w-4 h-4 mr-2" />
                  Voir toutes les prédictions
                </Button>
              </Link>
              <Button 
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
                variant="ghost" 
                className="w-full justify-start" 
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Régénérer les prédictions
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-green-500" />
              Système ML
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Modèle actif:</span>
                <span className="font-medium">Ultra Sophisticated v2</span>
              </div>
              <div className="flex justify-between">
                <span>Dernière prédiction:</span>
                <span className="font-medium">Il y a {Math.floor((Date.now() - new Date(data.meta.lastUpdate).getTime()) / 60000)} min</span>
              </div>
              <div className="flex justify-between">
                <span>Confiance moyenne:</span>
                <span className="font-medium text-green-600">{data.meta.avgConfidence}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}