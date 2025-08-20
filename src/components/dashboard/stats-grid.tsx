'use client'

import { StatCard } from '@/components/ui/card-premium'
import { Target, TrendingUp, Zap } from 'lucide-react'

interface StatsGridProps {
  data: {
    meta: {
      avgConfidence: number
      modelAccuracy: string
      generated: number
    }
  }
}

export default function StatsGrid({ data }: StatsGridProps) {
  const { meta } = data

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Précision ML */}
      <StatCard
        title="Précision ML"
        value={meta.modelAccuracy}
        change="+2.3%"
        trend="up"
        icon={<Target className="w-5 h-5" />}
        color="primary"
      />

      {/* Confiance Moyenne */}
      <StatCard
        title="Confiance Moyenne"
        value={`${Math.round(meta.avgConfidence)}%`}
        change="+5.1%"
        trend="up"
        icon={<TrendingUp className="w-5 h-5" />}
        color="success"
      />

      {/* Prédictions Générées */}
      <StatCard
        title="Prédictions"
        value={meta.generated.toString()}
        change="Temps réel"
        trend="neutral"
        icon={<Zap className="w-5 h-5" />}
        color="warning"
      />
    </div>
  )
}