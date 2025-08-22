'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useCallback } from 'react'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'error'
  timestamp: string
  version: string
  uptime_ms: number
  checks: {
    database: {
      status: 'healthy' | 'error'
      latency_ms: number
      tables_accessible: string[]
      error?: string
    }
    cache: {
      status: 'healthy' | 'degraded'
      total_items: number
      hit_rate_percent: number
      memory_efficient: boolean
    }
    api: {
      status: 'healthy'
      cache_ttl_hours: number
      features_enabled: string[]
    }
    system: {
      status: 'healthy' | 'degraded'
      memory_usage_mb: number
      nodejs_version: string
    }
  }
}

/**
 * Hook pour surveiller la santé de l'API
 */
export function useHealthMonitor(intervalMs: number = 30000) {
  const [lastAlert, setLastAlert] = useState<string | null>(null)

  const {
    data: health,
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['health-status'],
    queryFn: async (): Promise<HealthStatus> => {
      const response = await fetch('/api/health')
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      return response.json()
    },
    refetchInterval: intervalMs,
    staleTime: 0, // Toujours fresh
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  // Alertes automatiques
  const checkAlerts = useCallback(() => {
    if (!health) return

    const now = new Date().toISOString()
    
    // Alerte base de données
    if (health.checks.database.status === 'error') {
      const alert = `Database error: ${health.checks.database.error}`
      if (alert !== lastAlert) {
        console.error('🚨 HEALTH ALERT:', alert)
        setLastAlert(alert)
      }
    }
    
    // Alerte latence
    else if (health.checks.database.latency_ms > 2000) {
      const alert = `High database latency: ${health.checks.database.latency_ms}ms`
      if (alert !== lastAlert) {
        console.warn('⚠️ PERFORMANCE ALERT:', alert)
        setLastAlert(alert)
      }
    }
    
    // Alerte mémoire
    else if (health.checks.system.memory_usage_mb > 512) {
      const alert = `High memory usage: ${health.checks.system.memory_usage_mb}MB`
      if (alert !== lastAlert) {
        console.warn('⚠️ MEMORY ALERT:', alert)
        setLastAlert(alert)
      }
    }
    
    // Cache dégradé
    else if (health.checks.cache.hit_rate_percent < 50) {
      const alert = `Low cache hit rate: ${health.checks.cache.hit_rate_percent}%`
      if (alert !== lastAlert) {
        console.warn('⚠️ CACHE ALERT:', alert)
        setLastAlert(alert)
      }
    }
    
    // Reset alerte si tout va bien
    else if (health.status === 'healthy' && lastAlert) {
      console.log('✅ Health alerts cleared')
      setLastAlert(null)
    }
  }, [health, lastAlert])

  // Vérifier les alertes à chaque mise à jour
  if (health) {
    checkAlerts()
  }

  const isHealthy = health?.status === 'healthy'
  const isDegraded = health?.status === 'degraded'
  const hasError = health?.status === 'error' || error !== null

  return {
    health,
    error,
    isLoading,
    isHealthy,
    isDegraded,
    hasError,
    lastAlert,
    refetch,
    
    // Métriques utiles
    metrics: health ? {
      uptime: {
        hours: Math.round(health.uptime_ms / (1000 * 60 * 60)),
        minutes: Math.round((health.uptime_ms % (1000 * 60 * 60)) / (1000 * 60))
      },
      database: {
        latency: health.checks.database.latency_ms,
        tablesOk: health.checks.database.tables_accessible.length
      },
      cache: {
        hitRate: health.checks.cache.hit_rate_percent,
        items: health.checks.cache.total_items
      },
      system: {
        memory: health.checks.system.memory_usage_mb,
        nodeVersion: health.checks.system.nodejs_version
      }
    } : null
  }
}

/**
 * Hook léger pour vérifier juste si l'API est en vie
 */
export function useQuickHealthCheck() {
  return useQuery({
    queryKey: ['quick-health'],
    queryFn: async () => {
      const response = await fetch('/api/health', { method: 'HEAD' })
      return {
        alive: response.ok,
        status: response.status,
        timestamp: new Date().toISOString()
      }
    },
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 secondes
    retry: 1
  })
}