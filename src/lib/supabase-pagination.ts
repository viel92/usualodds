/**
 * Utilitaires de pagination Supabase
 * Gère automatiquement la limite de 1000 records par requête
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface PaginationOptions {
  batchSize?: number; // Taille des batches (max 1000)
  maxRecords?: number; // Limite totale de records à récupérer
  orderBy?: string; // Colonne de tri
  ascending?: boolean; // Ordre croissant/décroissant
}

export interface PaginatedResult<T> {
  data: T[];
  totalRecords: number;
  batches: number;
  hasMore: boolean;
}

/**
 * Récupère tous les records d'une table en gérant la pagination automatiquement
 */
export async function getAllRecords<T>(
  supabase: SupabaseClient,
  tableName: string,
  selectQuery: string = '*',
  filterCallback?: (query: any) => any,
  options: PaginationOptions = {}
): Promise<PaginatedResult<T>> {
  const {
    batchSize = 1000,
    maxRecords = 10000,
    orderBy = 'created_at',
    ascending = true
  } = options;

  // Validation taille batch
  if (batchSize > 1000) {
    throw new Error('Batch size cannot exceed 1000 (Supabase limit)');
  }

  let allRecords: T[] = [];
  let currentOffset = 0;
  let hasMore = true;
  let batchCount = 0;

  console.log(`🔄 Pagination ${tableName}: démarrage (batch size: ${batchSize})`);

  while (hasMore && allRecords.length < maxRecords) {
    try {
      // Construire la requête de base
      let query = supabase
        .from(tableName)
        .select(selectQuery)
        .range(currentOffset, currentOffset + batchSize - 1);

      // Appliquer le tri
      if (orderBy) {
        query = query.order(orderBy, { ascending });
      }

      // Appliquer les filtres personnalisés
      if (filterCallback) {
        query = filterCallback(query);
      }

      // Exécuter la requête
      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Erreur pagination ${tableName}: ${error.message}`);
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      // Ajouter les données (respecter maxRecords)
      const recordsToAdd = data.slice(0, maxRecords - allRecords.length);
      allRecords.push(...recordsToAdd as T[]);
      batchCount++;

      console.log(`  Batch ${batchCount}: ${recordsToAdd.length} records (total: ${allRecords.length})`);

      // Vérifier si on a atteint la fin ou la limite
      hasMore = data.length === batchSize && allRecords.length < maxRecords;
      currentOffset += batchSize;

      // Petit délai entre les batches pour éviter le rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(`❌ Erreur batch ${batchCount + 1}:`, error);
      throw error;
    }
  }

  console.log(`✅ Pagination ${tableName} terminée: ${allRecords.length} records en ${batchCount} batches`);

  return {
    data: allRecords,
    totalRecords: allRecords.length,
    batches: batchCount,
    hasMore: allRecords.length >= maxRecords
  };
}

/**
 * Récupère les matches à venir avec pagination automatique
 */
export async function getUpcomingMatchesPaginated(
  supabase: SupabaseClient,
  limit: number = 50
): Promise<PaginatedResult<any>> {
  const now = new Date().toISOString();
  
  return getAllRecords(
    supabase,
    'matches',
    `
      id,
      home_team_name,
      away_team_name,
      date,
      venue_name,
      season,
      home_team_id,
      away_team_id,
      status
    `,
    (query) => query
      .is('home_score', null)
      .is('away_score', null)
      .gte('date', now),
    {
      batchSize: 1000,
      maxRecords: limit,
      orderBy: 'date',
      ascending: true
    }
  );
}

/**
 * Récupère les matches récents avec résultats avec pagination
 */
export async function getRecentFinishedMatchesPaginated(
  supabase: SupabaseClient,
  daysSince: number = 7
): Promise<PaginatedResult<any>> {
  const since = new Date(Date.now() - daysSince * 24 * 60 * 60 * 1000).toISOString();
  
  return getAllRecords(
    supabase,
    'matches',
    'id, home_score, away_score, date, status, home_team_id, away_team_id',
    (query) => query
      .eq('status', 'Match Finished')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)
      .gte('date', since),
    {
      batchSize: 1000,
      maxRecords: 5000, // Limiter pour éviter surcharge
      orderBy: 'date',
      ascending: false
    }
  );
}

/**
 * Récupère les team features avec pagination
 */
export async function getTeamFeaturesPaginated(
  supabase: SupabaseClient,
  season?: number
): Promise<PaginatedResult<any>> {
  return getAllRecords(
    supabase,
    'team_features',
    '*',
    (query) => {
      if (season) {
        return query.eq('season', season);
      }
      return query;
    },
    {
      batchSize: 1000,
      maxRecords: 10000,
      orderBy: 'team_id',
      ascending: true
    }
  );
}

/**
 * Wrapper pour requêtes simples avec fallback pagination
 */
export async function safeQuery<T>(
  supabase: SupabaseClient,
  tableName: string,
  selectQuery: string,
  filterCallback?: (query: any) => any,
  fallbackToPagination: boolean = true
): Promise<T[]> {
  try {
    // Essayer requête simple d'abord
    let query = supabase.from(tableName).select(selectQuery);
    
    if (filterCallback) {
      query = filterCallback(query);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data as T[] || [];
    
  } catch (error: any) {
    // Si erreur liée à la limite, essayer pagination
    if (fallbackToPagination && (
      error.message?.includes('too many') || 
      error.message?.includes('limit') ||
      error.message?.includes('1000')
    )) {
      console.warn(`⚠️ Limite atteinte pour ${tableName}, basculement vers pagination`);
      
      const result = await getAllRecords<T>(
        supabase,
        tableName,
        selectQuery,
        filterCallback
      );
      
      return result.data;
    }
    
    throw error;
  }
}