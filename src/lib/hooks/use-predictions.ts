'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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

// Hook pour charger les prédictions avec cache
export function usePredictions(limit = 10, confidenceMin = 50) {
  return useQuery({
    queryKey: ['predictions', limit, confidenceMin],
    queryFn: async (): Promise<DashboardData> => {
      const response = await fetch(`/api/predictions?limit=${limit}&confidence_min=${confidenceMin}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur chargement prédictions')
      }
      
      return result.data
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Hook pour rafraîchir les prédictions
export function useRefreshPredictions() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/predictions', {
        method: 'POST'
      })
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur rafraîchissement')
      }
      
      return result.data
    },
    onSuccess: (data) => {
      // Invalider et mettre à jour le cache
      queryClient.setQueryData(['predictions', 10, 50], data)
      queryClient.invalidateQueries({ queryKey: ['predictions'] })
    },
  })
}