/**
 * PROFESSIONAL MATCH PREDICTION CARD
 * Modern, clean design inspired by FiveThirtyEight and premium sports platforms
 * Features: Team logos, comprehensive stats, visual hierarchy, no emojis
 */

'use client';

import { DESIGN_TOKENS, getConfidenceColor, getPredictionColor, getTeamLogoUrl } from '@/lib/design-system-professional';
import { 
  TrendingUp, 
  Target, 
  AlertTriangle,
  BarChart3,
  Trophy,
  Users,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  Activity,
  Zap
} from 'lucide-react';
import Image from 'next/image';

interface MatchPredictionCardProps {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    matchDate: string;
    league: string;
    status: 'scheduled' | 'in_1h' | 'live';
    hasLineup?: boolean; // New: distinguish matches with/without lineup
    predictions: {
      homeWin: number;
      draw: number;
      awayWin: number;
      confidence: number;
      expectedGoals: { home: number; away: number };
      btts: number;
      over25: number;
    };
    features?: {
      homeElo?: number;
      awayElo?: number;
      homeForm?: number;
      awayForm?: number;
      homeXG?: number;
      awayXG?: number;
      dataQuality?: number;
    };
    bookmakerOdds?: {
      homeWin: number;
      draw: number;
      awayWin: number;
    };
    value?: {
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
      topScorers?: {
        home: Array<{name: string; goals: number; form: number}>;
        away: Array<{name: string; goals: number; form: number}>;
      };
      trendingPlayers?: {
        home: Array<{name: string; position: string; form: number}>;
        away: Array<{name: string; position: string; form: number}>;
      };
      injuries?: {
        home: Array<{name: string; injury: string; severity: string}>;
        away: Array<{name: string; injury: string; severity: string}>;
      };
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
  
  // Professional utility functions
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'live': 
        return { 
          label: 'EN DIRECT', 
          className: 'bg-red-500 text-white animate-pulse',
          icon: <Activity className="w-3 h-3" />
        };
      case 'in_1h': 
        return { 
          label: 'DANS 1H', 
          className: 'bg-orange-500 text-white',
          icon: <Clock className="w-3 h-3" />
        };
      default: 
        return { 
          label: 'PROGRAMME', 
          className: 'bg-neutral-500 text-white',
          icon: <Calendar className="w-3 h-3" />
        };
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 75) return { label: 'TRES HAUTE', className: 'bg-success-100 text-success-700 border-success-200' };
    if (confidence >= 65) return { label: 'HAUTE', className: 'bg-primary-100 text-primary-700 border-primary-200' };
    if (confidence >= 55) return { label: 'MOYENNE', className: 'bg-warning-100 text-warning-700 border-warning-200' };
    return { label: 'FAIBLE', className: 'bg-neutral-100 text-neutral-700 border-neutral-200' };
  };

  // Calculate prediction data
  const mostLikelyOutcome = Math.max(match.predictions.homeWin, match.predictions.draw, match.predictions.awayWin);
  const predictedOutcome = match.predictions.homeWin === mostLikelyOutcome ? 'home' :
                          match.predictions.draw === mostLikelyOutcome ? 'draw' : 'away';

  const statusDisplay = getStatusDisplay(match.status);
  const confidenceBadge = getConfidenceBadge(match.predictions.confidence);
  
  // Team logos
  const homeLogoUrl = getTeamLogoUrl(match.homeTeam, match.homeTeamLogo);
  const awayLogoUrl = getTeamLogoUrl(match.awayTeam, match.awayTeamLogo);

  // Compact version for lists
  if (compact) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
           onClick={() => onDetailsClick?.(match.id)}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Team logos compact */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 relative">
                  <Image 
                    src={homeLogoUrl} 
                    alt={match.homeTeam}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/team-logo-placeholder.svg';
                    }}
                  />
                </div>
                <span className="text-xs text-neutral-400">VS</span>
                <div className="w-6 h-6 relative">
                  <Image 
                    src={awayLogoUrl} 
                    alt={match.awayTeam}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/team-logo-placeholder.svg';
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div className="font-semibold text-sm text-neutral-900">
                  {match.homeTeam} - {match.awayTeam}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-neutral-500">{match.league}</span>
                  {match.hasLineup && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">
                      <Users className="w-3 h-3 mr-1" />
                      Compo
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${confidenceBadge.className}`}>
                {Math.round(match.predictions.confidence)}%
              </span>
              
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full card version
  return (
    <div className={`bg-white border border-neutral-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${
      match.hasLineup ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-neutral-300'
    }`}>
      <div className="p-6">
        {/* Professional Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusDisplay.className}`}>
              {statusDisplay.icon}
              {statusDisplay.label}
            </span>
            
            {/* League */}
            <span className="text-sm text-neutral-600 font-medium">{match.league}</span>
            
            {/* Context indicators */}
            {match.hasLineup && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700 font-medium">
                <Users className="w-3 h-3 mr-1" />
                Composition confirmée
              </span>
            )}
            
            {match.context?.isRivalry && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-100 text-red-700 font-medium">
                <Zap className="w-3 h-3 mr-1" />
                DERBY
              </span>
            )}
          </div>
          
          {/* Date and time */}
          <div className="text-right">
            <div className="text-sm font-medium text-neutral-900">
              {new Date(match.matchDate).toLocaleDateString('fr-FR', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
              })}
            </div>
            <div className="text-sm text-neutral-500">
              {new Date(match.matchDate).toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>

        {/* Teams section with professional layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Team matchup section */}
          <div className="lg:col-span-5">
            <div className="flex items-center justify-between">
              {/* Home team */}
              <div className="text-center flex-1">
                <div className="w-12 h-12 mx-auto mb-3 relative">
                  <Image 
                    src={homeLogoUrl} 
                    alt={match.homeTeam}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/team-logo-placeholder.svg';
                    }}
                  />
                </div>
                <div className="font-bold text-lg text-neutral-900 mb-1">{match.homeTeam}</div>
                <div className="text-xs text-neutral-500 mb-2">DOMICILE</div>
                {predictedOutcome === 'home' && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800 font-medium">
                    <Trophy className="w-3 h-3 mr-1" />
                    FAVORI
                  </span>
                )}
                {match.features?.homeElo && (
                  <div className="text-xs text-neutral-500 mt-1">ELO: {Math.round(match.features.homeElo)}</div>
                )}
              </div>
              
              {/* VS section */}
              <div className="text-center mx-8">
                <div className="text-2xl font-black text-neutral-300 mb-2">VS</div>
                {match.predictions.expectedGoals && (
                  <div className="text-xs text-neutral-500">
                    xG: {match.predictions.expectedGoals.home.toFixed(1)} - {match.predictions.expectedGoals.away.toFixed(1)}
                  </div>
                )}
                {match.features?.dataQuality && (
                  <div className="text-xs text-neutral-400 mt-1">
                    Qualité: {Math.round(match.features.dataQuality * 100)}%
                  </div>
                )}
              </div>
              
              {/* Away team */}
              <div className="text-center flex-1">
                <div className="w-12 h-12 mx-auto mb-3 relative">
                  <Image 
                    src={awayLogoUrl} 
                    alt={match.awayTeam}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/team-logo-placeholder.svg';
                    }}
                  />
                </div>
                <div className="font-bold text-lg text-neutral-900 mb-1">{match.awayTeam}</div>
                <div className="text-xs text-neutral-500 mb-2">EXTERIEUR</div>
                {predictedOutcome === 'away' && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800 font-medium">
                    <Trophy className="w-3 h-3 mr-1" />
                    FAVORI
                  </span>
                )}
                {match.features?.awayElo && (
                  <div className="text-xs text-neutral-500 mt-1">ELO: {Math.round(match.features.awayElo)}</div>
                )}
              </div>
            </div>
          </div>

          {/* Professional Predictions Section */}
          <div className="lg:col-span-4">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Target className="h-5 w-5 text-primary-600" />
                <span className="font-semibold text-neutral-900">PREDICTION ML</span>
              </div>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${confidenceBadge.className}`}>
                {Math.round(match.predictions.confidence)}% {confidenceBadge.label}
              </span>
            </div>
            
            {/* 1X2 Professional Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className={`p-3 rounded-lg border text-center ${
                predictedOutcome === 'home' ? 'bg-blue-50 border-blue-200' : 'bg-neutral-50 border-neutral-200'
              }`}>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {Math.round(match.predictions.homeWin * 100)}%
                </div>
                <div className="text-xs text-neutral-600">VICTOIRE 1</div>
                {predictedOutcome === 'home' && (
                  <div className="mt-1">
                    <Trophy className="w-4 h-4 text-yellow-500 mx-auto" />
                  </div>
                )}
              </div>
              
              <div className={`p-3 rounded-lg border text-center ${
                predictedOutcome === 'draw' ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-50 border-neutral-200'
              }`}>
                <div className="text-2xl font-bold text-neutral-700 mb-1">
                  {Math.round(match.predictions.draw * 100)}%
                </div>
                <div className="text-xs text-neutral-600">MATCH NUL</div>
                {predictedOutcome === 'draw' && (
                  <div className="mt-1">
                    <Trophy className="w-4 h-4 text-yellow-500 mx-auto" />
                  </div>
                )}
              </div>
              
              <div className={`p-3 rounded-lg border text-center ${
                predictedOutcome === 'away' ? 'bg-red-50 border-red-200' : 'bg-neutral-50 border-neutral-200'
              }`}>
                <div className="text-2xl font-bold text-red-600 mb-1">
                  {Math.round(match.predictions.awayWin * 100)}%
                </div>
                <div className="text-xs text-neutral-600">VICTOIRE 2</div>
                {predictedOutcome === 'away' && (
                  <div className="mt-1">
                    <Trophy className="w-4 h-4 text-yellow-500 mx-auto" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Additional Markets */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-neutral-50 rounded border text-center">
                <div className="font-semibold text-neutral-900">{Math.round(match.predictions.btts * 100)}%</div>
                <div className="text-xs text-neutral-600">BTTS</div>
              </div>
              <div className="p-2 bg-neutral-50 rounded border text-center">
                <div className="font-semibold text-neutral-900">{Math.round(match.predictions.over25 * 100)}%</div>
                <div className="text-xs text-neutral-600">PLUS 2.5</div>
              </div>
            </div>
          </div>

          {/* Bookmaker Odds (optional) */}
          {match.bookmakerOdds && (
            <div className="lg:col-span-2">
              <div className="text-center mb-4">
                <span className="font-semibold text-sm text-neutral-600">COTES BOOKMAKER</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-neutral-50 rounded border text-center">
                  <div className="font-bold text-neutral-900">{match.bookmakerOdds.homeWin}</div>
                  <div className="text-xs text-neutral-600">1</div>
                </div>
                <div className="p-2 bg-neutral-50 rounded border text-center">
                  <div className="font-bold text-neutral-900">{match.bookmakerOdds.draw}</div>
                  <div className="text-xs text-neutral-600">X</div>
                </div>
                <div className="p-2 bg-neutral-50 rounded border text-center">
                  <div className="font-bold text-neutral-900">{match.bookmakerOdds.awayWin}</div>
                  <div className="text-xs text-neutral-600">2</div>
                </div>
              </div>
            </div>
          )}

          {/* Value Analysis (optional) */}
          {match.value ? (
            <div className="lg:col-span-1">
              <div className="text-center">
                <div className="mb-2">
                  <TrendingUp className="h-5 w-5 text-success-600 mx-auto" />
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-success-100 text-success-700 font-medium mb-2">
                  {match.value.recommendation}
                </span>
                <div className="text-lg font-bold text-success-600">
                  +{match.value.expectedValue}%
                </div>
                <div className="text-xs text-neutral-600">{match.value.market}</div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-1">
              <div className="text-center text-neutral-400">
                <BarChart3 className="h-5 w-5 mx-auto mb-2" />
                <span className="text-xs">Analyse en cours</span>
              </div>
            </div>
          )}
        </div>

        {/* Professional Match Context */}
        {(match.context?.topScorers || match.context?.trendingPlayers || match.context?.injuries || match.context?.weatherImpact) && (
          <div className="mt-6 pt-4 border-t border-neutral-100">
            
            {/* Top Scorers */}
            {(match.context.topScorers?.home?.length > 0 || match.context.topScorers?.away?.length > 0) && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">Potentiels Buteurs</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    {match.context.topScorers?.home?.slice(0, 2).map((scorer, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-blue-50 px-2 py-1 rounded mb-1">
                        <span className="font-medium text-blue-900">{scorer.name}</span>
                        <span className="text-blue-700">{scorer.goals}⚽</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    {match.context.topScorers?.away?.slice(0, 2).map((scorer, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-red-50 px-2 py-1 rounded mb-1">
                        <span className="font-medium text-red-900">{scorer.name}</span>
                        <span className="text-red-700">{scorer.goals}⚽</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Trending Players */}
            {(match.context.trendingPlayers?.home?.length > 0 || match.context.trendingPlayers?.away?.length > 0) && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">Joueurs En Vogue</h4>
                <div className="flex flex-wrap gap-2">
                  {match.context.trendingPlayers?.home?.map((player, i) => (
                    <span key={`h-${i}`} className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700 font-medium">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {player.name} ({player.position})
                    </span>
                  ))}
                  {match.context.trendingPlayers?.away?.map((player, i) => (
                    <span key={`a-${i}`} className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700 font-medium">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {player.name} ({player.position})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Injuries */}
            {(match.context.injuries?.home?.length > 0 || match.context.injuries?.away?.length > 0) && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">Absences Confirmées</h4>
                <div className="space-y-1">
                  {match.context.injuries?.home?.map((injury, i) => (
                    <div key={`h-${i}`} className="flex items-center justify-between text-xs bg-red-50 px-2 py-1 rounded">
                      <span className="font-medium text-red-900">{injury.name}</span>
                      <span className="text-red-700">{injury.injury}</span>
                    </div>
                  ))}
                  {match.context.injuries?.away?.map((injury, i) => (
                    <div key={`a-${i}`} className="flex items-center justify-between text-xs bg-red-50 px-2 py-1 rounded">
                      <span className="font-medium text-red-900">{injury.name}</span>
                      <span className="text-red-700">{injury.injury}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alerts */}
            <div className="flex items-center gap-3">
              {match.context.weatherImpact && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-700 font-medium">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Conditions météo défavorables
                </span>
              )}
              {match.context.isRivalry && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-700 font-medium">
                  <Zap className="w-3 h-3 mr-1" />
                  Derby
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Action button */}
        {onDetailsClick && (
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <button 
              onClick={() => onDetailsClick(match.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors duration-200 text-sm font-medium text-neutral-700 hover:text-neutral-900"
            >
              <BarChart3 className="w-4 h-4" />
              Voir analyse détaillée
            </button>
          </div>
        )}
      </div>
    </div>
  );
}