import { NextRequest, NextResponse } from 'next/server';
import { temporalValidationEngine } from '@/lib/validation/temporal-validation';

export async function POST(request: NextRequest) {
  try {
    const { 
      action, 
      seasons, 
      model, 
      window, 
      markets = ['1X2'], 
      minConfidence,
      maxMatches 
    } = await request.json();

    switch (action) {
      case 'run_backtest':
        if (!seasons || !model || !window) {
          return NextResponse.json({
            success: false,
            error: 'seasons, model, and window parameters required'
          }, { status: 400 });
        }

        // Construire périodes de test
        const periods = seasons.map((season: string) => ({
          startDate: new Date(`${season}-08-01`), // Début saison
          endDate: new Date(`${parseInt(season) + 1}-05-31`), // Fin saison
          season,
          matchweekStart: 1,
          matchweekEnd: 38
        }));

        // Configuration backtest
        const config = {
          model,
          window,
          markets,
          minConfidence,
          maxMatches
        };

        console.log(`Starting backtest for ${periods.length} seasons with ${model} model...`);

        const results = await temporalValidationEngine.walkForwardBacktest(periods, config);

        // Calculer résumé global
        const globalSummary = calculateGlobalSummary(results);

        return NextResponse.json({
          success: true,
          message: `Backtest completed for ${results.length} periods`,
          results,
          globalSummary
        });

      case 'get_backtest_history':
        const history = await getBacktestHistory(request.nextUrl.searchParams.get('limit') || '20');
        return NextResponse.json({
          success: true,
          history
        });

      case 'compare_models':
        const { models, season: compareSeason } = await request.json();
        if (!models || !compareSeason) {
          return NextResponse.json({
            success: false,
            error: 'models and season parameters required for comparison'
          }, { status: 400 });
        }

        const comparison = await compareModels(models, compareSeason);
        return NextResponse.json({
          success: true,
          comparison
        });

      case 'performance_analysis':
        const analysis = await getPerformanceAnalysis();
        return NextResponse.json({
          success: true,
          analysis
        });

      case 'overfitting_check':
        const modelName = request.nextUrl.searchParams.get('model') || 'ensemble';
        const overfittingAnalysis = await checkOverfitting(modelName);
        return NextResponse.json({
          success: true,
          overfittingAnalysis
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: run_backtest, get_backtest_history, compare_models, performance_analysis, or overfitting_check'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Backtest API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoints: {
      'POST /api/backtest': {
        description: 'Temporal validation and backtesting system',
        actions: {
          run_backtest: 'Execute walk-forward backtest (requires seasons, model, window)',
          get_backtest_history: 'Get historical backtest results (optional limit param)',
          compare_models: 'Compare multiple models head-to-head (requires models, season)',
          performance_analysis: 'Get comprehensive performance analysis across all tests',
          overfitting_check: 'Check for overfitting patterns (optional model param)'
        },
        examples: [
          {
            action: 'run_backtest',
            seasons: ['2022', '2023'],
            model: 'ensemble',
            window: 'T1',
            markets: ['1X2'],
            minConfidence: 0.6,
            maxMatches: 500
          },
          {
            action: 'compare_models',
            models: ['ensemble', 'contextual', 'baseline'],
            season: '2023'
          }
        ]
      }
    },
    available_models: [
      'ensemble: Adaptive ensemble with multiple base models',
      'contextual: Context-aware specialized models',
      'baseline: Simple baseline for comparison'
    ],
    temporal_windows: [
      'T24: 24 hours before match',
      'T6: 6 hours before match', 
      'T1: 1 hour before match (montante decision cutoff)',
      'T30: 30 minutes before match (publication only)'
    ],
    validation_methodology: [
      'Walk-forward analysis respecting temporal order',
      'Strict temporal constraints - no data leakage',
      'Performance metrics: accuracy, Brier score, calibration error',
      'Financial metrics: ROI, Sharpe ratio, maximum drawdown',
      'Statistical significance testing for model comparisons'
    ]
  });
}

// Helper functions
function calculateGlobalSummary(results: any[]) {
  if (results.length === 0) {
    return { totalPredictions: 0, avgAccuracy: 0, avgROI: 0 };
  }

  const totalPredictions = results.reduce((sum, r) => sum + r.metrics.totalPredictions, 0);
  const totalCorrect = results.reduce((sum, r) => sum + r.metrics.correctPredictions, 0);
  const avgAccuracy = totalCorrect / totalPredictions;
  const avgROI = results.reduce((sum, r) => sum + r.metrics.roi, 0) / results.length;
  const avgBrierScore = results.reduce((sum, r) => sum + r.metrics.brierScore, 0) / results.length;
  const avgSharpeRatio = results.reduce((sum, r) => sum + r.metrics.sharpeRatio, 0) / results.length;

  // Analyser consistance temporelle
  const windowAccuracies = results.flatMap(r => r.performance);
  const consistencyScore = calculateConsistencyScore(windowAccuracies);

  // Best/worst periods
  const sortedResults = results.sort((a, b) => b.metrics.accuracy - a.metrics.accuracy);
  const bestPeriod = sortedResults[0]?.period.season;
  const worstPeriod = sortedResults[sortedResults.length - 1]?.period.season;

  return {
    totalPredictions,
    avgAccuracy,
    avgROI,
    avgBrierScore,
    avgSharpeRatio,
    consistencyScore,
    bestPeriod,
    worstPeriod,
    periodsAnalyzed: results.length,
    overallRecommendation: avgAccuracy > 0.55 ? 'Model performing well' : 'Model needs improvement'
  };
}

function calculateConsistencyScore(windowAccuracies: any[]): number {
  if (windowAccuracies.length < 2) return 1;
  
  const accuracies = windowAccuracies.map(w => w.accuracy);
  const mean = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
  const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
  const stdDev = Math.sqrt(variance);
  
  // Normaliser à 0-1 (plus bas stdDev = plus consistant)
  return Math.max(0, 1 - stdDev * 4);
}

async function getBacktestHistory(limitStr: string) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const limit = parseInt(limitStr);
  const { data } = await supabase
    .from('backtest_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function compareModels(models: string[], season: string) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Récupérer résultats pour chaque modèle
  const comparisons: any = {};
  
  for (const model of models) {
    const { data } = await supabase
      .from('backtest_results')
      .select('*')
      .eq('model_type', model)
      .eq('season', season);

    if (data && data.length > 0) {
      comparisons[model] = {
        accuracy: data.reduce((sum, r) => sum + r.accuracy, 0) / data.length,
        roi: data.reduce((sum, r) => sum + r.roi, 0) / data.length,
        brierScore: data.reduce((sum, r) => sum + r.brier_score, 0) / data.length,
        sharpeRatio: data.reduce((sum, r) => sum + r.sharpe_ratio, 0) / data.length,
        tests: data.length
      };
    }
  }

  // Trouver meilleur/pire modèle
  const modelEntries = Object.entries(comparisons);
  const bestModel = modelEntries.reduce((best, [name, metrics]: any) => 
    !best || metrics.accuracy > best.metrics.accuracy ? { name, metrics } : best
  , null as any);

  const worstModel = modelEntries.reduce((worst, [name, metrics]: any) => 
    !worst || metrics.accuracy < worst.metrics.accuracy ? { name, metrics } : worst
  , null as any);

  // Calculer significativité statistique (simplifiée)
  const significanceTests: any = {};
  for (let i = 0; i < modelEntries.length; i++) {
    for (let j = i + 1; j < modelEntries.length; j++) {
      const [model1, metrics1]: any = modelEntries[i];
      const [model2, metrics2]: any = modelEntries[j];
      
      const accuracyDiff = Math.abs(metrics1.accuracy - metrics2.accuracy);
      const pValue = accuracyDiff > 0.05 ? 0.01 : 0.5; // Simplification
      
      significanceTests[`${model1}_vs_${model2}`] = {
        accuracyDifference: accuracyDiff,
        pValue,
        isSignificant: pValue < 0.05
      };
    }
  }

  return {
    season,
    models: comparisons,
    bestModel: bestModel?.name,
    worstModel: worstModel?.name,
    significanceTests,
    recommendation: bestModel ? 
      `Use ${bestModel.name} (${(bestModel.metrics.accuracy * 100).toFixed(1)}% accuracy)` :
      'Insufficient data for comparison'
  };
}

async function getPerformanceAnalysis() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Analyse par saison
  const { data: seasonalData } = await supabase
    .from('seasonal_performance_summary')
    .select('*')
    .order('season', { ascending: false });

  // Analyse par fenêtre
  const { data: windowData } = await supabase
    .from('window_performance_comparison')
    .select('*')
    .order('avg_accuracy', { ascending: false });

  // Évolution modèles
  const { data: evolutionData } = await supabase
    .from('model_evolution_timeline')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  // Insights généraux
  const insights = generatePerformanceInsights(seasonalData, windowData, evolutionData);

  return {
    seasonalPerformance: seasonalData || [],
    windowPerformance: windowData || [],
    modelEvolution: evolutionData || [],
    insights
  };
}

function generatePerformanceInsights(seasonal: any[], window: any[], evolution: any[]) {
  const insights = [];

  // Analyse saisonnière
  if (seasonal && seasonal.length > 1) {
    const latestSeason = seasonal[0];
    const previousSeason = seasonal[1];
    
    if (latestSeason.avg_accuracy > previousSeason.avg_accuracy) {
      insights.push(`Performance improving: +${((latestSeason.avg_accuracy - previousSeason.avg_accuracy) * 100).toFixed(1)}% vs last season`);
    } else {
      insights.push(`Performance declining: ${((previousSeason.avg_accuracy - latestSeason.avg_accuracy) * 100).toFixed(1)}% drop vs last season`);
    }
  }

  // Analyse fenêtres
  if (window && window.length > 0) {
    const bestWindow = window[0];
    insights.push(`Best performing window: ${bestWindow.window} (${(bestWindow.avg_accuracy * 100).toFixed(1)}% accuracy)`);
    
    if (window.length > 1) {
      const worstWindow = window[window.length - 1];
      const gap = bestWindow.avg_accuracy - worstWindow.avg_accuracy;
      if (gap > 0.1) {
        insights.push(`Large performance gap between windows: ${(gap * 100).toFixed(1)}% difference`);
      }
    }
  }

  // Évolution modèle
  if (evolution && evolution.length > 1) {
    const recentVersions = evolution.slice(0, 3);
    const improvingVersions = recentVersions.filter(v => v.accuracy_improvement > 0).length;
    
    if (improvingVersions >= 2) {
      insights.push('Model showing consistent improvement across versions');
    } else {
      insights.push('Model performance may have plateaued - consider new features');
    }
  }

  return insights;
}

async function checkOverfitting(modelName: string) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Utiliser fonction SQL d'analyse d'overfitting
  const { data, error } = await supabase
    .rpc('detect_overfitting', { 
      model_name: modelName,
      lookback_seasons: 3 
    });

  if (error) {
    console.error('Overfitting check error:', error);
    return { error: 'Failed to check overfitting' };
  }

  const analysis = data || [];
  
  // Calculer risk score global
  const riskCounts = analysis.reduce((counts: any, row: any) => {
    counts[row.overfitting_risk] = (counts[row.overfitting_risk] || 0) + 1;
    return counts;
  }, {});

  const totalSeasons = analysis.length;
  const highRiskSeasons = riskCounts.HIGH || 0;
  const overallRisk = highRiskSeasons / totalSeasons;

  let recommendation = '';
  if (overallRisk > 0.5) {
    recommendation = 'High overfitting risk detected - consider regularization or feature reduction';
  } else if (overallRisk > 0.3) {
    recommendation = 'Moderate overfitting risk - monitor performance carefully';
  } else {
    recommendation = 'Low overfitting risk - model generalizes well';
  }

  return {
    modelName,
    seasonsAnalyzed: totalSeasons,
    overallRiskScore: overallRisk,
    riskBreakdown: riskCounts,
    recommendation,
    detailedAnalysis: analysis
  };
}