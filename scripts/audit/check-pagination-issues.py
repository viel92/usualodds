#!/usr/bin/env python3
"""
Vérifier les problèmes de pagination dans les données
Analyser pourquoi certaines données manquent
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

def check_pagination_comprehensive(supabase):
    """Vérifier la pagination de toutes les tables importantes"""
    print("COMPREHENSIVE PAGINATION CHECK")
    print("=" * 35)
    
    tables_to_check = ['matches', 'match_statistics', 'team_features']
    
    for table in tables_to_check:
        print(f"\n[CHECKING] Table: {table}")
        
        try:
            # Method 1: Count with large limit
            print("  Method 1: Large limit (10000)...")
            response1 = supabase.table(table).select('id', count='exact').limit(10000).execute()
            count1 = response1.count
            data1_count = len(response1.data) if response1.data else 0
            
            print(f"    Count header: {count1}")
            print(f"    Actual data returned: {data1_count}")
            
            # Method 2: Paginated count
            print("  Method 2: Paginated counting...")
            total_paginated = 0
            batch_size = 1000
            offset = 0
            batches = 0
            
            while True:
                batch_response = supabase.table(table).select('id').range(offset, offset + batch_size - 1).execute()
                
                if not batch_response.data:
                    break
                    
                batch_count = len(batch_response.data)
                total_paginated += batch_count
                batches += 1
                
                print(f"    Batch {batches}: {batch_count} records (total: {total_paginated})")
                
                if batch_count < batch_size:
                    break
                    
                offset += batch_size
                
                # Safety limit
                if batches > 10:
                    print("    [WARNING] Stopping at 10 batches for safety")
                    break
                    
                time.sleep(0.1)
            
            print(f"  RESULTS for {table}:")
            print(f"    Method 1 count: {count1}")
            print(f"    Method 2 paginated: {total_paginated}")
            print(f"    Difference: {abs(count1 - total_paginated) if count1 else 'N/A'}")
            
            if count1 and count1 != total_paginated:
                print(f"    WARNING: Pagination mismatch detected!")
                
        except Exception as e:
            print(f"  [ERROR] {table} check failed: {e}")

def check_match_statistics_gaps(supabase):
    """Vérifier spécifiquement les gaps dans match_statistics"""
    print(f"\nMATCH_STATISTICS GAPS ANALYSIS")
    print("=" * 35)
    
    try:
        # Get all match_statistics avec détails
        print("[LOADING] All match_statistics...")
        all_stats = []
        batch_size = 1000
        offset = 0
        
        while True:
            batch = supabase.table('match_statistics').select('match_id,team_id,created_at').range(offset, offset + batch_size - 1).execute()
            
            if not batch.data:
                break
                
            all_stats.extend(batch.data)
            print(f"  Loaded batch: +{len(batch.data)} (total: {len(all_stats)})")
            
            if len(batch.data) < batch_size:
                break
                
            offset += batch_size
            time.sleep(0.1)
        
        if all_stats:
            stats_df = pd.DataFrame(all_stats)
            
            print(f"\n[ANALYSIS] Match_statistics patterns:")
            print(f"  Total records: {len(stats_df)}")
            print(f"  Unique matches: {stats_df['match_id'].nunique()}")
            print(f"  Date range: {stats_df['created_at'].min()} to {stats_df['created_at'].max()}")
            
            # Check for potential creation date patterns
            stats_df['date'] = pd.to_datetime(stats_df['created_at']).dt.date
            date_counts = stats_df['date'].value_counts().head(10)
            
            print(f"\n  Top creation dates:")
            for date, count in date_counts.items():
                print(f"    {date}: {count} records")
                
        return len(all_stats)
        
    except Exception as e:
        print(f"[ERROR] Gap analysis failed: {e}")
        return 0

def identify_missing_statistics_sources(supabase):
    """Identifier quels matches n'ont pas de statistiques et pourquoi"""
    print(f"\nMISSING STATISTICS SOURCE ANALYSIS") 
    print("=" * 40)
    
    try:
        # Get all matches
        print("[LOADING] All matches...")
        matches_response = supabase.table('matches').select('api_id,season,league_id,status_short,raw_data').execute()
        matches_df = pd.DataFrame(matches_response.data)
        
        # Get matches with statistics
        stats_response = supabase.table('match_statistics').select('match_id').execute()
        stats_df = pd.DataFrame(stats_response.data)
        
        match_ids_with_stats = set(stats_df['match_id'].unique())
        matches_with_stats = matches_df[matches_df['api_id'].isin(match_ids_with_stats)]
        matches_without_stats = matches_df[~matches_df['api_id'].isin(match_ids_with_stats)]
        
        print(f"[SUMMARY]")
        print(f"  Total matches: {len(matches_df)}")
        print(f"  With statistics: {len(matches_with_stats)}")
        print(f"  Without statistics: {len(matches_without_stats)}")
        
        # Analyze missing by attributes
        print(f"\n[MISSING BY SEASON]")
        missing_by_season = matches_without_stats['season'].value_counts().sort_index()
        for season, count in missing_by_season.items():
            print(f"  {season}: {count} matches")
        
        print(f"\n[MISSING BY STATUS]")
        missing_by_status = matches_without_stats['status_short'].value_counts()
        for status, count in missing_by_status.items():
            print(f"  {status}: {count} matches")
        
        # Check if raw_data contains statistics
        print(f"\n[RAW_DATA CHECK] Sample matches without statistics:")
        sample_missing = matches_without_stats.head(3)
        
        for idx, match in sample_missing.iterrows():
            raw_data = match.get('raw_data', {})
            has_statistics = 'statistics' in raw_data if raw_data else False
            print(f"  Match {match['api_id']} ({match['season']}):")
            print(f"    Status: {match['status_short']}")
            print(f"    Has raw_data: {bool(raw_data)}")
            print(f"    Has statistics in raw_data: {has_statistics}")
            
            if has_statistics and raw_data['statistics']:
                print(f"    Statistics available but not extracted!")
        
        return {
            'total_matches': len(matches_df),
            'with_stats': len(matches_with_stats), 
            'without_stats': len(matches_without_stats),
            'missing_by_season': missing_by_season.to_dict()
        }
        
    except Exception as e:
        print(f"[ERROR] Missing source analysis failed: {e}")
        return None

def main():
    """Main pagination check"""
    print("PAGINATION AND DATA GAPS INVESTIGATION")
    print("=" * 50)
    
    url, key = load_env_credentials()
    if not url or not key:
        print("[ERROR] Credentials manquantes")
        return
    
    try:
        supabase = create_client(url, key)
        print("[OK] Connected for pagination check")
        
        # Check pagination across tables
        check_pagination_comprehensive(supabase)
        
        # Deep dive into match_statistics
        total_stats = check_match_statistics_gaps(supabase)
        
        # Analyze missing data sources
        missing_analysis = identify_missing_statistics_sources(supabase)
        
        if missing_analysis:
            print(f"\nCONCLUSIONS:")
            coverage = (missing_analysis['with_stats'] / missing_analysis['total_matches']) * 100
            print(f"1. Current coverage: {coverage:.1f}%")
            
            if coverage < 50:
                print(f"2. MAJOR GAP: Most matches missing statistics")
                print(f"3. ACTION: Full extraction pipeline needed")
            else:
                print(f"2. PARTIAL COVERAGE: Expansion possible")
                print(f"3. ACTION: Targeted extraction for missing seasons")
        
        print(f"\nNEXT STEPS:")
        print(f"1. Create comprehensive extraction script")
        print(f"2. Handle pagination properly (1000+ records)")  
        print(f"3. Extract statistics for all seasons")
        print(f"4. Verify raw_data availability")
        
    except Exception as e:
        print(f"[ERROR] Investigation failed: {e}")

if __name__ == "__main__":
    main()