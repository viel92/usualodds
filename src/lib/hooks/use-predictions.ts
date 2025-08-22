'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CACHE_CONFIG, PredictionsCache } from '@/lib/cache-manager'

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
    // NOUVELLES FEATURES ENRICHIES
    homeXG?: number
    awayXG?: number
    homeShotsPerGame?: number
    awayShotsPerGame?: number
    homeShotEfficiency?: number
    awayShotEfficiency?: number
    homeStyle?: number
    awayStyle?: number
    dataQuality?: number
    homeRecentXG?: number
    homeRecentPoss?: number
    homeRecentMatches?: number
    awayRecentXG?: number
    awayRecentPoss?: number
    awayRecentMatches?: number
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

// Hook pour charger les prédictions avec cache unifié
export function usePredictions(limit = 10, confidenceMin = 50) {
  const cacheKey = PredictionsCache.generateKey(CACHE_CONFIG.CACHE_KEYS.PREDICTIONS, { limit, confidenceMin });
  
  return useQuery({
    queryKey: ['predictions', limit, confidenceMin],
    queryFn: async (): Promise<DashboardData> => {
      // Vérifier cache local d'abord
      const cached = PredictionsCache.get<DashboardData>(cacheKey);
      if (cached) {
        console.log('Cache hit - retour données locales');
        return cached;
      }
      
      // Sinon fetch API
      const response = await fetch(`/api/predictions?limit=${limit}&confidence_min=${confidenceMin}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur chargement prédictions')
      }
      
      if (!result.data) {
        throw new Error('Aucune donnée retournée par l\'API')
      }
      
      // Mettre en cache
      PredictionsCache.set(cacheKey, result.data);
      
      return result.data
    },
    staleTime: CACHE_CONFIG.PREDICTIONS_STALE_TIME, // 2h unifié
    gcTime: CACHE_CONFIG.PREDICTIONS_GC_TIME, // 4h unifié
  })
}

// Hook pour rafraîchir les prédictions
export function useRefreshPredictions() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/predictions?refresh=true', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur rafraîchissement')
      }
      
      if (!result.data) {
        throw new Error('Aucune donnée lors du rafraîchissement')
      }
      
      return result.data
    },
    onSuccess: (data) => {
      // Invalider cache local et React Query
      PredictionsCache.invalidate('predictions*');
      queryClient.setQueryData(['predictions', 10, 50], data)
      queryClient.invalidateQueries({ queryKey: ['predictions'] })
    },
  })
}