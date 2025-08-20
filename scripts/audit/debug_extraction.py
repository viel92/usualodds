#!/usr/bin/env python3
"""
DEBUG EXTRACTION
================
"""

import os
import json
from supabase import create_client
from dotenv import load_dotenv

def debug_extraction():
    print("DEBUG EXTRACTION RESULTS")
    print("="*30)
    
    load_dotenv()
    supabase = create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    )
    
    try:
        # Exemple d'un joueur
        response = supabase.table('player_features').select(
            'player_id, player_name, team_name, goals, assists, raw_stats'
        ).limit(3).execute()
        
        for i, player in enumerate(response.data, 1):
            print(f"\nJOUEUR {i}:")
            print(f"  player_id: {player.get('player_id')}")
            print(f"  player_name: '{player.get('player_name')}'")
            print(f"  team_name: '{player.get('team_name')}'")
            print(f"  goals: {player.get('goals')}")
            print(f"  assists: {player.get('assists')}")
            
            # Regarder raw_stats
            raw_stats = player.get('raw_stats')
            if raw_stats:
                try:
                    if isinstance(raw_stats, str):
                        stats = json.loads(raw_stats)
                    else:
                        stats = raw_stats
                    
                    print(f"  RAW STATS KEYS: {list(stats.keys())}")
                    
                    if 'team' in stats:
                        print(f"    team.name: '{stats['team'].get('name')}'")
                    
                    if 'goals' in stats:
                        print(f"    goals.total: {stats['goals'].get('total')}")
                        
                except Exception as e:
                    print(f"    JSON ERROR: {e}")
            else:
                print("  NO RAW_STATS")
    
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    debug_extraction()