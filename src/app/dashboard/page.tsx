'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button-premium'
import { Card, StatCard } from '@/components/ui/card-premium'
import { Badge, ConfidenceBadge, StatusBadge, TrendBadge } from '@/components/ui/badge-premium'
import { Spinner, Skeleton, Progress, PredictionCardSkeleton } from '@/components/ui/loading-states'
import { TrendingUp, Target, Zap, Users, RefreshCw, Calendar, MapPin, BarChart3, Eye, ArrowRight } from 'lucide-react'

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
  const getConfidenceLevel = (confidence: number): 'high' | 'medium' | 'low' => {
    if (confidence >= 80) return 'high'
    if (confidence >= 60) return 'medium'
    return 'low'
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
      <div className="min-h-screen bg-neutral-50">
        {/* Header Premium */}
        <Card variant="elevated" className="rounded-none border-0 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent flex items-center space-x-2">
                  <Target className="w-8 h-8 text-primary-600" />
                  <span>UsualOdds</span>
                </Link>
                <div className="hidden md:block text-neutral-400">|</div>
                <h1 className="hidden md:block text-headline-md font-bold text-neutral-900">Dashboard</h1>
              </div>
              <nav className="flex items-center space-x-6">
                <Link href="/predictions">
                  <Button variant="ghost" leftIcon={<BarChart3 className="w-4 h-4" />}>
                    Toutes les prédictions
                  </Button>
                </Link>
              </nav>
            </div>
          </div>
        </Card>

        {/* Loading State Premium */}
        <div className="flex items-center justify-center py-20">
          <Card variant="elevated" className="p-12">
            <div className="text-center">
              <Spinner size="xl" className="mx-auto mb-6" />
              <h3 className="text-headline-md font-semibold text-neutral-900 mb-2">Chargement du dashboard</h3>
              <p className="text-body-md text-neutral-600">Récupération des prédictions en cours...</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card variant="elevated" className="text-center p-12 max-w-md">
          <div className="w-16 h-16 bg-error-50 text-error-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="w-8 h-8" />
          </div>
          <h2 className="text-headline-md font-bold text-neutral-900 mb-4">Erreur de chargement</h2>
          <p className="text-body-md text-neutral-600 mb-8">{error}</p>
          <Button
            onClick={loadPredictions}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            size="lg"
          >
            Réessayer
          </Button>
        </Card>
      </div>
    )
  }

  if (!data || data.predictions.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* Header Premium */}
        <Card variant="elevated" className="rounded-none border-0 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent flex items-center space-x-2">
                  <Target className="w-8 h-8 text-primary-600" />
                  <span>UsualOdds</span>
                </Link>
                <div className="hidden md:block text-neutral-400">|</div>
                <h1 className="hidden md:block text-headline-md font-bold text-neutral-900">Dashboard</h1>
              </div>
              <nav className="flex items-center space-x-6">
                <Link href="/predictions">
                  <Button variant="ghost" leftIcon={<BarChart3 className="w-4 h-4" />}>
                    Toutes les prédictions
                  </Button>
                </Link>
              </nav>
            </div>
          </div>
        </Card>

        {/* Empty State Premium */}
        <div className="flex items-center justify-center py-20">
          <Card variant="elevated" className="text-center p-12 max-w-lg">
            <div className="w-20 h-20 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <TrendingUp className="w-10 h-10" />
            </div>
            <h2 className="text-display-md font-black text-neutral-900 mb-6">Aucune prédiction disponible</h2>
            <p className="text-body-lg text-neutral-600 mb-10 leading-relaxed">
              Les prédictions apparaîtront ici une fois les matches collectés et analysés.
            </p>
            <Button
              onClick={refreshPredictions}
              disabled={refreshing}
              loading={refreshing}
              size="xl"
              leftIcon={!refreshing ? <Zap className="w-5 h-5" /> : undefined}
            >
              {refreshing ? 'Génération en cours...' : 'Générer prédictions'}
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header Premium avec navigation */}
      <Card variant="elevated" className="rounded-none border-0 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent flex items-center space-x-2">
                <Target className="w-8 h-8 text-primary-600" />
                <span>UsualOdds</span>
              </Link>
              <div className="hidden md:block text-neutral-400">|</div>
              <h1 className="hidden md:block text-headline-md font-bold text-neutral-900">Dashboard</h1>
              <StatusBadge status="online" className="hidden md:flex" />
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/predictions">
                <Button variant="ghost" leftIcon={<BarChart3 className="w-4 h-4" />}>
                  Toutes les prédictions
                </Button>
              </Link>
              <Button
                onClick={refreshPredictions}
                disabled={refreshing}
                loading={refreshing}
                variant="primary"
                leftIcon={!refreshing ? <RefreshCw className="w-4 h-4" /> : undefined}
              >
                {refreshing ? 'Actualisation...' : 'Actualiser'}
              </Button>
            </nav>
          </div>
        </div>
      </Card>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview Premium */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Prédictions actives"
            value={data.predictions.length.toString()}
            icon={<Target className="w-5 h-5" />}
            trend="neutral"
          />
          <StatCard
            title="Confiance moyenne"
            value={`${data.meta.avgConfidence}%`}
            icon={<TrendingUp className="w-5 h-5" />}
            trend="up"
          />
          <StatCard
            title="Précision modèle"
            value={data.meta.modelAccuracy}
            icon={<Zap className="w-5 h-5" />}
            trend="up"
          />
          <StatCard
            title="Haute confiance"
            value={data.predictions.filter(p => p.confidence >= 75).length.toString()}
            icon={<Users className="w-5 h-5" />}
            trend="up"
          />
        </div>

        {/* Prédictions highlights Premium */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-display-md font-black text-neutral-900">Prochains matchs</h2>
            <Link href="/predictions">
              <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Voir tout
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {data.predictions.slice(0, 5).map((prediction) => (
              <Card key={prediction.id} variant="elevated" interactive="hover" className="overflow-hidden">
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Match Info Premium */}
                    <div className="lg:col-span-5">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="secondary" leftIcon={<Calendar className="w-3 h-3" />}>
                          {formatDate(prediction.date)}
                        </Badge>
                        <ConfidenceBadge confidence={prediction.confidence} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <div className="font-bold text-neutral-900 mb-1">{prediction.homeTeam}</div>
                          <Badge variant="outline" size="sm">
                            ELO: {prediction.features.homeElo}
                          </Badge>
                        </div>
                        <div className="text-center mx-4">
                          <div className="text-headline-md font-black text-neutral-800">VS</div>
                          <Badge variant="primary" size="sm">
                            {formatTime(prediction.date)}
                          </Badge>
                        </div>
                        <div className="text-center flex-1">
                          <div className="font-bold text-neutral-900 mb-1">{prediction.awayTeam}</div>
                          <Badge variant="outline" size="sm">
                            ELO: {prediction.features.awayElo}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Probabilities Premium */}
                    <div className="lg:col-span-4">
                      <div className="grid grid-cols-3 gap-3">
                        <Card variant="gradient" padding="sm" className="text-center">
                          <div className="text-headline-md font-bold text-primary-700">{prediction.probabilities.home}%</div>
                          <div className="text-caption-md text-neutral-600">Domicile</div>
                        </Card>
                        <Card variant="default" padding="sm" className="text-center">
                          <div className="text-headline-md font-bold text-neutral-700">{prediction.probabilities.draw}%</div>
                          <div className="text-caption-md text-neutral-600">Nul</div>
                        </Card>
                        <Card variant="gradient" padding="sm" className="text-center">
                          <div className="text-headline-md font-bold text-secondary-700">{prediction.probabilities.away}%</div>
                          <div className="text-caption-md text-neutral-600">Extérieur</div>
                        </Card>
                      </div>
                    </div>

                    {/* Prediction Premium */}
                    <div className="lg:col-span-3">
                      <div className="text-center space-y-2">
                        <div className="text-caption-lg text-neutral-600">Prédiction :</div>
                        <Badge variant="success" size="lg">
                          {getPredictionLabel(prediction.prediction)}
                        </Badge>
                        <div className="flex items-center justify-center text-caption-md text-neutral-500">
                          <MapPin className="w-3 h-3 mr-1" />
                          {prediction.venue}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to action Premium */}
        <Card variant="gradient" className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white text-center p-12">
          <h3 className="text-display-md font-black mb-6">Découvrez toutes nos prédictions</h3>
          <p className="text-body-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Accédez à l'ensemble de nos analyses détaillées et filtres avancés pour optimiser vos prédictions
          </p>
          <Link href="/predictions">
            <Button 
              variant="secondary"
              size="xl"
              leftIcon={<Eye className="w-5 h-5" />}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="shadow-2xl"
            >
              Voir toutes les prédictions
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}