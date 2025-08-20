#!/usr/bin/env python3
"""
Test Supabase avec les VRAIES credentials du .env
Correction du problème de connexion identifié
"""

import os
import sys
import pandas as pd
from supabase import create_client, Client

def load_env_credentials():
    """Load credentials from .env file"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value.strip('"')
    
    # Get Supabase credentials
    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    key = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    print(f"[CONFIG] URL: {url}")
    print(f"[CONFIG] Key: {key[:50]}..." if key else "[CONFIG] Key: Not found")
    
    return url, key

def test_corrected_connection():
    """Test avec les vraies credentials"""
    print("CORRECTED SUPABASE CONNECTION TEST")
    print("=" * 40)
    
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Missing credentials in .env file")
        return False
    
    try:
        # Create client avec vraies credentials
        supabase: Client = create_client(url, key)
        print("[OK] Supabase client created with correct credentials")
        
        # Test simple query
        print("\n[TEST] Querying matches table...")
        response = supabase.table('matches').select('id,home_team,away_team').limit(5).execute()
        
        if response.data:
            print(f"[SUCCESS] Retrieved {len(response.data)} matches")
            for match in response.data:
                print(f"  Match {match.get('id')}: {match.get('home_team')} vs {match.get('away_team')}")
            
            # Test team_features
            print("\n[TEST] Querying team_features table...")
            features_response = supabase.table('team_features').select('team_id,season,elo_rating').limit(5).execute()
            
            if features_response.data:
                print(f"[SUCCESS] Retrieved {len(features_response.data)} team features")
                for feature in features_response.data:
                    print(f"  Team {feature.get('team_id')} Season {feature.get('season')}: ELO {feature.get('elo_rating')}")
                
                return True
            else:
                print("[WARNING] No team features found")
                return False
        else:
            print("[WARNING] No matches found")
            return False
            
    except Exception as e:
        print(f"[ERROR] Connection test failed: {e}")
        return False

def test_pagination_with_correct_credentials():
    """Test pagination avec limite 1000"""
    print("\nPAGINATION TEST WITH CORRECT CREDENTIALS")
    print("=" * 45)
    
    url, key = load_env_credentials()
    
    try:
        supabase: Client = create_client(url, key)
        
        # Test count total matches
        print("[TEST] Getting total matches count...")
        
        # Méthode 1: Query avec count
        response = supabase.table('matches').select('*', count='exact').execute()
        total_matches = response.count if hasattr(response, 'count') else len(response.data)
        
        print(f"[INFO] Total matches: {total_matches}")
        
        if total_matches > 1000:
            print(f"[WARNING] Total {total_matches} > 1000 - Pagination required!")
            
            # Test pagination
            pages_needed = (total_matches // 1000) + 1
            print(f"[INFO] Pages needed: {pages_needed}")
            
            # Get first 1000
            page1 = supabase.table('matches').select('*').range(0, 999).execute()
            print(f"[OK] Page 1: {len(page1.data)} records")
            
            # Get second 1000 if needed
            if pages_needed > 1:
                page2 = supabase.table('matches').select('*').range(1000, 1999).execute()
                print(f"[OK] Page 2: {len(page2.data)} records")
            
            return True
        else:
            print(f"[OK] Total {total_matches} <= 1000 - Single query sufficient")
            return True
            
    except Exception as e:
        print(f"[ERROR] Pagination test failed: {e}")
        return False

def create_ml_data_loader():
    """Create ML data loader with correct credentials"""
    print("\nCREATING ML DATA LOADER")
    print("=" * 25)
    
    url, key = load_env_credentials()
    
    try:
        supabase: Client = create_client(url, key)
        
        # Load matches avec pagination
        print("[LOADING] Matches data with pagination...")
        all_matches = []
        offset = 0
        batch_size = 1000
        
        while True:
            batch = supabase.table('matches').select('*').range(offset, offset + batch_size - 1).execute()
            
            if not batch.data:
                break
                
            all_matches.extend(batch.data)
            print(f"  Loaded batch: {len(batch.data)} matches (total: {len(all_matches)})")
            
            if len(batch.data) < batch_size:
                break  # Last batch
                
            offset += batch_size
        
        matches_df = pd.DataFrame(all_matches)
        print(f"[SUCCESS] Total matches loaded: {len(matches_df)}")
        
        # Load team_features avec pagination
        print("\n[LOADING] Team features data with pagination...")
        all_features = []
        offset = 0
        
        while True:
            batch = supabase.table('team_features').select('*').range(offset, offset + batch_size - 1).execute()
            
            if not batch.data:
                break
                
            all_features.extend(batch.data)
            print(f"  Loaded batch: {len(batch.data)} features (total: {len(all_features)})")
            
            if len(batch.data) < batch_size:
                break
                
            offset += batch_size
        
        features_df = pd.DataFrame(all_features)
        print(f"[SUCCESS] Total team features loaded: {len(features_df)}")
        
        # Analyze data structure
        print(f"\n[ANALYSIS] Data structure:")
        print(f"  Matches columns: {list(matches_df.columns) if len(matches_df) > 0 else 'No data'}")
        print(f"  Features columns: {list(features_df.columns) if len(features_df) > 0 else 'No data'}")
        
        if len(matches_df) > 0 and len(features_df) > 0:
            print(f"\n[READY] Data loaded successfully for ML training")
            print(f"  Matches: {len(matches_df)} records")
            print(f"  Features: {len(features_df)} records")
            return matches_df, features_df, supabase
        else:
            print(f"[ERROR] Insufficient data loaded")
            return None, None, None
            
    except Exception as e:
        print(f"[ERROR] ML data loader failed: {e}")
        return None, None, None

def main():
    """Main test avec credentials corrigées"""
    print("SUPABASE CONNECTION CORRECTION TEST")
    print("=" * 50)
    print("Objective: Fix connection with correct .env credentials")
    
    # Test basic connection
    connection_ok = test_corrected_connection()
    
    if connection_ok:
        print("\n[SUCCESS] Basic connection working!")
        
        # Test pagination
        pagination_ok = test_pagination_with_correct_credentials()
        
        if pagination_ok:
            print("\n[SUCCESS] Pagination working!")
            
            # Create ML data loader
            matches_df, features_df, supabase = create_ml_data_loader()
            
            if matches_df is not None and features_df is not None:
                print("\n[SUCCESS] ML data loader ready!")
                print("NEXT STEP: Run real ML tests with loaded data")
                return True
            else:
                print("\n[PARTIAL] Connection OK but data loading issues")
                return False
        else:
            print("\n[PARTIAL] Connection OK but pagination issues")
            return False
    else:
        print("\n[FAILED] Basic connection still failing")
        print("Check: .env file path and credential validity")
        return False

if __name__ == "__main__":
    success = main()
    
    if success:
        print("\n🎯 CONNECTION FIXED - READY FOR ML TESTING")
        print("Next: Run enhanced ML tests with real Supabase data")
    else:
        print("\n❌ CONNECTION ISSUES PERSIST")
        print("Action: Verify .env file and credentials")