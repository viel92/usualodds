#!/usr/bin/env python3
"""
Debug le problème de merge entre match_statistics et matches
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

def debug_match_merge():
    """Debug merge problem"""
    print("DEBUG MATCH MERGE PROBLEM")
    print("=" * 30)
    
    url, key = load_env_credentials()
    supabase = create_client(url, key)
    
    # Load data
    print("[LOADING] Sample data...")
    stats_response = supabase.table('match_statistics').select('id,match_id,team_id').limit(5).execute()
    matches_response = supabase.table('matches').select('id,season,league_id').limit(5).execute()
    
    stats_df = pd.DataFrame(stats_response.data)
    matches_df = pd.DataFrame(matches_response.data)
    
    print("\n[SAMPLE] match_statistics:")
    print(stats_df.head())
    print(f"\nmatch_id samples: {stats_df['match_id'].tolist()}")
    
    print("\n[SAMPLE] matches:")
    print(matches_df.head())
    print(f"\nid samples: {matches_df['id'].tolist()}")
    
    # Check if match_ids exist in matches
    print("\n[CHECKING] If match_statistics.match_id exists in matches.id")
    sample_match_ids = stats_df['match_id'].head(3).tolist()
    
    for match_id in sample_match_ids:
        match_exists = supabase.table('matches').select('id,season').eq('id', str(match_id)).execute()
        print(f"  match_id {match_id}: {'EXISTS' if match_exists.data else 'NOT FOUND'}")
        if match_exists.data:
            print(f"    -> season: {match_exists.data[0].get('season', 'NULL')}")

def main():
    debug_match_merge()

if __name__ == "__main__":
    main()