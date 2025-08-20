'use client'

import { useState, useEffect } from 'react'

/**
 * DASHBOARD MINIMALISTE USUALODDS
 * 
 * Interface simple pour visualiser les prédictions de matchs
 */

interface Prediction {
  id: number
  match: {
    home_team: string
    away_team: string
    date: string
    venue: string
    round: string
  }
  predictions: {
    result_1x2: {
      home_win: number
      draw: number
      away_win: number
    }
    total_goals: {
      over_2_5: number
      under_2_5: number
      over_1_5: number
      over_3_5: number
    }
    scorers: {
      home: Array<{ name: string; probability: number }>
      away: Array<{ name: string; probability: number }>
    }
  }
  analysis: {
    overall_confidence: number
    home_style: string
    away_style: string
    home_form: string
    away_form: string
    advantage: string
    upset_potential: number
    key_factors: string[]
  }
  generated_at: string
}

interface DashboardStats {
  total_predictions: number
  avg_confidence: number
  home_wins: number
  away_wins: number
  draws: number
  over_2_5_count: number
}

interface DashboardData {
  predictions: Prediction[]
  stats: DashboardStats
  generated_at: string
  total: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  // Charger les prédictions
  const loadPredictions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/dashboard/predictions')
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

  // Régénérer les prédictions
  const regeneratePredictions = async () => {
    try {
      setRegenerating(true)
      
      const response = await fetch('/api/dashboard/predictions', {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.success) {
        // Recharger les prédictions après régénération
        setTimeout(() => {
          loadPredictions()
        }, 2000)
      } else {
        // Afficher les instructions pour régénération manuelle
        const instructions = result.instructions?.join('\n') || result.details
        alert(`Régénération manuelle requise:\n\n${instructions}`)
      }
    } catch (err) {
      setError('Erreur régénération prédictions')
      console.error('Erreur régénération:', err)
    } finally {
      setRegenerating(false)
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

  // Couleur confiance
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Couleur avantage
  const getAdvantageColor = (advantage: string) => {
    if (advantage === 'domicile') return 'text-blue-600'
    if (advantage === 'exterieur') return 'text-purple-600'
    return 'text-gray-600'
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

  if (!data || data.predictions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <div className="text-yellow-500 text-xl mb-4">📊</div>
          <p className="text-gray-600 mb-4">Aucune prédiction disponible</p>
          <button
            onClick={regeneratePredictions}
            disabled={regenerating}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {regenerating ? 'Génération...' : 'Générer prédictions'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">UsualOdds Dashboard</h1>
              <p className="text-gray-600">
                Prédictions générées le {formatDate(data.generated_at)}
              </p>
            </div>
            <button
              onClick={regeneratePredictions}
              disabled={regenerating}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {regenerating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Génération...
                </>
              ) : (
                <>🔄 Régénérer</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-blue-600">{data.stats.total_predictions}</div>
            <div className="text-sm text-gray-600">Prédictions</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">{data.stats.avg_confidence}%</div>
            <div className="text-sm text-gray-600">Confiance</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-blue-500">{data.stats.home_wins}</div>
            <div className="text-sm text-gray-600">Victoires Dom</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-500">{data.stats.draws}</div>
            <div className="text-sm text-gray-600">Nuls</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-purple-500">{data.stats.away_wins}</div>
            <div className="text-sm text-gray-600">Victoires Ext</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-orange-500">{data.stats.over_2_5_count}</div>
            <div className="text-sm text-gray-600">Over 2.5</div>
          </div>
        </div>

        {/* Liste des prédictions */}
        <div className="space-y-6">
          {data.predictions.map((prediction) => (
            <div key={prediction.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* En-tête match */}
              <div className="px-6 py-4 bg-gray-50 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {prediction.match.home_team} vs {prediction.match.away_team}
                    </h3>
                    <p className="text-gray-600">
                      {formatDate(prediction.match.date)} - {prediction.match.venue}
                    </p>
                    <p className="text-sm text-gray-500">{prediction.match.round}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getConfidenceColor(prediction.analysis.overall_confidence)}`}>
                      {prediction.analysis.overall_confidence}%
                    </div>
                    <div className="text-sm text-gray-500">Confiance</div>
                  </div>
                </div>
              </div>

              {/* Contenu prédictions */}
              <div className="px-6 py-4">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* 1X2 */}
                  <div>
                    <h4 className="font-semibold mb-3">Résultat (1X2)</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Victoire domicile</span>
                        <span className="font-bold text-blue-600">
                          {prediction.predictions.result_1x2.home_win}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Match nul</span>
                        <span className="font-bold text-gray-600">
                          {prediction.predictions.result_1x2.draw}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Victoire extérieur</span>
                        <span className="font-bold text-purple-600">
                          {prediction.predictions.result_1x2.away_win}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total buts */}
                  <div>
                    <h4 className="font-semibold mb-3">Total Buts</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Over 2.5</span>
                        <span className="font-bold text-orange-600">
                          {prediction.predictions.total_goals.over_2_5}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Under 2.5</span>
                        <span className="font-bold text-blue-600">
                          {prediction.predictions.total_goals.under_2_5}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Over 1.5</span>
                        <span className="font-bold text-green-600">
                          {prediction.predictions.total_goals.over_1_5}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Analyse */}
                  <div>
                    <h4 className="font-semibold mb-3">Analyse</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Avantage: </span>
                        <span className={`font-semibold ${getAdvantageColor(prediction.analysis.advantage)}`}>
                          {prediction.analysis.advantage}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Forme: </span>
                        <span>{prediction.analysis.home_form} vs {prediction.analysis.away_form}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Style: </span>
                        <span>{prediction.analysis.home_style} vs {prediction.analysis.away_style}</span>
                      </div>
                      {prediction.analysis.upset_potential > 25 && (
                        <div className="text-orange-600 font-semibold">
                          ⚠️ Potentiel surprise: {prediction.analysis.upset_potential}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Facteurs clés */}
                {prediction.analysis.key_factors.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h5 className="font-semibold text-sm mb-2">Facteurs clés:</h5>
                    <div className="flex flex-wrap gap-2">
                      {prediction.analysis.key_factors.map((factor, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}