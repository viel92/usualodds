#!/usr/bin/env python3
"""
VERIFY MATCHES COUNT - Vérifier le vrai compte de matches
=========================================================
Résoudre contradiction user (1760) vs audit (10)
"""

import os
from supabase import create_client
from dotenv import load_dotenv

def verify_matches():
    print("VERIFY EXACT MATCHES COUNT")
    print("=========================")
    
    load_dotenv()
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    try:
        supabase = create_client(supabase_url, service_role_key)
        
        # Count exact avec Supabase
        print("  [COUNTING] Total matches...")
        response = supabase.table('matches').select('id', count='exact').execute()
        total_count = response.count
        
        print(f"  [RESULT] TOTAL MATCHES: {total_count}")
        
        # Par saison
        print(f"\\n  [BY SEASON]")
        all_matches = supabase.table('matches').select('season').execute()
        
        seasons = {}
        for match in all_matches.data:
            season = match.get('season')
            seasons[season] = seasons.get(season, 0) + 1
        
        for season, count in sorted(seasons.items()):
            print(f"    Season {season}: {count} matches")
            
        return total_count
        
    except Exception as e:
        print(f"  [ERROR] {e}")
        return 0

if __name__ == "__main__":
    verify_matches()