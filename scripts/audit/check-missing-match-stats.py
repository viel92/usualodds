#!/usr/bin/env python3
"""
Vérifier pourquoi on n'a que 614 match_statistics sur 1760 matches
Analyser les données manquantes
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

def analyze_missing_match_statistics():
    """Analyser les match_statistics manquantes"""
    print("ANALYSE DES MATCH_STATISTICS MANQUANTES")
    print("=" * 45)
    
    url, key = load_env_credentials()
    supabase = create_client(url, key)
    
    try:
        # Count total matches
        print("[COUNTING] Total matches...")
        matches_response = supabase.table('matches').select('api_id,season,league_id,status_short').execute()
        matches_df = pd.DataFrame(matches_response.data)
        total_matches = len(matches_df)
        print(f"  Total matches: {total_matches}")
        
        # Count match_statistics
        print("[COUNTING] Match statistics...")
        stats_response = supabase.table('match_statistics').select('match_id').execute()
        stats_df = pd.DataFrame(stats_response.data)
        total_stats = len(stats_df)
        print(f"  Total match_statistics: {total_stats}")
        
        # Calculate missing
        missing_count = total_matches - (total_stats // 2)  # Diviser par 2 car 2 équipes par match
        print(f"  Missing match_statistics: {missing_count} matches ({missing_count * 2} records)")
        
        # Analyze by status
        print(f"\n[ANALYSIS] By match status:")
        status_counts = matches_df['status_short'].value_counts()
        for status, count in status_counts.items():
            print(f"  {status}: {count} matches")
        
        # Analyze by season
        print(f"\n[ANALYSIS] By season:")
        season_counts = matches_df['season'].value_counts().sort_index()
        for season, count in season_counts.items():
            print(f"  {season}: {count} matches")
        
        # Check which matches have statistics
        print(f"\n[CHECKING] Which matches have statistics...")
        match_ids_with_stats = set(stats_df['match_id'].unique())
        matches_with_stats = matches_df[matches_df['api_id'].isin(match_ids_with_stats)]
        matches_without_stats = matches_df[~matches_df['api_id'].isin(match_ids_with_stats)]
        
        print(f"  Matches WITH statistics: {len(matches_with_stats)}")
        print(f"  Matches WITHOUT statistics: {len(matches_without_stats)}")
        
        # Analyze missing by season
        print(f"\n[MISSING] By season:")
        if len(matches_without_stats) > 0:
            missing_by_season = matches_without_stats['season'].value_counts().sort_index()
            for season, count in missing_by_season.items():
                print(f"  {season}: {count} matches without stats")
        
        # Sample missing matches
        print(f"\n[SAMPLE] Missing matches:")
        if len(matches_without_stats) > 0:
            sample_missing = matches_without_stats.head(5)
            for idx, match in sample_missing.iterrows():
                print(f"  {match['api_id']}: {match['season']} - {match['status_short']}")
        
        # Check if it's a data pipeline issue
        print(f"\n[HYPOTHESIS] Possible causes:")
        print(f"1. Pipeline only processed certain seasons/leagues")
        print(f"2. Some matches don't have statistics from API Football")
        print(f"3. Data extraction was incomplete")
        print(f"4. Filtering by match status (only FT matches?)")
        
        return {
            'total_matches': total_matches,
            'total_stats_records': total_stats,
            'matches_with_stats': len(matches_with_stats),
            'matches_without_stats': len(matches_without_stats)
        }
        
    except Exception as e:
        print(f"[ERROR] Analysis failed: {e}")
        return None

def recommend_next_steps():
    """Recommander les prochaines étapes"""
    print(f"\nRECOMMANDATIONS:")
    print(f"1. IMMEDIATE: Tester ML avec 614 stats actuelles")
    print(f"2. EXPAND: Extraire stats pour matches manquants")
    print(f"3. FILTER: Peut-être se concentrer sur matches FT seulement")
    print(f"4. VERIFY: Vérifier si API Football a stats pour tous matches")

def main():
    """Main analysis"""
    print("CHECK: POURQUOI 614 AU LIEU DE 1760?")
    print("=" * 45)
    
    results = analyze_missing_match_statistics()
    
    if results:
        coverage_pct = (results['matches_with_stats'] / results['total_matches']) * 100
        print(f"\nCOUVERTURE ACTUELLE:")
        print(f"  {results['matches_with_stats']}/{results['total_matches']} matches ({coverage_pct:.1f}%)")
        
        if coverage_pct < 50:
            print(f"  ⚠️ COUVERTURE FAIBLE - Investigation nécessaire")
        elif coverage_pct < 80:
            print(f"  ℹ️ COUVERTURE PARTIELLE - Expansion possible")
        else:
            print(f"  ✅ COUVERTURE CORRECTE - Continuer ML")
    
    recommend_next_steps()

if __name__ == "__main__":
    main()