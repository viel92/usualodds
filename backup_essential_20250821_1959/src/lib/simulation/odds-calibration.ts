// @ts-nocheck
/**
 * PHASE 3: Fair Odds Calibration System
 * Système de calibration des odds fair et détection d'opportunités de valeur
 */

import { createApiClient } from '@/lib/supabase';
import type { MonteCarloScenario } from './learning-monte-carlo';

interface MarketOdds {
  market: string;
  bookmaker: string;
  odds: number;
  probability: number;
  margin: number;
  timestamp: string;
}

interface FairOdds {
  market: string;
  fairOdds: number;
  fairProbability: number;
  confidence: number;
  method: 'monte_carlo' | 'ensemble_avg' | 'kelly_optimal';
}

interface ValueOpportunity {
  id: string;
  fixtureId: number;
  market: string;
  bookmaker: string;
  marketOdds: number;
  fairOdds: number;
  marketProb: number;
  fairProb: number;
  edge: number;
  kelly: number;
  confidence: number;
  expectedValue: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: 'strong_bet' | 'value_bet' | 'avoid' | 'no_edge';
  reasoning: string[];
}

interface MarketEfficiency {
  overround: number;
  bias: number;
  consistency: number;
  sharpness: number;
  calibration: number;
  profitOpportunity: number;
}

class OddsCalibration {
  private supabase = createApiClient();
  private bookmakerBiases: Map<string, Map<string, number>> = new Map();
  private marketEfficiencyCache: Map<string, MarketEfficiency> = new Map();
  private historicalEdges: Map<string, number[]> = new Map();

  async calculateFairOdds(
    fixtureId: number,
    scenarios: MonteCarloScenario[]
  ): Promise<FairOdds[]> {
    console.log(`⚖️ Calculating fair odds for fixture ${fixtureId} from ${scenarios.length} scenarios`);
    
    const fairOdds: FairOdds[] = [];
    
    // Calcul probabilités fair pour marchés principaux
    const outcomes = this.aggregateOutcomeProbabilities(scenarios);
    const goalProbabilities = this.aggregateGoalProbabilities(scenarios);
    const bttsProbabilities = this.aggregateBttsProbabilities(scenarios);
    
    // Fair odds pour 1X2
    fairOdds.push(...this.calculateOutcomeFairOdds(outcomes));
    
    // Fair odds pour O/U 2.5
    fairOdds.push(...this.calculateGoalsFairOdds(goalProbabilities));
    
    // Fair odds pour BTTS
    fairOdds.push(...this.calculateBttsFairOdds(bttsProbabilities));
    
    // Application calibration basée sur performance historique
    return this.applyCalibratedAdjustments(fairOdds, fixtureId);
  }

  private aggregateOutcomeProbabilities(scenarios: MonteCarloScenario[]): {
    home: number;
    draw: number;
    away: number;
  } {
    const probs = { home: 0, draw: 0, away: 0 };
    
    scenarios.forEach(scenario => {
      switch (scenario.outcome) {
        case '1':
          probs.home += scenario.probability;
          break;
        case 'X':
          probs.draw += scenario.probability;
          break;
        case '2':
          probs.away += scenario.probability;
          break;
      }
    });
    
    return probs;
  }

  private aggregateGoalProbabilities(scenarios: MonteCarloScenario[]): {
    under25: number;
    over25: number;
    under15: number;
    over35: number;
  } {
    let under25 = 0, over25 = 0, under15 = 0, over35 = 0;
    
    scenarios.forEach(scenario => {
      const totalGoals = scenario.homeGoals + scenario.awayGoals;
      
      if (totalGoals < 2.5) under25 += scenario.probability;
      if (totalGoals > 2.5) over25 += scenario.probability;
      if (totalGoals < 1.5) under15 += scenario.probability;
      if (totalGoals > 3.5) over35 += scenario.probability;
    });
    
    return { under25, over25, under15, over35 };
  }

  private aggregateBttsProbabilities(scenarios: MonteCarloScenario[]): {
    yes: number;
    no: number;
  } {
    let yes = 0, no = 0;
    
    scenarios.forEach(scenario => {
      if (scenario.btts) {
        yes += scenario.probability;
      } else {
        no += scenario.probability;
      }
    });
    
    return { yes, no };
  }

  private calculateOutcomeFairOdds(outcomes: { home: number; draw: number; away: number }): FairOdds[] {
    const total = outcomes.home + outcomes.draw + outcomes.away;
    
    return [
      {
        market: '1X2_1',
        fairProbability: outcomes.home / total,
        fairOdds: total / outcomes.home,
        confidence: this.calculateConfidence(outcomes.home, total),
        method: 'monte_carlo'
      },
      {
        market: '1X2_X',
        fairProbability: outcomes.draw / total,
        fairOdds: total / outcomes.draw,
        confidence: this.calculateConfidence(outcomes.draw, total),
        method: 'monte_carlo'
      },
      {
        market: '1X2_2',
        fairProbability: outcomes.away / total,
        fairOdds: total / outcomes.away,
        confidence: this.calculateConfidence(outcomes.away, total),
        method: 'monte_carlo'
      }
    ];
  }

  private calculateGoalsFairOdds(goals: {
    under25: number;
    over25: number;
    under15: number;
    over35: number;
  }): FairOdds[] {
    const total25 = goals.under25 + goals.over25;
    const total15 = goals.under15 + (1 - goals.under15);
    const total35 = goals.over35 + (1 - goals.over35);
    
    return [
      {
        market: 'Goals_U2.5',
        fairProbability: goals.under25 / total25,
        fairOdds: total25 / goals.under25,
        confidence: this.calculateConfidence(goals.under25, total25),
        method: 'monte_carlo'
      },
      {
        market: 'Goals_O2.5',
        fairProbability: goals.over25 / total25,
        fairOdds: total25 / goals.over25,
        confidence: this.calculateConfidence(goals.over25, total25),
        method: 'monte_carlo'
      },
      {
        market: 'Goals_U1.5',
        fairProbability: goals.under15,
        fairOdds: 1 / goals.under15,
        confidence: this.calculateConfidence(goals.under15, 1),
        method: 'monte_carlo'
      },
      {
        market: 'Goals_O3.5',
        fairProbability: goals.over35,
        fairOdds: 1 / goals.over35,
        confidence: this.calculateConfidence(goals.over35, 1),
        method: 'monte_carlo'
      }
    ];
  }

  private calculateBttsFairOdds(btts: { yes: number; no: number }): FairOdds[] {
    const total = btts.yes + btts.no;
    
    return [
      {
        market: 'BTTS_Yes',
        fairProbability: btts.yes / total,
        fairOdds: total / btts.yes,
        confidence: this.calculateConfidence(btts.yes, total),
        method: 'monte_carlo'
      },
      {
        market: 'BTTS_No',
        fairProbability: btts.no / total,
        fairOdds: total / btts.no,
        confidence: this.calculateConfidence(btts.no, total),
        method: 'monte_carlo'
      }
    ];
  }

  private calculateConfidence(probability: number, total: number): number {
    // Confidence basée sur la concentration de probabilité et taille échantillon
    const concentration = Math.min(probability / total, (total - probability) / total);
    const sampleSize = total > 10000 ? 1.0 : total / 10000;
    
    return Math.min(concentration * 2 * sampleSize, 0.95);
  }

  private async applyCalibratedAdjustments(
    fairOdds: FairOdds[], 
    fixtureId: number
  ): Promise<FairOdds[]> {
    // Application ajustements calibrés selon performance historique
    await this.loadHistoricalCalibrations();
    
    return fairOdds.map(fair => {
      const historicalBias = this.getHistoricalBias(fair.market);
      const adjustedProb = fair.fairProbability * (1 + historicalBias);
      
      return {
        ...fair,
        fairProbability: Math.min(Math.max(adjustedProb, 0.001), 0.999),
        fairOdds: 1 / Math.min(Math.max(adjustedProb, 0.001), 0.999)
      };
    });
  }

  async identifyValueOpportunities(
    fixtureId: number,
    fairOdds: FairOdds[]
  ): Promise<ValueOpportunity[]> {
    console.log(`🎯 Identifying value opportunities for fixture ${fixtureId}`);
    
    // Récupération odds du marché
    const marketOdds = await this.fetchMarketOdds(fixtureId);
    const opportunities: ValueOpportunity[] = [];
    
    for (const fair of fairOdds) {
      const marketOptions = marketOdds.filter(m => m.market === fair.market);
      
      for (const market of marketOptions) {
        const opportunity = await this.analyzeValueOpportunity(fixtureId, fair, market);
        
        if (opportunity.edge > 0.03) { // Seuil minimum 3%
          opportunities.push(opportunity);
        }
      }
    }
    
    // Tri par edge décroissant
    return opportunities.sort((a, b) => b.edge - a.edge);
  }

  private async fetchMarketOdds(fixtureId: number): Promise<MarketOdds[]> {
    const { data: odds } = await this.supabase
      .from('odds_history')
      .select('*')
      .eq('fixture_id', fixtureId)
      .gte('updated_at', new Date(Date.now() - 2*60*60*1000).toISOString()) // 2h
      .order('updated_at', { ascending: false });
    
    return odds?.map(o => ({
      market: `${o.bet}${o.value ? '_' + o.value : ''}`,
      bookmaker: o.bookmaker,
      odds: parseFloat(o.odd),
      probability: 1 / parseFloat(o.odd),
      margin: 0, // Calculé après
      timestamp: o.updated_at
    })) || [];
  }

  private async analyzeValueOpportunity(
    fixtureId: number,
    fair: FairOdds,
    market: MarketOdds
  ): Promise<ValueOpportunity> {
    const edge = (market.probability * market.odds) - 1; // Edge brut
    const adjustedEdge = edge - this.getBookmakerBias(market.bookmaker, fair.market);
    
    const kelly = this.calculateKelly(fair.fairProbability, market.odds);
    const expectedValue = fair.fairProbability * (market.odds - 1) - (1 - fair.fairProbability);
    
    const riskLevel = this.assessRiskLevel(fair, market, adjustedEdge);
    const recommendation = this.getRecommendation(adjustedEdge, kelly, fair.confidence, riskLevel);
    
    return {
      id: `${fixtureId}_${fair.market}_${market.bookmaker}`,
      fixtureId,
      market: fair.market,
      bookmaker: market.bookmaker,
      marketOdds: market.odds,
      fairOdds: fair.fairOdds,
      marketProb: market.probability,
      fairProb: fair.fairProbability,
      edge: adjustedEdge,
      kelly,
      confidence: fair.confidence,
      expectedValue,
      riskLevel,
      recommendation,
      reasoning: this.generateValueReasoning(fair, market, adjustedEdge, kelly)
    };
  }

  private calculateKelly(fairProb: number, odds: number): number {
    // Formule Kelly: f = (bp - q) / b
    // b = odds - 1, p = fair probability, q = 1 - p
    const b = odds - 1;
    const p = fairProb;
    const q = 1 - p;
    
    const kelly = (b * p - q) / b;
    
    // Limitation Kelly à 25% max pour gestion risque
    return Math.max(0, Math.min(kelly, 0.25));
  }

  private assessRiskLevel(
    fair: FairOdds, 
    market: MarketOdds, 
    edge: number
  ): 'low' | 'medium' | 'high' {
    if (fair.confidence > 0.8 && edge > 0.1 && market.odds < 3.0) {
      return 'low';
    } else if (fair.confidence > 0.6 && edge > 0.05) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  private getRecommendation(
    edge: number, 
    kelly: number, 
    confidence: number, 
    risk: 'low' | 'medium' | 'high'
  ): 'strong_bet' | 'value_bet' | 'avoid' | 'no_edge' {
    if (edge < 0.03) return 'no_edge';
    if (edge > 0.15 && kelly > 0.05 && confidence > 0.7 && risk === 'low') return 'strong_bet';
    if (edge > 0.05 && kelly > 0.02 && risk !== 'high') return 'value_bet';
    return 'avoid';
  }

  private generateValueReasoning(
    fair: FairOdds,
    market: MarketOdds, 
    edge: number,
    kelly: number
  ): string[] {
    const reasons: string[] = [];
    
    if (edge > 0.1) {
      reasons.push(`Edge significatif: ${(edge * 100).toFixed(1)}%`);
    }
    
    if (kelly > 0.05) {
      reasons.push(`Kelly favorable: ${(kelly * 100).toFixed(1)}% bankroll`);
    }
    
    if (fair.confidence > 0.8) {
      reasons.push(`Haute confiance Monte Carlo: ${(fair.confidence * 100).toFixed(1)}%`);
    }
    
    if (market.odds > fair.fairOdds * 1.1) {
      reasons.push(`Bookmaker sous-estime: ${market.odds.toFixed(2)} vs ${fair.fairOdds.toFixed(2)}`);
    }
    
    const biasKey = `${market.bookmaker}_${fair.market}`;
    const historicalBias = this.getHistoricalBias(biasKey);
    if (historicalBias < -0.02) {
      reasons.push('Biais historique bookmaker favorable');
    }
    
    return reasons;
  }

  async analyzeMarketEfficiency(markets: string[]): Promise<Map<string, MarketEfficiency>> {
    console.log(`📊 Analyzing market efficiency for ${markets.length} markets`);
    
    const efficiency = new Map<string, MarketEfficiency>();
    
    for (const market of markets) {
      const marketData = await this.getMarketHistoricalData(market);
      
      efficiency.set(market, {
        overround: this.calculateOverround(marketData),
        bias: this.calculateMarketBias(marketData),
        consistency: this.calculateConsistency(marketData),
        sharpness: this.calculateSharpness(marketData),
        calibration: this.calculateCalibration(marketData),
        profitOpportunity: this.calculateProfitOpportunity(marketData)
      });
    }
    
    return efficiency;
  }

  private async getMarketHistoricalData(market: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('market_analysis')
      .select('*')
      .eq('market', market)
      .gte('date', new Date(Date.now() - 30*24*60*60*1000).toISOString());
    
    return data || [];
  }

  private calculateOverround(data: any[]): number {
    if (!data.length) return 0;
    
    const avgOverround = data.reduce((sum, d) => sum + (d.overround || 0), 0) / data.length;
    return avgOverround;
  }

  private calculateMarketBias(data: any[]): number {
    if (!data.length) return 0;
    
    // Calcul biais systematic (favoris sous-cotés, outsiders sur-cotés)
    return data.reduce((sum, d) => sum + (d.bias || 0), 0) / data.length;
  }

  private calculateConsistency(data: any[]): number {
    if (!data.length) return 0;
    
    const prices = data.map(d => d.avg_odds || 0);
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    
    return 1 / (1 + Math.sqrt(variance)); // Higher consistency = lower variance
  }

  private calculateSharpness(data: any[]): number {
    if (!data.length) return 0;
    
    // Measure of how quickly odds react to information
    return data.reduce((sum, d) => sum + (d.sharpness || 0), 0) / data.length;
  }

  private calculateCalibration(data: any[]): number {
    if (!data.length) return 0;
    
    // Measure of how well probabilities match actual frequencies
    return data.reduce((sum, d) => sum + (d.calibration || 0), 0) / data.length;
  }

  private calculateProfitOpportunity(data: any[]): number {
    if (!data.length) return 0;
    
    const opportunities = data.filter(d => (d.edge || 0) > 0.05).length;
    return opportunities / data.length;
  }

  private async loadHistoricalCalibrations(): Promise<void> {
    // Load bookmaker biases from historical data
    const { data: biases } = await this.supabase
      .from('bookmaker_biases')
      .select('*')
      .gte('updated_at', new Date(Date.now() - 7*24*60*60*1000).toISOString());
    
    biases?.forEach(b => {
      if (!this.bookmakerBiases.has(b.bookmaker)) {
        this.bookmakerBiases.set(b.bookmaker, new Map());
      }
      this.bookmakerBiases.get(b.bookmaker)!.set(b.market, b.bias);
    });
  }

  private getBookmakerBias(bookmaker: string, market: string): number {
    return this.bookmakerBiases.get(bookmaker)?.get(market) || 0;
  }

  private getHistoricalBias(marketKey: string): number {
    // Simplified - could be enhanced with more sophisticated bias tracking
    return 0;
  }

  async saveValueOpportunities(opportunities: ValueOpportunity[]): Promise<void> {
    if (!opportunities.length) return;
    
    const records = opportunities.map(opp => ({
      fixture_id: opp.fixtureId,
      market: opp.market,
      bookmaker: opp.bookmaker,
      market_odds: opp.marketOdds,
      fair_odds: opp.fairOdds,
      edge: opp.edge,
      kelly: opp.kelly,
      confidence: opp.confidence,
      expected_value: opp.expectedValue,
      risk_level: opp.riskLevel,
      recommendation: opp.recommendation,
      reasoning: opp.reasoning,
      created_at: new Date().toISOString()
    }));
    
    await this.supabase.from('value_opportunities').insert(records);
    console.log(`💾 Saved ${opportunities.length} value opportunities`);
  }
}

export default OddsCalibration;
export type { FairOdds, ValueOpportunity, MarketEfficiency, MarketOdds };