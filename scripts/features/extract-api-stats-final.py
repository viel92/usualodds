#!/usr/bin/env python3
"""
Extraction FINALE des stats API Football pour 1760 matches
Version avec conversions de types correctes (INTEGER vs FLOAT)
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

def load_all_match_statistics(supabase):
    """Load TOUS les match_statistics avec pagination"""
    print("LOADING ALL MATCH STATISTICS")
    print("=" * 35)
    
    try:
        all_stats = []
        batch_size = 200
        offset = 0
        
        print("[BATCH LOADING] Loading all match statistics...")
        
        while True:
            batch = supabase.table('match_statistics').select('*').range(offset, offset + batch_size - 1).execute()
            
            if not batch.data:
                break
                
            all_stats.extend(batch.data)
            print(f"  Batch {offset//batch_size + 1}: +{len(batch.data)} records (total: {len(all_stats)})")
            
            if len(batch.data) < batch_size:
                break
                
            offset += batch_size
            
            # Safety pause pour éviter rate limiting
            time.sleep(0.1)
        
        print(f"[SUCCESS] {len(all_stats)} total match statistics loaded")
        return pd.DataFrame(all_stats)
        
    except Exception as e:
        print(f"[ERROR] Loading failed: {e}")
        return None

def extract_api_stats_with_correct_types(stats_df):
    """Extraire stats API avec conversions de types correctes"""
    print(f"\nEXTRACTING API STATS WITH CORRECT TYPES")
    print("=" * 45)
    
    if stats_df is None or len(stats_df) == 0:
        print("[ERROR] No data to extract from")
        return None
    
    print(f"[PROCESSING] {len(stats_df)} records...")
    
    # Mapping avec types corrects
    api_mappings = {
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
        'passes_%': 'passes_percentage',
        'goalkeeper_saves': 'goalkeeper_saves',
        'shots_insidebox': 'shots_insidebox',
        'shots_outsidebox': 'shots_outsidebox'
    }
    
    # Types des colonnes basé sur l'analyse
    integer_columns = {
        'corner_kicks', 'yellow_cards', 'red_cards', 'total_shots',
        'shots_on_goal', 'shots_off_goal', 'ball_possession', 'fouls',
        'offsides', 'total_passes', 'passes_accurate', 'passes_percentage',
        'goalkeeper_saves', 'shots_insidebox', 'shots_outsidebox'
    }
    
    float_columns = {'expected_goals'}
    
    print(f"[MAPPING] {len(api_mappings)} columns with type-aware conversion")
    
    extracted_data = []
    successful_extractions = 0
    extraction_stats = {key: 0 for key in api_mappings.keys()}
    
    for idx, record in stats_df.iterrows():
        try:
            record_id = record['id']
            statistics = record.get('statistics', {})
            
            if not statistics or not isinstance(statistics, dict):
                continue
            
            # Extraire chaque stat disponible avec type correct
            update_data = {'id': record_id}
            extracted_count = 0
            
            for json_key, column_key in api_mappings.items():
                if json_key in statistics and statistics[json_key] is not None:
                    value = statistics[json_key]
                    
                    # Nettoyer les valeurs
                    if isinstance(value, str):
                        if '%' in value:
                            value = value.replace('%', '')
                        try:
                            value = float(value)
                        except ValueError:
                            continue
                    
                    # Convertir au bon type selon la colonne
                    try:
                        if isinstance(value, (int, float)):
                            if column_key in integer_columns:
                                # Colonne INTEGER - convertir en entier
                                update_data[column_key] = int(float(value))
                            elif column_key in float_columns:
                                # Colonne REAL - garder en float
                                update_data[column_key] = float(value)
                            
                            extraction_stats[json_key] += 1
                            extracted_count += 1
                            
                    except (ValueError, TypeError):
                        continue
            
            if extracted_count > 0:
                extracted_data.append(update_data)
                successful_extractions += 1
            
            # Progress indicator
            if (idx + 1) % 500 == 0:
                print(f"  Processed {idx + 1}/{len(stats_df)} records...")
        
        except Exception as e:
            print(f"  [WARNING] Error processing record {idx}: {e}")
            continue
    
    print(f"[SUCCESS] {successful_extractions} records with extracted data")
    
    # Stats par colonne
    print(f"\n[EXTRACTION STATS] Values found per column:")
    for json_key, count in extraction_stats.items():
        column = api_mappings[json_key]
        pct = (count / len(stats_df)) * 100
        column_type = "INT" if column in integer_columns else "FLOAT"
        print(f"  {column} ({column_type}): {count}/{len(stats_df)} ({pct:.1f}%)")
    
    return extracted_data

def batch_update_match_statistics_final(supabase, extracted_data):
    """Update match_statistics avec types corrects"""
    print(f"\nBATCH UPDATE - TYPES CORRIGES")
    print("=" * 35)
    
    if not extracted_data:
        print("[ERROR] No data to update")
        return False
    
    print(f"[UPDATING] {len(extracted_data)} records...")
    
    batch_size = 25  # Taille plus petite pour éviter timeouts
    total_batches = (len(extracted_data) + batch_size - 1) // batch_size
    successful_updates = 0
    failed_updates = 0
    
    for batch_idx in range(total_batches):
        start_idx = batch_idx * batch_size
        end_idx = min(start_idx + batch_size, len(extracted_data))
        batch_data = extracted_data[start_idx:end_idx]
        
        try:
            print(f"  Batch {batch_idx + 1}/{total_batches}: updating {len(batch_data)} records...")
            
            for record in batch_data:
                try:
                    record_id = record.pop('id')  # Remove ID from update data
                    
                    if record:  # Only update if there's data
                        result = supabase.table('match_statistics').update(record).eq('id', record_id).execute()
                        
                        if result.data:
                            successful_updates += 1
                        else:
                            failed_updates += 1
                
                except Exception as e:
                    failed_updates += 1
                    if failed_updates <= 5:  # Show only first 5 errors
                        print(f"    [WARNING] Failed to update record: {e}")
                    continue
            
            # Pause entre batches
            time.sleep(0.3)
            
        except Exception as e:
            print(f"  [ERROR] Batch {batch_idx + 1} failed: {e}")
            continue
    
    print(f"[RESULTS] {successful_updates} successful, {failed_updates} failed updates")
    
    if failed_updates > 0:
        print(f"[INFO] {failed_updates} records failed - likely due to type mismatches or constraints")
    
    return successful_updates > 0

def aggregate_to_team_features_final(supabase):
    """Agréger vers team_features - VERSION FINALE"""
    print(f"\nFINAL AGGREGATION TO TEAM_FEATURES")
    print("=" * 40)
    
    try:
        # Load updated match_statistics
        print("[LOADING] Updated match statistics...")
        stats_response = supabase.table('match_statistics').select('*').execute()
        stats_df = pd.DataFrame(stats_response.data)
        
        # Load matches pour season/league mapping
        print("[LOADING] Matches data...")
        matches_response = supabase.table('matches').select('id,season,league_id').execute()
        matches_df = pd.DataFrame(matches_response.data)
        
        # Merge
        merged_df = stats_df.merge(matches_df, left_on='match_id', right_on='id', how='left')
        
        print(f"[MERGED] {len(merged_df)} stats merged with matches")
        
        # Colonnes à agréger
        aggregation_mapping = {
            'corner_kicks': 'corners_for',
            'yellow_cards': 'yellow_cards',
            'red_cards': 'red_cards',
            'total_shots': 'shots_per_game',
            'shots_on_goal': 'shots_on_target_avg',
            'expected_goals': 'xg_for_avg',
            'ball_possession': 'possession_avg',
            'fouls': 'fouls_per_game',
            'total_passes': 'passes_per_game'
        }
        
        # Agréger par équipe/saison
        print("[AGGREGATING] By team/season...")
        
        aggregated_records = []
        
        for (team_id, season, league_id), group in merged_df.groupby(['team_id', 'season', 'league_id']):
            if pd.isna(team_id) or pd.isna(season) or pd.isna(league_id):
                continue
                
            agg_record = {
                'team_id': int(team_id),
                'season': int(season),
                'league_id': int(league_id)
            }
            
            # Calculer moyennes pour chaque stat
            for stats_col, team_col in aggregation_mapping.items():
                if stats_col in group.columns:
                    values = group[stats_col].dropna()
                    if len(values) > 0:
                        mean_value = values.mean()
                        agg_record[team_col] = float(mean_value)
            
            if len(agg_record) > 3:  # Au moins une stat calculée
                aggregated_records.append(agg_record)
        
        print(f"[AGGREGATED] {len(aggregated_records)} team/season records")
        
        # Update team_features
        print("[UPDATING] Team features...")
        successful_team_updates = 0
        failed_team_updates = 0
        
        for record in aggregated_records:
            try:
                team_id = record.pop('team_id')
                season = record.pop('season')
                league_id = record.pop('league_id')
                
                if record:  # Si on a des données à update
                    result = supabase.table('team_features').update(record).eq('team_id', team_id).eq('season', season).eq('league_id', league_id).execute()
                    
                    if result.data:
                        successful_team_updates += 1
                        
                        if successful_team_updates % 50 == 0:
                            print(f"  Updated {successful_team_updates} team features...")
                    else:
                        failed_team_updates += 1
            
            except Exception as e:
                failed_team_updates += 1
                if failed_team_updates <= 3:
                    print(f"  [WARNING] Error updating team {team_id}: {e}")
                continue
        
        print(f"[SUCCESS] {successful_team_updates} team features updated ({failed_team_updates} failed)")
        return successful_team_updates > 0
        
    except Exception as e:
        print(f"[ERROR] Aggregation failed: {e}")
        return False

def main():
    """Main final extraction process"""
    print("FINAL API STATS EXTRACTION - TYPE CORRECTED")
    print("=" * 55)
    print("Target: Populer colonnes API Football avec types corrects")
    print("Fix: INTEGER vs FLOAT conversions")
    print("Scope: TOUS les match_statistics disponibles")
    
    # Connect
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Credentials manquantes")
        return False
    
    start_time = time.time()
    
    try:
        supabase = create_client(url, key)
        print("[OK] Connected for final extraction")
        
        # Step 1: Load ALL match statistics
        stats_df = load_all_match_statistics(supabase)
        
        if stats_df is None or len(stats_df) == 0:
            print("[ERROR] No match statistics loaded")
            return False
        
        # Step 2: Extract API stats with correct types
        extracted_data = extract_api_stats_with_correct_types(stats_df)
        
        if not extracted_data:
            print("[ERROR] No stats extracted from JSON")
            return False
        
        # Step 3: Batch update match_statistics
        stats_updated = batch_update_match_statistics_final(supabase, extracted_data)
        
        if not stats_updated:
            print("[ERROR] Failed to update match_statistics")
            return False
        
        # Step 4: Aggregate to team_features
        features_updated = aggregate_to_team_features_final(supabase)
        
        # Results
        elapsed_time = time.time() - start_time
        
        print(f"\nFINAL EXTRACTION RESULTS")
        print("=" * 30)
        print(f"  Execution time: {elapsed_time:.1f} seconds")
        print(f"  Records processed: {len(stats_df)}")
        print(f"  Stats extracted: {len(extracted_data)}")
        print(f"  Match statistics: UPDATED")
        print(f"  Team features: {'UPDATED' if features_updated else 'FAILED'}")
        
        if features_updated:
            print(f"\nSUCCESS COMPLET - TYPES CORRIGES!")
            print(f"- API Football stats populees avec types corrects")
            print(f"- {len(extracted_data)} match_statistics mises a jour")
            print(f"- Team features recalculees")
            print(f"- Impact ML attendu: +2-3% accuracy")
            print(f"\nPROCHAINE ETAPE: Relancer test ML pour mesurer impact!")
            return True
        else:
            print(f"\nSUCCES PARTIEL - STATS EXTRAITES")
            print(f"- Match statistics: OK")
            print(f"- Team features: ECHEC")
            return False
        
    except Exception as e:
        print(f"[ERROR] Final extraction failed: {e}")
        return False

if __name__ == "__main__":
    print("ATTENTION: Script final avec conversions de types")
    print("INTEGER columns: corner_kicks, yellow_cards, etc.")
    print("FLOAT columns: expected_goals")
    print("Estimation: 5-10 minutes d'execution")
    
    # Confirmation sécurité
    response = input("\nContinuer avec l'extraction finale? (y/N): ")
    
    if response.lower() in ['y', 'yes', 'o', 'oui']:
        success = main()
        
        if success:
            print("\nREADY: Lancer test ML pour mesurer impact des donnees completes")
        else:
            print("\nACTION: Debug et retry extraction")
    else:
        print("Extraction annulee")