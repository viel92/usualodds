/**
 * API SYNC FOOTBALL DATA - USUALODDS
 * ===================================
 * 
 * Remplace l'ancien /api/collect désactivé
 * Active les collectors TypeScript pour alimenter la BDD
 */

import { NextRequest, NextResponse } from 'next/server';
import { FixturesCollector } from '@/lib/collectors/fixtures-collector';
import { TeamsCollector } from '@/lib/collectors/teams-collector';

interface SyncResponse {
  success: boolean;
  data?: {
    fixtures: number;
    teams: number;
    duration: number;
  };
  error?: string;
  timestamp: string;
}

/**
 * POST /api/sync - Lance la synchronisation des données football
 */
export async function POST(request: NextRequest): Promise<NextResponse<SyncResponse>> {
  const startTime = Date.now();
  
  try {
    console.log('🚀 SYNC FOOTBALL DATA - Démarrage');
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('days') || '30');
    const forceSync = searchParams.get('force') === 'true';
    
    console.log(`📅 Synchronisation pour les prochains ${daysAhead} jours`);
    console.log(`🔄 Force sync: ${forceSync}`);
    
    let fixturesCount = 0;
    let teamsCount = 0;
    
    try {
      // 1. SYNC TEAMS (prérequis pour fixtures)
      console.log('👥 Synchronisation équipes...');
      const teamsCollector = new TeamsCollector();
      await teamsCollector.collect();
      teamsCount = 1; // approximatif, collector ne retourne pas count
      
      // 2. SYNC FIXTURES  
      console.log('⚽ Synchronisation matches...');
      const fixturesCollector = new FixturesCollector();
      
      // Dates pour sync
      const dateFrom = new Date().toISOString().split('T')[0];
      const dateTo = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      await fixturesCollector.collect(dateFrom, dateTo);
      fixturesCount = 1; // approximatif, collector ne retourne pas count exact
      
    } catch (collectorError) {
      console.error('❌ Erreur collectors:', collectorError);
      throw collectorError;
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ SYNC TERMINÉ en ${duration}ms`);
    console.log(`📊 Fixtures: ~${fixturesCount}, Teams: ~${teamsCount}`);
    
    return NextResponse.json({
      success: true,
      data: {
        fixtures: fixturesCount,
        teams: teamsCount,
        duration
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('❌ ERREUR SYNC:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET /api/sync - Statut de la synchronisation
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'UsualOdds Football Data Sync API',
    version: '1.0.0',
    endpoints: {
      'POST /api/sync': 'Lance synchronisation complète',
      'POST /api/sync?days=7': 'Sync pour 7 jours',
      'POST /api/sync?force=true': 'Force la resynchronisation'
    },
    status: 'active',
    timestamp: new Date().toISOString()
  });
}