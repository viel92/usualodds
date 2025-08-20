#!/usr/bin/env python3
"""
Vérifier structure réelle des JSON dans Supabase
Comprendre format pour extraction correcte
"""

import os
import sys
import pandas as pd
import json
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

def check_match_statistics_json(supabase):
    """Check structure JSON match_statistics"""
    print("CHECK MATCH_STATISTICS JSON STRUCTURE")
    print("=" * 45)
    
    try:
        # Prendre un échantillon
        response = supabase.table('match_statistics').select('id,match_id,team_name,statistics').limit(3).execute()
        
        if response.data:
            for idx, record in enumerate(response.data):
                print(f"\n[RECORD {idx+1}] Match {record['match_id']} - {record['team_name']}")
                
                # Analyser le type de statistics
                stats = record['statistics']
                print(f"  Type: {type(stats)}")
                
                if stats is None:
                    print("  Content: NULL")
                    continue
                
                if isinstance(stats, dict):
                    print(f"  Dict keys: {list(stats.keys())}")
                    
                    # Montrer quelques valeurs
                    for key, value in list(stats.items())[:5]:
                        print(f"    {key}: {value} ({type(value)})")
                        
                elif isinstance(stats, list):
                    print(f"  List length: {len(stats)}")
                    if len(stats) > 0:
                        print(f"  First item type: {type(stats[0])}")
                        if isinstance(stats[0], dict):
                            print(f"  First item keys: {list(stats[0].keys())}")
                
                elif isinstance(stats, str):
                    print(f"  String content preview: {stats[:100]}...")
                    try:
                        parsed = json.loads(stats)
                        print(f"  Parsed type: {type(parsed)}")
                        if isinstance(parsed, dict):
                            print(f"  Parsed keys: {list(parsed.keys())}")
                    except:
                        print("  String is not valid JSON")
                
                else:
                    print(f"  Unknown type content: {stats}")
                
                break  # Analyser juste le premier pour comprendre
                
    except Exception as e:
        print(f"[ERROR] Check failed: {e}")

def check_matches_raw_data(supabase):
    """Check structure raw_data matches"""
    print("\nCHECK MATCHES RAW_DATA STRUCTURE")
    print("=" * 38)
    
    try:
        response = supabase.table('matches').select('id,raw_data').limit(2).execute()
        
        if response.data:
            for idx, record in enumerate(response.data):
                print(f"\n[MATCH {record['id']}] Raw data structure:")
                
                raw_data = record['raw_data']
                print(f"  Type: {type(raw_data)}")
                
                if isinstance(raw_data, dict):
                    print(f"  Top level keys: {list(raw_data.keys())}")
                    
                    # Check for statistics in raw_data
                    if 'statistics' in raw_data:
                        stats = raw_data['statistics']
                        print(f"  Statistics type: {type(stats)}")
                        
                        if isinstance(stats, list) and len(stats) > 0:
                            print(f"  Statistics teams: {len(stats)}")
                            team_stats = stats[0]
                            if 'statistics' in team_stats:
                                team_detailed_stats = team_stats['statistics']
                                print(f"  Team stats type: {type(team_detailed_stats)}")
                                
                                if isinstance(team_detailed_stats, list) and len(team_detailed_stats) > 0:
                                    print(f"  Available stat types:")
                                    for stat in team_detailed_stats[:10]:
                                        if isinstance(stat, dict) and 'type' in stat:
                                            print(f"    - {stat['type']}: {stat.get('value', 'N/A')}")
                
                break  # Juste le premier pour comprendre
                
    except Exception as e:
        print(f"[ERROR] Check failed: {e}")

def find_available_stats():
    """Lister toutes les stats disponibles"""
    print("\nAVAILABLE STATS MAPPING")
    print("=" * 25)
    
    # Stats qu'on cherche dans les colonnes vides
    target_stats = {
        'corners_for': ['Corner Kicks', 'Corners', 'corner_kicks'],
        'yellow_cards': ['Yellow Cards', 'yellow_cards', 'cards_yellow'],
        'red_cards': ['Red Cards', 'red_cards', 'cards_red'],
        'shots_per_game': ['Total Shots', 'total_shots', 'shots_total'],
        'shots_on_target_avg': ['Shots on Goal', 'shots_on_target', 'shots_on_goal'],
        'expected_goals': ['Expected Goals', 'xG', 'expected_goals'],
        'possession_avg': ['Ball Possession', 'possession', 'ball_possession'],
        'fouls': ['Fouls', 'fouls'],
        'offsides': ['Offsides', 'offsides']
    }
    
    print("Mapping recherche:")
    for column, possible_names in target_stats.items():
        print(f"  {column}: {possible_names}")

def main():
    """Main check"""
    print("CHECK JSON STRUCTURE POUR EXTRACTION")
    print("=" * 50)
    
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Credentials manquantes")
        return
    
    try:
        supabase = create_client(url, key)
        print("[OK] Connecte pour check structure")
        
        check_match_statistics_json(supabase)
        check_matches_raw_data(supabase)
        find_available_stats()
        
        print(f"\nRECOMMANDATIONS:")
        print(f"1. Adapter script extraction selon structure trouvee")
        print(f"2. Mapper les noms API vers nos colonnes cibles")
        print(f"3. Gerer les differents formats JSON/dict/list")
        print(f"4. Tester extraction sur echantillon d'abord")
        
    except Exception as e:
        print(f"[ERROR] Check failed: {e}")

if __name__ == "__main__":
    main()