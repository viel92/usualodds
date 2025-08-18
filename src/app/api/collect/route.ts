import { NextRequest, NextResponse } from 'next/server';
import { CollectionOrchestrator } from '@/lib/collectors';
import { enhancedOrchestrator } from '@/lib/features/enhanced-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();
    const orchestrator = new CollectionOrchestrator();

    switch (action) {
      case 'initialize':
        await orchestrator.initializeDatabase();
        return NextResponse.json({ 
          success: true, 
          message: 'Database initialization completed' 
        });

      case 'daily':
        await orchestrator.collectDailyData();
        return NextResponse.json({ 
          success: true, 
          message: 'Daily data collection completed' 
        });

      case 'odds':
        await orchestrator.collectOddsUpdates();
        return NextResponse.json({ 
          success: true, 
          message: 'Odds updates collection completed' 
        });

      case 'historical':
        const seasons = params.seasons || [
          new Date().getFullYear() - 4,
          new Date().getFullYear() - 3,
          new Date().getFullYear() - 2,
          new Date().getFullYear() - 1,
          new Date().getFullYear()
        ].map(year => year.toString());
        
        await orchestrator.collectHistoricalData(seasons);
        return NextResponse.json({ 
          success: true, 
          message: `Historical data collection completed for seasons: ${seasons.join(', ')}` 
        });

      case 'enhanced_daily':
        const dailyResults = await enhancedOrchestrator.executeDailyEnhancedPipeline();
        const totalCollections = Object.values(dailyResults).reduce((sum, result) => {
          return sum + Object.values(result.collections).reduce((s, c) => s + (c || 0), 0);
        }, 0);
        return NextResponse.json({
          success: true,
          message: `Enhanced daily pipeline completed: ${totalCollections} total collections`,
          results: dailyResults
        });

      case 'nightly_enrichment':
        await enhancedOrchestrator.executeNightlyEnrichmentPipeline();
        return NextResponse.json({
          success: true,
          message: 'Nightly enrichment pipeline completed'
        });

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action. Use: initialize, daily, odds, historical, enhanced_daily, or nightly_enrichment' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Collection API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoints: {
      'POST /api/collect': {
        description: 'Trigger data collection',
        actions: {
          initialize: 'Initialize database with leagues, teams, and players',
          daily: 'Collect daily fixtures and odds',
          odds: 'Update odds for different time windows',
          historical: 'Collect historical data for multiple seasons',
          enhanced_daily: 'Execute enhanced pipeline with weather, lineups, and context',
          nightly_enrichment: 'Execute nightly batch enrichment (2h-5h optimal)'
        },
        example: {
          action: 'initialize'
        }
      }
    }
  });
}