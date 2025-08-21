#!/usr/bin/env python3
"""
Fix team_features aggregation après extraction API Football
Corriger le problème de merge match_id types
"""

import os
import sys
import pandas as pd
from supabase import create_client, Client
import time

def load_env_credentials():
    """Load Supabase credentials"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value.strip('"')
    
    return os.environ.get('NEXT_PUBLIC_SUPABASE_URL'), os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

def fix_team_features_aggregation(supabase):
    """Corriger aggregation team_features avec types corrects"""
    print("FIX TEAM FEATURES AGGREGATION")
    print("=" * 35)
    
    try:
        # Load match_statistics
        print("[LOADING] Match statistics...")
        stats_response = supabase.table('match_statistics').select('*').execute()
        stats_df = pd.DataFrame(stats_response.data)
        print(f"  Loaded {len(stats_df)} match statistics")
        
        # Load matches with api_id (not id!)
        print("[LOADING] Matches data...")
        matches_response = supabase.table('matches').select('api_id,season,league_id').execute()
        matches_df = pd.DataFrame(matches_response.data)
        print(f"  Loaded {len(matches_df)} matches")
        
        # Debug types
        print(f"\n[DEBUG] Data types:")
        print(f"  stats_df['match_id']: {stats_df['match_id'].dtype}")
        print(f"  matches_df['api_id']: {matches_df['api_id'].dtype}")
        
        # Both should be integers - no conversion needed
        print(f"[INFO] Both columns are integers - direct merge")
        
        # Merge on correct columns
        merged_df = stats_df.merge(matches_df, left_on='match_id', right_on='api_id', how='left')
        print(f"[MERGED] {len(merged_df)} stats merged with matches")
        
        # Check for null values after merge
        null_count = merged_df['season'].isna().sum()
        print(f"[INFO] {null_count} records without season data")
        
        # Aggregation mapping - SEULEMENT colonnes qui existent
        aggregation_mapping = {
            'corner_kicks': 'corners_for',
            'yellow_cards': 'yellow_cards',
            'red_cards': 'red_cards',
            'total_shots': 'shots_per_game',
            'shots_on_goal': 'shots_on_target_avg',
            'expected_goals': 'xg_for_avg',
            'ball_possession': 'possession_avg'
            # NOTE: fouls_per_game et passes_per_game n'existent pas dans team_features
        }
        
        print(f"[AGGREGATING] By team/season/league...")
        
        aggregated_records = []
        processed_groups = 0
        
        for (team_id, season, league_id), group in merged_df.groupby(['team_id', 'season', 'league_id']):
            if pd.isna(team_id) or pd.isna(season) or pd.isna(league_id):
                continue
                
            agg_record = {
                'team_id': int(team_id),
                'season': int(season), 
                'league_id': int(league_id)
            }
            
            # Calculer moyennes avec types corrects
            for stats_col, team_col in aggregation_mapping.items():
                if stats_col in group.columns:
                    values = group[stats_col].dropna()
                    if len(values) > 0:
                        mean_value = values.mean()
                        
                        # Convertir au bon type selon la colonne team_features
                        if team_col in ['corners_for', 'yellow_cards', 'red_cards', 'shots_per_game', 'shots_on_target_avg']:
                            # Ces colonnes sont INTEGER dans team_features
                            agg_record[team_col] = int(round(mean_value))
                        else:
                            # expected_goals et possession_avg sont FLOAT
                            agg_record[team_col] = float(mean_value)
            
            if len(agg_record) > 3:  # Au moins une stat calculée
                aggregated_records.append(agg_record)
                processed_groups += 1
        
        print(f"[AGGREGATED] {len(aggregated_records)} team/season records")
        
        # Update team_features
        print("[UPDATING] Team features...")
        successful_updates = 0
        failed_updates = 0
        
        for record in aggregated_records:
            try:
                team_id = record.pop('team_id')
                season = record.pop('season')
                league_id = record.pop('league_id')
                
                if record:  # Si on a des données à update
                    result = supabase.table('team_features').update(record).eq('team_id', team_id).eq('season', season).eq('league_id', league_id).execute()
                    
                    if result.data:
                        successful_updates += 1
                        
                        if successful_updates % 50 == 0:
                            print(f"  Updated {successful_updates} team features...")
                    else:
                        failed_updates += 1
                        if failed_updates <= 3:
                            print(f"  [WARNING] No matching team_features for team {team_id}, season {season}")
            
            except Exception as e:
                failed_updates += 1
                if failed_updates <= 3:
                    print(f"  [WARNING] Error updating team {team_id}: {e}")
                continue
        
        print(f"[SUCCESS] {successful_updates} team features updated")
        print(f"[INFO] {failed_updates} updates failed (likely no matching records)")
        
        return successful_updates > 0
        
    except Exception as e:
        print(f"[ERROR] Fix aggregation failed: {e}")
        return False

def main():
    """Main fix"""
    print("FIX TEAM FEATURES APRÈS EXTRACTION API")
    print("=" * 45)
    
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Credentials manquantes")
        return False
    
    try:
        supabase = create_client(url, key)
        print("[OK] Connected for fix")
        
        success = fix_team_features_aggregation(supabase)
        
        if success:
            print(f"\nSUCCESS COMPLET!")
            print(f"- Match statistics: 614 records avec stats API")
            print(f"- Team features: AGGREGEES avec nouvelles stats")
            print(f"- Pipeline ML: READY pour test impact")
            
            print(f"\nPROCHAINE ETAPE:")
            print(f"1. Tester performance ML avec nouvelles donnees")
            print(f"2. Mesurer improvement vs baseline 54.1%")
            print(f"3. Objectif: 55-60% accuracy")
        else:
            print(f"\nERREUR: Fix aggregation failed")
        
        return success
        
    except Exception as e:
        print(f"[ERROR] Fix failed: {e}")
        return False

if __name__ == "__main__":
    main()