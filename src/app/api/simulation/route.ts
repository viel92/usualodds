/**
 * API Endpoint: Simulation Monte Carlo avec Calibration
 * Endpoints pour Phase 3: Learning Monte Carlo et Fair Odds
 */

import { NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase';
import LearningMonteCarlo, { type SimulationParameters } from '@/lib/simulation/learning-monte-carlo';
import OddsCalibration from '@/lib/simulation/odds-calibration';

const supabase = createApiClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const fixtureId = searchParams.get('fixture_id');

  console.log(`🎲 Simulation API called with action: ${action}, fixture: ${fixtureId}`);

  try {
    switch (action) {
      case 'run_simulation':
        return await handleRunSimulation(fixtureId);
      
      case 'calculate_fair_odds':
        return await handleCalculateFairOdds(fixtureId);
      
      case 'identify_value':
        return await handleIdentifyValue(fixtureId);
      
      case 'market_efficiency':
        return await handleMarketEfficiency();
      
      case 'simulation_history':
        return await handleSimulationHistory(fixtureId);
        
      case 'calibration_metrics':
        return await handleCalibrationMetrics();
      
      default:
        return NextResponse.json({ 
          error: 'Action invalide', 
          available_actions: ['run_simulation', 'calculate_fair_odds', 'identify_value', 'market_efficiency', 'simulation_history', 'calibration_metrics']
        }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Simulation API Error:', error);
    return NextResponse.json({ 
      error: 'Erreur interne simulation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, fixtureId, data } = body;

  console.log(`🎲 Simulation API POST called with action: ${action}, fixture: ${fixtureId}`);

  try {
    switch (action) {
      case 'run_custom_simulation':
        return await handleCustomSimulation(fixtureId, data);
      
      case 'post_match_calibration':
        return await handlePostMatchCalibration(fixtureId, data);
      
      case 'batch_simulation':
        return await handleBatchSimulation(data.fixtureIds);
        
      case 'update_scenario_weights':
        return await handleUpdateWeights(data);
      
      default:
        return NextResponse.json({ 
          error: 'Action POST invalide',
          available_actions: ['run_custom_simulation', 'post_match_calibration', 'batch_simulation', 'update_scenario_weights']
        }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Simulation API POST Error:', error);
    return NextResponse.json({ 
      error: 'Erreur interne simulation POST',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleRunSimulation(fixtureId: string | null) {
  if (!fixtureId) {
    return NextResponse.json({ error: 'fixture_id requis' }, { status: 400 });
  }

  console.log(`🎲 Running Monte Carlo simulation for fixture ${fixtureId}`);

  // Récupération paramètres de simulation depuis données enrichies
  const parameters = await buildSimulationParameters(parseInt(fixtureId));
  if (!parameters) {
    return NextResponse.json({ error: 'Paramètres simulation indisponibles' }, { status: 404 });
  }

  const monteCarlo = new LearningMonteCarlo();
  const scenarios = await monteCarlo.runSimulation(parseInt(fixtureId), parameters, 100000);
  const metrics = await monteCarlo.getSimulationMetrics(parseInt(fixtureId));

  // Sauvegarde résultats simulation
  await saveSimulationResults(parseInt(fixtureId), scenarios, parameters, metrics);

  return NextResponse.json({
    fixture_id: parseInt(fixtureId),
    scenarios: scenarios.slice(0, 20), // Top 20 scenarios les plus probables
    total_scenarios: scenarios.length,
    metrics,
    parameters,
    timestamp: new Date().toISOString(),
    status: 'completed'
  });
}

async function handleCalculateFairOdds(fixtureId: string | null) {
  if (!fixtureId) {
    return NextResponse.json({ error: 'fixture_id requis' }, { status: 400 });
  }

  console.log(`⚖️ Calculating fair odds for fixture ${fixtureId}`);

  // Récupération dernière simulation
  const { data: simulationData } = await supabase
    .from('monte_carlo_results')
    .select('scenarios')
    .eq('fixture_id', parseInt(fixtureId))
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!simulationData?.scenarios) {
    return NextResponse.json({ error: 'Simulation requise avant calcul fair odds' }, { status: 404 });
  }

  const scenarios = JSON.parse(simulationData.scenarios);
  const oddsCalibration = new OddsCalibration();
  const fairOdds = await oddsCalibration.calculateFairOdds(parseInt(fixtureId), scenarios);

  // Sauvegarde fair odds
  await saveFairOdds(parseInt(fixtureId), fairOdds);

  return NextResponse.json({
    fixture_id: parseInt(fixtureId),
    fair_odds: fairOdds,
    calculated_at: new Date().toISOString(),
    confidence_avg: fairOdds.reduce((sum, fo) => sum + fo.confidence, 0) / fairOdds.length
  });
}

async function handleIdentifyValue(fixtureId: string | null) {
  if (!fixtureId) {
    return NextResponse.json({ error: 'fixture_id requis' }, { status: 400 });
  }

  console.log(`🎯 Identifying value opportunities for fixture ${fixtureId}`);

  // Récupération fair odds récents
  const { data: fairOddsData } = await supabase
    .from('fair_odds')
    .select('odds_data')
    .eq('fixture_id', parseInt(fixtureId))
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!fairOddsData?.odds_data) {
    return NextResponse.json({ error: 'Fair odds requis avant identification valeur' }, { status: 404 });
  }

  const fairOdds = JSON.parse(fairOddsData.odds_data);
  const oddsCalibration = new OddsCalibration();
  const opportunities = await oddsCalibration.identifyValueOpportunities(parseInt(fixtureId), fairOdds);

  // Sauvegarde opportunités
  if (opportunities.length > 0) {
    await oddsCalibration.saveValueOpportunities(opportunities);
  }

  return NextResponse.json({
    fixture_id: parseInt(fixtureId),
    opportunities,
    total_opportunities: opportunities.length,
    strong_bets: opportunities.filter(o => o.recommendation === 'strong_bet').length,
    value_bets: opportunities.filter(o => o.recommendation === 'value_bet').length,
    identified_at: new Date().toISOString()
  });
}

async function handleMarketEfficiency() {
  console.log(`📊 Analyzing market efficiency`);

  const markets = ['1X2_1', '1X2_X', '1X2_2', 'Goals_O2.5', 'Goals_U2.5', 'BTTS_Yes', 'BTTS_No'];
  const oddsCalibration = new OddsCalibration();
  const efficiency = await oddsCalibration.analyzeMarketEfficiency(markets);

  return NextResponse.json({
    markets: Array.from(efficiency.entries()).map(([marketName, data]) => ({
      market: marketName,
      ...data
    })),
    analyzed_at: new Date().toISOString(),
    summary: {
      avg_overround: Array.from(efficiency.values()).reduce((sum, e) => sum + e.overround, 0) / efficiency.size,
      best_opportunities: Array.from(efficiency.entries())
        .sort(([,a], [,b]) => b.profitOpportunity - a.profitOpportunity)
        .slice(0, 3)
        .map(([market, data]) => ({ market, profit_opportunity: data.profitOpportunity }))
    }
  });
}

async function handleSimulationHistory(fixtureId: string | null) {
  const query = supabase
    .from('monte_carlo_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (fixtureId) {
    query.eq('fixture_id', parseInt(fixtureId));
  }

  const { data } = await query;

  return NextResponse.json({
    simulations: data || [],
    total: data?.length || 0,
    fixture_id: fixtureId ? parseInt(fixtureId) : null
  });
}

async function handleCalibrationMetrics() {
  console.log(`📈 Fetching calibration metrics`);

  const { data: calibrations } = await supabase
    .from('monte_carlo_calibrations')
    .select('*')
    .gte('created_at', new Date(Date.now() - 7*24*60*60*1000).toISOString())
    .order('created_at', { ascending: false });

  if (!calibrations?.length) {
    return NextResponse.json({ 
      metrics: {}, 
      message: 'Pas de calibrations récentes disponibles' 
    });
  }

  const metrics = {
    total_calibrations: calibrations.length,
    avg_strength_adjustment: calibrations.reduce((sum: number, c: any) => sum + c.strength_adjustment, 0) / calibrations.length,
    avg_variance_adjustment: calibrations.reduce((sum: number, c: any) => sum + c.variance_adjustment, 0) / calibrations.length,
    avg_tail_risk_adjustment: calibrations.reduce((sum: number, c: any) => sum + c.tail_risk_adjustment, 0) / calibrations.length,
    top_insights: calibrations
      .flatMap((c: any) => c.learning_insights || [])
      .reduce((acc: any, insight: any) => {
        acc[insight] = (acc[insight] || 0) + 1;
        return acc;
      }, {}),
    recent_period: '7 days'
  };

  return NextResponse.json({
    metrics,
    calibrations: calibrations.slice(0, 10), // 10 plus récents
    analyzed_at: new Date().toISOString()
  });
}

async function handleCustomSimulation(fixtureId: number, data: any) {
  console.log(`🎲 Running custom simulation for fixture ${fixtureId}`);

  const parameters: SimulationParameters = {
    homeStrength: data.homeStrength || 1.0,
    awayStrength: data.awayStrength || 1.0,
    homeDefense: data.homeDefense || 1.0,
    awayDefense: data.awayDefense || 1.0,
    homeAttack: data.homeAttack || 1.0,
    awayAttack: data.awayAttack || 1.0,
    avgGoals: data.avgGoals || 2.5,
    weatherImpact: data.weatherImpact || 0,
    fatigueImpact: data.fatigueImpact || 0,
    motivationImpact: data.motivationImpact || 0,
    formImpact: data.formImpact || 0
  };

  const iterations = data.iterations || 50000;
  const monteCarlo = new LearningMonteCarlo();
  const scenarios = await monteCarlo.runSimulation(fixtureId, parameters, iterations);

  return NextResponse.json({
    fixture_id: fixtureId,
    scenarios: scenarios.slice(0, 25),
    parameters,
    custom_simulation: true,
    timestamp: new Date().toISOString()
  });
}

async function handlePostMatchCalibration(fixtureId: number, data: any) {
  console.log(`📊 Performing post-match calibration for fixture ${fixtureId}`);

  const { actualResult, prediction } = data;
  
  if (!actualResult || !prediction) {
    return NextResponse.json({ error: 'actualResult et prediction requis' }, { status: 400 });
  }

  const monteCarlo = new LearningMonteCarlo();
  const calibration = await monteCarlo.performPostMatchCalibration(
    fixtureId, 
    prediction, 
    actualResult
  );

  return NextResponse.json({
    fixture_id: fixtureId,
    calibration,
    insights: calibration.learningInsights,
    adjustments: calibration.calibrationAdjustments,
    processed_at: new Date().toISOString()
  });
}

async function handleBatchSimulation(fixtureIds: number[]) {
  console.log(`🎲 Running batch simulation for ${fixtureIds.length} fixtures`);

  const results = [];
  
  for (const fixtureId of fixtureIds.slice(0, 10)) { // Limite 10 pour performance
    try {
      const parameters = await buildSimulationParameters(fixtureId);
      if (parameters) {
        const monteCarlo = new LearningMonteCarlo();
        const scenarios = await monteCarlo.runSimulation(fixtureId, parameters, 25000);
        
        results.push({
          fixture_id: fixtureId,
          status: 'completed',
          scenarios: scenarios.slice(0, 10)
        });
      } else {
        results.push({
          fixture_id: fixtureId,
          status: 'failed',
          reason: 'Paramètres indisponibles'
        });
      }
    } catch (error) {
      results.push({
        fixture_id: fixtureId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return NextResponse.json({
    batch_results: results,
    completed: results.filter(r => r.status === 'completed').length,
    failed: results.filter(r => r.status !== 'completed').length,
    processed_at: new Date().toISOString()
  });
}

async function handleUpdateWeights(data: any) {
  const { scenario, weight, event_type, probability } = data;
  
  if (scenario && weight) {
    await supabase.from('monte_carlo_weights').upsert({
      scenario,
      weight,
      updated_at: new Date().toISOString()
    });
  }
  
  if (event_type && probability) {
    await supabase.from('monte_carlo_tail_events').upsert({
      event_type,
      probability,
      updated_at: new Date().toISOString()
    });
  }

  return NextResponse.json({
    message: 'Weights updated successfully',
    updated_at: new Date().toISOString()
  });
}

async function buildSimulationParameters(fixtureId: number): Promise<SimulationParameters | null> {
  // Construction des paramètres depuis les données enrichies des phases précédentes
  const { data: fixture } = await supabase
    .from('fixtures')
    .select('*')
    .eq('id', fixtureId)
    .single();

  if (!fixture) return null;

  // Paramètres par défaut - à enrichir depuis feature stores existants
  return {
    homeStrength: 1.1, // Home advantage
    awayStrength: 1.0,
    homeDefense: 1.0,
    awayDefense: 1.0,
    homeAttack: 1.0,
    awayAttack: 1.0,
    avgGoals: 2.5,
    weatherImpact: 0,
    fatigueImpact: 0,
    motivationImpact: 0,
    formImpact: 0
  };
}

async function saveSimulationResults(
  fixtureId: number, 
  scenarios: any[], 
  parameters: SimulationParameters,
  metrics: any
) {
  await supabase.from('monte_carlo_results').insert({
    fixture_id: fixtureId,
    scenarios: JSON.stringify(scenarios),
    parameters: JSON.stringify(parameters),
    metrics: JSON.stringify(metrics),
    total_scenarios: scenarios.length,
    created_at: new Date().toISOString()
  });
}

async function saveFairOdds(fixtureId: number, fairOdds: any[]) {
  await supabase.from('fair_odds').insert({
    fixture_id: fixtureId,
    odds_data: JSON.stringify(fairOdds),
    confidence_avg: fairOdds.reduce((sum, fo) => sum + fo.confidence, 0) / fairOdds.length,
    created_at: new Date().toISOString()
  });
}