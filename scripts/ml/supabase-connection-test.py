#!/usr/bin/env python3
"""
Test connexion Supabase simple et robuste
Diagnostic des problemes de connexion réseau
"""

import os
import sys
import time
import pandas as pd

def test_basic_connection():
    """Test connexion de base sans dependances externes"""
    print("SUPABASE CONNECTION DIAGNOSTIC")
    print("=" * 40)
    
    try:
        from supabase import create_client, Client
        print("[OK] Supabase library import successful")
    except ImportError as e:
        print(f"[ERROR] Supabase library not found: {e}")
        return False
    
    # Configuration Supabase
    url = "https://bpyftqmkqwtmhqvuqctf.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweWZ0cW1rcXd0bWhxdnVxY3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQxNzA0MzIsImV4cCI6MjAzOTc0NjQzMn0.v-7pO7w5lZJrJAYcEAzN5ZRBrqOFFgpOxzFVWX5ZCSM"
    
    print(f"[INFO] Testing connection to: {url}")
    
    try:
        # Test avec timeout court
        supabase: Client = create_client(url, key)
        print("[OK] Supabase client created")
        
        # Test simple query avec limite
        print("[TEST] Querying matches table...")
        start_time = time.time()
        
        response = supabase.table('matches').select('id,home_team,away_team').limit(5).execute()
        
        query_time = time.time() - start_time
        print(f"[OK] Query completed in {query_time:.2f}s")
        
        if response.data:
            print(f"[SUCCESS] Retrieved {len(response.data)} matches")
            for match in response.data[:3]:
                print(f"  Match {match.get('id')}: {match.get('home_team')} vs {match.get('away_team')}")
            return True
        else:
            print("[WARNING] No data returned")
            return False
            
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        print(f"[ERROR] Error type: {type(e).__name__}")
        return False

def test_team_features_access():
    """Test acces table team_features"""
    print("\nTEAM FEATURES ACCESS TEST")
    print("=" * 30)
    
    try:
        from supabase import create_client, Client
        url = "https://bpyftqmkqwtmhqvuqctf.supabase.co"
        key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweWZ0cW1rcXd0bWhxdnVxY3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQxNzA0MzIsImV4cCI6MjAzOTc0NjQzMn0.v-7pO7w5lZJrJAYcEAzN5ZRBrqOFFgpOxzFVWX5ZCSM"
        
        supabase: Client = create_client(url, key)
        
        # Test team_features
        print("[TEST] Querying team_features...")
        response = supabase.table('team_features').select('team_id,season,elo_rating,form_5_points').limit(10).execute()
        
        if response.data:
            print(f"[SUCCESS] Retrieved {len(response.data)} team features")
            
            # Analyse des features disponibles
            if response.data:
                sample = response.data[0]
                print(f"[INFO] Available columns sample:")
                for key, value in sample.items():
                    if value is not None:
                        print(f"  {key}: {value}")
            
            return True
        else:
            print("[WARNING] No team features found")
            return False
            
    except Exception as e:
        print(f"[ERROR] Team features access failed: {e}")
        return False

def fallback_local_test():
    """Test avec données locales si connexion échoue"""
    print("\nFALLBACK LOCAL TEST")
    print("=" * 20)
    
    # Générer données test basées sur roadmap
    import numpy as np
    np.random.seed(42)
    
    # Simuler données team_features avec colonnes roadmap
    n_teams = 20
    n_seasons = 4
    
    teams_data = []
    for team_id in range(1, n_teams + 1):
        for season in [2021, 2022, 2023, 2024]:
            team_data = {
                'team_id': team_id,
                'season': season,
                'elo_rating': np.random.normal(1500, 200),
                'form_5_points': np.random.normal(1.5, 0.8),
                'volatility_index': np.random.uniform(0.1, 0.9),
                'goals_for_avg': np.random.normal(1.5, 0.5),
                'possession_avg': np.random.normal(50, 10),
                # Nouvelles features efficiency (à ajouter)
                'shooting_efficiency': np.random.uniform(0.05, 0.25),
                'possession_efficiency': np.random.uniform(0.8, 3.2),
                'attacking_pressure': np.random.uniform(8, 25)
            }
            teams_data.append(team_data)
    
    teams_df = pd.DataFrame(teams_data)
    print(f"[FALLBACK] Generated {len(teams_df)} team features")
    print(f"[FALLBACK] Features: {list(teams_df.columns)}")
    print(f"[FALLBACK] Sample data:")
    print(teams_df.head(3))
    
    return teams_df

def main():
    """Main diagnostic"""
    print("SUPABASE ML CONNECTION DIAGNOSTIC")
    print("=" * 50)
    print("Objective: Prepare for real ML testing with live data")
    
    # Test 1: Basic connection
    connection_ok = test_basic_connection()
    
    if connection_ok:
        # Test 2: Team features access
        features_ok = test_team_features_access()
        
        if features_ok:
            print("\n[SUCCESS] Supabase connection fully operational")
            print("[READY] Can proceed with real ML testing")
            return True
        else:
            print("\n[PARTIAL] Connection OK but team_features issues")
    
    # Fallback si problèmes
    print("\n[FALLBACK] Using local simulation for ML development")
    fallback_data = fallback_local_test()
    
    if fallback_data is not None:
        print("\n[ALTERNATIVE] Local development mode ready")
        print("[RECOMMEND] Continue ML optimization with simulated data")
        return "fallback"
    
    print("\n[FAILED] Cannot establish any data connection")
    return False

if __name__ == "__main__":
    result = main()
    if result == True:
        print("\nNEXT STEP: Run real ML tests with Supabase data")
    elif result == "fallback":
        print("\nNEXT STEP: Continue with local ML optimization")
    else:
        print("\nNEXT STEP: Debug connection issues")