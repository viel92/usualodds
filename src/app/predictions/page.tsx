'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button-premium'
import { Card, StatCard } from '@/components/ui/card-premium'
import { Badge, ConfidenceBadge, StatusBadge, TrendBadge } from '@/components/ui/badge-premium'
import { Spinner, Skeleton, Progress, PredictionCardSkeleton } from '@/components/ui/loading-states'
import { TrendingUp, Target, Zap, Users, RefreshCw, Calendar, MapPin, BarChart3, Eye, ArrowLeft, Filter, Search, Crown, Clock } from 'lucide-react'

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

  const getMatchStatus = (status: string): 'online' | 'offline' | 'loading' | 'error' | 'maintenance' => {
    switch (status) {
      case 'live': return 'online'
      case 'soon': return 'loading'
      default: return 'offline'
    }
  }

  const getPredictedWinner = (prediction: SimplePrediction) => {
    if (prediction.predictions.homeWin > prediction.predictions.awayWin && prediction.predictions.homeWin > prediction.predictions.draw) {
      return { team: prediction.homeTeam, type: 'home' }
    } else if (prediction.predictions.awayWin > prediction.predictions.draw) {
      return { team: prediction.awayTeam, type: 'away' }
    } else {
      return { team: 'Match Nul', type: 'draw' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* Header Skeleton */}
        <Card variant="elevated" className="rounded-none border-0 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>
        </Card>
        
        {/* Content Loading */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-4 w-24" />
              </Card>
            ))}
          </div>
          
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <PredictionCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card variant="elevated" className="text-center p-12 max-w-md">
          <div className="w-16 h-16 bg-error-50 text-error-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-8 h-8" />
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

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header Premium */}
      <Card variant="elevated" className="rounded-none border-0 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-display-lg font-black text-neutral-900">
                  Prédictions 
                  <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                    Temps Réel
                  </span>
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge variant="primary">
                    <Calendar className="w-3 h-3 mr-1" />
                    Saison 2025-26
                  </Badge>
                  <Badge variant="success" dot dotColor="bg-success-500">
                    {predictions.length} matchs prédits
                  </Badge>
                  <StatusBadge status="online" />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" leftIcon={<Filter className="w-4 h-4" />}>
                Filtres
              </Button>
              <Button variant="ghost" leftIcon={<Search className="w-4 h-4" />}>
                Recherche
              </Button>
              <Button
                onClick={loadPredictions}
                variant="primary"
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Premium */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Prédictions actives"
            value={predictions.length.toString()}
            icon={<Target className="w-5 h-5" />}
            trend="neutral"
          />
          <StatCard
            title="Haute confiance"
            value={predictions.filter(p => p.predictions.confidence >= 75).length.toString()}
            icon={<Crown className="w-5 h-5" />}
            trend="up"
          />
          <StatCard
            title="Favoris clairs"
            value={predictions.filter(p => Math.max(p.predictions.homeWin, p.predictions.draw, p.predictions.awayWin) >= 50).length.toString()}
            icon={<TrendingUp className="w-5 h-5" />}
            trend="up"
          />
          <StatCard
            title="Confiance moyenne"
            value={`${Math.round(predictions.reduce((sum, p) => sum + p.predictions.confidence, 0) / predictions.length)}%`}
            icon={<Zap className="w-5 h-5" />}
            trend="up"
          />
        </div>

        {/* Liste des prédictions Premium */}
        {predictions.length === 0 ? (
          <Card variant="elevated" className="text-center p-12">
            <div className="w-20 h-20 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <BarChart3 className="w-10 h-10" />
            </div>
            <h3 className="text-display-md font-black text-neutral-900 mb-4">Aucune prédiction disponible</h3>
            <p className="text-body-lg text-neutral-600 mb-8">Générez des prédictions depuis le dashboard</p>
            <Link href="/dashboard">
              <Button leftIcon={<TrendingUp className="w-4 h-4" />}>
                Aller au Dashboard
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {predictions.map((prediction) => {
              const winner = getPredictedWinner(prediction)
              return (
                <Card key={prediction.id} variant="elevated" interactive="hover" className="overflow-hidden">
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      {/* Info match Premium */}
                      <div className="lg:col-span-4">
                        <div className="flex items-center gap-3 mb-4">
                          <StatusBadge status={getMatchStatus(prediction.status)} />
                          <Badge variant="outline" size="sm">
                            Ligue 1
                          </Badge>
                          <Badge variant="secondary" size="sm">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(prediction.matchDate)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-center flex-1">
                            <div className="font-bold text-neutral-900 mb-2">{prediction.homeTeam}</div>
                            {winner.type === 'home' && (
                              <Badge variant="gold" size="sm">
                                <Crown className="w-3 h-3 mr-1" />
                                Favori
                              </Badge>
                            )}
                          </div>
                          <div className="text-center mx-6">
                            <div className="text-headline-lg font-black text-neutral-800">VS</div>
                          </div>
                          <div className="text-center flex-1">
                            <div className="font-bold text-neutral-900 mb-2">{prediction.awayTeam}</div>
                            {winner.type === 'away' && (
                              <Badge variant="gold" size="sm">
                                <Crown className="w-3 h-3 mr-1" />
                                Favori
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Prédictions 1X2 Premium */}
                      <div className="lg:col-span-5">
                        <div className="text-center mb-4">
                          <ConfidenceBadge confidence={prediction.predictions.confidence} />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <Card variant="gradient" padding="sm" className="text-center">
                            <div className="text-headline-md font-bold text-primary-700">
                              {prediction.predictions.homeWin}%
                            </div>
                            <div className="text-caption-md text-neutral-600">Victoire Dom.</div>
                            {winner.type === 'home' && (
                              <Crown className="w-4 h-4 text-warning-500 mx-auto mt-1" />
                            )}
                          </Card>
                          <Card variant="default" padding="sm" className="text-center">
                            <div className="text-headline-md font-bold text-neutral-700">
                              {prediction.predictions.draw}%
                            </div>
                            <div className="text-caption-md text-neutral-600">Match Nul</div>
                            {winner.type === 'draw' && (
                              <Crown className="w-4 h-4 text-warning-500 mx-auto mt-1" />
                            )}
                          </Card>
                          <Card variant="gradient" padding="sm" className="text-center">
                            <div className="text-headline-md font-bold text-secondary-700">
                              {prediction.predictions.awayWin}%
                            </div>
                            <div className="text-caption-md text-neutral-600">Victoire Ext.</div>
                            {winner.type === 'away' && (
                              <Crown className="w-4 h-4 text-warning-500 mx-auto mt-1" />
                            )}
                          </Card>
                        </div>
                      </div>

                      {/* Analyse Premium */}
                      <div className="lg:col-span-2">
                        <div className="space-y-3">
                          <div className="text-center">
                            <div className="text-caption-lg text-neutral-600 mb-1">Favori prédit:</div>
                            <Badge variant="success" size="lg">
                              {winner.team}
                            </Badge>
                          </div>
                          
                          {prediction.predictions.confidence >= 75 && (
                            <div className="text-center">
                              <Badge variant="success" size="sm">
                                <Target className="w-3 h-3 mr-1" />
                                Haute confiance
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions Premium */}
                      <div className="lg:col-span-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          leftIcon={<Eye className="w-4 h-4" />}
                          className="w-full"
                        >
                          Détails
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}