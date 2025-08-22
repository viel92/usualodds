'use client'

import { Button } from '@/components/ui/button-premium'
import { Card, StatCard } from '@/components/ui/card-premium'
import { Badge, ConfidenceBadge, StatusBadge, TrendBadge } from '@/components/ui/badge-premium'
import { Spinner, Skeleton, Progress, PredictionCardSkeleton } from '@/components/ui/loading-states'
import { TrendingUp, Target, Zap, Users } from 'lucide-react'

/**
 * SHOWCASE DES COMPOSANTS PREMIUM
 * =============================
 * Démonstration de tous les composants UI premium créés
 * Pour tester le design system complet
 */

export default function ComponentsShowcase() {
  return (
    <div className="container-custom py-8 space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-display-lg font-black">
          Design System 
          <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Premium
          </span>
        </h1>
        <p className="text-body-lg text-neutral-600 max-w-2xl mx-auto">
          Découvrez tous les composants UI sophistiqués créés pour UsualOdds SaaS
        </p>
      </div>

      {/* Buttons Section */}
      <Card>
        <div className="p-6">
          <h2 className="text-headline-lg font-bold mb-6">Système de Boutons</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link Style</Button>
            <Button variant="outline">Outline</Button>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra Large</Button>
          </div>
          
          <div className="flex items-center gap-4">
            <Button loading>Loading...</Button>
            <Button leftIcon={<Target className="w-4 h-4" />}>With Icon</Button>
            <Button rightIcon={<TrendingUp className="w-4 h-4" />}>Right Icon</Button>
          </div>
        </div>
      </Card>

      {/* Cards Section */}
      <Card>
        <div className="p-6">
          <h2 className="text-headline-lg font-bold mb-6">Système de Cartes</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card variant="default" padding="md">
              <h3 className="font-semibold mb-2">Default</h3>
              <p className="text-sm text-neutral-600">Style standard propre</p>
            </Card>
            
            <Card variant="elevated" padding="md" interactive="hover">
              <h3 className="font-semibold mb-2">Elevated</h3>
              <p className="text-sm text-neutral-600">Plus de profondeur</p>
            </Card>
            
            <Card variant="gradient" padding="md" interactive="subtle">
              <h3 className="font-semibold mb-2">Gradient</h3>
              <p className="text-sm text-neutral-600">Fond dégradé subtil</p>
            </Card>
            
            <Card variant="glass" padding="md" interactive="glow">
              <h3 className="font-semibold mb-2">Glass</h3>
              <p className="text-sm text-neutral-600">Effet glassmorphism</p>
            </Card>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <Card>
        <div className="p-6">
          <h2 className="text-headline-lg font-bold mb-6">Cartes Statistiques</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Précision ML"
              value="54.2%"
              change="+2.3%"
              trend="up"
              icon={<Target className="w-5 h-5" />}
            />
            
            <StatCard
              title="Prédictions"
              value="1,760"
              change="+180"
              trend="up"
              icon={<Zap className="w-5 h-5" />}
            />
            
            <StatCard
              title="Utilisateurs"
              value="842"
              change="-12"
              trend="down"
              icon={<Users className="w-5 h-5" />}
            />
            
            <StatCard
              title="Confiance Avg"
              value="73%"
              change="stable"
              trend="neutral"
              icon={<TrendingUp className="w-5 h-5" />}
            />
          </div>
        </div>
      </Card>

      {/* Badges Section */}
      <Card>
        <div className="p-6">
          <h2 className="text-headline-lg font-bold mb-6">Système de Badges</h2>
          
          <div className="space-y-6">
            {/* Standard badges */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Badges Standard</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="primary">Primary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="gradient">Gradient</Badge>
                <Badge variant="gold">Premium</Badge>
              </div>
            </div>
            
            {/* Confidence badges */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Badges Confiance</h3>
              <div className="flex flex-wrap gap-2">
                <ConfidenceBadge confidence={95} />
                <ConfidenceBadge confidence={76} />
                <ConfidenceBadge confidence={42} />
                <ConfidenceBadge confidence={88} showPercentage={false} />
              </div>
            </div>
            
            {/* Status badges */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Badges Status</h3>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="online" />
                <StatusBadge status="offline" />
                <StatusBadge status="loading" />
                <StatusBadge status="error" />
                <StatusBadge status="maintenance" />
              </div>
            </div>
            
            {/* Trend badges */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Badges Tendance</h3>
              <div className="flex flex-wrap gap-2">
                <TrendBadge trend="up" value="+12.5%" />
                <TrendBadge trend="down" value="-3.2%" />
                <TrendBadge trend="neutral" value="stable" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Loading States */}
      <Card>
        <div className="p-6">
          <h2 className="text-headline-lg font-bold mb-6">États de Chargement</h2>
          
          <div className="space-y-6">
            {/* Spinners */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Spinners</h3>
              <div className="flex items-center gap-4">
                <Spinner size="xs" />
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
                <Spinner size="xl" variant="success" />
                <Spinner size="md" variant="warning" />
              </div>
            </div>
            
            {/* Progress bars */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Barres de Progression</h3>
              <div className="space-y-4 max-w-md">
                <Progress value={25} variant="primary" showValue />
                <Progress value={60} variant="success" />
                <Progress value={85} variant="warning" size="lg" animated />
              </div>
            </div>
            
            {/* Skeletons */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Skeletons</h3>
              <div className="space-y-4 max-w-md">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton lines={3} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Prediction Card Skeleton */}
      <Card>
        <div className="p-6">
          <h2 className="text-headline-lg font-bold mb-6">Skeleton de Carte Prédiction</h2>
          <PredictionCardSkeleton />
        </div>
      </Card>

      {/* Typography */}
      <Card>
        <div className="p-6">
          <h2 className="text-headline-lg font-bold mb-6">Système Typographique</h2>
          
          <div className="space-y-4">
            <div className="text-display-lg">Display Large - Titres principaux</div>
            <div className="text-display-md">Display Medium - Sous-titres importants</div>
            <div className="text-headline-lg">Headline Large - Titres de section</div>
            <div className="text-headline-md">Headline Medium - Sous-titres</div>
            <div className="text-body-lg">Body Large - Texte principal plus grand</div>
            <div className="text-body-md">Body Medium - Texte principal standard</div>
            <div className="text-caption-lg">Caption Large - Légendes importantes</div>
            <div className="text-caption-md">Caption Medium - Petites annotations</div>
          </div>
        </div>
      </Card>

    </div>
  )
}