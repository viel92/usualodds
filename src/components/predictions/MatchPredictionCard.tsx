/**
 * COMPOSANT CARTE PRÉDICTION MATCH
 * Affichage détaillé d'un match avec prédictions, odds et value bets
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  TrendingUp, 
  Target, 
  AlertTriangle, 
  Zap,
  BarChart3,
  Trophy,
  Users,
  Calendar
} from 'lucide-react';

interface MatchPredictionCardProps {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    matchDate: string;
    league: string;
    status: 'scheduled' | 'in_1h' | 'live';
    predictions: {
      homeWin: number;
      draw: number;
      awayWin: number;
      confidence: number;
      expectedGoals: { home: number; away: number };
      btts: number;
      over25: number;
    };
    bookmakerOdds: {
      homeWin: number;
      draw: number;
      awayWin: number;
    };
    value: {
      market: string;
      recommendation: string;
      expectedValue: number;
      confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
    } | null;
    context?: {
      isRivalry?: boolean;
      importance?: 'low' | 'medium' | 'high';
      weatherImpact?: boolean;
      keyPlayersOut?: number;
    };
  };
  onDetailsClick?: (matchId: string) => void;
  compact?: boolean;
}

export default function MatchPredictionCard({ 
  match, 
  onDetailsClick,
  compact = false 
}: MatchPredictionCardProps) {
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'in_1h': 
        return {
          icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
          text: 'Dans 1h',
          color: 'bg-orange-100 text-orange-800 border-orange-200'
        };
      case 'live': 
        return {
          icon: <Zap className="h-4 w-4 text-red-500 animate-pulse" />,
          text: 'EN DIRECT',
          color: 'bg-red-100 text-red-800 border-red-200'
        };
      default: 
        return {
          icon: <Clock className="h-4 w-4 text-blue-500" />,
          text: 'Programmé',
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        };
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-gradient-to-r from-green-500 to-green-600';
    if (confidence >= 0.65) return 'bg-gradient-to-r from-blue-500 to-blue-600';
    if (confidence >= 0.5) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    return 'bg-gradient-to-r from-gray-400 to-gray-500';
  };

  const getValueBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'VERY_HIGH': return 'bg-green-600 text-white animate-pulse';
      case 'HIGH': return 'bg-green-500 text-white';
      case 'MEDIUM': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getImportanceIcon = (importance?: string) => {
    switch (importance) {
      case 'high': return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'medium': return <Users className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const statusConfig = getStatusConfig(match.status);
  const mostLikelyOutcome = Math.max(match.predictions.homeWin, match.predictions.draw, match.predictions.awayWin);
  const mostLikelyResult = match.predictions.homeWin === mostLikelyOutcome ? 'HOME' :
                          match.predictions.draw === mostLikelyOutcome ? 'DRAW' : 'AWAY';

  if (compact) {
    return (
      <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {statusConfig.icon}
              <div>
                <div className="font-semibold text-sm">
                  {match.homeTeam} vs {match.awayTeam}
                </div>
                <div className="text-xs text-gray-500">{match.league}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-sm font-medium">{Math.round(match.predictions.confidence * 100)}%</div>
                <div className="text-xs text-gray-500">Confiance</div>
              </div>
              
              {match.value && (
                <Badge className={getValueBadgeColor(match.value.confidence)}>
                  +{match.value.expectedValue}%
                </Badge>
              )}
              
              <Button variant="ghost" size="sm" onClick={() => onDetailsClick?.(match.id)}>
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Badge className={statusConfig.color} variant="outline">
              {statusConfig.icon}
              {statusConfig.text}
            </Badge>
            <span className="text-sm font-medium text-gray-600">{match.league}</span>
            {match.context?.isRivalry && (
              <Badge variant="destructive" className="text-xs">DERBY</Badge>
            )}
            {getImportanceIcon(match.context?.importance)}
          </div>
          
          <div className="text-sm text-gray-500">
            {new Date(match.matchDate).toLocaleDateString('fr-FR')} • {new Date(match.matchDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Match Teams */}
          <div className="lg:col-span-4">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="font-bold text-lg">{match.homeTeam}</div>
                <div className="text-sm text-gray-500 mt-1">Domicile</div>
              </div>
              
              <div className="text-center mx-6">
                <div className="text-2xl font-bold text-gray-400">VS</div>
                <div className="text-xs text-gray-400 mt-1">
                  {match.predictions.expectedGoals.home.toFixed(1)} - {match.predictions.expectedGoals.away.toFixed(1)}
                </div>
              </div>
              
              <div className="text-center flex-1">
                <div className="font-bold text-lg">{match.awayTeam}</div>
                <div className="text-sm text-gray-500 mt-1">Extérieur</div>
              </div>
            </div>
          </div>

          {/* AI Predictions */}
          <div className="lg:col-span-3">
            <div className="text-center mb-3">
              <div className="flex items-center justify-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-sm">Prédiction IA</span>
              </div>
            </div>
            
            {/* Confidence Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Confiance</span>
                <span className="font-semibold">{Math.round(match.predictions.confidence * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getConfidenceColor(match.predictions.confidence)}`}
                  style={{ width: `${match.predictions.confidence * 100}%` }}
                />
              </div>
            </div>
            
            {/* 1X2 Probabilities */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className={`text-center p-2 rounded ${mostLikelyResult === 'HOME' ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}>
                <div className="font-bold">{Math.round(match.predictions.homeWin * 100)}%</div>
                <div className="text-xs text-gray-600">1</div>
              </div>
              <div className={`text-center p-2 rounded ${mostLikelyResult === 'DRAW' ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}>
                <div className="font-bold">{Math.round(match.predictions.draw * 100)}%</div>
                <div className="text-xs text-gray-600">X</div>
              </div>
              <div className={`text-center p-2 rounded ${mostLikelyResult === 'AWAY' ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}>
                <div className="font-bold">{Math.round(match.predictions.awayWin * 100)}%</div>
                <div className="text-xs text-gray-600">2</div>
              </div>
            </div>
            
            {/* Additional Markets */}
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div className="text-center p-1 bg-gray-50 rounded">
                <div className="font-medium">{Math.round(match.predictions.btts * 100)}%</div>
                <div className="text-gray-600">BTTS</div>
              </div>
              <div className="text-center p-1 bg-gray-50 rounded">
                <div className="font-medium">{Math.round(match.predictions.over25 * 100)}%</div>
                <div className="text-gray-600">O2.5</div>
              </div>
            </div>
          </div>

          {/* Bookmaker Odds */}
          <div className="lg:col-span-2">
            <div className="text-center mb-3">
              <span className="font-semibold text-sm text-gray-600">Odds Bookmaker</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="font-bold text-blue-700">{match.bookmakerOdds.homeWin}</div>
                <div className="text-xs text-gray-600">1</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="font-bold text-blue-700">{match.bookmakerOdds.draw}</div>
                <div className="text-xs text-gray-600">X</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="font-bold text-blue-700">{match.bookmakerOdds.awayWin}</div>
                <div className="text-xs text-gray-600">2</div>
              </div>
            </div>
          </div>

          {/* Value Bet */}
          <div className="lg:col-span-2">
            {match.value ? (
              <div className="text-center">
                <div className="mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600 mx-auto" />
                </div>
                <Badge className={`${getValueBadgeColor(match.value.confidence)} mb-2`}>
                  {match.value.recommendation}
                </Badge>
                <div className="text-lg font-bold text-green-600">
                  +{match.value.expectedValue}%
                </div>
                <div className="text-xs text-gray-500">{match.value.market}</div>
                <div className="text-xs text-gray-400 mt-1">{match.value.confidence}</div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <div className="mb-2">
                  <BarChart3 className="h-5 w-5 mx-auto" />
                </div>
                <span className="text-sm">Pas de valeur détectée</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="lg:col-span-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => onDetailsClick?.(match.id)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Détails
            </Button>
          </div>
        </div>

        {/* Context Alerts */}
        {(match.context?.weatherImpact || (match.context?.keyPlayersOut && match.context.keyPlayersOut > 0)) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm">
              {match.context.weatherImpact && (
                <div className="flex items-center gap-1 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Conditions météo</span>
                </div>
              )}
              {match.context.keyPlayersOut && match.context.keyPlayersOut > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <Users className="h-4 w-4" />
                  <span>{match.context.keyPlayersOut} joueur(s) clé(s) absent(s)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}