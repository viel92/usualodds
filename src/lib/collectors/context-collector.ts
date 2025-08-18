import { BaseCollector } from './base-collector';
import { WindowType } from '@/types/database';

interface MatchContext {
  matchId: string;
  window: WindowType;
  collectedAt: string;
  
  // Arbitre
  referee?: RefereeData;
  
  // Historique H2H
  headToHead?: HeadToHeadData;
  
  // Context derby/rivalité
  rivalry?: RivalryData;
  
  // Importance du match
  matchImportance?: MatchImportanceData;
  
  // Contexte calendrier
  calendar?: CalendarContextData;
  
  // Pression/enjeux
  stakes?: MatchStakesData;
}

interface RefereeData {
  name: string;
  nationality: string;
  experience: number;
  
  // Tendances arbitrage
  avgCardsPerMatch: number;
  avgRedCardsPerMatch: number;
  penaltyRate: number;
  strictnessRating: number;
  homeAdvantageInfluence: number;
  
  // Performance récente
  recentMatches: number;
  controversialDecisions: number;
  
  // Spécificités
  bigGameExperience: boolean;
  derbyExperience: boolean;
}

interface HeadToHeadData {
  totalMatches: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  
  // Stats récentes (5 derniers)
  recentForm: string; // Ex: "WDLWW"
  avgGoalsHome: number;
  avgGoalsAway: number;
  avgCards: number;
  
  // Tendances
  dominantTeam?: string;
  streakInfo?: string;
  venueAdvantage: number;
  
  // Patterns spéciaux
  highScoringTendency: boolean;
  defensiveBattles: boolean;
  cardHeavyMatches: boolean;
}

interface RivalryData {
  isRivalry: boolean;
  rivalryLevel: number; // 0-1
  type: 'derby' | 'title_race' | 'relegation' | 'historical' | 'none';
  description?: string;
  
  // Impact sur le jeu
  extraMotivation: number;
  unpredictabilityFactor: number;
  emotionalIntensity: number;
  
  // Historique rivalité
  significantMatches?: string[];
  lastMeetingDate?: string;
  lastMeetingResult?: string;
}

interface MatchImportanceData {
  homeImportance: number; // 0-1
  awayImportance: number; // 0-1
  
  // Types d'enjeux
  homeStakes: MatchStake[];
  awayStakes: MatchStake[];
  
  // Contexte saison
  seasonPhase: 'early' | 'mid' | 'crucial' | 'final_stretch' | 'playoffs';
  matchweek: number;
  remainingMatches: number;
}

interface MatchStake {
  type: 'title' | 'champions_league' | 'europa_league' | 'relegation' | 'pride' | 'revenge';
  urgency: number; // 0-1
  pressure: number; // 0-1
  description: string;
}

interface CalendarContextData {
  // Congestion
  homeMatchesSince: number; // Jours depuis dernier match
  awayMatchesSince: number;
  
  // Matches à venir
  homeNextMatchIn: number; // Jours jusqu'au prochain
  awayNextMatchIn: number;
  
  // Competitions européennes
  homeUCLRecent: boolean;
  awayUCLRecent: boolean;
  homeUCLNext: boolean;
  awayUCLNext: boolean;
  
  // Voyages
  homeTravel: TravelData;
  awayTravel: TravelData;
  
  // Période spéciale
  isHolidayPeriod: boolean;
  isInternationalBreak: boolean;
}

interface TravelData {
  distance: number; // km
  timeZoneChange: number;
  lastTravelDate?: string;
  fatigueRating: number; // 0-1
}

interface MatchStakesData {
  // Pression médiatique
  mediaAttention: number; // 0-1
  tvAudience: number; // Estimation viewers
  
  // Support
  expectedAttendance: number;
  homeSupport: number; // 0-1
  awaySupport: number; // 0-1
  
  // Market expectations
  bookmakerFavorite: 'home' | 'away' | 'draw';
  publicExpectation: 'home' | 'away' | 'draw';
  
  // Narrative/storylines
  storylines: string[];
}

export class ContextCollector extends BaseCollector {
  
  async collectMatchContext(window: WindowType): Promise<void> {
    console.log(`🔍 Collecting match context for window ${window}...`);

    try {
      const matches = await this.getMatchesForWindow(window);
      
      if (matches.length === 0) {
        console.log(`No matches found for context collection at window ${window}`);
        return;
      }

      let collectedContexts = 0;

      for (const match of matches) {
        try {
          const context = await this.buildMatchContext(match, window);
          
          if (context) {
            await this.storeMatchContext(context);
            collectedContexts++;
          }

          // Respecter limites API
          await this.rateLimitDelay(800);

        } catch (error) {
          console.error(`Error collecting context for match ${match.id}:`, error);
        }
      }

      await this.logDataQuality(
        'collection',
        'match_context',
        `context_collection_${window}`,
        'passed',
        {
          window,
          matches_processed: matches.length,
          contexts_collected: collectedContexts
        }
      );

      console.log(`✅ Context collection completed for window ${window}: ${collectedContexts} contexts`);

    } catch (error) {
      console.error(`Error in context collection for window ${window}:`, error);
      
      await this.logDataQuality(
        'collection',
        'match_context',
        `context_collection_${window}`,
        'failed',
        { 
          window,
          error: error instanceof Error ? error.message : String(error)
        }
      );
      
      throw error;
    }
  }

  private async buildMatchContext(match: any, window: WindowType): Promise<MatchContext | null> {
    try {
      console.log(`Building context for ${match.home_team?.name} vs ${match.away_team?.name}`);

      const context: MatchContext = {
        matchId: match.id,
        window,
        collectedAt: new Date().toISOString()
      };

      // 1. Données arbitre
      if (match.referee) {
        context.referee = await this.getRefereeData(match.referee);
      }

      // 2. Historique H2H
      context.headToHead = await this.getHeadToHeadData(
        match.home_team_id,
        match.away_team_id
      );

      // 3. Analyse rivalité
      context.rivalry = await this.analyzeRivalry(match);

      // 4. Importance du match
      context.matchImportance = await this.calculateMatchImportance(match);

      // 5. Contexte calendrier
      context.calendar = await this.getCalendarContext(match);

      // 6. Enjeux et pression
      context.stakes = await this.calculateMatchStakes(match);

      return context;

    } catch (error) {
      console.error(`Error building context for match ${match.id}:`, error);
      return null;
    }
  }

  private async getRefereeData(refereeName: string): Promise<RefereeData | undefined> {
    // Dans l'implémentation réelle, récupérer stats arbitre depuis API ou base interne
    
    // Base de données simplifiée des arbitres principaux
    const refereeDatabase: Record<string, Partial<RefereeData>> = {
      'Michael Oliver': {
        nationality: 'England',
        experience: 15,
        avgCardsPerMatch: 3.2,
        avgRedCardsPerMatch: 0.1,
        penaltyRate: 0.3,
        strictnessRating: 0.7,
        homeAdvantageInfluence: 0.1,
        bigGameExperience: true,
        derbyExperience: true
      },
      'Clément Turpin': {
        nationality: 'France',
        experience: 12,
        avgCardsPerMatch: 4.1,
        avgRedCardsPerMatch: 0.15,
        penaltyRate: 0.35,
        strictnessRating: 0.8,
        homeAdvantageInfluence: 0.05,
        bigGameExperience: true,
        derbyExperience: true
      },
      'Daniele Orsato': {
        nationality: 'Italy',
        experience: 18,
        avgCardsPerMatch: 3.8,
        avgRedCardsPerMatch: 0.12,
        penaltyRate: 0.25,
        strictnessRating: 0.75,
        homeAdvantageInfluence: 0.08,
        bigGameExperience: true,
        derbyExperience: true
      }
    };

    const knownReferee = refereeDatabase[refereeName];
    
    if (knownReferee) {
      return {
        name: refereeName,
        recentMatches: 5,
        controversialDecisions: 1,
        ...knownReferee
      } as RefereeData;
    }

    // Valeurs par défaut pour arbitres inconnus
    return {
      name: refereeName,
      nationality: 'Unknown',
      experience: 8,
      avgCardsPerMatch: 3.5,
      avgRedCardsPerMatch: 0.1,
      penaltyRate: 0.3,
      strictnessRating: 0.6,
      homeAdvantageInfluence: 0.1,
      recentMatches: 3,
      controversialDecisions: 0,
      bigGameExperience: false,
      derbyExperience: false
    };
  }

  private async getHeadToHeadData(
    homeTeamId: string,
    awayTeamId: string
  ): Promise<HeadToHeadData | undefined> {
    try {
      // Récupérer les 10 derniers matchs entre ces équipes
      const { data: h2hMatches } = await this.supabase
        .from('matches')
        .select('*')
        .or(`and(home_team_id.eq.${homeTeamId},away_team_id.eq.${awayTeamId}),and(home_team_id.eq.${awayTeamId},away_team_id.eq.${homeTeamId})`)
        .eq('status', 'finished')
        .order('match_date', { ascending: false })
        .limit(10);

      if (!h2hMatches || h2hMatches.length === 0) {
        return undefined;
      }

      let homeWins = 0;
      let awayWins = 0;
      let draws = 0;
      let totalGoalsHome = 0;
      let totalGoalsAway = 0;
      let totalCards = 0;

      const recentForm: string[] = [];

      h2hMatches.forEach(match => {
        const isHomeTeamAtHome = match.home_team_id === homeTeamId;
        const homeScore = match.home_score || 0;
        const awayScore = match.away_score || 0;

        // Calculer résultat du point de vue de l'équipe "home" actuelle
        if (isHomeTeamAtHome) {
          totalGoalsHome += homeScore;
          totalGoalsAway += awayScore;
          
          if (homeScore > awayScore) {
            homeWins++;
            recentForm.push('W');
          } else if (homeScore < awayScore) {
            awayWins++;
            recentForm.push('L');
          } else {
            draws++;
            recentForm.push('D');
          }
        } else {
          totalGoalsHome += awayScore;
          totalGoalsAway += homeScore;
          
          if (awayScore > homeScore) {
            homeWins++;
            recentForm.push('W');
          } else if (awayScore < homeScore) {
            awayWins++;
            recentForm.push('L');
          } else {
            draws++;
            recentForm.push('D');
          }
        }

        // Estimer cartons (placeholder)
        totalCards += 4; // Moyenne estimée
      });

      const totalMatches = h2hMatches.length;
      const avgGoalsHome = totalGoalsHome / totalMatches;
      const avgGoalsAway = totalGoalsAway / totalMatches;
      const avgCards = totalCards / totalMatches;

      // Déterminer équipe dominante
      let dominantTeam: string | undefined;
      if (homeWins > awayWins + 2) dominantTeam = 'home';
      else if (awayWins > homeWins + 2) dominantTeam = 'away';

      return {
        totalMatches,
        homeWins,
        draws,
        awayWins,
        recentForm: recentForm.slice(0, 5).join(''),
        avgGoalsHome,
        avgGoalsAway,
        avgCards,
        dominantTeam,
        venueAdvantage: homeWins / totalMatches - 0.5, // -0.5 à +0.5
        highScoringTendency: (avgGoalsHome + avgGoalsAway) > 2.8,
        defensiveBattles: (avgGoalsHome + avgGoalsAway) < 2.2,
        cardHeavyMatches: avgCards > 5
      };

    } catch (error) {
      console.error('Error getting H2H data:', error);
      return undefined;
    }
  }

  private async analyzeRivalry(match: any): Promise<RivalryData> {
    const homeTeam = match.home_team?.name || '';
    const awayTeam = match.away_team?.name || '';

    // Base de données des rivalités connues
    const knownRivalries = [
      {
        teams: ['Manchester United', 'Manchester City'],
        level: 0.9,
        type: 'derby' as const,
        description: 'Manchester Derby'
      },
      {
        teams: ['Arsenal', 'Tottenham'],
        level: 0.95,
        type: 'derby' as const,
        description: 'North London Derby'
      },
      {
        teams: ['Liverpool', 'Everton'],
        level: 0.85,
        type: 'derby' as const,
        description: 'Merseyside Derby'
      },
      {
        teams: ['Real Madrid', 'Barcelona'],
        level: 1.0,
        type: 'derby' as const,
        description: 'El Clásico'
      },
      {
        teams: ['Milan', 'Inter'],
        level: 0.9,
        type: 'derby' as const,
        description: 'Derby della Madonnina'
      }
    ];

    // Vérifier rivalités connues
    for (const rivalry of knownRivalries) {
      const hasRivalry = rivalry.teams.some(team1 => 
        homeTeam.includes(team1) && 
        rivalry.teams.some(team2 => 
          team2 !== team1 && awayTeam.includes(team2)
        )
      );

      if (hasRivalry) {
        return {
          isRivalry: true,
          rivalryLevel: rivalry.level,
          type: rivalry.type,
          description: rivalry.description,
          extraMotivation: rivalry.level * 0.8,
          unpredictabilityFactor: rivalry.level * 0.6,
          emotionalIntensity: rivalry.level * 0.9
        };
      }
    }

    // Vérifier rivalité géographique (même ville)
    const cityKeywords = ['United', 'City', 'FC', 'Athletic'];
    const sameCity = cityKeywords.some(keyword => 
      homeTeam.includes(keyword) && awayTeam.includes(keyword)
    );

    if (sameCity) {
      return {
        isRivalry: true,
        rivalryLevel: 0.6,
        type: 'derby',
        description: 'Local Derby',
        extraMotivation: 0.5,
        unpredictabilityFactor: 0.4,
        emotionalIntensity: 0.6
      };
    }

    return {
      isRivalry: false,
      rivalryLevel: 0,
      type: 'none',
      extraMotivation: 0,
      unpredictabilityFactor: 0,
      emotionalIntensity: 0
    };
  }

  private async calculateMatchImportance(match: any): Promise<MatchImportanceData> {
    const matchDate = new Date(match.match_date);
    const month = matchDate.getMonth() + 1;
    
    // Déterminer phase de saison
    let seasonPhase: MatchImportanceData['seasonPhase'] = 'mid';
    if (month >= 8 && month <= 10) seasonPhase = 'early';
    else if (month >= 11 && month <= 2) seasonPhase = 'mid';
    else if (month >= 3 && month <= 5) seasonPhase = 'crucial';
    else if (month >= 6) seasonPhase = 'final_stretch';

    // Estimation importance basée sur phase de saison
    let baseImportance = 0.5;
    switch (seasonPhase) {
      case 'early': baseImportance = 0.3; break;
      case 'mid': baseImportance = 0.5; break;
      case 'crucial': baseImportance = 0.7; break;
      case 'final_stretch': baseImportance = 0.9; break;
    }

    // Enjeux simulés (dans l'implémentation réelle, analyser classement)
    const homeStakes: MatchStake[] = [
      {
        type: 'champions_league',
        urgency: baseImportance,
        pressure: baseImportance * 0.8,
        description: 'Fighting for Champions League qualification'
      }
    ];

    const awayStakes: MatchStake[] = [
      {
        type: 'champions_league',
        urgency: baseImportance,
        pressure: baseImportance * 0.8,
        description: 'Fighting for Champions League qualification'
      }
    ];

    return {
      homeImportance: baseImportance,
      awayImportance: baseImportance,
      homeStakes,
      awayStakes,
      seasonPhase,
      matchweek: this.estimateMatchweek(matchDate),
      remainingMatches: this.estimateRemainingMatches(matchDate)
    };
  }

  private estimateMatchweek(matchDate: Date): number {
    // Estimation simplifiée basée sur la date
    const startOfSeason = new Date(matchDate.getFullYear(), 7, 15); // 15 août
    const diffTime = matchDate.getTime() - startOfSeason.getTime();
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return Math.max(1, Math.min(diffWeeks, 38));
  }

  private estimateRemainingMatches(matchDate: Date): number {
    const endOfSeason = new Date(matchDate.getFullYear() + 1, 4, 31); // 31 mai
    const diffTime = endOfSeason.getTime() - matchDate.getTime();
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return Math.max(0, Math.min(diffWeeks, 38));
  }

  private async getCalendarContext(match: any): Promise<CalendarContextData> {
    // Simplification : données de base
    const matchDate = new Date(match.match_date);
    
    return {
      homeMatchesSince: 7, // Placeholder
      awayMatchesSince: 4, // Placeholder
      homeNextMatchIn: 7,
      awayNextMatchIn: 7,
      homeUCLRecent: false,
      awayUCLRecent: false,
      homeUCLNext: false,
      awayUCLNext: false,
      homeTravel: {
        distance: 0, // Match à domicile
        timeZoneChange: 0,
        fatigueRating: 0
      },
      awayTravel: {
        distance: 200, // Estimation
        timeZoneChange: 0,
        fatigueRating: 0.2
      },
      isHolidayPeriod: this.isHolidayPeriod(matchDate),
      isInternationalBreak: false
    };
  }

  private isHolidayPeriod(date: Date): boolean {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Période de Noël/Nouvel An
    return (month === 12 && day >= 20) || (month === 1 && day <= 10);
  }

  private async calculateMatchStakes(match: any): Promise<MatchStakesData> {
    return {
      mediaAttention: 0.6, // Placeholder
      tvAudience: 2000000, // Estimation
      expectedAttendance: 50000, // Placeholder
      homeSupport: 0.8,
      awaySupport: 0.6,
      bookmakerFavorite: 'home', // Placeholder
      publicExpectation: 'home',
      storylines: [
        'Battle for Champions League spots',
        'Key players returning from injury'
      ]
    };
  }

  private async getMatchesForWindow(window: WindowType) {
    const now = new Date();
    let fromTime: Date, toTime: Date;

    switch (window) {
      case 'T24':
        fromTime = new Date(now.getTime() + 23 * 60 * 60 * 1000);
        toTime = new Date(now.getTime() + 25 * 60 * 60 * 1000);
        break;
      case 'T6':
        fromTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
        toTime = new Date(now.getTime() + 6.5 * 60 * 60 * 1000);
        break;
      case 'T1':
        fromTime = new Date(now.getTime() + 0.5 * 60 * 60 * 1000);
        toTime = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
        break;
      case 'T30':
        fromTime = new Date(now.getTime() + 25 * 60 * 1000);
        toTime = new Date(now.getTime() + 35 * 60 * 1000);
        break;
      default:
        throw new Error(`Invalid window: ${window}`);
    }

    const { data: matches } = await this.supabase
      .from('matches')
      .select(`
        id, match_date, referee,
        home_team_id, away_team_id,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name)
      `)
      .eq('status', 'scheduled')
      .gte('match_date', fromTime.toISOString())
      .lte('match_date', toTime.toISOString());

    return matches || [];
  }

  private async storeMatchContext(context: MatchContext): Promise<void> {
    const { error } = await this.supabase
      .from('match_context')
      .upsert({
        match_id: context.matchId,
        window: context.window,
        collected_at: context.collectedAt,
        referee_data: context.referee,
        head_to_head: context.headToHead,
        rivalry_data: context.rivalry,
        match_importance: context.matchImportance,
        calendar_context: context.calendar,
        stakes_data: context.stakes,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'match_id,window'
      });

    if (error) {
      throw new Error(`Failed to store match context: ${error.message}`);
    }
  }
}

export const contextCollector = new ContextCollector();