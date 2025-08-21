#!/usr/bin/env python3
"""
Tracer l'origine des 614 match_statistics existants
Comment ont-ils été créés si raw_data n'a pas de statistics ?
"""

import os
import sys
import pandas as pd
from supabase import create_client, Client
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

def investigate_existing_statistics_source():
    """Investiguer la source des statistiques existantes"""
    print("TRACING EXISTING STATISTICS ORIGIN")
    print("=" * 40)
    
    url, key = load_env_credentials()
    supabase = create_client(url, key)
    
    try:
        # Get existing match_statistics with details
        print("[LOADING] Existing match_statistics...")
        stats_response = supabase.table('match_statistics').select('*').limit(5).execute()
        
        if not stats_response.data:
            print("[ERROR] No existing statistics found")
            return
        
        print(f"[SAMPLE] First 5 match_statistics:")
        for i, record in enumerate(stats_response.data):
            print(f"\n  Record {i+1}:")
            print(f"    ID: {record['id']}")
            print(f"    Match ID: {record['match_id']}")
            print(f"    Team ID: {record['team_id']}")
            print(f"    Created: {record['created_at']}")
            print(f"    Has statistics JSON: {'statistics' in record and bool(record['statistics'])}")
            
            # Check if this match_id has raw_data with statistics
            match_response = supabase.table('matches').select('raw_data,season').eq('api_id', record['match_id']).execute()
            
            if match_response.data:
                match = match_response.data[0]
                raw_data = match.get('raw_data', {})
                season = match.get('season')
                
                print(f"    Match season: {season}")
                print(f"    Match has raw_data: {bool(raw_data)}")
                
                if raw_data:
                    print(f"    Raw_data keys: {list(raw_data.keys())}")
                    
                    # Check specific structures
                    if 'statistics' in raw_data:
                        print(f"    Has 'statistics' in raw_data: YES")
                    else:
                        print(f"    Has 'statistics' in raw_data: NO")
                        
                        # Look for alternative structure
                        if 'fixture' in raw_data:
                            print(f"    Has 'fixture' in raw_data: YES")
                        if 'events' in raw_data:
                            print(f"    Has 'events' in raw_data: YES")
                        if 'lineups' in raw_data:
                            print(f"    Has 'lineups' in raw_data: YES")
            
            # Check the statistics field in match_statistics
            if 'statistics' in record and record['statistics']:
                stats_data = record['statistics']
                print(f"    Statistics field type: {type(stats_data)}")
                
                if isinstance(stats_data, dict):
                    print(f"    Statistics keys: {list(stats_data.keys())}")
                    
                    # Sample some values
                    sample_keys = ['corner_kicks', 'yellow_cards', 'total_shots', 'expected_goals']
                    for key in sample_keys:
                        if key in stats_data:
                            print(f"      {key}: {stats_data[key]}")
        
        # Check creation pattern
        print(f"\n[CREATION ANALYSIS]")
        all_stats_response = supabase.table('match_statistics').select('created_at,match_id').execute()
        all_stats_df = pd.DataFrame(all_stats_response.data)
        
        # Group by creation time
        all_stats_df['date'] = pd.to_datetime(all_stats_df['created_at']).dt.date
        creation_dates = all_stats_df['date'].value_counts()
        
        print(f"Statistics creation by date:")
        for date, count in creation_dates.head(5).items():
            print(f"  {date}: {count} records")
        
        # Check if there's a pattern in match_ids
        unique_matches = all_stats_df['match_id'].nunique()
        total_records = len(all_stats_df)
        
        print(f"\nPattern analysis:")
        print(f"  Total statistics records: {total_records}")
        print(f"  Unique matches: {unique_matches}")
        print(f"  Avg records per match: {total_records/unique_matches:.1f}")
        
        # Sample match_ids to check their seasons
        print(f"\n[MATCH_ID ANALYSIS]")
        sample_match_ids = all_stats_df['match_id'].unique()[:5]
        
        for match_id in sample_match_ids:
            match_info = supabase.table('matches').select('season,league_id,status_short').eq('api_id', match_id).execute()
            if match_info.data:
                info = match_info.data[0]
                print(f"  Match {match_id}: Season {info['season']}, League {info['league_id']}, Status {info['status_short']}")
        
    except Exception as e:
        print(f"[ERROR] Investigation failed: {e}")

def check_alternative_data_sources():
    """Vérifier s'il y a d'autres sources de données"""
    print(f"\nCHECKING ALTERNATIVE DATA SOURCES")
    print("=" * 40)
    
    # Check if there are other statistics-related tables
    tables_to_check = ['player_statistics', 'team_statistics', 'league_statistics']
    
    url, key = load_env_credentials()
    supabase = create_client(url, key)
    
    for table in tables_to_check:
        try:
            response = supabase.table(table).select('*').limit(1).execute()
            print(f"  Table '{table}': {'EXISTS' if response.data else 'EMPTY/NONE'}")
            
            if response.data:
                print(f"    Sample record keys: {list(response.data[0].keys())}")
        except Exception as e:
            print(f"  Table '{table}': DOES NOT EXIST")

def main():
    """Main investigation"""
    print("INVESTIGATION: D'OU VIENNENT LES 614 STATISTICS?")
    print("=" * 55)
    
    investigate_existing_statistics_source()
    check_alternative_data_sources()
    
    print(f"\nHYPOTHESES:")
    print(f"1. Statistics créées par un script différent")
    print(f"2. Data importée depuis une source externe") 
    print(f"3. API Football appelé directement (pas via raw_data)")
    print(f"4. Structure raw_data changée depuis création")
    print(f"5. Statistics extraites depuis un autre endpoint")
    
    print(f"\nACTIONS POSSIBLES:")
    print(f"1. Identifier le script/process qui a créé ces 614 stats")
    print(f"2. Reproduire le même process pour matches manquants")
    print(f"3. Appeler API Football directement pour missing matches")
    print(f"4. Vérifier s'il y a eu des migrations récentes")

if __name__ == "__main__":
    main()