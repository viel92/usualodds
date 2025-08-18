import { NextRequest, NextResponse } from 'next/server';
import { enhancedOrchestrator } from '@/lib/features/enhanced-orchestrator';
import { WindowType } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const { action, window, config } = await request.json();

    switch (action) {
      case 'execute_pipeline':
        if (!window) {
          return NextResponse.json({
            success: false,
            error: 'Window parameter required (T24, T6, T1, T30)'
          }, { status: 400 });
        }

        const result = await enhancedOrchestrator.executeEnhancedPipeline(
          window as WindowType,
          config || { weather: true, lineups: true, context: true, validate: true }
        );

        return NextResponse.json({
          success: true,
          message: `Enhanced pipeline completed for window ${window}`,
          result
        });

      case 'execute_daily':
        const dailyResults = await enhancedOrchestrator.executeDailyEnhancedPipeline();
        const totalCollections = Object.values(dailyResults).reduce((sum, result) => {
          return sum + Object.values(result.collections).reduce((s, c) => s + (c || 0), 0);
        }, 0);
        const totalErrors = Object.values(dailyResults).reduce((sum, result) => sum + result.errors.length, 0);

        return NextResponse.json({
          success: true,
          message: `Enhanced daily pipeline completed: ${totalCollections} collections, ${totalErrors} errors`,
          results: dailyResults
        });

      case 'execute_nightly':
        await enhancedOrchestrator.executeNightlyEnrichmentPipeline();
        return NextResponse.json({
          success: true,
          message: 'Nightly enrichment pipeline completed successfully'
        });

      case 'status':
        // Retourner statut des collecteurs enrichis
        const now = new Date();
        const windows: WindowType[] = ['T24', 'T6', 'T1', 'T30'];
        
        const status = await Promise.all(
          windows.map(async (w) => {
            try {
              const validation = await enhancedOrchestrator.validateTemporalConstraints(w);
              return {
                window: w,
                canProceed: validation.canProceed,
                violations: validation.violations.length,
                nextExecution: validation.nextValidExecution
              };
            } catch (error) {
              return {
                window: w,
                canProceed: false,
                violations: 1,
                error: error instanceof Error ? error.message : String(error)
              };
            }
          })
        );

        return NextResponse.json({
          success: true,
          timestamp: now.toISOString(),
          windows: status
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: execute_pipeline, execute_daily, execute_nightly, or status'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Enhanced API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoints: {
      'POST /api/enhanced': {
        description: 'Enhanced data collection with weather, lineups, and context',
        actions: {
          execute_pipeline: 'Execute pipeline for specific window (requires window parameter)',
          execute_daily: 'Execute complete daily pipeline (T-24h → T-6h → T-1h → T-30min)',
          execute_nightly: 'Execute nightly enrichment batch process',
          status: 'Get current status of all temporal windows'
        },
        examples: [
          {
            action: 'execute_pipeline',
            window: 'T1',
            config: { weather: true, lineups: true, context: true, validate: true }
          },
          {
            action: 'execute_daily'
          },
          {
            action: 'status'
          }
        ]
      }
    },
    temporal_windows: {
      T24: 'T-24h: Initial data collection and first predictions',
      T6: 'T-6h: Updated data with refined predictions',
      T1: 'T-1h: FINAL data for montante decisions (strict cutoff)',
      T30: 'T-30min: Official lineups for publication only (not for decisions)'
    },
    critical_constraints: [
      'T-1h is the absolute cutoff for montante decision data',
      'T-30min official lineups are for publication only',
      'All collectors respect API rate limits',
      'Temporal validation prevents data leakage'
    ]
  });
}