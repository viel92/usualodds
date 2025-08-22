/**
 * API Health Check - USUALODDS
 * ============================
 * 
 * Endpoint dédié pour le monitoring et les health checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { PredictionsCache } from '@/lib/cache-manager';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  uptime_ms: number;
  checks: {
    database: DatabaseHealth;
    cache: CacheHealth;
    api: ApiHealth;
    system: SystemHealth;
  };
}

interface DatabaseHealth {
  status: 'healthy' | 'error';
  latency_ms: number;
  tables_accessible: string[];
  error?: string;
}

interface CacheHealth {
  status: 'healthy' | 'degraded';
  total_items: number;
  valid_items: number;
  expired_items: number;
  hit_rate_percent: number;
  memory_efficient: boolean;
}

interface ApiHealth {
  status: 'healthy';
  endpoints: string[];
  cache_ttl_hours: number;
  features_enabled: string[];
}

interface SystemHealth {
  status: 'healthy' | 'degraded';
  memory_usage_mb: number;
  nodejs_version: string;
  environment: string;
}

const startTime = Date.now();

/**
 * GET /api/health
 * Retourne l'état de santé complet du système
 */
export async function GET(request: NextRequest): Promise<NextResponse<HealthCheckResult>> {
  const healthCheck: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime_ms: Date.now() - startTime,
    checks: {
      database: await checkDatabase(),
      cache: checkCache(),
      api: checkApi(),
      system: checkSystem()
    }
  };

  // Déterminer le statut global
  const checks = Object.values(healthCheck.checks);
  const hasError = checks.some(check => check.status === 'error');
  const hasDegraded = checks.some(check => check.status === 'degraded');

  if (hasError) {
    healthCheck.status = 'error';
  } else if (hasDegraded) {
    healthCheck.status = 'degraded';
  }

  const httpStatus = healthCheck.status === 'healthy' ? 200 : 
                     healthCheck.status === 'degraded' ? 200 : 503;

  return NextResponse.json(healthCheck, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Vérification de la base de données
 */
async function checkDatabase(): Promise<DatabaseHealth> {
  try {
    const supabase = createAdminClient();
    
    // Test de latence
    const start = Date.now();
    const { error: matchesError } = await supabase
      .from('matches')
      .select('id')
      .limit(1);
    const latency = Date.now() - start;

    // Test des tables critiques
    const criticalTables = ['matches', 'team_features', 'match_statistics'];
    const accessibleTables: string[] = [];

    for (const table of criticalTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error) {
          accessibleTables.push(table);
        }
      } catch (e) {
        // Table non accessible
      }
    }

    return {
      status: matchesError ? 'error' : 'healthy',
      latency_ms: latency,
      tables_accessible: accessibleTables,
      error: matchesError?.message
    };

  } catch (error) {
    return {
      status: 'error',
      latency_ms: -1,
      tables_accessible: [],
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

/**
 * Vérification du cache
 */
function checkCache(): CacheHealth {
  const stats = PredictionsCache.getStats();
  const cleaned = PredictionsCache.cleanup();
  
  const hitRate = Math.round(stats.hitRate * 100);
  const memoryEfficient = stats.total < 1000; // Moins de 1000 items en cache
  
  return {
    status: hitRate > 50 ? 'healthy' : 'degraded',
    total_items: stats.total,
    valid_items: stats.valid,
    expired_items: stats.expired + cleaned,
    hit_rate_percent: hitRate,
    memory_efficient: memoryEfficient
  };
}

/**
 * Vérification de l'API
 */
function checkApi(): ApiHealth {
  return {
    status: 'healthy',
    endpoints: [
      '/api/predictions',
      '/api/predictions/live',
      '/api/predictions/upcoming',
      '/api/health'
    ],
    cache_ttl_hours: 2,
    features_enabled: [
      'unified_cache',
      'pagination',
      'deterministic_predictions',
      'health_checks'
    ]
  };
}

/**
 * Vérification du système
 */
function checkSystem(): SystemHealth {
  const memoryUsage = process.memoryUsage();
  const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  
  return {
    status: memoryMB < 512 ? 'healthy' : 'degraded', // Alerte si > 512MB
    memory_usage_mb: memoryMB,
    nodejs_version: process.version,
    environment: process.env.NODE_ENV || 'development'
  };
}

/**
 * HEAD /api/health
 * Health check rapide (sans détails)
 */
export async function HEAD(): Promise<NextResponse> {
  try {
    // Test rapide BDD
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('matches')
      .select('id')
      .limit(1);

    const status = error ? 503 : 200;
    
    return new NextResponse(null, {
      status,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Health-Status': error ? 'error' : 'healthy'
      }
    });

  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Health-Status': 'error'
      }
    });
  }
}