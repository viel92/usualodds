import { NextRequest, NextResponse } from 'next/server';
import { postMatchAnalyzer } from '@/lib/ml/post-match-analyzer';

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    switch (action) {
      case 'analyze_finished_matches':
        await postMatchAnalyzer.analyzeFinishedMatches();
        return NextResponse.json({ 
          success: true, 
          message: 'Post-match analysis completed' 
        });

      case 'get_learning_insights':
        const insights = await getLearningInsights(params.days || 30);
        return NextResponse.json({ 
          success: true, 
          data: insights 
        });

      case 'get_performance_metrics':
        const metrics = await getPerformanceMetrics(params.days || 7);
        return NextResponse.json({ 
          success: true, 
          data: metrics 
        });

      case 'get_error_patterns':
        const patterns = await getErrorPatterns(params.days || 14);
        return NextResponse.json({ 
          success: true, 
          data: patterns 
        });

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action. Use: analyze_finished_matches, get_learning_insights, get_performance_metrics, get_error_patterns' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Learning API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

async function getLearningInsights(days: number) {
  const { createClient } = await import('@/lib/supabase');
  const supabase = createClient();
  
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('learning_insights')
    .select('*')
    .gte('generated_at', startDate.toISOString())
    .order('impact', { ascending: false });

  if (error) throw error;
  return data;
}

async function getPerformanceMetrics(days: number) {
  const { createClient } = await import('@/lib/supabase');
  const supabase = createClient();
  
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  // Get prediction errors for the period
  const { data: errors, error } = await supabase
    .from('prediction_errors')
    .select('*')
    .gte('analyzed_at', startDate.toISOString());

  if (error) throw error;

  if (!errors || errors.length === 0) {
    return {
      totalPredictions: 0,
      overallBrierScore: 0,
      calibrationError: 0,
      windowPerformance: {},
      marketPerformance: {},
      errorTypeDistribution: {}
    };
  }

  // Calculate metrics
  const totalPredictions = errors.length;
  const overallBrierScore = errors.reduce((sum: number, e: any) => sum + e.brier_score, 0) / totalPredictions;
  const calibrationError = errors.reduce((sum: number, e: any) => sum + Math.abs(e.predicted_prob - e.actual_result), 0) / totalPredictions;

  // Performance by window
  const windowPerformance = errors.reduce((acc: Record<string, { count: number; totalBrier: number }>, error: any) => {
    if (!acc[error.window]) {
      acc[error.window] = { count: 0, totalBrier: 0 };
    }
    acc[error.window].count++;
    acc[error.window].totalBrier += error.brier_score;
    return acc;
  }, {} as Record<string, { count: number; totalBrier: number; avgBrier?: number }>);

  Object.keys(windowPerformance).forEach(window => {
    (windowPerformance[window] as any).avgBrier = windowPerformance[window].totalBrier / windowPerformance[window].count;
  });

  // Performance by market
  const marketPerformance = errors.reduce((acc: Record<string, { count: number; totalBrier: number }>, error: any) => {
    if (!acc[error.market]) {
      acc[error.market] = { count: 0, totalBrier: 0 };
    }
    acc[error.market].count++;
    acc[error.market].totalBrier += error.brier_score;
    return acc;
  }, {} as Record<string, { count: number; totalBrier: number; avgBrier?: number }>);

  Object.keys(marketPerformance).forEach(market => {
    (marketPerformance[market] as any).avgBrier = marketPerformance[market].totalBrier / marketPerformance[market].count;
  });

  // Error type distribution
  const errorTypeDistribution = errors.reduce((acc: Record<string, number>, error: any) => {
    acc[error.error_type] = (acc[error.error_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalPredictions,
    overallBrierScore,
    calibrationError,
    windowPerformance,
    marketPerformance,
    errorTypeDistribution,
    period: {
      days,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString()
    }
  };
}

async function getErrorPatterns(days: number) {
  const { createClient } = await import('@/lib/supabase');
  const supabase = createClient();
  
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('error_patterns')
    .select('*')
    .gte('analyzed_at', startDate.toISOString())
    .order('avg_brier_score', { ascending: false });

  if (error) throw error;
  return data;
}

export async function GET() {
  return NextResponse.json({
    endpoints: {
      'POST /api/learning': {
        description: 'Machine learning and post-match analysis',
        actions: {
          analyze_finished_matches: 'Run post-match analysis on finished matches',
          get_learning_insights: 'Get learning insights from recent analysis',
          get_performance_metrics: 'Get model performance metrics',
          get_error_patterns: 'Get error patterns analysis'
        },
        examples: {
          analyze_finished_matches: {
            action: 'analyze_finished_matches'
          },
          get_learning_insights: {
            action: 'get_learning_insights',
            days: 30
          },
          get_performance_metrics: {
            action: 'get_performance_metrics',
            days: 7
          },
          get_error_patterns: {
            action: 'get_error_patterns',
            days: 14
          }
        }
      }
    }
  });
}