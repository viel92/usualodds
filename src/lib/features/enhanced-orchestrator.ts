// @ts-nocheck
import { BaseCollector } from '../collectors/base-collector';
import { TemporalValidator, ValidationResult } from './temporal-validator';
import { TemporalOrchestrator } from './temporal-orchestrator';
import { weatherCollector } from '../collectors/weather-collector';
import { lineupsCollector } from '../collectors/lineups-collector';
import { contextCollector } from '../collectors/context-collector';
import { WindowType } from '@/types/database';

interface EnhancedPipelineConfig {
  weather: boolean;
  lineups: boolean;
  context: boolean;
  validate: boolean;
  validateMontanteDecision?: boolean;
}

interface EnhancedCollectionResult {
  window: WindowType;
  collections: {
    weather?: number;
    lineups?: number;
    context?: number;
  };
  validationResult?: ValidationResult;
  errors: string[];
  duration: number;
}

export class EnhancedOrchestrator extends TemporalOrchestrator {
  private weatherCollector = weatherCollector;
  private lineupsCollector = lineupsCollector;
  private contextCollector = contextCollector;

  /**
   * Orchestrateur enrichi intégrant météo, lineups, et contexte
   * Respect strict des contraintes temporelles pour décisions montante
   */
  async executeEnhancedPipeline(
    window: WindowType,
    config: EnhancedPipelineConfig = { weather: true, lineups: true, context: true, validate: true }
  ): Promise<EnhancedCollectionResult> {
    const startTime = Date.now();
    const result: EnhancedCollectionResult = {
      window,
      collections: {},
      errors: [],
      duration: 0
    };

    console.log(`🚀 Starting Enhanced Pipeline for window ${window}...`);

    try {
      // 1. Validation temporelle préalable si requise
      if (config.validate) {
        const { temporalValidator } = await import('./temporal-validator');
        const validation = await temporalValidator.validateTemporalConstraints('enhanced-pipeline', window, new Date());
        result.validationResult = validation;

        if (!validation.isValid) {
          throw new Error(`Temporal validation failed: ${validation.violations.map(v => v.description).join(', ')}`);
        }
      }

      // 2. Collecte enrichie en parallèle
      const collections = await Promise.allSettled([
        config.weather ? this.collectWeatherData(window) : Promise.resolve(0),
        config.lineups ? this.collectLineupsData(window) : Promise.resolve(0),
        config.context ? this.collectContextData(window) : Promise.resolve(0)
      ]);

      // 3. Traiter résultats collecte
      if (collections[0].status === 'fulfilled' && config.weather) {
        result.collections.weather = collections[0].value;
      } else if (collections[0].status === 'rejected') {
        result.errors.push(`Weather collection failed: ${collections[0].reason}`);
      }

      if (collections[1].status === 'fulfilled' && config.lineups) {
        result.collections.lineups = collections[1].value;
      } else if (collections[1].status === 'rejected') {
        result.errors.push(`Lineups collection failed: ${collections[1].reason}`);
      }

      if (collections[2].status === 'fulfilled' && config.context) {
        result.collections.context = collections[2].value;
      } else if (collections[2].status === 'rejected') {
        result.errors.push(`Context collection failed: ${collections[2].reason}`);
      }

      // 4. Validation spéciale pour décisions montante (T-1h)
      if (window === 'T1' && config.validateMontanteDecision) {
        await this.validateMontanteDecisionReadiness();
      }

      result.duration = Date.now() - startTime;

      console.log(`✅ Enhanced Pipeline completed for window ${window} in ${result.duration}ms`);
      console.log(`Collections: Weather=${result.collections.weather}, Lineups=${result.collections.lineups}, Context=${result.collections.context}`);

      if (result.errors.length > 0) {
        console.warn(`⚠️  Pipeline completed with ${result.errors.length} errors:`, result.errors);
      }

      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      result.duration = Date.now() - startTime;
      
      console.error(`❌ Enhanced Pipeline failed for window ${window}:`, error);
      throw error;
    }
  }

  /**
   * Collecte données météo pour la fenêtre spécifiée
   */
  private async collectWeatherData(window: WindowType): Promise<number> {
    console.log(`🌤️  Collecting weather data for window ${window}...`);
    
    try {
      await this.weatherCollector.collectWeatherForecasts(window);
      
      // Comptage des prévisions collectées
      const { count } = await this.supabase
        .from('weather_forecasts')
        .select('id', { count: 'exact' })
        .eq('window', window)
        .gte('forecast_time', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()); // 2h window

      return count || 0;
    } catch (error) {
      console.error(`Error collecting weather data for ${window}:`, error);
      throw error;
    }
  }

  /**
   * Collecte données de compositions pour la fenêtre spécifiée
   */
  private async collectLineupsData(window: WindowType): Promise<number> {
    console.log(`👥 Collecting lineups data for window ${window}...`);
    
    try {
      await this.lineupsCollector.collectLineups(window);
      
      // Comptage différencié selon fenêtre
      if (window === 'T30') {
        // Lineups officielles à T-30min
        const { count } = await this.supabase
          .from('official_lineups')
          .select('id', { count: 'exact' })
          .gte('released_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

        return count || 0;
      } else {
        // Lineups probables pour autres fenêtres
        const { count } = await this.supabase
          .from('probable_lineups')
          .select('id', { count: 'exact' })
          .eq('window', window)
          .gte('collected_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

        return count || 0;
      }
    } catch (error) {
      console.error(`Error collecting lineups data for ${window}:`, error);
      throw error;
    }
  }

  /**
   * Collecte données de contexte pour la fenêtre spécifiée
   */
  private async collectContextData(window: WindowType): Promise<number> {
    console.log(`🔍 Collecting context data for window ${window}...`);
    
    try {
      await this.contextCollector.collectMatchContext(window);
      
      // Comptage des contextes collectés
      const { count } = await this.supabase
        .from('match_context')
        .select('id', { count: 'exact' })
        .eq('window', window)
        .gte('collected_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

      return count || 0;
    } catch (error) {
      console.error(`Error collecting context data for ${window}:`, error);
      throw error;
    }
  }

  /**
   * Validation spéciale pour s'assurer que toutes les données nécessaires
   * sont disponibles pour la prise de décision montante à T-1h
   */
  private async validateMontanteDecisionReadiness(): Promise<void> {
    console.log('🔒 Validating montante decision readiness at T-1h...');

    const now = new Date();
    const matchesInDecisionWindow = await this.getMatchesForDecision();

    if (matchesInDecisionWindow.length === 0) {
      console.log('✅ No matches in decision window - validation passed');
      return;
    }

    const validationErrors: string[] = [];

    for (const match of matchesInDecisionWindow) {
      // Vérifier disponibilité données météo T-1h
      const { count: weatherCount } = await this.supabase
        .from('weather_forecasts')
        .select('id', { count: 'exact' })
        .eq('match_id', match.id)
        .eq('window', 'T1');

      if (weatherCount === 0) {
        validationErrors.push(`Missing weather data for match ${match.id} at T-1h`);
      }

      // Vérifier disponibilité lineups probables T-1h
      const { count: lineupsCount } = await this.supabase
        .from('probable_lineups')
        .select('id', { count: 'exact' })
        .eq('match_id', match.id)
        .eq('window', 'T1');

      if (lineupsCount < 2) { // Home + Away
        validationErrors.push(`Insufficient probable lineups for match ${match.id} at T-1h (need 2, got ${lineupsCount})`);
      }

      // Vérifier disponibilité contexte T-1h
      const { count: contextCount } = await this.supabase
        .from('match_context')
        .select('id', { count: 'exact' })
        .eq('match_id', match.id)
        .eq('window', 'T1');

      if (contextCount === 0) {
        validationErrors.push(`Missing context data for match ${match.id} at T-1h`);
      }

      // CRITIQUE: Vérifier qu'aucune donnée post T-1h n'est utilisée
      const t1hCutoff = new Date(new Date(match.match_date).getTime() - 60 * 60 * 1000);
      if (now > t1hCutoff) {
        validationErrors.push(`Match ${match.id}: T-1h cutoff passed - cannot make montante decision`);
      }
    }

    if (validationErrors.length > 0) {
      throw new Error(`Montante decision validation failed: ${validationErrors.join('; ')}`);
    }

    console.log(`✅ Montante decision validation passed for ${matchesInDecisionWindow.length} matches`);
  }

  /**
   * Récupère les matchs dans la fenêtre de décision montante (T-1h)
   */
  private async getMatchesForDecision() {
    const now = new Date();
    const fromTime = new Date(now.getTime() + 0.5 * 60 * 60 * 1000); // T+30min
    const toTime = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);   // T+1h30min

    const { data: matches } = await this.supabase
      .from('matches')
      .select('id, match_date, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
      .eq('status', 'scheduled')
      .gte('match_date', fromTime.toISOString())
      .lte('match_date', toTime.toISOString());

    return matches || [];
  }

  /**
   * Exécute le pipeline complet pour une journée donnée
   * Respecte l'ordre temporel: T-24h → T-6h → T-1h → T-30min
   */
  async executeDailyEnhancedPipeline(): Promise<Record<WindowType, EnhancedCollectionResult>> {
    console.log('🗓️  Starting Daily Enhanced Pipeline...');

    const results: Record<WindowType, EnhancedCollectionResult> = {} as any;
    const windows: WindowType[] = ['T24', 'T6', 'T1', 'T30'];

    for (const window of windows) {
      console.log(`\n🔄 Processing window ${window}...`);
      
      try {
        const config: EnhancedPipelineConfig = {
          weather: true,
          lineups: true,
          context: true,
          validate: true,
          validateMontanteDecision: window === 'T1' // Validation spéciale à T-1h
        };

        results[window] = await this.executeEnhancedPipeline(window, config);
        
        // Délai entre fenêtres pour respecter les APIs
        if (window !== 'T30') {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Failed processing window ${window}:`, error);
        results[window] = {
          window,
          collections: {},
          errors: [error instanceof Error ? error.message : String(error)],
          duration: 0
        };
      }
    }

    console.log('\n✅ Daily Enhanced Pipeline completed');
    
    // Résumé des résultats
    const summary = windows.map(window => {
      const result = results[window];
      const totalCollections = Object.values(result.collections).reduce((sum, count) => sum + (count || 0), 0);
      return `${window}: ${totalCollections} items, ${result.errors.length} errors`;
    }).join(' | ');
    
    console.log(`📊 Summary: ${summary}`);

    return results;
  }

  /**
   * Pipeline nocturne d'enrichissement - traitement en lots
   * À exécuter entre 2h et 5h du matin
   */
  async executeNightlyEnrichmentPipeline(): Promise<void> {
    console.log('🌙 Starting Nightly Enrichment Pipeline...');

    try {
      // 1. Enrichissement météo pour matchs des 3 prochains jours
      await this.enrichHistoricalWeatherData();

      // 2. Mise à jour contexte équipes (H2H, rivalités, etc.)
      await this.enrichTeamContextData();

      // 3. Analyse et mise à jour données joueurs/blessures
      await this.enrichPlayerData();

      console.log('✅ Nightly Enrichment Pipeline completed successfully');

    } catch (error) {
      console.error('❌ Nightly Enrichment Pipeline failed:', error);
      throw error;
    }
  }

  private async enrichHistoricalWeatherData(): Promise<void> {
    console.log('🌤️  Enriching historical weather data...');
    
    // Récupérer matchs des 3 prochains jours sans données météo
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    
    const { data: matchesNeedingWeather } = await this.supabase
      .from('matches')
      .select('id, match_date, venue')
      .eq('status', 'scheduled')
      .lte('match_date', threeDaysFromNow.toISOString())
      .not('weather_forecasts', 'is', null); // Matches without weather data

    if (!matchesNeedingWeather || matchesNeedingWeather.length === 0) {
      console.log('No matches requiring weather enrichment');
      return;
    }

    console.log(`Enriching weather for ${matchesNeedingWeather.length} matches`);
    
    // Traiter en lots pour respecter API limits
    for (let i = 0; i < matchesNeedingWeather.length; i += 5) {
      const batch = matchesNeedingWeather.slice(i, i + 5);
      
      await Promise.all(
        batch.map(async (match) => {
          try {
            await this.weatherCollector.collectWeatherForecasts('T24'); // Default collection
          } catch (error) {
            console.warn(`Failed to enrich weather for match ${match.id}:`, error);
          }
        })
      );

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  private async enrichTeamContextData(): Promise<void> {
    console.log('🔍 Enriching team context data...');
    
    const upcomingMatches = await this.supabase
      .from('matches')
      .select('id, home_team_id, away_team_id')
      .eq('status', 'scheduled')
      .gte('match_date', new Date().toISOString())
      .lte('match_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

    // Process in chunks
    // Implementation would call contextCollector for batch processing
  }

  private async enrichPlayerData(): Promise<void> {
    console.log('👥 Enriching player data...');
    
    // Update injury/suspension data
    // Update recent form data  
    // Implementation would batch process player updates
  }
}

export const enhancedOrchestrator = new EnhancedOrchestrator();