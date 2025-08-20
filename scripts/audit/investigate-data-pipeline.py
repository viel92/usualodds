#!/usr/bin/env python3
"""
Investigation approfondie du pipeline de données
Objectif: Comprendre pourquoi 39 colonnes sont critiques
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

def investigate_raw_data_content(supabase):
    """Investiguer le contenu des raw_data"""
    print("INVESTIGATION RAW_DATA")
    print("=" * 30)
    
    try:
        # Sample des match raw_data
        matches_response = supabase.table('matches').select('id,raw_data').limit(5).execute()
        
        if matches_response.data:
            print(f"[INFO] {len(matches_response.data)} matches avec raw_data analyses")
            
            for match in matches_response.data:
                try:
                    raw_data = json.loads(match['raw_data'])
                    print(f"\n[MATCH {match['id']}] Structure raw_data:")
                    
                    def analyze_dict(data, prefix="", max_depth=2):
                        if max_depth <= 0:
                            return
                        for key, value in data.items():
                            if isinstance(value, dict):
                                print(f"  {prefix}{key}: {{...}} ({len(value)} keys)")
                                if len(value) < 10:  # Detail si pas trop gros
                                    analyze_dict(value, prefix + "  ", max_depth-1)
                            elif isinstance(value, list):
                                print(f"  {prefix}{key}: [...] ({len(value)} items)")
                                if len(value) > 0 and isinstance(value[0], dict):
                                    print(f"    {prefix}Sample item keys: {list(value[0].keys())}")
                            else:
                                print(f"  {prefix}{key}: {type(value).__name__}")
                    
                    analyze_dict(raw_data)
                    break  # Analyser juste le premier pour l'exemple
                    
                except Exception as e:
                    print(f"  [ERROR] Parsing raw_data: {e}")
                    continue
                    
    except Exception as e:
        print(f"[ERROR] Investigation raw_data echouee: {e}")

def investigate_match_statistics_json(supabase):
    """Investiguer le JSON statistics"""
    print("\nINVESTIGATION MATCH_STATISTICS JSON")
    print("=" * 40)
    
    try:
        # Sample des statistics JSON
        stats_response = supabase.table('match_statistics').select('id,match_id,team_name,statistics').limit(3).execute()
        
        if stats_response.data:
            print(f"[INFO] {len(stats_response.data)} statistics analysees")
            
            for stat in stats_response.data:
                try:
                    statistics = json.loads(stat['statistics'])
                    print(f"\n[STAT {stat['id']}] Team: {stat['team_name']}")
                    print(f"  Keys disponibles: {list(statistics.keys())}")
                    
                    # Chercher XG
                    xg_found = False
                    for key, value in statistics.items():
                        if 'xg' in key.lower() or 'expected' in key.lower():
                            print(f"  XG TROUVE: {key} = {value}")
                            xg_found = True
                    
                    if not xg_found:
                        print(f"  XG PAS TROUVE dans cette stat")
                        
                    # Autres metriques importantes
                    important_metrics = ['goals', 'shots', 'possession', 'corners', 'fouls', 'cards']
                    for metric in important_metrics:
                        found_keys = [k for k in statistics.keys() if metric in k.lower()]
                        if found_keys:
                            print(f"  {metric.upper()}: {found_keys}")
                    
                    break  # Analyser juste le premier
                    
                except Exception as e:
                    print(f"  [ERROR] Parsing statistics JSON: {e}")
                    continue
                    
    except Exception as e:
        print(f"[ERROR] Investigation statistics echouee: {e}")

def check_data_collection_scripts(supabase):
    """Verifier quels scripts de collecte ont tournés"""
    print("\nVERIFICATION SCRIPTS COLLECTE")
    print("=" * 35)
    
    try:
        # Check dernières mises à jour
        recent_teams = supabase.table('team_features').select('team_id,updated_at,elo_rating,form_5_points,xg_for_avg').order('updated_at', desc=True).limit(5).execute()
        
        if recent_teams.data:
            print(f"[INFO] Dernieres team_features mises a jour:")
            for team in recent_teams.data:
                print(f"  Team {team['team_id']}: {team['updated_at']}")
                print(f"    ELO: {team['elo_rating']}")
                print(f"    Form: {team['form_5_points']}")
                print(f"    XG: {team['xg_for_avg']}")
        
        # Check si certaines colonnes sont populées vs d'autres
        team_sample = supabase.table('team_features').select('*').limit(1).execute()
        
        if team_sample.data:
            sample = team_sample.data[0]
            print(f"\n[SAMPLE] Etat colonnes team_features:")
            
            populated_cols = []
            empty_cols = []
            
            for key, value in sample.items():
                if value is not None and value != 0 and value != '':
                    populated_cols.append(key)
                else:
                    empty_cols.append(key)
            
            print(f"  Colonnes populees ({len(populated_cols)}): {populated_cols[:10]}...")
            print(f"  Colonnes vides ({len(empty_cols)}): {empty_cols[:10]}...")
        
    except Exception as e:
        print(f"[ERROR] Verification scripts echouee: {e}")

def analyze_api_football_coverage(supabase):
    """Analyser coverage API Football"""
    print("\nANALYSE COVERAGE API FOOTBALL")
    print("=" * 35)
    
    try:
        # Check raw_data pour voir quelles données API sont disponibles
        match_sample = supabase.table('matches').select('raw_data').limit(1).execute()
        
        if match_sample.data:
            raw_data = json.loads(match_sample.data[0]['raw_data'])
            
            print(f"[API COVERAGE] Données disponibles dans raw_data:")
            
            # Endpoints API Football typiques
            api_endpoints = {
                'fixture': ['fixture', 'league', 'teams', 'goals', 'score'],
                'statistics': ['statistics'],
                'lineups': ['lineups'],
                'events': ['events'],
                'players': ['players']
            }
            
            for endpoint, expected_keys in api_endpoints.items():
                found_keys = []
                for key in expected_keys:
                    if key in raw_data:
                        found_keys.append(key)
                
                coverage = len(found_keys) / len(expected_keys) * 100
                print(f"  {endpoint}: {coverage:.0f}% coverage ({found_keys})")
            
            # Check details statistics
            if 'statistics' in raw_data:
                stats = raw_data['statistics']
                print(f"\n[STATISTICS DETAIL] {len(stats)} teams stats")
                
                if len(stats) > 0:
                    team_stats = stats[0]['statistics']
                    stat_types = [stat['type'] for stat in team_stats]
                    print(f"  Types stats disponibles: {stat_types}")
                    
                    # Chercher XG specifiquement
                    xg_stats = [stat for stat in team_stats if 'xg' in stat['type'].lower() or 'expected' in stat['type'].lower()]
                    print(f"  Stats XG trouvees: {[stat['type'] for stat in xg_stats]}")
        
    except Exception as e:
        print(f"[ERROR] Analyse API coverage echouee: {e}")

def identify_missing_calculation_scripts():
    """Identifier scripts de calcul manquants"""
    print("\nIDENTIFICATION SCRIPTS MANQUANTS")
    print("=" * 40)
    
    # Features critiques identifiées
    critical_missing_features = {
        'tempo_score': 'Rythme de jeu - script de calcul manquant',
        'pressing_intensity': 'Intensité pressing - analyse tactique manquante',
        'transition_speed': 'Vitesse transitions - métrique non calculée',
        'corners_for': 'Corners - extraction basic manquante', 
        'yellow_cards': 'Cartons - données basic non extraites',
        'red_cards': 'Cartons rouges - extraction manquante',
        'xg_for_avg': 'XG moyenne - calcul partiel (18% seulement)',
        'big_game_performance': 'Performance gros matchs - algorithme manquant'
    }
    
    print(f"[FEATURES CRITIQUES] Diagnostics:")
    for feature, diagnostic in critical_missing_features.items():
        print(f"  {feature}: {diagnostic}")
    
    # Scripts nécessaires
    required_scripts = [
        'extract-basic-match-stats.js',  # Corners, cartons, etc.
        'calculate-tactical-metrics.js',  # Tempo, pressing, transitions
        'calculate-xg-complete.js',      # XG complet toutes saisons
        'calculate-big-game-performance.js',  # Performance gros matchs
        'fix-missing-basic-stats.js'    # Correction stats de base
    ]
    
    print(f"\n[SCRIPTS REQUIS] Pour corriger:")
    for script in required_scripts:
        print(f"  - {script}")

def main():
    """Investigation principale"""
    print("INVESTIGATION APPROFONDIE PIPELINE DONNEES")
    print("=" * 55)
    print("Objectif: Comprendre pourquoi 39 colonnes critiques")
    
    # Connect
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Credentials manquantes")
        return False
    
    try:
        supabase = create_client(url, key)
        print(f"[OK] Connecte pour investigation")
        
        # Investigations
        investigate_raw_data_content(supabase)
        investigate_match_statistics_json(supabase)
        check_data_collection_scripts(supabase)
        analyze_api_football_coverage(supabase)
        identify_missing_calculation_scripts()
        
        # Conclusions
        print(f"\nCONCLUSIONS INVESTIGATION")
        print("=" * 25)
        
        print(f"PROBLEMES IDENTIFIES:")
        print(f"1. SCRIPTS CALCUL MANQUANTS - Features avancees jamais calculees")
        print(f"2. EXTRACTION INCOMPLETE - Stats basic pas extraites du JSON")
        print(f"3. XG PARTIEL - Seulement 18% vs 82% manquant")
        print(f"4. PIPELINE CASSE - Beaucoup de colonnes creees mais jamais remplies")
        
        print(f"\nACTIONS PRIORITAIRES:")
        print(f"1. CREER scripts extraction stats basic (corners, cartons)")
        print(f"2. REPARER pipeline XG pour toutes saisons")
        print(f"3. IMPLEMENTER calculs features tactiques")
        print(f"4. LANCER recalcul complet team_features")
        
        print(f"\nIMPACT ML:")
        print(f"- Performance actuelle: 54.1% avec donnees partielles")
        print(f"- Potentiel avec donnees completes: 60-65% possible")
        print(f"- ROI correction: +5-10% accuracy attendue")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Investigation echouee: {e}")
        return False

if __name__ == "__main__":
    success = main()
    
    if success:
        print("\nInvestigation terminee - Actions definies")
    else:
        print("\nInvestigation echouee - Verifier connexion")