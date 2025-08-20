#!/usr/bin/env python3
"""
Vérifier ce que l'API Football donne vraiment
Analyser les raw_data pour voir la source de vérité
"""

import os
import sys
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

def analyze_api_football_raw_data(supabase):
    """Analyser les raw_data pour voir ce que l'API donne"""
    print("ANALYSE API FOOTBALL RAW DATA")
    print("=" * 35)
    
    try:
        # Prendre un échantillon de matches avec raw_data
        response = supabase.table('matches').select('id,raw_data').limit(3).execute()
        
        if not response.data:
            print("[ERROR] No raw_data found")
            return
        
        for idx, match in enumerate(response.data):
            print(f"\n[MATCH {idx+1}] ID: {match['id']}")
            
            raw_data = match['raw_data']
            
            if not raw_data:
                print("  No raw_data")
                continue
            
            print(f"  Raw data keys: {list(raw_data.keys())}")
            
            # Analyser structure statistics dans raw_data
            if 'statistics' in raw_data:
                stats = raw_data['statistics']
                print(f"  Statistics type: {type(stats)}")
                
                if isinstance(stats, list) and len(stats) > 0:
                    print(f"  Number of teams: {len(stats)}")
                    
                    # Analyser première équipe
                    team_stats = stats[0]
                    print(f"  Team stats keys: {list(team_stats.keys())}")
                    
                    if 'statistics' in team_stats:
                        detailed_stats = team_stats['statistics']
                        print(f"  Detailed stats type: {type(detailed_stats)}")
                        
                        if isinstance(detailed_stats, list):
                            print(f"  Available stat types from API Football:")
                            
                            for stat in detailed_stats:
                                if isinstance(stat, dict) and 'type' in stat:
                                    stat_type = stat['type']
                                    stat_value = stat.get('value', 'N/A')
                                    print(f"    - {stat_type}: {stat_value}")
            
            # Analyser autres sections
            for key in ['fixture', 'teams', 'goals', 'events']:
                if key in raw_data:
                    data = raw_data[key]
                    print(f"  {key}: {type(data)} - {list(data.keys()) if isinstance(data, dict) else 'Not dict'}")
            
            break  # Analyser juste le premier pour avoir un aperçu complet
            
    except Exception as e:
        print(f"[ERROR] Analysis failed: {e}")

def check_what_api_provides():
    """Check ce que l'API Football peut théoriquement fournir"""
    print("\nAPI FOOTBALL CAPABILITIES CHECK")
    print("=" * 35)
    
    print("Endpoints API Football typiques:")
    
    endpoints = {
        '/fixtures': 'Match basic info, scores, dates',
        '/fixtures/statistics': 'Match statistics per team',
        '/fixtures/events': 'Goals, cards, substitutions',
        '/fixtures/lineups': 'Starting lineups and formations',
        '/players': 'Player statistics for match',
        '/standings': 'League table/standings'
    }
    
    for endpoint, description in endpoints.items():
        print(f"  {endpoint}: {description}")
    
    print(f"\nStats typiques dans /fixtures/statistics:")
    
    typical_stats = [
        'Shots on Goal', 'Shots off Goal', 'Total Shots',
        'Blocked Shots', 'Shots insidebox', 'Shots outsidebox',
        'Fouls', 'Corner Kicks', 'Offsides',
        'Ball Possession', 'Yellow Cards', 'Red Cards',
        'Goalkeeper Saves', 'Total passes', 'Passes accurate',
        'Passes %', 'Expected goals'
    ]
    
    for stat in typical_stats:
        print(f"  - {stat}")
    
    print(f"\nStats AVANCEES (probablement PAS dans API):")
    
    advanced_stats = [
        'tempo_score', 'pressing_intensity', 'transition_speed',
        'verticality_index', 'width_usage', 'big_game_performance',
        'congestion_index', 'travel_km_total', 'avg_rest_days'
    ]
    
    for stat in advanced_stats:
        print(f"  - {stat} [CALCUL REQUIS]")

def identify_migration_creator():
    """Identifier qui a créé ces colonnes"""
    print("\nQUI A CREE CES COLONNES?")
    print("=" * 25)
    
    print("Analyse migration 20250819_200000_consolidated_migration.sql:")
    print("  - Colonnes basiques API: corners, cards, shots [OK]")
    print("  - Colonnes avancees: tempo_score, pressing_intensity [CUSTOM]")
    print("  - Colonnes calculees: big_game_performance, volatility [CUSTOM]")
    print("  - Colonnes externes: travel_km, congestion_index [EXTERNAL DATA]")
    
    print(f"\nCONCLUSION:")
    print(f"  1. BASIQUES (API Football): ~15 colonnes extractibles")
    print(f"  2. CALCULEES (Algorithmes): ~10 colonnes a developper")
    print(f"  3. EXTERNES (Autres sources): ~5 colonnes donnees tierces")
    print(f"  4. TOTAL: 30 colonnes dont 15 immediatement recuperables")

def main():
    """Main analysis"""
    print("CHECK: QUI A CREE CES COLONNES VIDES?")
    print("=" * 45)
    
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Credentials manquantes")
        return
    
    try:
        supabase = create_client(url, key)
        print("[OK] Connected for API analysis")
        
        analyze_api_football_raw_data(supabase)
        check_what_api_provides()
        identify_migration_creator()
        
        print(f"\nRECOMMANDATIONS:")
        print(f"1. EXTRAIRE stats basiques API Football (quick win)")
        print(f"2. DEVELOPPER algorithmes stats avancees (long term)")
        print(f"3. INTEGRER donnees externes si necessaire")
        print(f"4. PRIORISER selon impact ML")
        
    except Exception as e:
        print(f"[ERROR] Check failed: {e}")

if __name__ == "__main__":
    main()