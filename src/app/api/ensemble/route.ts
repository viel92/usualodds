import { NextRequest, NextResponse } from 'next/server';
import { adaptiveEnsemble } from '@/lib/models/adaptive-ensemble';
import { WindowType } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const { action, matchId, window, market } = await request.json();

    switch (action) {
      case 'predict':
        if (!matchId || !window) {
          return NextResponse.json({
            success: false,
            error: 'matchId and window parameters required'
          }, { status: 400 });
        }

        const prediction = await adaptiveEnsemble.generateEnsemblePrediction(
          matchId,
          window as WindowType,
          market || '1X2'
        );

        return NextResponse.json({
          success: true,
          prediction,
          message: `Ensemble prediction generated for match ${matchId}`
        });

      case 'nightly_retrain':
        await adaptiveEnsemble.nightlyRetraining();
        return NextResponse.json({
          success: true,
          message: 'Nightly ensemble retraining completed successfully'
        });

      case 'performance_status':
        // Récupérer statut de performance de tous les modèles
        const performanceStatus = await getEnsemblePerformanceStatus();
        return NextResponse.json({
          success: true,
          status: performanceStatus
        });

      case 'model_weights':
        const weights = await getCurrentModelWeights();
        return NextResponse.json({
          success: true,
          weights
        });

      case 'recent_predictions':
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
        const recentPredictions = await getRecentEnsemblePredictions(limit);
        return NextResponse.json({
          success: true,
          predictions: recentPredictions
        });

      case 'retraining_history':
        const historyLimit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
        const retrainingHistory = await getRetrainingHistory(historyLimit);
        return NextResponse.json({
          success: true,
          history: retrainingHistory
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: predict, nightly_retrain, performance_status, model_weights, recent_predictions, or retraining_history'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Ensemble API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoints: {
      'POST /api/ensemble': {
        description: 'Adaptive ensemble model operations',
        actions: {
          predict: 'Generate ensemble prediction for a match (requires matchId, window)',
          nightly_retrain: 'Execute nightly retraining based on recent errors',
          performance_status: 'Get current performance status of all models',
          model_weights: 'Get current ensemble weights for all temporal windows',
          recent_predictions: 'Get recent ensemble predictions (optional limit param)',
          retraining_history: 'Get model retraining history (optional limit param)'
        },
        examples: [
          {
            action: 'predict',
            matchId: 'uuid-here',
            window: 'T1',
            market: '1X2'
          },
          {
            action: 'nightly_retrain'
          },
          {
            action: 'performance_status'
          }
        ]
      }
    },
    model_architecture: {
      base_models: [
        'poisson: Classical Poisson goal model',
        'dixon_coles: Dixon-Coles time-decay model',
        'elo_rating: Elo rating system adapted for football',
        'form_based: Recent form and momentum model',
        'weather_adjusted: Weather-aware prediction model'
      ],
      ensemble_method: 'Weighted average with dynamic weight adjustment',
      adaptation_frequency: 'Nightly retraining based on post-match analysis',
      performance_metrics: ['brier_score', 'log_loss', 'calibration_error', 'recent_performance']
    },
    temporal_windows: {
      T24: 'Initial predictions with base data',
      T6: 'Updated with enriched data',
      T1: 'Final predictions for montante decisions',
      T30: 'Post-lineup predictions for publication'
    }
  });
}

// Helper functions
async function getEnsemblePerformanceStatus() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Récupérer résumé de performance par fenêtre
  const { data: summary } = await supabase
    .from('model_performance_summary')
    .select('*')
    .order('window');

  // Récupérer poids actuels
  const { data: weights } = await supabase
    .from('ensemble_weights')
    .select('*')
    .order('window');

  // Récupérer modèles nécessitant réentraînement
  const { data: degradedModels } = await supabase
    .from('model_performance')
    .select('model_name, window, recent_performance, updated_at')
    .lt('recent_performance', 0.4)
    .order('recent_performance');

  // Récupérer patterns d'erreur récents
  const { data: errorPatterns } = await supabase
    .from('model_performance')
    .select('model_name, error_patterns, updated_at')
    .not('error_patterns', 'eq', '{}')
    .order('updated_at', { ascending: false })
    .limit(10);

  return {
    summary: summary || [],
    current_weights: weights || [],
    models_needing_retraining: degradedModels || [],
    recent_error_patterns: errorPatterns || [],
    last_retraining: await getLastRetrainingTime(),
    system_health: calculateSystemHealth(summary)
  };
}

async function getCurrentModelWeights() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: weights } = await supabase
    .from('ensemble_weights')
    .select('*')
    .order('window');

  return weights || [];
}

async function getRecentEnsemblePredictions(limit: number) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: predictions } = await supabase
    .from('recent_ensemble_predictions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return predictions || [];
}

async function getRetrainingHistory(limit: number) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: history } = await supabase
    .from('model_retraining_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return history || [];
}

async function getLastRetrainingTime() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: lastRetraining } = await supabase
    .from('model_retraining_history')
    .select('created_at, model_name, success')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return lastRetraining;
}

function calculateSystemHealth(summary: any[]) {
  if (!summary || summary.length === 0) {
    return { score: 0.5, status: 'unknown', issues: ['No performance data available'] };
  }

  const issues: string[] = [];
  let totalScore = 0;

  for (const windowSummary of summary) {
    // Vérifier Brier Score (< 0.25 = bon)
    if (windowSummary.avg_brier_score > 0.3) {
      issues.push(`High Brier Score for ${windowSummary.window}: ${windowSummary.avg_brier_score.toFixed(3)}`);
    }

    // Vérifier calibration error (< 0.1 = bon)
    if (windowSummary.avg_calibration_error > 0.15) {
      issues.push(`High calibration error for ${windowSummary.window}: ${windowSummary.avg_calibration_error.toFixed(3)}`);
    }

    // Vérifier performance récente (> 0.5 = bon)
    if (windowSummary.avg_recent_performance < 0.45) {
      issues.push(`Low recent performance for ${windowSummary.window}: ${windowSummary.avg_recent_performance.toFixed(3)}`);
    }

    // Calculer score pour cette fenêtre
    const brierScore = Math.max(0, 1 - windowSummary.avg_brier_score * 4); // Normaliser 0.25 -> 1.0
    const calibScore = Math.max(0, 1 - windowSummary.avg_calibration_error * 10); // Normaliser 0.1 -> 1.0
    const recentScore = windowSummary.avg_recent_performance;

    totalScore += (brierScore + calibScore + recentScore) / 3;
  }

  const avgScore = totalScore / summary.length;
  let status = 'excellent';
  
  if (avgScore < 0.3) status = 'critical';
  else if (avgScore < 0.5) status = 'poor';
  else if (avgScore < 0.7) status = 'fair';
  else if (avgScore < 0.85) status = 'good';

  return {
    score: avgScore,
    status,
    issues
  };
}