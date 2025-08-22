'use client'

import { Suspense, lazy } from 'react'
import { Skeleton } from '@/components/ui/loading-states'

// Lazy load du composant stats lourd
const StatsGrid = lazy(() => import('./stats-grid'))

// Skeleton pour les stats
const StatsGridSkeleton = () => (
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
)

export function LazyStatsGrid({ data }: { data: any }) {
  return (
    <Suspense fallback={<StatsGridSkeleton />}>
      <StatsGrid data={data} />
    </Suspense>
  )
}