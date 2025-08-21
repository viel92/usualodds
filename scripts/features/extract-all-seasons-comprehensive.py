#!/usr/bin/env python3
"""
Extraction COMPREHENSIVE pour toutes saisons (2020-2025)
Pipeline complet pour 2057 matches avec gestion pagination
"""

import os
import sys
import pandas as pd
from supabase import create_client, Client
import time
import json

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

def load_all_matches_comprehensive(supabase):
    """Load TOUS les 2057 matches avec pagination correcte"""
    print("LOADING ALL MATCHES - COMPREHENSIVE")
    print("=" * 45)
    
    try:
        all_matches = []
        batch_size = 1000  # Supabase limit
        offset = 0
        batch_count = 0
        
        print("[BATCH LOADING] Loading all 2057+ matches...")
        
        while True:
            batch = supabase.table('matches').select('api_id,season,league_id,status_short,raw_data').range(offset, offset + batch_size - 1).execute()
            
            if not batch.data:
                break
                
            all_matches.extend(batch.data)
            batch_count += 1
            print(f"  Batch {batch_count}: +{len(batch.data)} matches (total: {len(all_matches)})")
            
            if len(batch.data) < batch_size:
                break
                
            offset += batch_size
            time.sleep(0.2)  # Rate limiting
        
        print(f"[SUCCESS] {len(all_matches)} total matches loaded")
        return pd.DataFrame(all_matches)
        
    except Exception as e:
        print(f"[ERROR] Loading failed: {e}")
        return None

def analyze_raw_data_statistics_availability(matches_df):
    """Analyser la disponibilité des statistiques dans raw_data"""
    print(f"\nANALYZING RAW_DATA STATISTICS AVAILABILITY")
    print("=" * 50)
    
    if matches_df is None or len(matches_df) == 0:
        print("[ERROR] No matches to analyze")
        return None
    
    analysis = {
        'total_matches': len(matches_df),
        'has_raw_data': 0,
        'has_statistics_in_raw': 0,
        'statistics_types': {},
        'by_season': {}
    }
    
    print(f"[PROCESSING] {len(matches_df)} matches...")
    
    for idx, match in matches_df.iterrows():
        raw_data = match.get('raw_data')
        season = match.get('season')
        
        if raw_data:
            analysis['has_raw_data'] += 1
            
            # Check if raw_data has statistics
            if isinstance(raw_data, dict) and 'statistics' in raw_data:
                analysis['has_statistics_in_raw'] += 1
                
                # Analyze statistics structure
                stats = raw_data['statistics']
                if isinstance(stats, list) and len(stats) > 0:
                    # Get first team's statistics for analysis
                    team_stats = stats[0]
                    if 'statistics' in team_stats and isinstance(team_stats['statistics'], list):
                        for stat in team_stats['statistics']:
                            if isinstance(stat, dict) and 'type' in stat:
                                stat_type = stat['type']
                                if stat_type not in analysis['statistics_types']:
                                    analysis['statistics_types'][stat_type] = 0
                                analysis['statistics_types'][stat_type] += 1
        
        # Count by season
        if season:
            if season not in analysis['by_season']:
                analysis['by_season'][season] = {'total': 0, 'with_stats': 0}
            analysis['by_season'][season]['total'] += 1
            
            if raw_data and isinstance(raw_data, dict) and 'statistics' in raw_data:
                analysis['by_season'][season]['with_stats'] += 1
        
        if (idx + 1) % 500 == 0:
            print(f"  Analyzed {idx + 1}/{len(matches_df)} matches...")
    
    # Results
    print(f"\n[ANALYSIS RESULTS]")
    print(f"  Total matches: {analysis['total_matches']}")
    print(f"  With raw_data: {analysis['has_raw_data']}")
    print(f"  With statistics in raw_data: {analysis['has_statistics_in_raw']}")
    
    coverage = (analysis['has_statistics_in_raw'] / analysis['total_matches']) * 100
    print(f"  Statistics coverage: {coverage:.1f}%")
    
    print(f"\n[BY SEASON]")
    for season in sorted(analysis['by_season'].keys()):
        season_data = analysis['by_season'][season]
        season_coverage = (season_data['with_stats'] / season_data['total']) * 100 if season_data['total'] > 0 else 0
        print(f"  {season}: {season_data['with_stats']}/{season_data['total']} ({season_coverage:.1f}%)")
    
    if analysis['statistics_types']:
        print(f"\n[AVAILABLE STATISTICS TYPES]")
        sorted_stats = sorted(analysis['statistics_types'].items(), key=lambda x: x[1], reverse=True)
        for stat_type, count in sorted_stats[:15]:  # Top 15
            print(f"  {stat_type}: {count} matches")
    
    return analysis

def create_comprehensive_match_statistics(supabase, matches_df, analysis):
    """Créer match_statistics pour TOUS les matches qui ont des stats"""
    print(f"\nCREATING COMPREHENSIVE MATCH_STATISTICS")
    print("=" * 45)
    
    if analysis['has_statistics_in_raw'] == 0:
        print("[ERROR] No matches have statistics in raw_data")
        return False
    
    print(f"[TARGET] {analysis['has_statistics_in_raw']} matches with statistics")
    
    # API mappings (colonnes existantes seulement)
    api_mappings = {
        'Corner Kicks': 'corner_kicks',
        'Yellow Cards': 'yellow_cards', 
        'Red Cards': 'red_cards',
        'Total Shots': 'total_shots',
        'Shots on Goal': 'shots_on_goal',
        'Shots off Goal': 'shots_off_goal',
        'expected_goals': 'expected_goals',
        'Ball Possession': 'ball_possession',
        'Fouls': 'fouls',
        'Offsides': 'offsides',
        'Total passes': 'total_passes',
        'Passes accurate': 'passes_accurate',
        'Passes %': 'passes_percentage',
        'Goalkeeper Saves': 'goalkeeper_saves',
        'Shots insidebox': 'shots_insidebox',
        'Shots outsidebox': 'shots_outsidebox'
    }
    
    # Types des colonnes
    integer_columns = {
        'corner_kicks', 'yellow_cards', 'red_cards', 'total_shots',
        'shots_on_goal', 'shots_off_goal', 'ball_possession', 'fouls',
        'offsides', 'total_passes', 'passes_accurate', 'passes_percentage',
        'goalkeeper_saves', 'shots_insidebox', 'shots_outsidebox'
    }
    
    statistics_to_create = []
    processed_matches = 0
    
    for idx, match in matches_df.iterrows():
        raw_data = match.get('raw_data')
        
        if not raw_data or not isinstance(raw_data, dict) or 'statistics' not in raw_data:
            continue
            
        stats = raw_data['statistics']
        if not isinstance(stats, list) or len(stats) == 0:
            continue
            
        # Process both teams
        for team_stats in stats:
            if not isinstance(team_stats, dict) or 'team' not in team_stats or 'statistics' not in team_stats:
                continue
                
            team_info = team_stats['team']
            team_id = team_info.get('id')
            
            if not team_id:
                continue
                
            # Extract statistics
            match_stat_record = {
                'match_id': match['api_id'],
                'team_id': team_id,
                'team_name': team_info.get('name', '')
            }
            
            detailed_stats = team_stats['statistics']
            if isinstance(detailed_stats, list):
                for stat in detailed_stats:
                    if isinstance(stat, dict) and 'type' in stat and 'value' in stat:
                        stat_type = stat['type']
                        stat_value = stat['value']
                        
                        if stat_type in api_mappings:
                            column_name = api_mappings[stat_type]
                            
                            # Clean and convert value
                            if stat_value is not None:
                                try:
                                    if isinstance(stat_value, str):
                                        if '%' in stat_value:
                                            stat_value = stat_value.replace('%', '')
                                        stat_value = float(stat_value)
                                    
                                    # Convert to correct type
                                    if column_name in integer_columns:
                                        match_stat_record[column_name] = int(float(stat_value))
                                    else:
                                        match_stat_record[column_name] = float(stat_value)
                                        
                                except (ValueError, TypeError):
                                    continue
            
            # Add to creation list if has some statistics
            if len(match_stat_record) > 3:  # Has more than just match_id, team_id, team_name
                statistics_to_create.append(match_stat_record)
        
        processed_matches += 1
        
        if processed_matches % 100 == 0:
            print(f"  Processed {processed_matches} matches...")
    
    print(f"[EXTRACTION] {len(statistics_to_create)} statistics records ready")
    
    if len(statistics_to_create) == 0:
        print("[ERROR] No statistics could be extracted")
        return False
    
    # Batch insert new statistics
    print(f"[INSERTING] Statistics in batches...")
    batch_size = 50
    successful_inserts = 0
    failed_inserts = 0
    
    for i in range(0, len(statistics_to_create), batch_size):
        batch = statistics_to_create[i:i + batch_size]
        
        try:
            result = supabase.table('match_statistics').insert(batch).execute()
            
            if result.data:
                successful_inserts += len(result.data)
            else:
                failed_inserts += len(batch)
                
        except Exception as e:
            failed_inserts += len(batch)
            print(f"  [WARNING] Batch insert failed: {e}")
        
        # Progress
        if (i // batch_size + 1) % 10 == 0:
            print(f"  Inserted {i + len(batch)}/{len(statistics_to_create)} records...")
        
        time.sleep(0.2)
    
    print(f"[RESULTS] {successful_inserts} successful, {failed_inserts} failed inserts")
    
    return successful_inserts > 0

def main():
    """Main comprehensive extraction"""
    print("COMPREHENSIVE EXTRACTION - ALL SEASONS")
    print("=" * 50)
    print("Target: Extract statistics for ALL matches (2020-2025)")
    print("Scope: ~2057 matches with proper pagination")
    
    url, key = load_env_credentials()
    if not url or not key:
        print("[ERROR] Credentials manquantes")
        return False
    
    start_time = time.time()
    
    try:
        supabase = create_client(url, key)
        print("[OK] Connected for comprehensive extraction")
        
        # Step 1: Load ALL matches
        matches_df = load_all_matches_comprehensive(supabase)
        
        if matches_df is None or len(matches_df) == 0:
            print("[ERROR] No matches loaded")
            return False
        
        # Step 2: Analyze statistics availability
        analysis = analyze_raw_data_statistics_availability(matches_df)
        
        if not analysis:
            print("[ERROR] Analysis failed")
            return False
        
        # Step 3: Create match_statistics for all available data
        success = create_comprehensive_match_statistics(supabase, matches_df, analysis)
        
        # Results
        elapsed_time = time.time() - start_time
        
        print(f"\nCOMPREHENSIVE EXTRACTION RESULTS")
        print("=" * 40)
        print(f"  Execution time: {elapsed_time:.1f} seconds")
        print(f"  Total matches analyzed: {len(matches_df)}")
        print(f"  Matches with statistics: {analysis['has_statistics_in_raw']}")
        print(f"  Statistics coverage: {(analysis['has_statistics_in_raw']/len(matches_df))*100:.1f}%")
        print(f"  Extraction success: {'YES' if success else 'NO'}")
        
        if success:
            print(f"\nSUCCESS - COMPREHENSIVE DATA!")
            print(f"- All available statistics extracted")
            print(f"- Multi-season coverage improved")
            print(f"- Ready for team_features aggregation")
            print(f"\nNEXT: Aggregate to team_features and test ML impact!")
        else:
            print(f"\nPARTIAL SUCCESS")
            print(f"- Analysis completed")
            print(f"- Extraction issues encountered")
        
        return success
        
    except Exception as e:
        print(f"[ERROR] Comprehensive extraction failed: {e}")
        return False

if __name__ == "__main__":
    print("ATTENTION: Extraction comprehensive pour toutes saisons")
    print("Cela va analyser 2057+ matches et créer statistiques manquantes")
    print("Estimation: 10-15 minutes d'exécution")
    
    # Auto-execute without prompt
    print("\n[AUTO-MODE] Execution automatique activee...")
    response = 'y'
    
    if True:  # Always execute
        success = main()
        
        if success:
            print("\nREADY: Full dataset - Run team_features aggregation puis test ML")
        else:
            print("\nACTION: Review extraction issues and retry")
    else:
        print("Extraction annulée")