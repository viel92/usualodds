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
  MapPin, BarChart3, Eye, ArrowLeft, Gamepad2, Rocket,
  Crown, Clock, Home, Shield, Trophy, Star, ChevronRight,
  Flame, Activity, Info, MoreVertical, Sparkles, Cpu
} from 'lucide-react'

/**
 * 🚀 NOUVELLE INTERFACE DARK MODE GAMING 🚀
 * Style cyberpunk/gaming ultra-reconnaissable pour test
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
    if (confidence >= 80) return 'from-green-400 to-emerald-600'
    if (confidence >= 65) return 'from-yellow-400 to-orange-500'
    return 'from-gray-400 to-gray-600'
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">🚀 LOADING GAMING MODE 🚀</h2>
            <p className="text-purple-300">Chargement des prédictions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 🎮 HEADER GAMING STYLE CYBERPUNK 🎮 */}
      <div className="bg-black/90 backdrop-blur-xl border-b border-purple-500/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/dashboard">
                <Button variant="ghost" className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Retour
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                  🎮 PRÉDICTIONS GAMING MODE 🎮
                </h1>
                <div className="flex items-center space-x-3 text-sm text-purple-300 mt-1">
                  <span className="flex items-center">
                    <Cpu className="w-4 h-4 mr-1 text-green-400 animate-pulse" />
                    IA EN LIGNE
                  </span>
                  <span className="text-purple-500">•</span>
                  <span>{filteredPredictions.length} matchs détectés</span>
                  <span className="text-purple-500">•</span>
                  <span className="flex items-center">
                    <Sparkles className="w-4 h-4 mr-1 text-yellow-400" />
                    Mode Test Déploiement
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={loadPredictions}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>

          {/* 🔥 FILTRES GAMING STYLE 🔥 */}
          <div className="flex items-center space-x-3 mt-4">
            <Gamepad2 className="w-5 h-5 text-purple-400" />
            {[
              { key: 'all', label: '🎯 Tous les matchs', icon: Target },
              { key: 'today', label: '⚡ Aujourd\'hui', icon: Zap },
              { key: 'tomorrow', label: '🚀 Demain', icon: Rocket },
              { key: 'high', label: '👑 Haute confiance', icon: Crown }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedFilter(key as any)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center space-x-2 ${
                  selectedFilter === key
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white border border-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🎯 CONTENU PRINCIPAL GAMING 🎯 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Gaming */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Matchs Détectés", value: filteredPredictions.length, icon: Target, color: "from-blue-500 to-cyan-600" },
            { label: "Haute Confiance", value: filteredPredictions.filter(p => p.predictions.confidence >= 75).length, icon: Flame, color: "from-red-500 to-orange-600" },
            { label: "Précision IA", value: "54.2%", icon: Cpu, color: "from-green-500 to-emerald-600" },
            { label: "Confiance Moy.", value: Math.round(filteredPredictions.reduce((sum, p) => sum + p.predictions.confidence, 0) / filteredPredictions.length || 0) + "%", icon: Star, color: "from-purple-500 to-pink-600" }
          ].map((stat, idx) => (
            <div key={idx} className="bg-black/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 text-center group hover:border-purple-500/50 transition-all duration-300">
              <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 🎮 LISTE DES PRÉDICTIONS GAMING 🎮 */}
        {filteredPredictions.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-12 text-center">
            <Gamepad2 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">🎯 Aucun Match Trouvé</h3>
            <p className="text-gray-400">Modifiez les filtres ou actualisez la page</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPredictions.map((prediction) => {
              const { time, day } = formatDate(prediction.matchDate)
              const result = getPredictedResult(prediction)
              const confidenceGradient = getConfidenceColor(prediction.predictions.confidence)
              
              return (
                <div key={prediction.id} className="bg-black/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 group">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      {/* Date/Heure Gaming */}
                      <div className="text-center min-w-[80px]">
                        <div className="text-xs text-purple-400 font-bold uppercase tracking-wide">{day}</div>
                        <div className="text-lg font-black text-white">{time}</div>
                      </div>

                      {/* Équipes Gaming Style */}
                      <div className="flex-1 mx-6">
                        <div className="grid grid-cols-3 gap-4 items-center">
                          {/* Équipe Domicile */}
                          <div className="text-right">
                            <div className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                              {prediction.homeTeam}
                            </div>
                            <div className={`text-2xl font-black bg-gradient-to-r ${confidenceGradient} bg-clip-text text-transparent`}>
                              {prediction.predictions.homeWin}%
                            </div>
                            {result === '1' && (
                              <div className="flex items-center justify-end mt-1">
                                <Crown className="w-4 h-4 text-yellow-400 mr-1" />
                                <span className="text-xs text-yellow-400 font-bold">FAVORI</span>
                              </div>
                            )}
                          </div>

                          {/* VS Central */}
                          <div className="text-center">
                            <div className="text-2xl font-black text-purple-400 mb-2">VS</div>
                            <div className="text-lg font-bold text-gray-400">
                              Nul {prediction.predictions.draw}%
                            </div>
                            {result === 'X' && (
                              <div className="flex items-center justify-center mt-1">
                                <Crown className="w-4 h-4 text-yellow-400 mr-1" />
                                <span className="text-xs text-yellow-400 font-bold">PRÉDICTION</span>
                              </div>
                            )}
                          </div>

                          {/* Équipe Extérieur */}
                          <div className="text-left">
                            <div className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                              {prediction.awayTeam}
                            </div>
                            <div className={`text-2xl font-black bg-gradient-to-r ${confidenceGradient} bg-clip-text text-transparent`}>
                              {prediction.predictions.awayWin}%
                            </div>
                            {result === '2' && (
                              <div className="flex items-center justify-start mt-1">
                                <Crown className="w-4 h-4 text-yellow-400 mr-1" />
                                <span className="text-xs text-yellow-400 font-bold">FAVORI</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Stade Info */}
                        <div className="flex items-center justify-center mt-3 text-sm text-gray-500">
                          <MapPin className="w-4 h-4 mr-1" />
                          {prediction.venue}
                        </div>
                      </div>

                      {/* Confiance Gaming */}
                      <div className="text-center min-w-[120px]">
                        <div className={`bg-gradient-to-r ${confidenceGradient} text-white px-4 py-2 rounded-xl font-black text-lg mb-2`}>
                          {prediction.predictions.confidence}%
                        </div>
                        <div className="bg-gray-800 text-white px-3 py-1 rounded-lg text-sm font-bold">
                          PRÉDICTION: {result}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}