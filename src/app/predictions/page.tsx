'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button-premium'
import { Badge } from '@/components/ui/badge-premium'
import { usePredictions, useRefreshPredictions } from '@/lib/hooks/use-predictions'
import { 
  RefreshCw, BarChart3, 
  Eye, ArrowLeft, Crown, Shield, Trophy, Star, 
  ChevronRight, Flame, Activity, Info
} from 'lucide-react'

/**
 * PAGE PRÉDICTIONS - STYLE MODERNE
 */

export default function PredictionsPage() {
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null)
  const { data, isLoading, error, refetch } = usePredictions(20, 50)
  const refreshMutation = useRefreshPredictions()

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync()
    } catch (err) {
      console.error('Predictions refresh error:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-6">
                <div className="animate-pulse">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="flex space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

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
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <h1 className="text-xl font-bold text-gray-900 flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-gold-500" />
                  Prédictions Football
                </h1>
                <Badge variant="success" className="bg-green-50 text-green-700">
                  <Flame className="w-3 h-3 mr-1" />
                  {data.predictions.length} matches
                </Badge>
              </div>
              <p className="text-sm text-gray-500 flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                Système ML ultra-sophistiqué • Précision {data.meta.modelAccuracy} • 
                Mise à jour {new Date(data.meta.lastUpdate).toLocaleString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-xs">
                Confiance moy: {data.meta.avgConfidence}%
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
        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{data.predictions.length}</p>
                <p className="text-sm text-gray-500">Prédictions</p>
              </div>
              <Trophy className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{data.meta.avgConfidence}%</p>
                <p className="text-sm text-gray-500">Confiance moy.</p>
              </div>
              <Star className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{data.predictions.filter(p => p.confidence >= 70).length}</p>
                <p className="text-sm text-gray-500">Confiance >70%</p>
              </div>
              <Crown className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{data.meta.modelAccuracy}</p>
                <p className="text-sm text-gray-500">Précision ML</p>
              </div>
              <Activity className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Liste des prédictions */}
        <div className="space-y-4">
          {data.predictions.map((prediction, index) => (
            <div 
              key={prediction.id} 
              className={`bg-white rounded-lg border transition-all duration-200 ${
                selectedPrediction === prediction.id ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedPrediction(selectedPrediction === prediction.id ? null : prediction.id)}
            >
              <div className="p-6 cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-lg">{prediction.homeTeam}</span>
                        <span className="text-gray-400">vs</span>
                        <span className="font-bold text-lg">{prediction.awayTeam}</span>
                      </div>
                      <Badge 
                        variant={prediction.prediction === 'home' ? 'success' : 
                                prediction.prediction === 'draw' ? 'warning' : 'secondary'}
                        className="text-sm font-medium"
                      >
                        {prediction.prediction === 'home' ? '1 - Victoire Domicile' : 
                         prediction.prediction === 'draw' ? 'X - Match Nul' : '2 - Victoire Extérieur'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>📅 {new Date(prediction.date).toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                      <span>🏟️ {prediction.venue}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge 
                      variant={prediction.confidence >= 70 ? 'success' : 
                              prediction.confidence >= 60 ? 'warning' : 'secondary'}
                      className="text-lg font-bold px-3 py-1"
                    >
                      {prediction.confidence}%
                    </Badge>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                      selectedPrediction === prediction.id ? 'rotate-90' : ''
                    }`} />
                  </div>
                </div>

                {/* Probabilités */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Domicile</div>
                    <div className="text-2xl font-bold text-blue-600">{prediction.probabilities.home}%</div>
                    <div className="text-xs text-gray-500">{prediction.homeTeam}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Nul</div>
                    <div className="text-2xl font-bold text-gray-600">{prediction.probabilities.draw}%</div>
                    <div className="text-xs text-gray-500">Match nul</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Extérieur</div>
                    <div className="text-2xl font-bold text-red-600">{prediction.probabilities.away}%</div>
                    <div className="text-xs text-gray-500">{prediction.awayTeam}</div>
                  </div>
                </div>

                {/* Détails étendus */}
                {selectedPrediction === prediction.id && (
                  <div className="border-t pt-4 mt-4 space-y-3">
                    <div className="flex items-center mb-2">
                      <Info className="w-4 h-4 mr-2 text-blue-500" />
                      <span className="font-semibold text-gray-900">Analyse détaillée</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Données ML</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Elo {prediction.homeTeam}:</span>
                            <span className="font-medium">{prediction.features.homeElo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Elo {prediction.awayTeam}:</span>
                            <span className="font-medium">{prediction.features.awayElo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Forme domicile:</span>
                            <span className="font-medium">{prediction.features.homeForm}/10</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Forme extérieur:</span>
                            <span className="font-medium">{prediction.features.awayForm}/10</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Recommandation</h4>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge 
                              variant={prediction.confidence >= 70 ? 'success' : 'warning'}
                              className="text-xs"
                            >
                              {prediction.confidence >= 70 ? 'Forte confiance' : 'Confiance modérée'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700">
                            {prediction.confidence >= 70 
                              ? "Prédiction avec forte confiance. Recommandé pour les paris." 
                              : "Prédiction modérée. Analyser d'autres facteurs avant de parier."
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination info */}
        {data.pagination.hasMore && (
          <div className="text-center py-6">
            <Badge variant="outline" className="text-sm">
              Affichage de {data.predictions.length} sur {data.pagination.total} matchs
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}