import { BaseCollector } from './base-collector';
import { WindowType } from '@/types/database';

interface ProbableLineup {
  matchId: string;
  teamId: string;
  window: WindowType;
  collectedAt: string;
  formation: string;
  confidence: number;
  source: 'api' | 'prediction' | 'historical';
  players: ProbablePlayer[];
  uncertainties: LineupUncertainty[];
}

interface ProbablePlayer {
  playerId: string;
  position: string;
  starterProbability: number;
  minutesExpected: number;
  injuryRisk: number;
  formRating: number;
  roleImportance: number; // 0-1, importance dans l'équipe
  lastAppearance?: string;
  confidenceSource: string;
}

interface LineupUncertainty {
  playerId: string;
  uncertaintyType: 'injury' | 'rotation' | 'form' | 'tactical' | 'suspension';
  impactLevel: number; // 0-1
  description: string;
  lastUpdate: string;
}

interface OfficialLineup {
  matchId: string;
  teamId: string;
  releasedAt: string;
  formation: string;
  startingXI: string[];
  substitutes: string[];
  captain?: string;
  changes: LineupChange[];
}

interface LineupChange {
  playerId: string;
  changeType: 'added' | 'removed' | 'position_change';
  previousStatus?: string;
  newStatus: string;
  reason?: string;
}

export class LineupsCollector extends BaseCollector {
  
  /**
   * Collecte lineups avec respect strict des contraintes temporelles
   * T-24h/T-6h: Lineups probables avec confidence
   * T-1h: DERNIÈRE collecte lineups probables pour DÉCISION MONTANTE
   * T-30min: Lineups officielles (publication uniquement, PAS décision)
   */
  async collectLineups(window: WindowType): Promise<void> {
    console.log(`🔍 Collecting lineups for window ${window}...`);

    if (window === 'T30') {
      // T-30min: Collecter lineups officielles (publication uniquement)
      await this.collectOfficialLineups();
    } else {
      // T-24h, T-6h, T-1h: Collecter lineups probables
      await this.collectProbableLineups(window);
    }
  }

  private async collectProbableLineups(window: WindowType): Promise<void> {
    try {
      const matches = await this.getMatchesForWindow(window);
      
      if (matches.length === 0) {
        console.log(`No matches found for probable lineups collection at window ${window}`);
        return;
      }

      let collectedLineups = 0;

      for (const match of matches) {
        try {
          // Collecter lineups probables pour les deux équipes
          const homeLineup = await this.buildProbableLineup(match, match.home_team_id, window);
          const awayLineup = await this.buildProbableLineup(match, match.away_team_id, window);

          if (homeLineup) {
            await this.storeProbableLineup(homeLineup);
            collectedLineups++;
          }

          if (awayLineup) {
            await this.storeProbableLineup(awayLineup);
            collectedLineups++;
          }

          // Respecter contraintes API
          await this.rateLimitDelay(1000);

        } catch (error) {
          console.error(`Error collecting probable lineups for match ${match.id}:`, error);
        }
      }

      await this.logDataQuality(
        'collection',
        'probable_lineups',
        `probable_lineups_${window}`,
        'passed',
        {
          window,
          matches_processed: matches.length,
          lineups_collected: collectedLineups
        }
      );

      console.log(`✅ Probable lineups collection completed for window ${window}: ${collectedLineups} lineups`);

    } catch (error) {
      console.error(`Error in probable lineups collection for window ${window}:`, error);
      
      await this.logDataQuality(
        'collection',
        'probable_lineups',
        `probable_lineups_${window}`,
        'failed',
        { 
          window,
          error: error instanceof Error ? error.message : String(error)
        }
      );
      
      throw error;
    }
  }

  private async collectOfficialLineups(): Promise<void> {
    console.log('🚨 Collecting OFFICIAL lineups (T-30min - publication only, NOT for montante decisions)');

    try {
      const matches = await this.getMatchesForWindow('T30');
      
      if (matches.length === 0) {
        console.log('No matches found for official lineups collection');
        return;
      }

      let collectedLineups = 0;

      for (const match of matches) {
        try {
          // ⚠️ IMPORTANT: Ces lineups officielles ne doivent PAS être utilisées pour décisions montante
          const officialLineups = await this.getOfficialLineupsFromAPI(match.api_id);
          
          if (officialLineups && officialLineups.length > 0) {
            for (const lineup of officialLineups) {
              await this.storeOfficialLineup({
                ...lineup,
                matchId: match.id,
                releasedAt: new Date().toISOString()
              });
              collectedLineups++;
            }
          }

          await this.rateLimitDelay(2000);

        } catch (error) {
          console.error(`Error collecting official lineups for match ${match.id}:`, error);
        }
      }

      // LOG CRITIQUE: Ces données ne doivent pas influencer montante
      await this.logDataQuality(
        'collection',
        'official_lineups',
        'official_lineups_T30',
        'passed',
        {
          window: 'T30',
          matches_processed: matches.length,
          lineups_collected: collectedLineups,
          WARNING: 'OFFICIAL_LINEUPS_FOR_PUBLICATION_ONLY_NOT_MONTANTE_DECISIONS'
        }
      );

      console.log(`✅ Official lineups collection completed: ${collectedLineups} lineups (PUBLICATION ONLY)`);

    } catch (error) {
      console.error('Error in official lineups collection:', error);
      throw error;
    }
  }

  private async buildProbableLineup(
    match: any,
    teamId: string,
    window: WindowType
  ): Promise<ProbableLineup | null> {
    try {
      // 1. Récupérer l'effectif de l'équipe
      const { data: squadPlayers } = await this.supabase
        .from('player_match_stats')
        .select(`
          player_id,
          players:player_id(name, position),
          minutes_played,
          created_at
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!squadPlayers || squadPlayers.length === 0) {
        console.warn(`No squad data found for team ${teamId}`);
        return null;
      }

      // 2. Récupérer données de blessures/suspensions
      const injuries = await this.getInjuriesAndSuspensions(teamId);

      // 3. Analyser patterns de sélection récents
      const recentSelections = await this.analyzeRecentSelections(teamId, match.match_date);

      // 4. Construire lineup probable
      const probablePlayers = await this.buildProbablePlayers(
        squadPlayers,
        injuries,
        recentSelections,
        window
      );

      // 5. Prédire formation la plus probable
      const probableFormation = await this.predictFormation(teamId, recentSelections);

      // 6. Calculer incertitudes
      const uncertainties = await this.calculateUncertainties(probablePlayers, injuries);

      // 7. Calculer confidence globale
      const confidence = this.calculateLineupConfidence(probablePlayers, uncertainties, window);

      return {
        matchId: match.id,
        teamId,
        window,
        collectedAt: new Date().toISOString(),
        formation: probableFormation,
        confidence,
        source: 'prediction',
        players: probablePlayers,
        uncertainties
      };

    } catch (error) {
      console.error(`Error building probable lineup for team ${teamId}:`, error);
      return null;
    }
  }

  private async getInjuriesAndSuspensions(teamId: string): Promise<any[]> {
    // Simulation de données blessures/suspensions
    // Dans l'implémentation réelle, utiliser API-Football /injuries et /fixtures/events
    try {
      const response = await this.api.getInjuries({ team: teamId });
      return response.response || [];
    } catch (error) {
      console.warn(`Could not fetch injuries for team ${teamId}:`, error);
      return [];
    }
  }

  private async analyzeRecentSelections(teamId: string, matchDate: string): Promise<any> {
    // Analyser les 5 derniers matchs pour patterns de sélection
    const { data: recentMatches } = await this.supabase
      .from('matches')
      .select(`
        id,
        match_date,
        player_match_stats(player_id, minutes_played, players(name, position))
      `)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .lt('match_date', matchDate)
      .eq('status', 'finished')
      .order('match_date', { ascending: false })
      .limit(5);

    if (!recentMatches) return null;

    // Analyser fréquence de sélection et positions
    const selectionFrequency: Record<string, { count: number; avgMinutes: number; positions: string[] }> = {};

    recentMatches.forEach(match => {
      if (match.player_match_stats) {
        match.player_match_stats.forEach((stat: any) => {
          if (!selectionFrequency[stat.player_id]) {
            selectionFrequency[stat.player_id] = { count: 0, avgMinutes: 0, positions: [] };
          }
          
          selectionFrequency[stat.player_id].count++;
          selectionFrequency[stat.player_id].avgMinutes += stat.minutes_played || 0;
          
          if (stat.players?.position && !selectionFrequency[stat.player_id].positions.includes(stat.players.position)) {
            selectionFrequency[stat.player_id].positions.push(stat.players.position);
          }
        });
      }
    });

    // Calculer moyennes
    Object.keys(selectionFrequency).forEach(playerId => {
      const freq = selectionFrequency[playerId];
      freq.avgMinutes = freq.avgMinutes / freq.count;
    });

    return {
      totalMatches: recentMatches.length,
      selectionFrequency,
      lastMatchDate: recentMatches[0]?.match_date
    };
  }

  private async buildProbablePlayers(
    squadPlayers: any[],
    injuries: any[],
    recentSelections: any,
    window: WindowType
  ): Promise<ProbablePlayer[]> {
    const probablePlayers: ProbablePlayer[] = [];

    for (const squadPlayer of squadPlayers) {
      const playerId = squadPlayer.player_id;
      const playerData = squadPlayer.players;

      if (!playerData) continue;

      // Vérifier blessures/suspensions
      const isInjured = injuries.some(inj => 
        inj.player?.id === parseInt(playerId) && inj.type === 'injury'
      );
      
      const isSuspended = injuries.some(inj => 
        inj.player?.id === parseInt(playerId) && inj.type === 'suspension'
      );

      if (isInjured || isSuspended) {
        continue; // Skip joueurs indisponibles
      }

      // Calculer probabilité de titularisation basée sur historique
      const selectionData = recentSelections?.selectionFrequency?.[playerId];
      let starterProbability = 0.3; // Base par défaut
      let minutesExpected = 30;

      if (selectionData) {
        const selectionRate = selectionData.count / (recentSelections.totalMatches || 1);
        const avgMinutes = selectionData.avgMinutes;
        
        // Probabilité basée sur fréquence de sélection et minutes
        starterProbability = Math.min(selectionRate * 1.2, 1.0);
        
        if (avgMinutes >= 70) {
          starterProbability = Math.min(starterProbability + 0.3, 1.0);
          minutesExpected = 85;
        } else if (avgMinutes >= 45) {
          starterProbability = Math.min(starterProbability + 0.1, 1.0);
          minutesExpected = 60;
        } else {
          minutesExpected = avgMinutes;
        }
      }

      // Ajustement selon fenêtre temporelle
      let confidenceSource = `historical_analysis_${window}`;
      
      // Plus on est proche du match, plus on peut être précis
      if (window === 'T1') {
        // À T-1h, on peut être plus confiant dans nos prédictions
        if (starterProbability > 0.7) starterProbability = Math.min(starterProbability + 0.1, 0.95);
        confidenceSource = 'advanced_prediction_T1h';
      }

      probablePlayers.push({
        playerId,
        position: playerData.position || 'Unknown',
        starterProbability,
        minutesExpected,
        injuryRisk: this.calculateInjuryRisk(squadPlayer, injuries),
        formRating: this.calculateFormRating(selectionData),
        roleImportance: this.calculateRoleImportance(selectionData, playerData.position),
        lastAppearance: selectionData ? recentSelections.lastMatchDate : undefined,
        confidenceSource
      });
    }

    // Trier par probabilité de titularisation
    return probablePlayers
      .sort((a, b) => b.starterProbability - a.starterProbability)
      .slice(0, 18); // Garder seulement 18 joueurs les plus probables
  }

  private calculateInjuryRisk(squadPlayer: any, injuries: any[]): number {
    // Calcul simplifié du risque de blessure
    const recentMinutes = squadPlayer.minutes_played || 0;
    
    // Plus un joueur joue beaucoup récemment, plus le risque augmente
    if (recentMinutes > 270) return 0.3; // 3 matchs complets récents
    if (recentMinutes > 180) return 0.2;
    if (recentMinutes > 90) return 0.1;
    
    return 0.05; // Risque de base
  }

  private calculateFormRating(selectionData: any): number {
    if (!selectionData) return 0.5;
    
    const playingTime = selectionData.avgMinutes / 90;
    const consistency = selectionData.count / 5; // Sur 5 derniers matchs
    
    return Math.min((playingTime + consistency) / 2, 1.0);
  }

  private calculateRoleImportance(selectionData: any, position: string): number {
    let baseImportance = 0.5;
    
    // Importance selon position
    if (position === 'GK') baseImportance = 0.9;
    else if (position === 'DEF') baseImportance = 0.7;
    else if (position === 'MID') baseImportance = 0.6;
    else if (position === 'ATT') baseImportance = 0.8;
    
    // Ajuster selon fréquence de sélection
    if (selectionData && selectionData.avgMinutes > 70) {
      baseImportance = Math.min(baseImportance + 0.2, 1.0);
    }
    
    return baseImportance;
  }

  private async predictFormation(teamId: string, recentSelections: any): Promise<string> {
    // Prédiction simplifiée de formation
    // Dans l'implémentation réelle, analyser formations récentes via API
    
    const commonFormations = ['4-3-3', '4-2-3-1', '3-5-2', '4-4-2', '5-3-2'];
    return commonFormations[Math.floor(Math.random() * commonFormations.length)];
  }

  private async calculateUncertainties(
    players: ProbablePlayer[],
    injuries: any[]
  ): Promise<LineupUncertainty[]> {
    const uncertainties: LineupUncertainty[] = [];
    
    for (const player of players) {
      // Incertitude si probabilité entre 0.3 et 0.7 (zone d'incertitude)
      if (player.starterProbability >= 0.3 && player.starterProbability <= 0.7) {
        uncertainties.push({
          playerId: player.playerId,
          uncertaintyType: 'rotation',
          impactLevel: Math.abs(0.5 - player.starterProbability) * 2,
          description: `Rotation risk - ${Math.round(player.starterProbability * 100)}% chance to start`,
          lastUpdate: new Date().toISOString()
        });
      }
      
      // Incertitude liée au risque de blessure
      if (player.injuryRisk > 0.2) {
        uncertainties.push({
          playerId: player.playerId,
          uncertaintyType: 'injury',
          impactLevel: player.injuryRisk,
          description: `High injury risk - ${Math.round(player.injuryRisk * 100)}% risk`,
          lastUpdate: new Date().toISOString()
        });
      }
    }
    
    return uncertainties;
  }

  private calculateLineupConfidence(
    players: ProbablePlayer[],
    uncertainties: LineupUncertainty[],
    window: WindowType
  ): number {
    // Confidence basée sur certitude des prédictions
    let confidence = 0.7; // Base
    
    // Réduire confidence si trop d'incertitudes
    const highUncertainties = uncertainties.filter(u => u.impactLevel > 0.3);
    confidence -= highUncertainties.length * 0.1;
    
    // Ajuster selon fenêtre temporelle
    switch (window) {
      case 'T24':
        confidence *= 0.7; // Moins confiant 24h avant
        break;
      case 'T6':
        confidence *= 0.8; // Moyennement confiant 6h avant
        break;
      case 'T1':
        confidence *= 0.9; // Plus confiant 1h avant (mais pas parfait !)
        break;
    }
    
    return Math.max(Math.min(confidence, 0.95), 0.3); // Entre 30% et 95%
  }

  private async getOfficialLineupsFromAPI(fixtureApiId: number): Promise<any[] | null> {
    try {
      const response = await this.api.getFixtureLineups(fixtureApiId.toString());
      return response.response || null;
    } catch (error) {
      console.error(`Error fetching official lineups for fixture ${fixtureApiId}:`, error);
      return null;
    }
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
        id, api_id, match_date, home_team_id, away_team_id,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name)
      `)
      .eq('status', 'scheduled')
      .gte('match_date', fromTime.toISOString())
      .lte('match_date', toTime.toISOString());

    return matches || [];
  }

  private async storeProbableLineup(lineup: ProbableLineup): Promise<void> {
    // Stocker lineup probable
    const { error: lineupError } = await this.supabase
      .from('probable_lineups')
      .upsert({
        match_id: lineup.matchId,
        team_id: lineup.teamId,
        window: lineup.window,
        collected_at: lineup.collectedAt,
        formation: lineup.formation,
        confidence: lineup.confidence,
        source: lineup.source,
        players: lineup.players,
        uncertainties: lineup.uncertainties,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'match_id,team_id,window'
      });

    if (lineupError) {
      throw new Error(`Failed to store probable lineup: ${lineupError.message}`);
    }
  }

  private async storeOfficialLineup(lineup: OfficialLineup): Promise<void> {
    // ⚠️ STOCKAGE AVEC WARNING: Ces données ne doivent PAS influencer décisions montante
    const { error } = await this.supabase
      .from('official_lineups')
      .upsert({
        match_id: lineup.matchId,
        team_id: lineup.teamId,
        released_at: lineup.releasedAt,
        formation: lineup.formation,
        starting_xi: lineup.startingXI,
        substitutes: lineup.substitutes,
        captain: lineup.captain,
        changes: lineup.changes,
        for_publication_only: true, // FLAG CRITIQUE
        not_for_montante_decisions: true, // FLAG CRITIQUE
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'match_id,team_id'
      });

    if (error) {
      throw new Error(`Failed to store official lineup: ${error.message}`);
    }
  }
}

export const lineupsCollector = new LineupsCollector();