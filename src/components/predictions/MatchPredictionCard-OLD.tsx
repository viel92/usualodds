/**
 * COMPOSANT CARTE PRÉDICTION MATCH PREMIUM
 * Affichage détaillé d'un match avec prédictions, odds et value bets
 * VERSION PREMIUM AVEC DESIGN SYSTEM
 */

'use client';

import { Button } from '@/components/ui/button-premium';
import { Card } from '@/components/ui/card-premium';
import { Badge, ConfidenceBadge, StatusBadge } from '@/components/ui/badge-premium';
import { 
  TrendingUp, 
  Target, 
  AlertTriangle,
  BarChart3,
  Trophy,
  Users,
  Calendar,
  Crown,
  Eye
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
  
  const getStatusConfig = (status: string): 'online' | 'offline' | 'loading' | 'error' | 'maintenance' => {
    switch (status) {
      case 'in_1h': return 'loading';
      case 'live': return 'online';
      default: return 'offline';
    }
  };

  const getValueBadgeVariant = (confidence: string) => {
    switch (confidence) {
      case 'VERY_HIGH': return 'success';
      case 'HIGH': return 'success';
      case 'MEDIUM': return 'primary';
      default: return 'default';
    }
  };

  const getImportanceIcon = (importance?: string) => {
    switch (importance) {
      case 'high': return <Trophy className="h-4 w-4 text-warning-500" />;
      case 'medium': return <Users className="h-4 w-4 text-primary-500" />;
      default: return null;
    }
  };

  const mostLikelyOutcome = Math.max(match.predictions.homeWin, match.predictions.draw, match.predictions.awayWin);
  const mostLikelyResult = match.predictions.homeWin === mostLikelyOutcome ? 'HOME' :
                          match.predictions.draw === mostLikelyOutcome ? 'DRAW' : 'AWAY';

  const getPredictedWinner = () => {
    if (mostLikelyResult === 'HOME') return { team: match.homeTeam, type: 'home' };
    if (mostLikelyResult === 'AWAY') return { team: match.awayTeam, type: 'away' };
    return { team: 'Match Nul', type: 'draw' };
  };

  const winner = getPredictedWinner();

  if (compact) {
    return (
      <Card variant="elevated" interactive="hover" className="border-l-4 border-l-primary-500">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusBadge status={getStatusConfig(match.status)} />
              <div>
                <div className="font-semibold text-sm text-neutral-900">
                  {match.homeTeam} vs {match.awayTeam}
                </div>
                <Badge variant="outline" size="sm">{match.league}</Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <ConfidenceBadge confidence={Math.round(match.predictions.confidence * 100)} />
              
              {match.value && (
                <Badge variant={getValueBadgeVariant(match.value.confidence)} size="sm">
                  +{match.value.expectedValue}%
                </Badge>
              )}
              
              <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />} onClick={() => onDetailsClick?.(match.id)}>
                Détails
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" interactive="hover" className="border-l-4 border-l-primary-500">
      <div className="p-6">
        {/* Header Premium */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <StatusBadge status={getStatusConfig(match.status)} />
            <Badge variant="outline" size="sm">{match.league}</Badge>
            {match.context?.isRivalry && (
              <Badge variant="warning" size="sm">DERBY</Badge>
            )}
            {getImportanceIcon(match.context?.importance)}
          </div>
          
          <Badge variant="secondary">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(match.matchDate).toLocaleDateString('fr-FR')} • {new Date(match.matchDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Match Teams Premium */}
          <div className="lg:col-span-4">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="font-bold text-headline-md text-neutral-900 mb-2">{match.homeTeam}</div>
                <div className="text-caption-md text-neutral-600 mb-2">Domicile</div>
                {winner.type === 'home' && (
                  <Badge variant="gold" size="sm">
                    <Crown className="w-3 h-3 mr-1" />
                    Favori
                  </Badge>
                )}
              </div>
              
              <div className="text-center mx-6">
                <div className="text-display-md font-black text-neutral-400">VS</div>
                <div className="text-caption-md text-neutral-400 mt-1">
                  xG: {match.predictions.expectedGoals.home.toFixed(1)} - {match.predictions.expectedGoals.away.toFixed(1)}
                </div>
              </div>
              
              <div className="text-center flex-1">
                <div className="font-bold text-headline-md text-neutral-900 mb-2">{match.awayTeam}</div>
                <div className="text-caption-md text-neutral-600 mb-2">Extérieur</div>
                {winner.type === 'away' && (
                  <Badge variant="gold" size="sm">
                    <Crown className="w-3 h-3 mr-1" />
                    Favori
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* AI Predictions Premium */}
          <div className="lg:col-span-3">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Target className="h-4 w-4 text-primary-600" />
                <span className="font-semibold text-sm">Prédiction IA</span>
              </div>
              <ConfidenceBadge confidence={Math.round(match.predictions.confidence * 100)} />
            </div>
            
            {/* 1X2 Probabilities Premium */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card variant={mostLikelyResult === 'HOME' ? 'gradient' : 'default'} padding="sm" className="text-center">
                <div className="font-bold text-headline-md text-primary-700">{Math.round(match.predictions.homeWin * 100)}%</div>
                <div className="text-caption-md text-neutral-600">1</div>
                {mostLikelyResult === 'HOME' && <Crown className="w-4 h-4 text-warning-500 mx-auto mt-1" />}
              </Card>
              <Card variant={mostLikelyResult === 'DRAW' ? 'gradient' : 'default'} padding="sm" className="text-center">
                <div className="font-bold text-headline-md text-neutral-700">{Math.round(match.predictions.draw * 100)}%</div>
                <div className="text-caption-md text-neutral-600">X</div>
                {mostLikelyResult === 'DRAW' && <Crown className="w-4 h-4 text-warning-500 mx-auto mt-1" />}
              </Card>
              <Card variant={mostLikelyResult === 'AWAY' ? 'gradient' : 'default'} padding="sm" className="text-center">
                <div className="font-bold text-headline-md text-secondary-700">{Math.round(match.predictions.awayWin * 100)}%</div>
                <div className="text-caption-md text-neutral-600">2</div>
                {mostLikelyResult === 'AWAY' && <Crown className="w-4 h-4 text-warning-500 mx-auto mt-1" />}
              </Card>
            </div>
            
            {/* Additional Markets */}
            <div className="grid grid-cols-2 gap-2">
              <Card variant="default" padding="sm" className="text-center">
                <div className="font-medium text-sm">{Math.round(match.predictions.btts * 100)}%</div>
                <div className="text-caption-md text-neutral-600">BTTS</div>
              </Card>
              <Card variant="default" padding="sm" className="text-center">
                <div className="font-medium text-sm">{Math.round(match.predictions.over25 * 100)}%</div>
                <div className="text-caption-md text-neutral-600">O2.5</div>
              </Card>
            </div>
          </div>

          {/* Bookmaker Odds Premium */}
          <div className="lg:col-span-2">
            <div className="text-center mb-4">
              <span className="font-semibold text-sm text-neutral-600">Odds Bookmaker</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Card variant="gradient" padding="sm" className="text-center">
                <div className="font-bold text-primary-700">{match.bookmakerOdds.homeWin}</div>
                <div className="text-caption-md text-neutral-600">1</div>
              </Card>
              <Card variant="default" padding="sm" className="text-center">
                <div className="font-bold text-neutral-700">{match.bookmakerOdds.draw}</div>
                <div className="text-caption-md text-neutral-600">X</div>
              </Card>
              <Card variant="gradient" padding="sm" className="text-center">
                <div className="font-bold text-secondary-700">{match.bookmakerOdds.awayWin}</div>
                <div className="text-caption-md text-neutral-600">2</div>
              </Card>
            </div>
          </div>

          {/* Value Bet Premium */}
          <div className="lg:col-span-2">
            {match.value ? (
              <div className="text-center">
                <div className="mb-3">
                  <TrendingUp className="h-5 w-5 text-success-600 mx-auto" />
                </div>
                <Badge variant={getValueBadgeVariant(match.value.confidence)} size="lg" className="mb-2">
                  {match.value.recommendation}
                </Badge>
                <div className="text-headline-lg font-bold text-success-600">
                  +{match.value.expectedValue}%
                </div>
                <div className="text-caption-md text-neutral-600">{match.value.market}</div>
                <Badge variant="outline" size="sm" className="mt-1">
                  {match.value.confidence}
                </Badge>
              </div>
            ) : (
              <div className="text-center text-neutral-400">
                <div className="mb-3">
                  <BarChart3 className="h-5 w-5 mx-auto" />
                </div>
                <span className="text-sm">Pas de valeur détectée</span>
              </div>
            )}
          </div>

          {/* Actions Premium */}
          <div className="lg:col-span-1">
            <Button 
              variant="secondary" 
              size="sm" 
              leftIcon={<Eye className="h-4 w-4" />}
              className="w-full"
              onClick={() => onDetailsClick?.(match.id)}
            >
              Détails
            </Button>
          </div>
        </div>

        {/* Context Alerts Premium */}
        {(match.context?.weatherImpact || (match.context?.keyPlayersOut && match.context.keyPlayersOut > 0)) && (
          <div className="mt-6 pt-4 border-t border-neutral-100">
            <div className="flex items-center gap-4">
              {match.context.weatherImpact && (
                <Badge variant="warning" size="sm">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Conditions météo
                </Badge>
              )}
              {match.context.keyPlayersOut && match.context.keyPlayersOut > 0 && (
                <Badge variant="error" size="sm">
                  <Users className="w-3 h-3 mr-1" />
                  {match.context.keyPlayersOut} joueur(s) clé(s) absent(s)
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}