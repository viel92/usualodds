'use client'

import Link from 'next/link'
import { usePredictions, useRefreshPredictions } from '@/lib/hooks/use-predictions'
import { DESIGN_TOKENS } from '@/lib/design-system-professional'
import { 
  TrendingUp, Target, RefreshCw, BarChart3, 
  Activity, Trophy, Shield, ChevronRight,
  Calendar, Clock, Zap, Users, AlertCircle,
  ArrowUpRight
} from 'lucide-react'

/**
 * PROFESSIONAL DASHBOARD - FIVETHIRTYEIGHT STYLE
 * Clean, data-focused interface with professional typography and spacing
 * No emojis, modern icons, comprehensive stats display
 */

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = usePredictions(10, 50)
  const refreshMutation = useRefreshPredictions()

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync()
    } catch (err) {
      console.error('Dashboard refresh error:', err)
    }
  }

  // Professional loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="animate-pulse">
              <div className="h-8 bg-neutral-200 rounded w-64 mb-3"></div>
              <div className="h-5 bg-neutral-200 rounded w-96"></div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-neutral-200 p-6">
                <div className="animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 bg-neutral-200 rounded"></div>
                    <div className="h-4 bg-neutral-200 rounded w-16"></div>
                  </div>
                  <div className="h-8 bg-neutral-200 rounded w-20 mb-2"></div>
                  <div className="h-4 bg-neutral-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Content skeleton */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-neutral-200 rounded w-48"></div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-neutral-200 rounded-lg p-4">
                  <div className="h-5 bg-neutral-200 rounded w-64 mb-2"></div>
                  <div className="h-4 bg-neutral-200 rounded w-32"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Professional error state
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">
            Erreur de chargement des données
          </h2>
          <p className="text-neutral-600 mb-6">
            {error.message || 'Une erreur inattendue s\'est produite'}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-neutral-200 rounded-full flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-neutral-600">Aucune donnée disponible</p>
        </div>
      </div>
    )
  }

  // Calculate additional stats
  const highConfidencePredictions = data.predictions.filter(p => p.confidence >= 70).length
  const todayPredictions = data.predictions.filter(p => {
    const today = new Date().toDateString()
    const predDate = new Date(p.date).toDateString()
    return today === predDate
  }).length

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Professional Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-primary-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
                    Tableau de bord Analytics
                  </h1>
                  <div className="flex items-center mt-1 text-sm text-neutral-500">
                    <Clock className="w-4 h-4 mr-1" />
                    Dernière mise à jour: {new Date(data.meta.lastUpdate).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* System status */}
              <div className="hidden sm:flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <Activity className="w-4 h-4 mr-2" />
                Système opérationnel
              </div>
              
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
                className="inline-flex items-center px-4 py-2 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors duration-200 font-medium text-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-primary-600" />
              </div>
              <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">TOTAL</span>
            </div>
            <div className="text-3xl font-bold text-neutral-900 mb-1">
              {data.predictions.length}
            </div>
            <p className="text-sm text-neutral-600">Prédictions actives</p>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">MOYENNE</span>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-1">
              {data.meta.avgConfidence}%
            </div>
            <p className="text-sm text-neutral-600">Confiance moyenne</p>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">ELITE</span>
            </div>
            <div className="text-3xl font-bold text-yellow-600 mb-1">
              {highConfidencePredictions}
            </div>
            <p className="text-sm text-neutral-600">Confiance élevée (≥70%)</p>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">ML</span>
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {data.meta.modelAccuracy}
            </div>
            <p className="text-sm text-neutral-600">Précision du modèle</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Featured Predictions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-neutral-200">
              <div className="p-6 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Zap className="w-5 h-5 text-orange-500 mr-3" />
                    <h2 className="text-xl font-semibold text-neutral-900">
                      Prédictions prioritaires
                    </h2>
                  </div>
                  <Link 
                    href="/predictions"
                    className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200"
                  >
                    Voir toutes
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <p className="text-sm text-neutral-500 mt-1">
                  Les matchs avec les meilleures opportunités de prédiction
                </p>
              </div>

              <div className="divide-y divide-neutral-200">
                {data.predictions.slice(0, 5).map((prediction) => {
                  const confidence = prediction.confidence
                  const confidenceColor = confidence >= 75 ? 'text-green-600 bg-green-100' :
                                        confidence >= 65 ? 'text-blue-600 bg-blue-100' :
                                        confidence >= 55 ? 'text-yellow-600 bg-yellow-100' :
                                        'text-neutral-600 bg-neutral-100'

                  return (
                    <div key={prediction.id} className="p-6 hover:bg-neutral-50 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-neutral-900 truncate">
                              {prediction.homeTeam} vs {prediction.awayTeam}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${confidenceColor}`}>
                              {Math.round(confidence)}% confiance
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-neutral-500">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {new Date(prediction.date).toLocaleDateString('fr-FR', {
                                weekday: 'short',
                                day: 'numeric', 
                                month: 'short'
                              })}
                            </div>
                            <div className="flex items-center">
                              <Shield className="w-4 h-4 mr-1" />
                              {prediction.venue}
                            </div>
                          </div>

                          {/* Probabilities display */}
                          <div className="flex items-center space-x-4 mt-3">
                            <div className="text-sm">
                              <span className="text-neutral-600">Probabilités:</span>
                              <span className="ml-2 font-medium text-blue-600">
                                1: {prediction.probabilities.home}%
                              </span>
                              <span className="ml-2 font-medium text-neutral-600">
                                X: {prediction.probabilities.draw}%
                              </span>
                              <span className="ml-2 font-medium text-red-600">
                                2: {prediction.probabilities.away}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <ChevronRight className="w-5 h-5 text-neutral-400" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* System Info & Quick Actions */}
          <div className="space-y-6">
            {/* System Status */}
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <div className="flex items-center mb-4">
                <Shield className="w-5 h-5 text-green-500 mr-3" />
                <h3 className="text-lg font-semibold text-neutral-900">État du système</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Modèle actuel</span>
                  <span className="text-sm font-medium text-neutral-900">Ultra Sophisticated ML</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Version</span>
                  <span className="text-sm font-medium text-neutral-900">v2.1.0</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Dernière formation</span>
                  <span className="text-sm font-medium text-neutral-900">
                    {Math.floor((Date.now() - new Date(data.meta.lastUpdate).getTime()) / (1000 * 60))} min
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Précision modèle</span>
                  <span className="text-sm font-semibold text-green-600">{data.meta.modelAccuracy}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <div className="flex items-center mb-4">
                <Activity className="w-5 h-5 text-primary-500 mr-3" />
                <h3 className="text-lg font-semibold text-neutral-900">Actions rapides</h3>
              </div>
              
              <div className="space-y-3">
                <Link
                  href="/predictions"
                  className="w-full flex items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors duration-200"
                >
                  <div className="flex items-center">
                    <Target className="w-5 h-5 text-neutral-600 mr-3" />
                    <span className="font-medium text-neutral-900">Toutes les prédictions</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </Link>
                
                <button
                  onClick={handleRefresh}
                  disabled={refreshMutation.isPending}
                  className="w-full flex items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center">
                    <RefreshCw className={`w-5 h-5 text-neutral-600 mr-3 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                    <span className="font-medium text-neutral-900">Actualiser données</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <div className="flex items-center mb-4">
                <BarChart3 className="w-5 h-5 text-purple-500 mr-3" />
                <h3 className="text-lg font-semibold text-neutral-900">Performance</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-neutral-600">Confiance moyenne</span>
                    <span className="text-sm font-semibold text-neutral-900">{data.meta.avgConfidence}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${data.meta.avgConfidence}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-neutral-600">Couverture prédictions</span>
                    <span className="text-sm font-semibold text-neutral-900">
                      {Math.round((data.predictions.length / data.pagination.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((data.predictions.length / data.pagination.total) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}