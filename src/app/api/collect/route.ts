// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { CollectionOrchestrator } from '@/lib/collectors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, seasons, window } = body;

    const orchestrator = new CollectionOrchestrator();

    console.log(`[API] Starting collection action: ${action}`);

    switch (action) {
      case 'initialize':
        console.log('[API] Initializing database...');
        await orchestrator.initializeDatabase();
        return NextResponse.json({ 
          success: true, 
          message: 'Database initialization completed',
          timestamp: new Date().toISOString()
        });

      case 'daily':
        console.log('[API] Collecting daily data...');
        await orchestrator.collectDailyData();
        return NextResponse.json({ 
          success: true, 
          message: 'Daily data collection completed',
          timestamp: new Date().toISOString()
        });

      case 'historical':
        if (!seasons || !Array.isArray(seasons)) {
          return NextResponse.json(
            { error: 'Seasons array is required for historical collection' },
            { status: 400 }
          );
        }
        console.log(`[API] Collecting historical data for seasons: ${seasons.join(', ')}`);
        await orchestrator.collectHistoricalData(seasons);
        return NextResponse.json({ 
          success: true, 
          message: `Historical data collection completed for seasons: ${seasons.join(', ')}`,
          seasons: seasons,
          timestamp: new Date().toISOString()
        });

      case 'odds':
        console.log('[API] Collecting odds updates...');
        await orchestrator.collectOddsUpdates();
        return NextResponse.json({ 
          success: true, 
          message: 'Odds updates collection completed',
          timestamp: new Date().toISOString()
        });

      case 'enhanced_daily':
        console.log('[API] Running enhanced daily pipeline...');
        // Enhanced pipeline: daily + odds + basic features calculation
        await orchestrator.collectDailyData();
        await orchestrator.collectOddsUpdates();
        
        return NextResponse.json({ 
          success: true, 
          message: 'Enhanced daily pipeline completed',
          components: ['fixtures', 'odds', 'basic_features'],
          timestamp: new Date().toISOString()
        });

      case 'status':
        // Return system status
        return NextResponse.json({
          success: true,
          status: 'active',
          available_actions: [
            'initialize', 
            'daily', 
            'historical', 
            'odds', 
            'enhanced_daily',
            'status'
          ],
          system_info: {
            architecture: 'TypeScript Collectors',
            version: 'MVP.1',
            last_updated: new Date().toISOString()
          }
        });

      default:
        return NextResponse.json(
          { 
            error: `Unknown action: ${action}`,
            available_actions: ['initialize', 'daily', 'historical', 'odds', 'enhanced_daily', 'status']
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[API] Collection error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during collection',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'UsualOdds Collection API',
    version: 'MVP.1',
    available_methods: ['POST'],
    actions: {
      initialize: 'Initialize database with leagues, teams, and players',
      daily: 'Collect daily fixtures and basic odds',
      historical: 'Collect historical data for specified seasons',
      odds: 'Update odds for multiple time windows',
      enhanced_daily: 'Complete daily pipeline with odds and features',
      status: 'Get system status and available actions'
    },
    usage: {
      method: 'POST',
      body: {
        action: 'string (required)',
        seasons: 'array (for historical action)',
        window: 'string (for specific odds windows)'
      }
    },
    timestamp: new Date().toISOString()
  });
}