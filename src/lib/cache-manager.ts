/**
 * Gestionnaire de cache unifié pour les prédictions
 * Synchronise les TTL entre l'API Next.js et les hooks React Query
 */

// Configuration cache centralisée
export const CACHE_CONFIG = {
  // TTL unifié à 2 heures pour prédictions
  PREDICTIONS_TTL: 2 * 60 * 60 * 1000, // 2h en ms
  PREDICTIONS_STALE_TIME: 2 * 60 * 60 * 1000, // 2h en ms (React Query)
  PREDICTIONS_GC_TIME: 4 * 60 * 60 * 1000, // 4h en ms (garbage collection)
  
  // Headers HTTP Cache
  CACHE_CONTROL_HEADER: 'public, max-age=7200, s-maxage=7200', // 2h en secondes
  
  // Clés de cache standardisées
  CACHE_KEYS: {
    PREDICTIONS: 'predictions',
    PREDICTIONS_LIVE: 'predictions_live', 
    PREDICTIONS_UPCOMING: 'predictions_upcoming',
    STATS: 'stats',
    DASHBOARD: 'dashboard'
  }
} as const;

/**
 * Interface pour les objets cachés
 */
interface CachedItem<T> {
  data: T;
  timestamp: number;
  expires: number;
  key: string;
}

/**
 * Cache manager central
 */
export class PredictionsCache {
  private static cache = new Map<string, CachedItem<any>>();
  
  /**
   * Génère une clé de cache standardisée
   */
  static generateKey(baseKey: string, params?: Record<string, any>): string {
    if (!params) return baseKey;
    
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `${baseKey}:${sortedParams}`;
  }
  
  /**
   * Récupère un item du cache
   */
  static get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Vérifier expiration
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  /**
   * Met un item en cache
   */
  static set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.PREDICTIONS_TTL): void {
    const now = Date.now();
    const item: CachedItem<T> = {
      data,
      timestamp: now,
      expires: now + ttl,
      key
    };
    
    this.cache.set(key, item);
  }
  
  /**
   * Invalide une clé ou un pattern
   */
  static invalidate(keyOrPattern: string): number {
    let deleted = 0;
    
    if (keyOrPattern.includes('*')) {
      // Pattern matching
      const pattern = keyOrPattern.replace('*', '.*');
      const regex = new RegExp(`^${pattern}$`);
      
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
          deleted++;
        }
      }
    } else {
      // Clé exacte
      if (this.cache.delete(keyOrPattern)) {
        deleted = 1;
      }
    }
    
    return deleted;
  }
  
  /**
   * Nettoie les items expirés
   */
  static cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
  
  /**
   * Statistiques du cache
   */
  static getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;
    
    for (const [, item] of this.cache) {
      if (now > item.expires) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return {
      total: this.cache.size,
      valid,
      expired,
      hitRate: valid / (valid + expired) || 0
    };
  }
  
  /**
   * Vide complètement le cache
   */
  static clear(): void {
    this.cache.clear();
  }
}

/**
 * Utilitaires pour les headers HTTP
 */
export class CacheHeaders {
  /**
   * Génère les headers de cache pour les réponses API
   */
  static getHeaders(ttlSeconds?: number): Record<string, string> {
    const ttl = ttlSeconds || (CACHE_CONFIG.PREDICTIONS_TTL / 1000);
    
    return {
      'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}`,
      'Expires': new Date(Date.now() + (ttl * 1000)).toUTCString(),
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${Date.now()}"`,
      'Vary': 'Accept-Encoding'
    };
  }
  
  /**
   * Headers pour invalidation de cache
   */
  static getNoCache(): Record<string, string> {
    return {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }
}

/**
 * Hook helper pour React Query avec config unifiée
 */
export const getCacheQueryConfig = (key: string, customTTL?: number) => ({
  staleTime: customTTL || CACHE_CONFIG.PREDICTIONS_STALE_TIME,
  gcTime: CACHE_CONFIG.PREDICTIONS_GC_TIME,
  queryKey: [key],
});

/**
 * Démarrage automatique du cleanup
 */
if (typeof window === 'undefined') {
  // Côté serveur - cleanup toutes les heures
  setInterval(() => {
    const cleaned = PredictionsCache.cleanup();
    if (cleaned > 0) {
      console.log(`Cache cleanup: ${cleaned} items expirés supprimés`);
    }
  }, 60 * 60 * 1000); // 1 heure
}