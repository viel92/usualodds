import { NextRequest, NextResponse } from 'next/server';
import { FeatureOrchestrator } from '@/lib/features';
import { temporalOrchestrator } from '@/lib/features/temporal-orchestrator';
import { temporalValidator } from '@/lib/features/temporal-validator';
import { WindowType } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const { action, matchId, window, dateFrom, dateTo } = await request.json();
    const orchestrator = new FeatureOrchestrator();

    switch (action) {
      case 'build_match':
        if (!matchId || !window) {
          return NextResponse.json({ 
            success: false, 
            error: 'matchId and window are required' 
          }, { status: 400 });
        }
        
        await orchestrator.buildAllFeatures(matchId, window as WindowType);
        return NextResponse.json({ 
          success: true, 
          message: `Features built for match ${matchId} at window ${window}` 
        });

      case 'build_temporal':
        if (!matchId || !window) {
          return NextResponse.json({ 
            success: false, 
            error: 'matchId and window are required' 
          }, { status: 400 });
        }
        
        const pipeline = await temporalOrchestrator.executeTemporalPipeline(
          matchId, 
          window as WindowType
        );
        
        return NextResponse.json({ 
          success: pipeline.status === 'completed', 
          data: pipeline,
          message: `Temporal pipeline ${pipeline.status} for match ${matchId} at window ${window}` 
        });

      case 'validate_temporal':
        if (!matchId || !window) {
          return NextResponse.json({ 
            success: false, 
            error: 'matchId and window are required' 
          }, { status: 400 });
        }
        
        const validation = await temporalValidator.validateTemporalConstraints(
          matchId,
          window as WindowType,
          new Date()
        );
        
        return NextResponse.json({ 
          success: validation.isValid, 
          data: validation,
          message: validation.isValid ? 'Temporal validation passed' : 'Temporal violations detected'
        });

      case 'prepare_montante':
        if (!matchId) {
          return NextResponse.json({ 
            success: false, 
            error: 'matchId is required' 
          }, { status: 400 });
        }
        
        const montanteContext = await temporalOrchestrator.prepareMontanteDecision(matchId);
        
        return NextResponse.json({ 
          success: montanteContext.canProceedWithMontante, 
          data: montanteContext,
          message: montanteContext.canProceedWithMontante ? 
            'Montante decision approved' : 
            'Montante decision blocked - temporal violations'
        });

      case 'execute_scheduled':
        const scheduledResults = await temporalOrchestrator.executeScheduledPipelines();
        
        return NextResponse.json({ 
          success: true, 
          data: scheduledResults,
          message: `Scheduled pipelines executed: ${scheduledResults.executed} total, ${scheduledResults.succeeded} succeeded`
        });

      case 'build_all':
        if (!window) {
          return NextResponse.json({ 
            success: false, 
            error: 'window is required' 
          }, { status: 400 });
        }
        
        await orchestrator.buildFeaturesForAllMatches(window as WindowType, dateFrom, dateTo);
        return NextResponse.json({ 
          success: true, 
          message: `Features built for all matches at window ${window}` 
        });

      case 'rebuild_match':
        if (!matchId) {
          return NextResponse.json({ 
            success: false, 
            error: 'matchId is required' 
          }, { status: 400 });
        }
        
        await orchestrator.rebuildFeaturesForMatch(matchId);
        return NextResponse.json({ 
          success: true, 
          message: `Features rebuilt for match ${matchId}` 
        });

      case 'status':
        const status = await orchestrator.getFeatureBuildStatus();
        return NextResponse.json({ 
          success: true, 
          data: status 
        });

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action. Use: build_match, build_temporal, validate_temporal, prepare_montante, execute_scheduled, build_all, rebuild_match, or status' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Features API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoints: {
      'POST /api/features': {
        description: 'Build and manage features for matches',
        actions: {
          build_match: 'Build features for a specific match and window',
          build_all: 'Build features for all upcoming matches at a window',
          rebuild_match: 'Rebuild features for a specific match (all windows)',
          status: 'Get feature build status'
        },
        examples: {
          build_match: {
            action: 'build_match',
            matchId: 'uuid',
            window: 'T24'
          },
          build_all: {
            action: 'build_all',
            window: 'T1',
            dateFrom: '2024-01-01',
            dateTo: '2024-01-31'
          },
          rebuild_match: {
            action: 'rebuild_match',
            matchId: 'uuid'
          },
          status: {
            action: 'status'
          }
        }
      }
    }
  });
}