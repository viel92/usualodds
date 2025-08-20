#!/usr/bin/env python3
"""
Fix des colonnes vides en extrayant depuis JSON statistics
Simple et efficace - les données sont déjà là !
"""

import os
import sys
import pandas as pd
from supabase import create_client, Client

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

def fix_match_statistics_columns(supabase):
    """Fix colonnes vides match_statistics"""
    print("FIX MATCH_STATISTICS EMPTY COLUMNS")
    print("=" * 40)
    
    try:
        # Load match_statistics avec JSON
        print("[LOADING] Match statistics...")
        response = supabase.table('match_statistics').select('id,statistics').execute()
        
        if not response.data:
            print("[ERROR] No match statistics found")
            return False
        
        print(f"[INFO] {len(response.data)} records to process")
        
        updates_count = 0
        successful_extractions = 0
        
        for record in response.data:
            try:
                record_id = record['id']
                statistics = record['statistics']
                
                if not statistics or not isinstance(statistics, dict):
                    continue
                
                # Extraire les valeurs depuis le dict
                update_data = {}
                
                # Mapping direct JSON → colonnes
                mappings = {
                    'corner_kicks': 'corner_kicks',
                    'yellow_cards': 'yellow_cards', 
                    'red_cards': 'red_cards',
                    'total_shots': 'total_shots',
                    'shots_on_goal': 'shots_on_goal',
                    'shots_off_goal': 'shots_off_goal',
                    'expected_goals': 'expected_goals',
                    'ball_possession': 'ball_possession',
                    'fouls': 'fouls',
                    'offsides': 'offsides',
                    'total_passes': 'total_passes',
                    'passes_accurate': 'passes_accurate',
                    'goalkeeper_saves': 'goalkeeper_saves',
                    'shots_insidebox': 'shots_insidebox',
                    'shots_outsidebox': 'shots_outsidebox'
                }
                
                for json_key, column_key in mappings.items():
                    if json_key in statistics and statistics[json_key] is not None:
                        value = statistics[json_key]
                        
                        # Nettoyer les valeurs (enlever % par exemple)
                        if isinstance(value, str):
                            if '%' in value:
                                value = value.replace('%', '')
                            try:
                                value = float(value)
                            except ValueError:
                                continue
                        
                        update_data[column_key] = value
                
                # Update si on a des données
                if update_data:
                    result = supabase.table('match_statistics').update(update_data).eq('id', record_id).execute()
                    
                    if result.data:
                        updates_count += 1
                        successful_extractions += len(update_data)
                        
                        if updates_count % 100 == 0:
                            print(f"  Updated {updates_count} records...")
                
            except Exception as e:
                print(f"  [WARNING] Error processing record {record.get('id')}: {e}")
                continue
        
        print(f"[SUCCESS] {updates_count} records updated")
        print(f"[SUCCESS] {successful_extractions} total values extracted")
        
        return updates_count > 0
        
    except Exception as e:
        print(f"[ERROR] Fix failed: {e}")
        return False

def aggregate_to_team_features(supabase):
    """Aggréger les stats vers team_features"""
    print(f"\nAGGREGATE TO TEAM_FEATURES")
    print("=" * 30)
    
    try:
        # Load match_statistics avec colonnes maintenant remplies
        print("[LOADING] Updated match statistics...")
        stats_response = supabase.table('match_statistics').select('*').execute()
        stats_df = pd.DataFrame(stats_response.data)
        
        # Load matches pour season/league
        matches_response = supabase.table('matches').select('id,season,league_id').execute()
        matches_df = pd.DataFrame(matches_response.data)
        
        # Merge
        merged_df = stats_df.merge(matches_df, left_on='match_id', right_on='id', how='left')
        
        print(f"[INFO] {len(merged_df)} stats merged with matches")
        
        # Columns à aggréger vers team_features
        stats_to_aggregate = {
            'corner_kicks': 'corners_for',
            'yellow_cards': 'yellow_cards', 
            'red_cards': 'red_cards',
            'total_shots': 'shots_per_game',
            'shots_on_goal': 'shots_on_target_avg'
        }
        
        # Aggréger par team/season
        aggregated_data = []
        
        for (team_id, season, league_id), group in merged_df.groupby(['team_id', 'season', 'league_id']):
            agg_record = {
                'team_id': team_id,
                'season': season, 
                'league_id': league_id
            }
            
            for stats_col, team_col in stats_to_aggregate.items():
                if stats_col in group.columns:
                    mean_value = group[stats_col].mean()
                    if pd.notna(mean_value):
                        agg_record[team_col] = mean_value
            
            aggregated_data.append(agg_record)
        
        print(f"[INFO] {len(aggregated_data)} team aggregations created")
        
        # Update team_features
        updates_count = 0
        
        for record in aggregated_data:
            try:
                team_id = record['team_id']
                season = record['season']
                league_id = record['league_id']
                
                # Données à update
                update_data = {k: v for k, v in record.items() 
                              if k not in ['team_id', 'season', 'league_id']}
                
                if update_data:
                    result = supabase.table('team_features').update(update_data).eq('team_id', team_id).eq('season', season).eq('league_id', league_id).execute()
                    
                    if result.data:
                        updates_count += 1
                        
                        if updates_count % 20 == 0:
                            print(f"  Updated {updates_count} team features...")
                
            except Exception as e:
                print(f"  [WARNING] Error updating team {record.get('team_id')}: {e}")
                continue
        
        print(f"[SUCCESS] {updates_count} team_features updated")
        return updates_count > 0
        
    except Exception as e:
        print(f"[ERROR] Aggregation failed: {e}")
        return False

def main():
    """Main fix process"""
    print("FIX EMPTY COLUMNS - EXTRACT FROM JSON")
    print("=" * 45)
    print("Target: Corriger 39 colonnes critiques")
    print("Method: Extraire depuis JSON deja present")
    
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Credentials manquantes")
        return False
    
    try:
        supabase = create_client(url, key)
        print("[OK] Connected")
        
        # Fix match_statistics columns
        stats_fixed = fix_match_statistics_columns(supabase)
        
        if stats_fixed:
            # Aggregate to team_features
            features_updated = aggregate_to_team_features(supabase)
            
            if features_updated:
                print(f"\nSUCCESS COMPLET!")
                print(f"- Match statistics: colonnes remplies")
                print(f"- Team features: stats agregees")
                print(f"- Impact attendu: +2-5% ML accuracy")
                print(f"\nProchaine etape: Tester ML avec nouvelles donnees")
                return True
            else:
                print(f"\nSUCCES PARTIEL")
                print(f"- Match statistics: OK")
                print(f"- Team features: echec aggregation")
                return False
        else:
            print(f"\nECHEC")
            print(f"- Match statistics: echec extraction")
            return False
        
    except Exception as e:
        print(f"[ERROR] Process failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    
    if success:
        print("READY: Relancer ML test pour voir impact")
    else:
        print("ACTION: Debug extraction process")