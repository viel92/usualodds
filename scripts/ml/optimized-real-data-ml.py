#!/usr/bin/env python3
"""
ML optimisé avec vraies données Supabase
151 features disponibles + target correct
Objectif: 55-60% accuracy
"""

import os
import sys
import pandas as pd
import numpy as np
from supabase import create_client, Client
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

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

def load_complete_dataset(supabase, limit=500):
    """Load complete dataset with pagination"""
    print("LOADING COMPLETE DATASET")
    print("=" * 30)
    
    try:
        # Load more matches with pagination
        print(f"[LOADING] Matches data (limit: {limit})...")
        
        all_matches = []
        batch_size = 100
        offset = 0
        
        while len(all_matches) < limit:
            batch = supabase.table('matches').select(
                'id,home_team_id,away_team_id,home_score,away_score,season,league_id'
            ).range(offset, offset + batch_size - 1).execute()
            
            if not batch.data:
                break
                
            all_matches.extend(batch.data)
            print(f"  Loaded batch: +{len(batch.data)} (total: {len(all_matches)})")
            
            if len(batch.data) < batch_size:
                break
                
            offset += batch_size
        
        matches_df = pd.DataFrame(all_matches)
        print(f"[SUCCESS] Matches loaded: {len(matches_df)}")
        
        # Load team features with key columns
        print("\n[LOADING] Team features (key columns)...")
        
        key_features = [
            'team_id', 'season', 'league_id',
            # ELO features
            'elo_rating', 'elo_home', 'elo_away',
            # Form features  
            'form_5_points', 'form_10_points',
            # XG features (BREAKTHROUGH!)
            'xg_for_avg', 'xg_against_avg', 'xg_diff_avg',
            # Performance features
            'goals_per_game', 'goals_conceded_per_game', 'possession_avg',
            # Advanced features
            'volatility_index', 'big_game_performance', 'pressure_score',
            'current_rank', 'points', 'goal_difference',
            # Home/Away performance
            'home_advantage', 'away_performance'
        ]
        
        features_select = ','.join(key_features)
        features_response = supabase.table('team_features').select(features_select).limit(limit).execute()
        
        if features_response.data:
            features_df = pd.DataFrame(features_response.data)
            print(f"[SUCCESS] Features loaded: {len(features_df)} records")
            print(f"[INFO] Key features: {len(key_features)} selected from 151 available")
            
            return matches_df, features_df
        else:
            print("[ERROR] No team features loaded")
            return matches_df, None
            
    except Exception as e:
        print(f"[ERROR] Dataset loading failed: {e}")
        return None, None

def create_match_result_target(matches_df):
    """Create proper match result target (Home Win=1, Draw=0, Away Win=2)"""
    print("\nCREATING MATCH RESULT TARGET")
    print("=" * 32)
    
    try:
        matches_df = matches_df.copy()
        
        # Create proper target from scores
        def get_result(row):
            home_score = row['home_score']
            away_score = row['away_score']
            
            if pd.isna(home_score) or pd.isna(away_score):
                return None
                
            if home_score > away_score:
                return 1  # Home win
            elif home_score < away_score:
                return 2  # Away win  
            else:
                return 0  # Draw
        
        matches_df['result'] = matches_df.apply(get_result, axis=1)
        
        # Remove matches without result
        matches_df = matches_df.dropna(subset=['result'])
        
        # Target distribution
        target_dist = matches_df['result'].value_counts().sort_index()
        print(f"[SUCCESS] Target created for {len(matches_df)} matches")
        print(f"[DISTRIBUTION] Results:")
        print(f"  Draw (0): {target_dist.get(0, 0)} ({target_dist.get(0, 0)/len(matches_df):.1%})")
        print(f"  Home Win (1): {target_dist.get(1, 0)} ({target_dist.get(1, 0)/len(matches_df):.1%})")
        print(f"  Away Win (2): {target_dist.get(2, 0)} ({target_dist.get(2, 0)/len(matches_df):.1%})")
        
        return matches_df
        
    except Exception as e:
        print(f"[ERROR] Target creation failed: {e}")
        return None

def engineer_match_features(matches_df, features_df):
    """Engineer features for each match"""
    print("\nENGINEERING MATCH FEATURES")
    print("=" * 30)
    
    if matches_df is None or features_df is None:
        print("[ERROR] Missing data for feature engineering")
        return None, None
    
    try:
        ml_data = []
        
        for idx, match in matches_df.iterrows():
            try:
                home_team_id = match['home_team_id']
                away_team_id = match['away_team_id']
                season = match['season']
                league_id = match.get('league_id', 1)
                
                # Find team features for this season/league
                home_features = features_df[
                    (features_df['team_id'] == home_team_id) & 
                    (features_df['season'] == season) &
                    (features_df['league_id'] == league_id)
                ]
                
                away_features = features_df[
                    (features_df['team_id'] == away_team_id) & 
                    (features_df['season'] == season) &
                    (features_df['league_id'] == league_id)
                ]
                
                if len(home_features) == 0 or len(away_features) == 0:
                    continue  # Skip if no features available
                
                home_feat = home_features.iloc[0]
                away_feat = away_features.iloc[0]
                
                # Create match features
                match_features = {
                    'match_id': match['id'],
                    'season': season,
                    'result': match['result']
                }
                
                # === ELO FEATURES ===
                home_elo = home_feat.get('elo_rating', 1500)
                away_elo = away_feat.get('elo_rating', 1500)
                match_features.update({
                    'home_elo': home_elo,
                    'away_elo': away_elo,
                    'elo_advantage': home_elo - away_elo,
                    'elo_home_venue': home_feat.get('elo_home', home_elo),
                    'elo_away_venue': away_feat.get('elo_away', away_elo)
                })
                
                # === FORM FEATURES ===
                home_form = home_feat.get('form_5_points', 1.0)
                away_form = away_feat.get('form_5_points', 1.0)
                match_features.update({
                    'home_form_5': home_form,
                    'away_form_5': away_form,
                    'form_advantage': home_form - away_form,
                    'home_form_10': home_feat.get('form_10_points', home_form),
                    'away_form_10': away_feat.get('form_10_points', away_form)
                })
                
                # === XG FEATURES (BREAKTHROUGH!) ===
                home_xg = home_feat.get('xg_for_avg', 0)
                away_xg = away_feat.get('xg_for_avg', 0)
                home_xga = home_feat.get('xg_against_avg', 0)
                away_xga = away_feat.get('xg_against_avg', 0)
                
                match_features.update({
                    'home_xg_for': home_xg,
                    'away_xg_for': away_xg,
                    'home_xg_against': home_xga,
                    'away_xg_against': away_xga,
                    'xg_attack_advantage': home_xg - away_xga,
                    'xg_defense_advantage': away_xg - home_xga,
                    'xg_total_quality': (home_xg + away_xg) / 2
                })
                
                # === PERFORMANCE FEATURES ===
                match_features.update({
                    'home_goals_avg': home_feat.get('goals_per_game', 1.0),
                    'away_goals_avg': away_feat.get('goals_per_game', 1.0),
                    'home_goals_conceded': home_feat.get('goals_conceded_per_game', 1.0),
                    'away_goals_conceded': away_feat.get('goals_conceded_per_game', 1.0),
                    'home_possession': home_feat.get('possession_avg', 50),
                    'away_possession': away_feat.get('possession_avg', 50),
                    'possession_advantage': home_feat.get('possession_avg', 50) - away_feat.get('possession_avg', 50)
                })
                
                # === RANK/STANDING FEATURES ===
                home_rank = home_feat.get('current_rank', 10)
                away_rank = away_feat.get('current_rank', 10)
                match_features.update({
                    'home_rank': home_rank,
                    'away_rank': away_rank,
                    'rank_advantage': away_rank - home_rank,  # Lower rank = better
                    'home_points': home_feat.get('points', 30),
                    'away_points': away_feat.get('points', 30),
                    'points_advantage': home_feat.get('points', 30) - away_feat.get('points', 30)
                })
                
                # === ADVANCED FEATURES ===
                match_features.update({
                    'home_volatility': home_feat.get('volatility_index', 0.5),
                    'away_volatility': away_feat.get('volatility_index', 0.5),
                    'home_big_game': home_feat.get('big_game_performance', 0),
                    'away_big_game': away_feat.get('big_game_performance', 0),
                    'home_pressure': home_feat.get('pressure_score', 0),
                    'away_pressure': away_feat.get('pressure_score', 0),
                    'home_advantage_venue': home_feat.get('home_advantage', 0),
                    'away_performance_away': away_feat.get('away_performance', 0)
                })
                
                # === COMPOSITE FEATURES ===
                # ELO-Form synergy (from roadmap)
                match_features['elo_form_synergy'] = (match_features['elo_advantage'] * match_features['form_advantage']) / 100
                
                # XG efficiency
                if home_xg > 0 and away_xg > 0:
                    match_features['xg_efficiency_home'] = match_features['home_goals_avg'] / home_xg
                    match_features['xg_efficiency_away'] = match_features['away_goals_avg'] / away_xg
                else:
                    match_features['xg_efficiency_home'] = 1.0
                    match_features['xg_efficiency_away'] = 1.0
                
                # Quality differential
                match_features['overall_quality'] = (home_elo + away_elo + home_form + away_form) / 4
                
                ml_data.append(match_features)
                
            except Exception as e:
                print(f"  [WARNING] Error processing match {idx}: {e}")
                continue
        
        if not ml_data:
            print("[ERROR] No match features could be created")
            return None, None
        
        ml_df = pd.DataFrame(ml_data)
        
        # Separate features and target
        feature_cols = [col for col in ml_df.columns if col not in ['match_id', 'result']]
        X = ml_df[feature_cols]
        y = ml_df['result']
        
        # Clean data
        X = X.fillna(0)
        
        print(f"[SUCCESS] Match features engineered:")
        print(f"  Matches: {len(X)}")
        print(f"  Features: {len(X.columns)}")
        print(f"  Target classes: {sorted(y.unique())}")
        
        return X, y
        
    except Exception as e:
        print(f"[ERROR] Feature engineering failed: {e}")
        return None, None

def test_optimized_models(X, y):
    """Test optimized ML models"""
    print("\nTESTING OPTIMIZED ML MODELS")
    print("=" * 35)
    
    if X is None or y is None:
        print("[ERROR] No data for ML testing")
        return {}
    
    try:
        # Temporal split (more realistic)
        split_point = int(0.7 * len(X))
        X_train, X_test = X[:split_point], X[split_point:]
        y_train, y_test = y[:split_point], y[split_point:]
        
        print(f"  Train: {len(X_train)} matches")
        print(f"  Test: {len(X_test)} matches")
        print(f"  Features: {len(X.columns)}")
        
        # Optimized models
        models = {
            'RandomForest_Opt': RandomForestClassifier(
                n_estimators=200, 
                max_depth=12, 
                min_samples_split=5,
                random_state=42
            ),
            'GradientBoosting_Opt': GradientBoostingClassifier(
                n_estimators=150,
                max_depth=8,
                learning_rate=0.1,
                random_state=42
            )
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
                cv_scores = cross_val_score(model, X_train, y_train, cv=5)
                
                results[name] = {
                    'accuracy': accuracy,
                    'cv_mean': cv_scores.mean(),
                    'cv_std': cv_scores.std(),
                    'predictions': y_pred
                }
                
                print(f"    Test Accuracy: {accuracy:.1%}")
                print(f"    CV Score: {cv_scores.mean():.1%} ± {cv_scores.std():.1%}")
                
                # Feature importance
                if hasattr(model, 'feature_importances_'):
                    feature_importance = pd.DataFrame({
                        'feature': X.columns,
                        'importance': model.feature_importances_
                    }).sort_values('importance', ascending=False)
                    
                    print(f"    Top 5 features:")
                    for _, row in feature_importance.head(5).iterrows():
                        print(f"      {row['feature']}: {row['importance']:.1%}")
                
            except Exception as e:
                print(f"    [ERROR] Model {name} failed: {e}")
                continue
        
        return results, y_test
        
    except Exception as e:
        print(f"[ERROR] ML testing failed: {e}")
        return {}, None

def main():
    """Main execution avec données optimisées"""
    print("OPTIMIZED REAL DATA ML TEST")
    print("=" * 35)
    print("Objective: Achieve 55-60% accuracy with real Supabase data")
    print("Features: 151 available, XG data included, proper target")
    
    # Load credentials and connect
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Missing Supabase credentials")
        return False
    
    try:
        supabase = create_client(url, key)
        print(f"[OK] Connected to Supabase")
        
        # Load complete dataset
        matches_df, features_df = load_complete_dataset(supabase, limit=1000)
        
        if matches_df is None:
            print("[ERROR] Failed to load matches data")
            return False
        
        # Create proper match result target
        matches_df = create_match_result_target(matches_df)
        
        if matches_df is None:
            print("[ERROR] Failed to create target")
            return False
        
        # Engineer match features
        X, y = engineer_match_features(matches_df, features_df)
        
        if X is None:
            print("[ERROR] Failed to engineer features")
            return False
        
        # Test optimized models
        results, y_test = test_optimized_models(X, y)
        
        # Results analysis
        print("\nRESULTS ANALYSIS")
        print("=" * 20)
        
        if results:
            best_model = max(results.keys(), key=lambda k: results[k]['accuracy'])
            best_accuracy = results[best_model]['accuracy']
            
            print(f"  Best Model: {best_model}")
            print(f"  Best Accuracy: {best_accuracy:.1%}")
            
            # Target achievement check
            baseline_roadmap = 0.521
            target_55 = 0.55
            target_60 = 0.60
            
            print(f"\n  Roadmap Baseline: {baseline_roadmap:.1%}")
            print(f"  Current Result: {best_accuracy:.1%}")
            print(f"  Improvement: {best_accuracy - baseline_roadmap:+.1%}")
            
            # Achievement status
            if best_accuracy >= target_60:
                print(f"\n🎯 TARGET 60% ACHIEVED! ({best_accuracy:.1%})")
                print("✅ READY FOR PRODUCTION DEPLOYMENT")
                status = "production_ready"
            elif best_accuracy >= target_55:
                print(f"\n🎯 TARGET 55% ACHIEVED! ({best_accuracy:.1%})")
                print("✅ READY FOR OPTIMIZATION TO 60%")
                status = "target_achieved"
            elif best_accuracy >= 0.50:
                print(f"\n📈 ABOVE RANDOM BASELINE ({best_accuracy:.1%})")
                print("🔧 CONTINUE OPTIMIZATION")
                status = "improving"
            else:
                print(f"\n⚠️ BELOW RANDOM BASELINE ({best_accuracy:.1%})")
                print("🔍 NEEDS INVESTIGATION")
                status = "needs_work"
            
            return status
            
        else:
            print("  [ERROR] No results obtained")
            return False
        
    except Exception as e:
        print(f"[ERROR] Main execution failed: {e}")
        return False

if __name__ == "__main__":
    result = main()
    
    if result == "production_ready":
        print("\n🚀 SUCCESS: PRODUCTION READY")
        print("Next: Deploy to production environment")
    elif result == "target_achieved":
        print("\n🎯 SUCCESS: TARGET ACHIEVED")
        print("Next: Final optimization for 60%+")
    elif result == "improving":
        print("\n📈 PROGRESS: CONTINUE OPTIMIZATION")
        print("Next: Add more features and fine-tune")
    else:
        print("\n🔧 NEEDS WORK: DEBUG AND OPTIMIZE")
        print("Next: Review feature engineering")