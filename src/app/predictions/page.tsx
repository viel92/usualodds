'use client'

import { useState, useEffect } from 'react'

/**
 * PAGE PRÉDICTIONS SIMPLIFIÉE
 * 
 * Version sans dépendances UI complexes
 */

interface SimplePrediction {
  id: string
  homeTeam: string
  awayTeam: string
  matchDate: string
  predictions: {
    homeWin: number
    draw: number
    awayWin: number
    confidence: number
  }
  status: 'scheduled' | 'soon' | 'live'
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<SimplePrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger les prédictions depuis l'API
  useEffect(() => {
    loadPredictions()
  }, [])

  const loadPredictions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/dashboard/predictions')
      const result = await response.json()
      
      if (result.success && result.data.predictions) {
        // Transformer les données pour cette interface
        const transformedPredictions = result.data.predictions.map((pred: any) => ({
          id: pred.id.toString(),
          homeTeam: pred.match.home_team,
          awayTeam: pred.match.away_team,
          matchDate: pred.match.date,
          predictions: {
            homeWin: pred.predictions.result_1x2.home_win,
            draw: pred.predictions.result_1x2.draw,
            awayWin: pred.predictions.result_1x2.away_win,
            confidence: pred.analysis.overall_confidence
          },
          status: 'scheduled' as const
        }))
        
        setPredictions(transformedPredictions)
      } else {
        setError('Aucune prédiction disponible')
      }
    } catch (err) {
      setError('Erreur chargement prédictions')
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500'
    if (confidence >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500 text-white'
      case 'soon': return 'bg-orange-500 text-white'
      default: return 'bg-blue-500 text-white'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des prédictions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <div className="text-red-500 text-xl mb-4">⚠️ Erreur</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadPredictions}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Prédictions Temps Réel</h1>
              <p className="text-gray-600 mt-1">
                Saison 2025-26 • {predictions.length} matchs prédits
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadPredictions}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
              >
                🔄 Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-blue-600">{predictions.length}</div>
            <div className="text-sm text-gray-600">Prédictions actives</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">
              {predictions.filter(p => p.predictions.confidence >= 75).length}
            </div>
            <div className="text-sm text-gray-600">Haute confiance</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-purple-600">
              {predictions.filter(p => Math.max(p.predictions.homeWin, p.predictions.draw, p.predictions.awayWin) >= 50).length}
            </div>
            <div className="text-sm text-gray-600">Favoris clairs</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(predictions.reduce((sum, p) => sum + p.predictions.confidence, 0) / predictions.length)}%
            </div>
            <div className="text-sm text-gray-600">Confiance moyenne</div>
          </div>
        </div>

        {/* Liste des prédictions */}
        {predictions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Aucune prédiction disponible</h3>
            <p className="text-gray-500">Générez des prédictions depuis le dashboard</p>
          </div>
        ) : (
          <div className="space-y-4">
            {predictions.map((prediction) => (
              <div key={prediction.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Info match */}
                    <div className="lg:col-span-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(prediction.status)}`}>
                          {prediction.status === 'live' ? 'EN DIRECT' : 
                           prediction.status === 'soon' ? 'IMMINENT' : 'PROGRAMMÉ'}
                        </span>
                        <span className="text-sm text-gray-500">Ligue 1</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <div className="font-semibold text-gray-900">{prediction.homeTeam}</div>
                        </div>
                        <div className="text-center mx-4">
                          <div className="text-sm text-gray-500">
                            {formatDate(prediction.matchDate)}
                          </div>
                          <div className="text-lg font-bold text-gray-800">VS</div>
                        </div>
                        <div className="text-center flex-1">
                          <div className="font-semibold text-gray-900">{prediction.awayTeam}</div>
                        </div>
                      </div>
                    </div>

                    {/* Prédictions 1X2 */}
                    <div className="lg:col-span-4">
                      <div className="text-center mb-3">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm text-gray-600">Prédiction</span>
                          <div className={`h-2 w-16 rounded-full ${getConfidenceColor(prediction.predictions.confidence)}`}></div>
                          <span className="text-sm font-medium">{prediction.predictions.confidence}%</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="text-lg font-bold text-blue-600">
                            {prediction.predictions.homeWin}%
                          </div>
                          <div className="text-xs text-gray-600">Victoire Dom.</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-lg font-bold text-gray-600">
                            {prediction.predictions.draw}%
                          </div>
                          <div className="text-xs text-gray-600">Match Nul</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <div className="text-lg font-bold text-purple-600">
                            {prediction.predictions.awayWin}%
                          </div>
                          <div className="text-xs text-gray-600">Victoire Ext.</div>
                        </div>
                      </div>
                    </div>

                    {/* Analyse rapide */}
                    <div className="lg:col-span-3">
                      <div className="space-y-2">
                        <div className="text-center">
                          <span className="text-sm text-gray-600">Favori prédit:</span>
                          <div className="font-semibold text-gray-900">
                            {prediction.predictions.homeWin > prediction.predictions.awayWin && prediction.predictions.homeWin > prediction.predictions.draw ? 
                              prediction.homeTeam :
                              prediction.predictions.awayWin > prediction.predictions.draw ?
                              prediction.awayTeam : 'Match Nul'
                            }
                          </div>
                        </div>
                        
                        {prediction.predictions.confidence >= 75 && (
                          <div className="text-center">
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              ✅ Haute confiance
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="lg:col-span-1">
                      <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm">
                        📊 Détails
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}