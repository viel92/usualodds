#!/usr/bin/env python3
"""
Test ML avec Supabase corrigé - Schema correct
Objectif: Atteindre 55-60% avec vraies données
"""

import os
import sys
import pandas as pd
import numpy as np
from supabase import create_client, Client
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report
import warnings
warnings.filterwarnings('ignore')

def load_env_credentials():
    """Load credentials from .env"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value.strip('"')
    
    return os.environ.get('NEXT_PUBLIC_SUPABASE_URL'), os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

def explore_schema(supabase):
    """Explore correct schema"""
    print("SCHEMA EXPLORATION")
    print("=" * 20)
    
    try:
        # Test matches schema
        print("[TEST] Matches table schema...")
        matches_sample = supabase.table('matches').select('*').limit(1).execute()
        
        if matches_sample.data:
            match_columns = list(matches_sample.data[0].keys())
            print(f"  Matches columns: {match_columns}")
        
        # Test team_features schema  
        print("\n[TEST] Team features schema...")
        features_sample = supabase.table('team_features').select('*').limit(1).execute()
        
        if features_sample.data:
            feature_columns = list(features_sample.data[0].keys())
            print(f"  Features columns: {feature_columns}")
            
        return match_columns, feature_columns
        
    except Exception as e:
        print(f"[ERROR] Schema exploration failed: {e}")
        return [], []

def load_ml_data_corrected(supabase):
    """Load ML data avec schema correct"""
    print("\nLOADING ML DATA - CORRECTED SCHEMA")
    print("=" * 40)
    
    try:
        # Load matches avec colonnes correctes
        print("[LOADING] Matches data...")
        
        # Essayer différentes variantes de colonnes
        possible_columns = [
            'id,home_team_id,away_team_id,home_score,away_score,season',
            'id,home_team,away_team,home_score,away_score,season',
            '*'
        ]
        
        matches_data = None
        for columns in possible_columns:
            try:
                response = supabase.table('matches').select(columns).limit(100).execute()
                if response.data:
                    matches_data = response.data
                    print(f"  [OK] Loaded with columns: {columns}")
                    break
            except Exception as e:
                print(f"  [FAILED] Columns {columns}: {e}")
                continue
        
        if not matches_data:
            print("[ERROR] Could not load matches data")
            return None, None
        
        matches_df = pd.DataFrame(matches_data)
        print(f"  Matches loaded: {len(matches_df)} records")
        print(f"  Columns: {list(matches_df.columns)}")
        
        # Load team_features
        print("\n[LOADING] Team features data...")
        features_response = supabase.table('team_features').select('*').limit(100).execute()
        
        if not features_response.data:
            print("[ERROR] Could not load team features")
            return matches_df, None
        
        features_df = pd.DataFrame(features_response.data)
        print(f"  Features loaded: {len(features_df)} records")
        print(f"  Columns: {list(features_df.columns)}")
        
        return matches_df, features_df
        
    except Exception as e:
        print(f"[ERROR] Data loading failed: {e}")
        return None, None

def prepare_ml_features(matches_df, features_df):
    """Prepare features pour ML"""
    print("\nPREPARING ML FEATURES")
    print("=" * 25)
    
    if matches_df is None or features_df is None:
        print("[ERROR] Missing data for feature preparation")
        return None, None
    
    try:
        # Analyser colonnes disponibles
        print(f"[INFO] Matches columns: {list(matches_df.columns)}")
        print(f"[INFO] Features columns: {list(features_df.columns)}")
        
        # Identifier colonnes target
        target_columns = ['home_score', 'away_score', 'result']
        available_targets = [col for col in target_columns if col in matches_df.columns]
        
        if not available_targets:
            print("[WARNING] No target columns found, creating synthetic target")
            # Create synthetic target for testing
            matches_df['result'] = np.random.choice([0, 1, 2], size=len(matches_df))
            available_targets = ['result']
        
        target_col = available_targets[0]
        print(f"[INFO] Using target column: {target_col}")
        
        # Prepare basic features from available data
        feature_data = []
        
        for idx, match in matches_df.iterrows():
            try:
                # Basic match features
                match_features = {
                    'match_id': match.get('id', idx),
                    'season': match.get('season', 2024),
                }
                
                # Add available features
                for col in matches_df.columns:
                    if col not in ['id', target_col] and pd.notna(match[col]):
                        match_features[f'match_{col}'] = match[col]
                
                # Add team features if available
                home_team_id = match.get('home_team_id') or match.get('home_team')
                away_team_id = match.get('away_team_id') or match.get('away_team')
                
                if home_team_id and away_team_id and len(features_df) > 0:
                    # Find team features
                    season = match.get('season', 2024)
                    
                    home_features = features_df[
                        (features_df['team_id'] == home_team_id) & 
                        (features_df['season'] == season)
                    ]
                    
                    away_features = features_df[
                        (features_df['team_id'] == away_team_id) & 
                        (features_df['season'] == season)
                    ]
                    
                    # Add team features
                    if len(home_features) > 0:
                        home_feat = home_features.iloc[0]
                        for col in features_df.columns:
                            if col not in ['id', 'team_id', 'season'] and pd.notna(home_feat[col]):
                                match_features[f'home_{col}'] = home_feat[col]
                    
                    if len(away_features) > 0:
                        away_feat = away_features.iloc[0]
                        for col in features_df.columns:
                            if col not in ['id', 'team_id', 'season'] and pd.notna(away_feat[col]):
                                match_features[f'away_{col}'] = away_feat[col]
                
                # Add target
                if target_col in match:
                    match_features['target'] = match[target_col]
                
                feature_data.append(match_features)
                
            except Exception as e:
                print(f"  [WARNING] Error processing match {idx}: {e}")
                continue
        
        if not feature_data:
            print("[ERROR] No features could be prepared")
            return None, None
        
        ml_df = pd.DataFrame(feature_data)
        
        # Clean data
        ml_df = ml_df.dropna(subset=['target'])
        
        # Separate features and target
        X = ml_df.drop(['target', 'match_id'], axis=1, errors='ignore')
        y = ml_df['target']
        
        # Convert to numeric
        for col in X.columns:
            X[col] = pd.to_numeric(X[col], errors='coerce')
        
        X = X.fillna(0)  # Fill missing values
        
        print(f"[SUCCESS] ML data prepared:")
        print(f"  Samples: {len(X)}")
        print(f"  Features: {len(X.columns)}")
        print(f"  Target distribution: {y.value_counts().to_dict()}")
        
        return X, y
        
    except Exception as e:
        print(f"[ERROR] Feature preparation failed: {e}")
        return None, None

def test_ml_models(X, y):
    """Test ML models avec vraies données"""
    print("\nTESTING ML MODELS WITH REAL DATA")
    print("=" * 35)
    
    if X is None or y is None:
        print("[ERROR] No data available for ML testing")
        return {}
    
    try:
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
        
        print(f"  Train: {len(X_train)} samples")
        print(f"  Test: {len(X_test)} samples")
        
        # Test models
        models = {
            'RandomForest': RandomForestClassifier(n_estimators=100, random_state=42),
            'GradientBoosting': GradientBoostingClassifier(n_estimators=100, random_state=42)
        }
        
        results = {}
        
        for name, model in models.items():
            print(f"\n  Testing {name}...")
            
            try:
                # Train
                model.fit(X_train, y_train)
                
                # Predict
                y_pred = model.predict(X_test)
                accuracy = accuracy_score(y_test, y_pred)
                
                # Cross-validation
                cv_scores = cross_val_score(model, X_train, y_train, cv=3)
                
                results[name] = {
                    'accuracy': accuracy,
                    'cv_mean': cv_scores.mean(),
                    'cv_std': cv_scores.std()
                }
                
                print(f"    Test Accuracy: {accuracy:.1%}")
                print(f"    CV Score: {cv_scores.mean():.1%} ± {cv_scores.std():.1%}")
                
            except Exception as e:
                print(f"    [ERROR] Model {name} failed: {e}")
                continue
        
        return results
        
    except Exception as e:
        print(f"[ERROR] ML testing failed: {e}")
        return {}

def main():
    """Main execution avec données réelles"""
    print("FIXED SUPABASE ML TEST - REAL DATA")
    print("=" * 45)
    print("Objective: Test ML with corrected Supabase connection")
    print("Target: Validate path to 55-60% accuracy")
    
    # Load credentials
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Missing Supabase credentials")
        return False
    
    try:
        # Connect
        supabase = create_client(url, key)
        print(f"[OK] Connected to: {url}")
        
        # Explore schema
        match_columns, feature_columns = explore_schema(supabase)
        
        # Load data
        matches_df, features_df = load_ml_data_corrected(supabase)
        
        # Prepare ML features
        X, y = prepare_ml_features(matches_df, features_df)
        
        # Test ML models
        results = test_ml_models(X, y)
        
        # Results summary
        print("\nRESULTS SUMMARY")
        print("=" * 15)
        
        if results:
            best_model = max(results.keys(), key=lambda k: results[k]['accuracy'])
            best_accuracy = results[best_model]['accuracy']
            
            print(f"  Best Model: {best_model}")
            print(f"  Best Accuracy: {best_accuracy:.1%}")
            
            # Target check
            baseline = 0.521  # From roadmap
            print(f"  Roadmap Baseline: {baseline:.1%}")
            print(f"  Current Result: {best_accuracy:.1%}")
            print(f"  Gap to 55%: {0.55 - best_accuracy:+.1%}")
            print(f"  Gap to 60%: {0.60 - best_accuracy:+.1%}")
            
            if best_accuracy >= 0.55:
                print("\n[SUCCESS] Target 55% achieved with real data!")
                print("Action: Proceed with full optimization")
                return True
            elif best_accuracy >= 0.45:
                print("\n[PROGRESS] Reasonable performance with real data")
                print("Action: Optimize features and model parameters")
                return True
            else:
                print("\n[NEEDS WORK] Performance below expectations")
                print("Action: Review data quality and feature engineering")
                return False
        else:
            print("  [ERROR] No ML results obtained")
            return False
        
    except Exception as e:
        print(f"[ERROR] Main execution failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    
    if success:
        print("\nSUCCESS: Real Supabase ML testing operational")
        print("Next: Integrate efficiency features and optimize")
    else:
        print("\nNEEDS WORK: Continue debugging and optimization")