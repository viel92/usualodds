'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

/**
 * DASHBOARD SAAS - HUB CENTRAL USUALODDS
 * 
 * Vue d'ensemble des prédictions avec navigation claire
 */

interface Prediction {
  id: string
  homeTeam: string
  awayTeam: string
  date: string
  venue: string
  probabilities: {
    home: number
    draw: number
    away: number
  }
  confidence: number
  prediction: 'home' | 'draw' | 'away'
  features: {
    homeElo: number
    awayElo: number
    homeForm: number
    awayForm: number
  }
}

interface DashboardData {
  predictions: Prediction[]
  pagination: {
    total: number
    page: number
    perPage: number
    hasMore: boolean
  }
  meta: {
    avgConfidence: number
    modelAccuracy: string
    lastUpdate: string
    generated: number
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Charger les prédictions depuis la nouvelle API unifiée
  const loadPredictions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/predictions?limit=10&confidence_min=50')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Erreur chargement prédictions')
      }
    } catch (err) {
      setError('Erreur connexion API')
      console.error('Erreur chargement:', err)
    } finally {
      setLoading(false)
    }
  }

  // Rafraîchir les prédictions
  const refreshPredictions = async () => {
    try {
      setRefreshing(true)
      
      const response = await fetch('/api/predictions', {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Erreur rafraîchissement')
      }
    } catch (err) {
      setError('Erreur rafraîchissement prédictions')
      console.error('Erreur rafraîchissement:', err)
    } finally {
      setRefreshing(false)
    }
  }

  // Charger au montage
  useEffect(() => {
    loadPredictions()
  }, [])

  // Formatage date
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

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Couleurs basées sur confiance
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50'
    if (confidence >= 70) return 'text-blue-600 bg-blue-50'
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }

  const getPredictionLabel = (prediction: string) => {
    switch (prediction) {
      case 'home': return 'Victoire Dom.'
      case 'away': return 'Victoire Ext.'
      case 'draw': return 'Match Nul'
      default: return 'Indéterminé'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ⚽ UsualOdds
                </Link>
                <div className="hidden md:block text-gray-400">|</div>
                <h1 className="hidden md:block text-xl font-semibold text-gray-900">Dashboard</h1>
              </div>
              <nav className="flex items-center space-x-6">
                <Link href="/predictions" className="text-gray-600 hover:text-gray-900 font-medium">
                  Toutes les prédictions
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Loading State */}
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement du dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadPredictions}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            🔄 Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (!data || data.predictions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ⚽ UsualOdds
                </Link>
                <div className="hidden md:block text-gray-400">|</div>
                <h1 className="hidden md:block text-xl font-semibold text-gray-900">Dashboard</h1>
              </div>
              <nav className="flex items-center space-x-6">
                <Link href="/predictions" className="text-gray-600 hover:text-gray-900 font-medium">
                  Toutes les prédictions
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex items-center justify-center py-20">
          <div className="text-center bg-white p-12 rounded-xl shadow-sm border max-w-lg">
            <div className="text-6xl mb-6">🔮</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Aucune prédiction disponible</h2>
            <p className="text-gray-600 mb-8">
              Les prédictions apparaîtront ici une fois les matches collectés et analysés.
            </p>
            <button
              onClick={refreshPredictions}
              disabled={refreshing}
              className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
            >
              {refreshing ? '🔄 Génération...' : '✨ Générer prédictions'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ⚽ UsualOdds
              </Link>
              <div className="hidden md:block text-gray-400">|</div>
              <h1 className="hidden md:block text-xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            <nav className="flex items-center space-x-6">
              <Link href="/predictions" className="text-gray-600 hover:text-gray-900 font-medium">
                Toutes les prédictions
              </Link>
              <button
                onClick={refreshPredictions}
                disabled={refreshing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                {refreshing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Actualisation...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Actualiser</span>
                  </>
                )}
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="text-3xl font-bold text-blue-600 mb-1">{data.predictions.length}</div>
            <div className="text-sm text-gray-600">Prédictions actives</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="text-3xl font-bold text-green-600 mb-1">{data.meta.avgConfidence}%</div>
            <div className="text-sm text-gray-600">Confiance moyenne</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="text-3xl font-bold text-purple-600 mb-1">{data.meta.modelAccuracy}</div>
            <div className="text-sm text-gray-600">Précision modèle</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="text-3xl font-bold text-orange-600 mb-1">
              {data.predictions.filter(p => p.confidence >= 75).length}
            </div>
            <div className="text-sm text-gray-600">Haute confiance</div>
          </div>
        </div>

        {/* Prédictions highlights */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Prochains matchs</h2>
            <Link 
              href="/predictions"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
            >
              <span>Voir tout</span>
              <span>→</span>
            </Link>
          </div>

          <div className="space-y-4">
            {data.predictions.slice(0, 5).map((prediction) => (
              <div key={prediction.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Match Info */}
                    <div className="lg:col-span-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">{formatDate(prediction.date)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(prediction.confidence)}`}>
                          {prediction.confidence}% confiance
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <div className="font-semibold text-gray-900">{prediction.homeTeam}</div>
                          <div className="text-xs text-gray-500">ELO: {prediction.features.homeElo}</div>
                        </div>
                        <div className="text-center mx-4">
                          <div className="text-lg font-bold text-gray-800">VS</div>
                          <div className="text-xs text-gray-500">{formatTime(prediction.date)}</div>
                        </div>
                        <div className="text-center flex-1">
                          <div className="font-semibold text-gray-900">{prediction.awayTeam}</div>
                          <div className="text-xs text-gray-500">ELO: {prediction.features.awayElo}</div>
                        </div>
                      </div>
                    </div>

                    {/* Probabilities */}
                    <div className="lg:col-span-4">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="text-lg font-bold text-blue-600">{prediction.probabilities.home}%</div>
                          <div className="text-xs text-gray-600">Dom.</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-lg font-bold text-gray-600">{prediction.probabilities.draw}%</div>
                          <div className="text-xs text-gray-600">Nul</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <div className="text-lg font-bold text-purple-600">{prediction.probabilities.away}%</div>
                          <div className="text-xs text-gray-600">Ext.</div>
                        </div>
                      </div>
                    </div>

                    {/* Prediction */}
                    <div className="lg:col-span-3">
                      <div className="text-center">
                        <div className="text-sm text-gray-600 mb-1">Prédiction :</div>
                        <div className="font-bold text-gray-900">{getPredictionLabel(prediction.prediction)}</div>
                        <div className="text-xs text-gray-500 mt-1">{prediction.venue}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to action */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">Découvrez toutes nos prédictions</h3>
          <p className="text-blue-100 mb-6">
            Accédez à l'ensemble de nos analyses détaillées et filtres avancés
          </p>
          <Link 
            href="/predictions"
            className="bg-white text-blue-600 px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors font-semibold inline-flex items-center space-x-2"
          >
            <span>📊</span>
            <span>Voir toutes les prédictions</span>
          </Link>
        </div>
      </div>
    </div>
  )
}