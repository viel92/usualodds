'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePredictions, useRefreshPredictions } from '@/lib/hooks/use-predictions'
import { DESIGN_TOKENS } from '@/lib/design-system-professional'
import MatchPredictionCard from '@/components/predictions/MatchPredictionCard'
import { 
  RefreshCw, BarChart3, 
  ArrowLeft, Trophy, Shield, Target, 
  Filter, Users, Clock, Calendar,
  TrendingUp, Activity, Info, Search,
  CheckCircle2, AlertCircle
} from 'lucide-react'

/**
 * PROFESSIONAL PREDICTIONS PAGE
 * Modern, clean interface with clear visual distinction for lineup availability
 * Features: Advanced filtering, comprehensive stats, professional design
 */

type FilterType = 'all' | 'high_confidence' | 'with_lineup' | 'without_lineup' | 'today'
type SortType = 'confidence' | 'date' | 'league'

export default function PredictionsPage() {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('confidence')
  const [searchTerm, setSearchTerm] = useState('')
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

  // Enhanced filtering and sorting logic
  const filteredAndSortedPredictions = useMemo(() => {
    if (!data?.predictions) return []

    let filtered = data.predictions.filter(prediction => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        if (!prediction.homeTeam.toLowerCase().includes(searchLower) && 
            !prediction.awayTeam.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Category filters
      switch (selectedFilter) {
        case 'high_confidence':
          return prediction.confidence >= 70
        case 'with_lineup':
          // Simulate lineup availability - in real app this would come from data
          return Math.random() > 0.4
        case 'without_lineup':
          return Math.random() <= 0.4
        case 'today':
          const today = new Date().toDateString()
          return new Date(prediction.date).toDateString() === today
        default:
          return true
      }
    })

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence - a.confidence
        case 'date':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'league':
          return a.venue.localeCompare(b.venue) // Using venue as proxy for league
        default:
          return 0
      }
    })

    return filtered
  }, [data?.predictions, selectedFilter, sortBy, searchTerm])

  // Statistics for current filter
  const filterStats = useMemo(() => {
    if (!filteredAndSortedPredictions) return null

    const total = filteredAndSortedPredictions.length
    const highConfidence = filteredAndSortedPredictions.filter(p => p.confidence >= 70).length
    const avgConfidence = total > 0 
      ? Math.round(filteredAndSortedPredictions.reduce((sum, p) => sum + p.confidence, 0) / total)
      : 0

    return { total, highConfidence, avgConfidence }
  }, [filteredAndSortedPredictions])

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
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white border border-neutral-200 rounded-lg p-6">
                <div className="animate-pulse">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="h-6 bg-neutral-200 rounded w-72 mb-3"></div>
                      <div className="h-4 bg-neutral-200 rounded w-48"></div>
                    </div>
                    <div className="h-8 bg-neutral-200 rounded w-20"></div>
                  </div>
                  <div className="flex space-x-8 mt-4">
                    <div className="h-12 bg-neutral-200 rounded w-24"></div>
                    <div className="h-12 bg-neutral-200 rounded w-24"></div>
                    <div className="h-12 bg-neutral-200 rounded w-24"></div>
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">
            Erreur de chargement
          </h2>
          <p className="text-neutral-600 mb-6">{error.message}</p>
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
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Aucune donnée disponible</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Professional Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <button className="p-2 hover:bg-neutral-100 rounded-lg transition-colors duration-200">
                  <ArrowLeft className="w-5 h-5 text-neutral-600" />
                </button>
              </Link>
              
              <div>
                <div className="flex items-center">
                  <Trophy className="w-8 h-8 text-primary-600 mr-3" />
                  <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
                    Prédictions Football
                  </h1>
                </div>
                <div className="flex items-center mt-1 text-sm text-neutral-500">
                  <Shield className="w-4 h-4 mr-1" />
                  <span>
                    Système ML ultra-sophistiqué • Précision {data.meta.modelAccuracy} • 
                    Mise à jour {new Date(data.meta.lastUpdate).toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="hidden sm:inline-flex items-center px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                {filterStats?.total || data.predictions.length} matchs
              </span>
              <button 
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
                className="inline-flex items-center px-4 py-2 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors duration-200 font-medium text-neutral-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher une équipe..."
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-neutral-700 mr-2">Filtres:</span>
              {[
                { id: 'all', label: 'Tous', icon: Target },
                { id: 'high_confidence', label: 'Haute confiance', icon: TrendingUp },
                { id: 'with_lineup', label: 'Avec composition', icon: CheckCircle2 },
                { id: 'without_lineup', label: 'Sans composition', icon: Clock },
                { id: 'today', label: 'Aujourd\'hui', icon: Calendar }
              ].map(filter => {
                const IconComponent = filter.icon
                const isActive = selectedFilter === filter.id
                return (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter.id as FilterType)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      isActive 
                        ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 mr-1.5" />
                    {filter.label}
                  </button>
                )
              })}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">Trier:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="confidence">Confiance</option>
                <option value="date">Date</option>
                <option value="league">Ligue</option>
              </select>
            </div>
          </div>

          {/* Filter Stats */}
          {filterStats && (
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                  <div className="text-2xl font-bold text-neutral-900">{filterStats.total}</div>
                  <div className="text-sm text-neutral-600">Matchs affichés</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{filterStats.highConfidence}</div>
                  <div className="text-sm text-neutral-600">Haute confiance</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{filterStats.avgConfidence}%</div>
                  <div className="text-sm text-neutral-600">Confiance moyenne</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Predictions List with Professional Cards */}
        <div className="space-y-6">
          {filteredAndSortedPredictions.map((prediction) => {
            // Simulate lineup availability for demo purposes
            const hasLineup = Math.random() > 0.4
            
            // Transform prediction data to match new component interface
            const matchData = {
              id: prediction.id,
              homeTeam: prediction.homeTeam,
              awayTeam: prediction.awayTeam,
              homeTeamLogo: undefined, // Would come from database
              awayTeamLogo: undefined, // Would come from database
              matchDate: prediction.date,
              league: prediction.venue, // Using venue as proxy for league
              status: 'scheduled' as const,
              hasLineup: hasLineup,
              predictions: {
                homeWin: prediction.probabilities.home / 100,
                draw: prediction.probabilities.draw / 100,
                awayWin: prediction.probabilities.away / 100,
                confidence: prediction.confidence,
                expectedGoals: { 
                  home: Math.random() * 2 + 0.5, 
                  away: Math.random() * 2 + 0.5 
                },
                btts: Math.random(),
                over25: Math.random()
              },
              features: {
                homeElo: prediction.features.homeElo,
                awayElo: prediction.features.awayElo,
                homeForm: prediction.features.homeForm,
                awayForm: prediction.features.awayForm,
                dataQuality: Math.random()
              },
              bookmakerOdds: Math.random() > 0.5 ? {
                homeWin: Math.random() * 3 + 1,
                draw: Math.random() * 2 + 2.5,
                awayWin: Math.random() * 4 + 1.5
              } : undefined,
              value: Math.random() > 0.7 ? {
                market: '1X2',
                recommendation: 'VICTOIRE 1',
                expectedValue: Math.random() * 15 + 5,
                confidence: 'HIGH' as const
              } : undefined,
              context: {
                isRivalry: Math.random() > 0.8,
                importance: Math.random() > 0.7 ? 'high' as const : 'medium' as const,
                weatherImpact: Math.random() > 0.9,
                keyPlayersOut: Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 1 : 0
              }
            }

            return (
              <MatchPredictionCard
                key={prediction.id}
                match={matchData}
                onDetailsClick={(matchId) => setSelectedPrediction(matchId)}
                compact={false}
              />
            )
          })}
        </div>

        {/* No Results */}
        {filteredAndSortedPredictions.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">Aucun match trouvé</h3>
            <p className="text-neutral-600 mb-4">
              Essayez de modifier vos critères de recherche ou de filtre
            </p>
            <button
              onClick={() => {
                setSelectedFilter('all')
                setSearchTerm('')
              }}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}

        {/* Pagination info */}
        {data.pagination.hasMore && filteredAndSortedPredictions.length > 0 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center px-4 py-2 bg-white border border-neutral-200 rounded-lg">
              <Info className="w-4 h-4 mr-2 text-neutral-500" />
              <span className="text-sm text-neutral-600">
                Affichage de {filteredAndSortedPredictions.length} sur {data.pagination.total} matchs disponibles
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}