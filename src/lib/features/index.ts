// @ts-nocheck
export { BaseFeatureBuilder } from './base-feature-builder';
export { TeamFeaturesBuilder } from './team-features-builder';
export { PlayerFeaturesBuilder } from './player-features-builder';

import { TeamFeaturesBuilder } from './team-features-builder';
import { PlayerFeaturesBuilder } from './player-features-builder';
import { WindowType } from '@/types/database';
import { createApiClient } from '@/lib/supabase';

export class FeatureOrchestrator {
  private supabase = createApiClient();
  private teamFeaturesBuilder = new TeamFeaturesBuilder();
  private playerFeaturesBuilder = new PlayerFeaturesBuilder();

  async buildAllFeatures(matchId: string, window: WindowType): Promise<void> {
    console.log(`Building all features for match ${matchId} at window ${window}...`);

    try {
      // Build team features first (faster and required for some player features)
      await this.teamFeaturesBuilder.buildFeatures(matchId, window);
      
      // Build player features
      await this.playerFeaturesBuilder.buildFeatures(matchId, window);

      // Log successful feature build
      await this.supabase
        .from('data_quality_checks')
        .insert({
          check_type: 'feature_build',
          table_name: 'features',
          check_name: `features_build_${window}`,
          status: 'passed',
          details: { match_id: matchId, window },
          checked_at: new Date().toISOString()
        });

      console.log(`All features built successfully for match ${matchId} at window ${window}`);
    } catch (error) {
      console.error(`Error building features for match ${matchId}:`, error);
      
      // Log failed feature build
      await this.supabase
        .from('data_quality_checks')
        .insert({
          check_type: 'feature_build',
          table_name: 'features',
          check_name: `features_build_${window}`,
          status: 'failed',
          details: { 
            match_id: matchId, 
            window, 
            error: error instanceof Error ? error.message : String(error) 
          },
          checked_at: new Date().toISOString()
        });

      throw error;
    }
  }

  async buildFeaturesForAllMatches(window: WindowType, dateFrom?: string, dateTo?: string): Promise<void> {
    console.log(`Building features for all matches at window ${window}...`);

    try {
      // Get upcoming matches
      let query = this.supabase
        .from('matches')
        .select('id, match_date')
        .eq('status', 'scheduled')
        .order('match_date', { ascending: true });

      if (dateFrom) {
        query = query.gte('match_date', dateFrom);
      } else {
        query = query.gte('match_date', new Date().toISOString());
      }

      if (dateTo) {
        query = query.lte('match_date', dateTo);
      }

      const { data: matches, error } = await query;

      if (error) {
        throw new Error(`Failed to get matches: ${error.message}`);
      }

      if (!matches || matches.length === 0) {
        console.log('No matches found for feature building');
        return;
      }

      console.log(`Building features for ${matches.length} matches...`);

      let successCount = 0;
      let errorCount = 0;

      for (const match of matches) {
        try {
          await this.buildAllFeatures(match.id, window);
          successCount++;
          
          // Add small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to build features for match ${match.id}:`, error);
          errorCount++;
        }
      }

      console.log(`Feature building completed. Success: ${successCount}, Errors: ${errorCount}`);
    } catch (error) {
      console.error('Error building features for all matches:', error);
      throw error;
    }
  }

  async rebuildFeaturesForMatch(matchId: string): Promise<void> {
    console.log(`Rebuilding features for match ${matchId}...`);

    try {
      // Delete existing features
      await this.supabase.from('features_match_team').delete().eq('match_id', matchId);
      await this.supabase.from('features_player_match').delete().eq('match_id', matchId);

      // Rebuild features for all windows
      const windows: WindowType[] = ['T24', 'T6', 'T1', 'T30'];
      
      for (const window of windows) {
        await this.buildAllFeatures(matchId, window);
      }

      console.log(`Features rebuilt successfully for match ${matchId}`);
    } catch (error) {
      console.error(`Error rebuilding features for match ${matchId}:`, error);
      throw error;
    }
  }

  async getFeatureBuildStatus(): Promise<{
    totalMatches: number;
    matchesWithFeatures: number;
    lastBuildTime: string | null;
    failedBuilds: number;
  }> {
    try {
      // Get total upcoming matches
      const { count: totalMatches } = await this.supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .gte('match_date', new Date().toISOString());

      // Get matches with features
      const { data: matchesWithFeatures } = await this.supabase
        .from('features_match_team')
        .select('match_id')
        .eq('window', 'T24');

      const uniqueMatches = new Set(matchesWithFeatures?.map(f => f.match_id) || []);

      // Get last build time
      const { data: lastBuild } = await this.supabase
        .from('data_quality_checks')
        .select('checked_at')
        .eq('check_type', 'feature_build')
        .eq('status', 'passed')
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      // Get failed builds
      const { count: failedBuilds } = await this.supabase
        .from('data_quality_checks')
        .select('*', { count: 'exact', head: true })
        .eq('check_type', 'feature_build')
        .eq('status', 'failed')
        .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      return {
        totalMatches: totalMatches || 0,
        matchesWithFeatures: uniqueMatches.size,
        lastBuildTime: lastBuild?.checked_at || null,
        failedBuilds: failedBuilds || 0
      };
    } catch (error) {
      console.error('Error getting feature build status:', error);
      return {
        totalMatches: 0,
        matchesWithFeatures: 0,
        lastBuildTime: null,
        failedBuilds: 0
      };
    }
  }
}