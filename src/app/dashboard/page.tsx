'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button-premium'
import { Card } from '@/components/ui/card-premium'
import { Badge, ConfidenceBadge } from '@/components/ui/badge-premium'
import { PredictionCardSkeleton } from '@/components/ui/loading-states'
import { LazyStatsGrid } from '@/components/dashboard/lazy-stats'
import { usePredictions, useRefreshPredictions } from '@/lib/hooks/use-predictions'
import { TrendingUp, Target, RefreshCw, Calendar, MapPin, BarChart3, Eye, ArrowRight } from 'lucide-react'

/**
 * DASHBOARD OPTIMISÉ - HUB CENTRAL USUALODDS
 * 
 * Vue d'ensemble des prédictions avec React Query et lazy loading
 */

export default function DashboardPage() {
  // Utilisation de React Query pour cache et optimisation
  const { data, isLoading, error, refetch } = usePredictions(10, 50)
  const refreshMutation = useRefreshPredictions()

  // Rafraîchir les prédictions
  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync()
    } catch (err) {
      console.error('Dashboard Analytics - À venir:', err)
    }
  }

  // Loading state avec skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-25 to-neutral-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="animate-pulse">
              <div className="h-8 bg-neutral-200 rounded w-64 mb-4"></div>
              <div className="h-4 bg-neutral-200 rounded w-96"></div>
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6 bg-white rounded-lg border border-neutral-200">
                <div className="animate-pulse">
                  <div className="w-12 h-12 bg-neutral-200 rounded-lg mb-4"></div>
                  <div className="h-8 bg-neutral-200 rounded w-20 mb-2"></div>
                  <div className="h-4 bg-neutral-200 rounded w-32"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Predictions Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <PredictionCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-25 to-neutral-50 flex items-center justify-center">
        <Card variant="elevated" className="p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-error-50 text-error-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="text-headline-md font-bold text-neutral-900 mb-2">
            Dashboard Analytics - À venir
          </h3>
          <p className="text-neutral-600 mb-6">
            {error?.message || 'Impossible de charger les prédictions'}
          </p>
          <Button onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </Card>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-25 to-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header avec actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-headline-lg font-bold text-neutral-900 mb-2">
              Dashboard Prédictions
            </h1>
            <p className="text-body-md text-neutral-600">
              Vue d'ensemble des prédictions générées par IA
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <Button
              variant="secondary"
              size="md"
              onClick={handleRefresh}
              disabled={refreshMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              {refreshMutation.isPending ? 'Actualisation...' : 'Actualiser'}
            </Button>
            
            <Link href="/predictions">
              <Button size="md">
                <Eye className="w-4 h-4 mr-2" />
                Voir Toutes
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid - Lazy Loaded */}
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6 bg-white rounded-lg border border-neutral-200 animate-pulse">
                <div className="w-12 h-12 bg-neutral-200 rounded-lg mb-4"></div>
                <div className="h-8 bg-neutral-200 rounded w-20 mb-2"></div>
                <div className="h-4 bg-neutral-200 rounded w-32"></div>
              </div>
            ))}
          </div>
        }>
          <LazyStatsGrid data={data} />
        </Suspense>

        {/* Section Prédictions Récentes */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-headline-md font-bold text-neutral-900">
              Prédictions Récentes
            </h2>
            <Badge variant="primary" size="sm">
              {data.predictions.length} prédictions
            </Badge>
          </div>

          {/* Liste des prédictions */}
          <div className="space-y-4">
            {data.predictions.map((prediction) => (
              <Card key={prediction.id} variant="elevated" interactive="hover" className="overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Badge variant="primary" size="sm">
                        Ligue 1
                      </Badge>
                      <span className="text-caption-lg text-neutral-500">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {new Date(prediction.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <ConfidenceBadge confidence={prediction.confidence} />
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-center">
                      <div className="text-body-lg font-semibold text-neutral-900">
                        {prediction.homeTeam}
                      </div>
                      <div className="text-caption-md text-neutral-500">Domicile</div>
                    </div>
                    
                    <div className="text-center px-4">
                      <div className="text-2xl font-bold text-neutral-400">VS</div>
                      <div className="text-caption-md text-neutral-500">
                        {new Date(prediction.date).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-body-lg font-semibold text-neutral-900">
                        {prediction.awayTeam}
                      </div>
                      <div className="text-caption-md text-neutral-500">Extérieur</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-caption-lg text-neutral-500">
                      <MapPin className="w-4 h-4" />
                      <span>{prediction.venue}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Détails
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card variant="gradient" className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white text-center p-8">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-headline-md font-bold mb-4">
              Explorez Toutes les Prédictions
            </h3>
            <p className="text-body-md text-primary-100 mb-6">
              Découvrez l'analyse complète avec filtres, recherche et insights détaillés
            </p>
            <Link href="/predictions">
              <Button variant="secondary" size="lg">
                <TrendingUp className="w-5 h-5 mr-2" />
                Accéder aux Prédictions
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}