/**
 * API ENDPOINT PRÉDICTIONS MATCHS À VENIR
 * Récupération temps réel des prédictions avec odds et value bets
 * SAFE: Lecture seule, aucun risque pour la collecte en cours
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const timeFrame = searchParams.get('timeframe') || 'today';
  const league = searchParams.get('league');
  const minConfidence = parseFloat(searchParams.get('minConfidence') || '0');
  const valueOnly = searchParams.get('valueOnly') === 'true';

  try {
    const now = new Date();
    
    // Données mockées pour l'instant - à remplacer quand collecte terminée
    const mockUpcomingMatches = [
      {
        id: 'match_psg_marseille_2025',
        homeTeam: {
          id: 'team_psg',
          name: 'Paris Saint Germain',
          shortName: 'PSG',
          logo: '/teams/psg.png'
        },
        awayTeam: {
          id: 'team_marseille',
          name: 'Olympique de Marseille',
          shortName: 'OM',
          logo: '/teams/marseille.png'
        },
        matchDate: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        league: {
          id: 'league_ligue1',
          name: 'Ligue 1',
          country: 'France',
          logo: '/leagues/ligue1.png'
        },
        status: 'in_1h',
        predictions: {
          homeWin: 0.65,
          draw: 0.22,
          awayWin: 0.13,
          confidence: 0.87,
          expectedGoals: { home: 2.1, away: 0.8 },
          btts: 0.35,
          over25: 0.68,
          timeWindow: 'T1',
          generatedAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString()
        },
        bookmakerOdds: {
          homeWin: 1.45,
          draw: 4.20,
          awayWin: 6.50,
          source: 'bet365',
          updatedAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString()
        },
        valueBet: {
          market: '1X2',
          recommendation: 'HOME',
          expectedValue: 12.3,
          confidence: 'HIGH',
          reasoning: 'Probabilité prédite (65%) vs odds bookmaker (69%) - Edge significatif'
        },
        context: {
          isRivalry: true,
          importance: 'high',
          weatherImpact: false,
          keyPlayersOut: 0,
          recentForm: {
            home: { wins: 4, draws: 1, losses: 0 },
            away: { wins: 2, draws: 2, losses: 1 }
          }
        }
      }
    ];

    // Filtrer selon paramètres
    let filteredMatches = mockUpcomingMatches;

    if (minConfidence > 0) {
      filteredMatches = filteredMatches.filter(match => 
        match.predictions && match.predictions.confidence >= minConfidence
      );
    }

    if (valueOnly) {
      filteredMatches = filteredMatches.filter(match => match.valueBet);
    }

    const response = {
      success: true,
      data: filteredMatches,
      meta: {
        total: filteredMatches.length,
        timeFrame,
        filters: { league, minConfidence, valueOnly },
        generatedAt: now.toISOString(),
        nextUpdate: new Date(now.getTime() + 15 * 60 * 1000).toISOString()
      },
      status: {
        predictionEngine: 'operational',
        dataCollectionPhase: 'phase_1_in_progress',
        lastModelUpdate: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        availableLeagues: ['Ligue 1', 'Premier League', 'La Liga', 'Bundesliga', 'Serie A']
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch upcoming matches',
        data: [],
        meta: { total: 0, timeFrame, generatedAt: new Date().toISOString() }
      }, 
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}