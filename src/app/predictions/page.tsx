'use client'

import { useState, useEffect } from 'react'

// Force dynamic rendering to prevent stale static generation
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button-premium'
import { Card } from '@/components/ui/card-premium'
import { Badge, ConfidenceBadge, StatusBadge } from '@/components/ui/badge-premium'
import { 
  TrendingUp, Target, Zap, Users, RefreshCw, Calendar, 
  MapPin, BarChart3, Eye, ArrowLeft, Filter, Search, 
  Crown, Clock, Home, Shield, Trophy, Star, ChevronRight,
  Flame, Activity, Info, MoreVertical
} from 'lucide-react'

/**
 * PAGE PRÉDICTIONS STYLE SOFASCORE
 * Interface ultra-compacte et moderne
 */

interface SimplePrediction {
  id: string
  homeTeam: string
  awayTeam: string
  matchDate: string
  venue?: string
  competition?: string
  predictions: {
    homeWin: number
    draw: number
    awayWin: number
    confidence: number
  }
  status: 'scheduled' | 'soon' | 'live'
  homeForm?: number
  awayForm?: number
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<SimplePrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'tomorrow' | 'high'>('all')
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact')

  useEffect(() => {
    loadPredictions()
  }, [])

  const loadPredictions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/predictions')
      const result = await response.json()
      
      if (result.success && result.data.predictions) {
        const transformedPredictions = result.data.predictions.map((pred: any) => ({
          id: pred.id.toString(),
          homeTeam: pred.homeTeam,
          awayTeam: pred.awayTeam,
          matchDate: pred.date,
          venue: pred.venue || 'Stade à confirmer',
          competition: 'Ligue 1',
          predictions: {
            homeWin: pred.probabilities.home,
            draw: pred.probabilities.draw,
            awayWin: pred.probabilities.away,
            confidence: pred.confidence
          },
          status: 'scheduled' as const,
          homeForm: pred.features?.homeForm || 0,
          awayForm: pred.features?.awayForm || 0
        }))
        
        setPredictions(transformedPredictions)
      } else {
        setError('Aucune prédiction disponible')
      }
    } catch (err) {
      setError('Erreur lors du chargement')
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const day = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
    return { time, day }
  }

  const getPredictedResult = (pred: SimplePrediction) => {
    const { homeWin, draw, awayWin } = pred.predictions
    if (homeWin > draw && homeWin > awayWin) return '1'
    if (draw > homeWin && draw > awayWin) return 'X'
    return '2'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50'
    if (confidence >= 65) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }

  const filteredPredictions = predictions.filter(pred => {
    if (selectedFilter === 'high') return pred.predictions.confidence >= 75
    if (selectedFilter === 'today') {
      const today = new Date().toDateString()
      return new Date(pred.matchDate).toDateString() === today
    }
    if (selectedFilter === 'tomorrow') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return new Date(pred.matchDate).toDateString() === tomorrow.toDateString()
    }
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Compact Style SofaScore */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="px-2">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Prédictions Football</h1>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Activity className="w-3 h-3 mr-1 text-green-500" />
                    En direct
                  </span>
                  <span>•</span>
                  <span>{filteredPredictions.length} matchs</span>
                  <span>•</span>
                  <span>Ligue 1 2024-25</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'compact' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('compact')}
                className="px-3"
              >
                Compact
              </Button>
              <Button
                variant={viewMode === 'detailed' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('detailed')}
                className="px-3"
              >
                Détaillé
              </Button>
              <Button
                onClick={loadPredictions}
                variant="ghost"
                size="sm"
                className="px-3"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filtres rapides */}
          <div className="flex items-center space-x-2 pb-3 overflow-x-auto">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedFilter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tous les matchs
            </button>
            <button
              onClick={() => setSelectedFilter('today')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedFilter === 'today' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setSelectedFilter('tomorrow')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedFilter === 'tomorrow' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Demain
            </button>
            <button
              onClick={() => setSelectedFilter('high')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center ${
                selectedFilter === 'high' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Flame className="w-3 h-3 mr-1" />
              Haute confiance
            </button>
          </div>
        </div>
      </div>

      {/* Layout 2 colonnes */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Colonne principale - Prédictions */}
          <div className="lg:col-span-2">
            {/* Stats rapides */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {filteredPredictions.length}
                </div>
                <div className="text-xs text-gray-500">Matchs</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredPredictions.filter(p => p.predictions.confidence >= 75).length}
                </div>
                <div className="text-xs text-gray-500">Haute conf.</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  54.2%
                </div>
                <div className="text-xs text-gray-500">Précision</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(filteredPredictions.reduce((sum, p) => sum + p.predictions.confidence, 0) / filteredPredictions.length || 0)}%
                </div>
                <div className="text-xs text-gray-500">Conf. moy.</div>
              </div>
            </div>

            {/* Liste des prédictions compactes */}
            {filteredPredictions.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune prédiction</h3>
                <p className="text-sm text-gray-500">Modifiez les filtres ou actualisez la page</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPredictions.map((prediction) => {
                  const { time, day } = formatDate(prediction.matchDate)
                  const result = getPredictedResult(prediction)
                  const confidenceClass = getConfidenceColor(prediction.predictions.confidence)
                  
                  return viewMode === 'compact' ? (
                    // Vue compacte style SofaScore
                    <div key={prediction.id} className="bg-white rounded-lg hover:shadow-md transition-shadow">
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          {/* Date/Heure */}
                          <div className="w-16 text-center flex-shrink-0">
                            <div className="text-xs text-gray-500">{day}</div>
                            <div className="text-sm font-semibold text-gray-900">{time}</div>
                          </div>

                          {/* Équipes */}
                          <div className="flex-1 mx-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
                                {prediction.homeTeam}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-bold text-blue-600">
                                  {prediction.predictions.homeWin}%
                                </span>
                                {result === '1' && <Crown className="w-3 h-3 text-yellow-500" />}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
                                {prediction.awayTeam}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-bold text-blue-600">
                                  {prediction.predictions.awayWin}%
                                </span>
                                {result === '2' && <Crown className="w-3 h-3 text-yellow-500" />}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-100">
                              <span className="text-xs text-gray-400 flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {prediction.venue}
                              </span>
                              {result === 'X' && (
                                <span className="text-xs text-gray-500 flex items-center">
                                  Nul {prediction.predictions.draw}%
                                  <Crown className="w-3 h-3 text-yellow-500 ml-1" />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Prédiction et confiance */}
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${confidenceClass}`}>
                              {prediction.predictions.confidence}%
                            </div>
                            <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs font-bold">
                              {result}
                            </div>
                            <button className="p-1 hover:bg-gray-100 rounded">
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Vue détaillée
                    <Card key={prediction.id} variant="elevated" className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" size="sm">
                              {prediction.competition}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {day} • {time}
                            </span>
                            {prediction.predictions.confidence >= 75 && (
                              <Badge variant="success" size="sm">
                                <Flame className="w-3 h-3 mr-1" />
                                Hot Pick
                              </Badge>
                            )}
                          </div>
                          <ConfidenceBadge confidence={prediction.predictions.confidence} />
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="text-center">
                            <div className="font-semibold text-gray-900 mb-1">
                              {prediction.homeTeam}
                            </div>
                            <div className="text-2xl font-bold text-blue-600">
                              {prediction.predictions.homeWin}%
                            </div>
                            {result === '1' && (
                              <Badge variant="gold" size="sm" className="mt-1">
                                <Crown className="w-3 h-3 mr-1" />
                                Favori
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-center">
                            <div className="text-gray-500 mb-1">Nul</div>
                            <div className="text-2xl font-bold text-gray-600">
                              {prediction.predictions.draw}%
                            </div>
                            {result === 'X' && (
                              <Badge variant="outline" size="sm" className="mt-1">
                                Prédiction
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-center">
                            <div className="font-semibold text-gray-900 mb-1">
                              {prediction.awayTeam}
                            </div>
                            <div className="text-2xl font-bold text-purple-600">
                              {prediction.predictions.awayWin}%
                            </div>
                            {result === '2' && (
                              <Badge variant="gold" size="sm" className="mt-1">
                                <Crown className="w-3 h-3 mr-1" />
                                Favori
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {prediction.venue}
                          </span>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-3 h-3 mr-1" />
                            Détails
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sidebar - Widgets premium */}
          <div className="space-y-4">
            {/* Widget Top Predictions */}
            <Card variant="elevated" className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
                  Top Confiance
                </h3>
                <Badge variant="primary" size="sm">Live</Badge>
              </div>
              <div className="space-y-2">
                {predictions
                  .sort((a, b) => b.predictions.confidence - a.predictions.confidence)
                  .slice(0, 3)
                  .map((pred, idx) => (
                    <div key={pred.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                        <div>
                          <div className="text-xs font-medium text-gray-900">
                            {pred.homeTeam} vs {pred.awayTeam}
                          </div>
                          <div className="text-xs text-gray-500">
                            Résultat: {getPredictedResult(pred)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="success" size="sm">
                        {pred.predictions.confidence}%
                      </Badge>
                    </div>
                  ))}
              </div>
            </Card>

            {/* Widget Stats */}
            <Card variant="elevated" className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2 text-blue-500" />
                  Statistiques
                </h3>
                <button className="text-gray-400 hover:text-gray-600">
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Victoires domicile</span>
                    <span className="font-semibold">
                      {Math.round((predictions.filter(p => getPredictedResult(p) === '1').length / predictions.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(predictions.filter(p => getPredictedResult(p) === '1').length / predictions.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Matchs nuls</span>
                    <span className="font-semibold">
                      {Math.round((predictions.filter(p => getPredictedResult(p) === 'X').length / predictions.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-600 h-2 rounded-full"
                      style={{ width: `${(predictions.filter(p => getPredictedResult(p) === 'X').length / predictions.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Victoires extérieur</span>
                    <span className="font-semibold">
                      {Math.round((predictions.filter(p => getPredictedResult(p) === '2').length / predictions.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${(predictions.filter(p => getPredictedResult(p) === '2').length / predictions.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Widget Info Système */}
            <Card variant="gradient" className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-green-500" />
                  Système ML
                </h3>
                <StatusBadge status="online" />
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Modèle</span>
                  <span className="font-medium">XGBoost v2.1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Précision</span>
                  <span className="font-medium text-green-600">54.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dernière MAJ</span>
                  <span className="font-medium">Il y a 2h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Données</span>
                  <span className="font-medium">5 saisons</span>
                </div>
              </div>
            </Card>

            {/* CTA Premium */}
            <Card variant="elevated" className="p-4 bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="text-center">
                <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Version Premium</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Débloquez plus de fonctionnalités
                </p>
                <Button variant="primary" size="sm" className="w-full">
                  Découvrir
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}