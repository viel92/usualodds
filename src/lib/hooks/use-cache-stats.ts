'use client'

import { useQuery } from '@tanstack/react-query'
import { PredictionsCache } from '@/lib/cache-manager'

/**
 * Hook pour monitorer les stats du cache
 */
export function useCacheStats() {
  return useQuery({
    queryKey: ['cache-stats'],
    queryFn: () => {
      const stats = PredictionsCache.getStats();
      return {
        ...stats,
        lastUpdate: new Date().toISOString()
      };
    },
    refetchInterval: 30000, // Refresh toutes les 30s
    staleTime: 0 // Toujours fresh
  });
}

/**
 * Hook pour forcer le nettoyage du cache
 */
export function useCacheCleanup() {
  return {
    cleanup: () => {
      const cleaned = PredictionsCache.cleanup();
      console.log(`Cache cleanup: ${cleaned} items supprimés`);
      return cleaned;
    },
    clear: () => {
      PredictionsCache.clear();
      console.log('Cache complètement vidé');
    },
    invalidatePattern: (pattern: string) => {
      const deleted = PredictionsCache.invalidate(pattern);
      console.log(`Pattern ${pattern}: ${deleted} items supprimés`);
      return deleted;
    }
  };
}