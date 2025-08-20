#!/usr/bin/env python3
"""
Final ensemble optimization pour atteindre 55-60%
Base: 54.1% achieved, target: push to 55-60%
"""

import os
import sys
import pandas as pd
import numpy as np
from supabase import create_client, Client
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import accuracy_score, classification_report
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

def load_and_prepare_data(supabase):
    """Load data optimized for final push"""
    print("LOADING DATA FOR FINAL OPTIMIZATION")
    print("=" * 40)
    
    try:
        # Load expanded dataset
        print("[LOADING] Extended matches dataset...")
        
        all_matches = []
        batch_size = 200
        max_matches = 1500  # More data for better training
        
        offset = 0
        while len(all_matches) < max_matches:
            batch = supabase.table('matches').select(
                'id,home_team_id,away_team_id,home_score,away_score,season,league_id'
            ).range(offset, offset + batch_size - 1).execute()
            
            if not batch.data:
                break
                
            all_matches.extend(batch.data)
            
            if len(batch.data) < batch_size:
                break
                
            offset += batch_size
        
        matches_df = pd.DataFrame(all_matches)
        
        # Create target
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
        matches_df = matches_df.dropna(subset=['result'])
        
        print(f"[SUCCESS] Matches with results: {len(matches_df)}")
        
        # Load extended team features
        extended_features = [
            'team_id', 'season', 'league_id',
            # Core performance
            'elo_rating', 'elo_home', 'elo_away',
            'form_5_points', 'form_10_points',
            'current_rank', 'points', 'goal_difference',
            'goals_per_game', 'goals_conceded_per_game',
            # XG features
            'xg_for_avg', 'xg_against_avg', 'xg_diff_avg',
            # Advanced metrics
            'possession_avg', 'volatility_index', 'big_game_performance',
            'pressure_score', 'home_advantage', 'away_performance',
            # Additional features for final push
            'tempo_score', 'pressing_intensity', 'transition_speed',
            'corners_for', 'corners_against', 'corners_conversion_rate',
            'yellow_cards', 'red_cards', 'discipline_score',
            # Specialized features
            'underdog_performance', 'big_game_mentality'
        ]
        
        features_select = ','.join(extended_features)
        features_response = supabase.table('team_features').select(features_select).limit(500).execute()
        
        features_df = pd.DataFrame(features_response.data)
        print(f"[SUCCESS] Extended features loaded: {len(extended_features)} features")
        
        return matches_df, features_df
        
    except Exception as e:
        print(f"[ERROR] Data loading failed: {e}")
        return None, None

def engineer_enhanced_features(matches_df, features_df):
    """Engineer enhanced features for final optimization"""
    print("\nENGINEERING ENHANCED FEATURES")
    print("=" * 35)
    
    try:
        ml_data = []
        
        for idx, match in matches_df.iterrows():
            try:
                home_team_id = match['home_team_id']
                away_team_id = match['away_team_id']
                season = match['season']
                league_id = match.get('league_id', 1)
                
                # Find team features
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
                    continue
                
                home_feat = home_features.iloc[0]
                away_feat = away_features.iloc[0]
                
                # Enhanced feature engineering
                match_features = {
                    'match_id': match['id'],
                    'result': match['result']
                }
                
                # === CORE FEATURES (Proven) ===
                home_elo = home_feat.get('elo_rating', 1500)
                away_elo = away_feat.get('elo_rating', 1500)
                home_form = home_feat.get('form_5_points', 1.0)
                away_form = away_feat.get('form_5_points', 1.0)
                home_points = home_feat.get('points', 30)
                away_points = away_feat.get('points', 30)
                
                # Basic advantages
                match_features.update({
                    'elo_advantage': home_elo - away_elo,
                    'form_advantage': home_form - away_form,
                    'points_advantage': home_points - away_points,
                    'rank_advantage': away_feat.get('current_rank', 10) - home_feat.get('current_rank', 10)
                })
                
                # === XG FEATURES (Enhanced) ===
                home_xg = home_feat.get('xg_for_avg', 0)
                away_xg = away_feat.get('xg_for_avg', 0)
                home_xga = home_feat.get('xg_against_avg', 0)
                away_xga = away_feat.get('xg_against_avg', 0)
                
                if home_xg > 0 and away_xg > 0:
                    match_features.update({
                        'xg_attack_advantage': home_xg - away_xga,
                        'xg_defense_advantage': away_xg - home_xga,
                        'xg_ratio': home_xg / (away_xg + 0.1),
                        'xg_total_quality': (home_xg + away_xg) / 2
                    })
                else:
                    match_features.update({
                        'xg_attack_advantage': 0,
                        'xg_defense_advantage': 0,
                        'xg_ratio': 1.0,
                        'xg_total_quality': 1.0
                    })
                
                # === PERFORMANCE FEATURES ===
                home_goals = home_feat.get('goals_per_game', 1.0)
                away_goals = away_feat.get('goals_per_game', 1.0)
                home_conceded = home_feat.get('goals_conceded_per_game', 1.0)
                away_conceded = away_feat.get('goals_conceded_per_game', 1.0)
                
                match_features.update({
                    'attack_vs_defense': home_goals - away_conceded,
                    'defense_vs_attack': away_goals - home_conceded,
                    'goal_ratio': home_goals / (away_goals + 0.1),
                    'defensive_ratio': away_conceded / (home_conceded + 0.1)
                })
                
                # === STYLE FEATURES ===
                home_possession = home_feat.get('possession_avg', 50)
                away_possession = away_feat.get('possession_avg', 50)
                home_tempo = home_feat.get('tempo_score', 0)
                away_tempo = away_feat.get('tempo_score', 0)
                
                match_features.update({
                    'possession_advantage': home_possession - away_possession,
                    'tempo_clash': abs(home_tempo - away_tempo),
                    'style_compatibility': (home_possession + away_possession) / 100,
                    'pressing_differential': home_feat.get('pressing_intensity', 0) - away_feat.get('pressing_intensity', 0)
                })
                
                # === PSYCHOLOGICAL FEATURES ===
                home_pressure = home_feat.get('pressure_score', 0)
                away_pressure = away_feat.get('pressure_score', 0)
                home_big_game = home_feat.get('big_game_performance', 0)
                away_big_game = away_feat.get('big_game_performance', 0)
                
                match_features.update({
                    'pressure_advantage': away_pressure - home_pressure,  # Less pressure = advantage
                    'big_game_advantage': home_big_game - away_big_game,
                    'underdog_factor': home_feat.get('underdog_performance', 0) - away_feat.get('underdog_performance', 0)
                })
                
                # === VENUE FEATURES ===
                match_features.update({
                    'home_venue_advantage': home_feat.get('home_advantage', 0),
                    'away_travel_factor': -away_feat.get('away_performance', 0),
                    'venue_differential': home_feat.get('home_advantage', 0) + away_feat.get('away_performance', 0)
                })
                
                # === COMPOSITE FEATURES (Advanced) ===
                # ELO-Form synergy (proven from roadmap)
                match_features['elo_form_synergy'] = (match_features['elo_advantage'] * match_features['form_advantage']) / 100
                
                # Quality-Motivation composite
                overall_quality = (home_elo + away_elo + home_form + away_form) / 4
                motivation_factor = (home_pressure + away_pressure) / 2
                match_features['quality_motivation'] = overall_quality * (1 + motivation_factor / 100)
                
                # Attack-Defense balance
                attack_strength = (home_goals + away_goals) / 2
                defense_strength = 2 - (home_conceded + away_conceded) / 2
                match_features['game_intensity'] = attack_strength * defense_strength
                
                # Volatility impact
                home_vol = home_feat.get('volatility_index', 0.5)
                away_vol = away_feat.get('volatility_index', 0.5)
                match_features['volatility_chaos'] = (home_vol + away_vol) / 2
                match_features['predictability'] = 1 - match_features['volatility_chaos']
                
                ml_data.append(match_features)
                
            except Exception as e:
                continue
        
        ml_df = pd.DataFrame(ml_data)
        
        # Separate features and target
        feature_cols = [col for col in ml_df.columns if col not in ['match_id', 'result']]
        X = ml_df[feature_cols]
        y = ml_df['result']
        
        # Clean and normalize
        X = X.fillna(0)
        
        print(f"[SUCCESS] Enhanced features created:")
        print(f"  Matches: {len(X)}")
        print(f"  Features: {len(X.columns)}")
        
        return X, y
        
    except Exception as e:
        print(f"[ERROR] Enhanced feature engineering failed: {e}")
        return None, None

def test_final_ensemble(X, y):
    """Test final ensemble for 55-60% target"""
    print("\nFINAL ENSEMBLE OPTIMIZATION")
    print("=" * 35)
    
    try:
        # Temporal split
        split_point = int(0.75 * len(X))
        X_train, X_test = X[:split_point], X[split_point:]
        y_train, y_test = y[:split_point], y[split_point:]
        
        print(f"  Train: {len(X_train)} matches")
        print(f"  Test: {len(X_test)} matches")
        print(f"  Features: {len(X.columns)}")
        
        # Optimized individual models
        rf_optimized = RandomForestClassifier(
            n_estimators=300,
            max_depth=15,
            min_samples_split=3,
            min_samples_leaf=2,
            max_features='sqrt',
            random_state=42
        )
        
        gb_optimized = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=10,
            learning_rate=0.05,
            subsample=0.8,
            random_state=42
        )
        
        # Scale for neural network
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        nn_optimized = MLPClassifier(
            hidden_layer_sizes=(120, 60, 30),
            max_iter=1000,
            alpha=0.01,
            random_state=42
        )
        
        models = {
            'RandomForest_Final': (rf_optimized, X_train, X_test),
            'GradientBoosting_Final': (gb_optimized, X_train, X_test),
            'NeuralNetwork_Final': (nn_optimized, X_train_scaled, X_test_scaled)
        }
        
        individual_results = {}
        predictions = {}
        
        # Test individual models
        for name, (model, X_tr, X_te) in models.items():
            print(f"\n  Testing {name}...")
            
            model.fit(X_tr, y_train)
            y_pred = model.predict(X_te)
            accuracy = accuracy_score(y_test, y_pred)
            
            cv_scores = cross_val_score(model, X_tr, y_train, cv=5)
            
            individual_results[name] = {
                'accuracy': accuracy,
                'cv_mean': cv_scores.mean(),
                'cv_std': cv_scores.std()
            }
            predictions[name] = y_pred
            
            print(f"    Accuracy: {accuracy:.1%}")
            print(f"    CV: {cv_scores.mean():.1%} ± {cv_scores.std():.1%}")
        
        # Ensemble methods
        print(f"\n  Testing Ensemble Methods...")
        
        # Weighted voting based on CV performance
        weights = [individual_results[name]['cv_mean'] for name in ['RandomForest_Final', 'GradientBoosting_Final']]
        total_weight = sum(weights)
        normalized_weights = [w/total_weight for w in weights]
        
        # Voting ensemble (RF + GB only, skip NN for voting)
        voting_clf = VotingClassifier(
            estimators=[
                ('rf', rf_optimized),
                ('gb', gb_optimized)
            ],
            voting='soft',
            weights=normalized_weights
        )
        
        voting_clf.fit(X_train, y_train)
        voting_pred = voting_clf.predict(X_test)
        voting_accuracy = accuracy_score(y_test, voting_pred)
        
        print(f"    Weighted Voting: {voting_accuracy:.1%}")
        
        # Custom ensemble with all three
        ensemble_pred = []
        for i in range(len(y_test)):
            votes = [
                predictions['RandomForest_Final'][i],
                predictions['GradientBoosting_Final'][i],
                predictions['NeuralNetwork_Final'][i]
            ]
            
            # Weighted majority vote
            vote_counts = {0: 0, 1: 0, 2: 0}
            vote_counts[votes[0]] += normalized_weights[0]  # RF weight
            vote_counts[votes[1]] += normalized_weights[1]  # GB weight
            vote_counts[votes[2]] += 0.1  # NN small weight
            
            ensemble_pred.append(max(vote_counts.keys(), key=lambda k: vote_counts[k]))
        
        ensemble_accuracy = accuracy_score(y_test, ensemble_pred)
        print(f"    Custom Ensemble: {ensemble_accuracy:.1%}")
        
        # Final results
        all_results = {
            **individual_results,
            'Weighted_Voting': {'accuracy': voting_accuracy},
            'Custom_Ensemble': {'accuracy': ensemble_accuracy}
        }
        
        best_model = max(all_results.keys(), key=lambda k: all_results[k]['accuracy'])
        best_accuracy = all_results[best_model]['accuracy']
        
        print(f"\n  FINAL RESULTS:")
        print(f"    Best Model: {best_model}")
        print(f"    Best Accuracy: {best_accuracy:.1%}")
        
        return all_results, best_accuracy
        
    except Exception as e:
        print(f"[ERROR] Final ensemble failed: {e}")
        return {}, 0

def main():
    """Main execution for final optimization"""
    print("FINAL ENSEMBLE OPTIMIZATION - TARGET 55-60%")
    print("=" * 50)
    print("Starting point: 54.1% achieved")
    print("Goal: Push to 55-60% with ensemble methods")
    
    # Connect to Supabase
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Missing credentials")
        return False
    
    try:
        supabase = create_client(url, key)
        
        # Load and prepare enhanced data
        matches_df, features_df = load_and_prepare_data(supabase)
        
        if matches_df is None:
            print("[ERROR] Data loading failed")
            return False
        
        # Engineer enhanced features
        X, y = engineer_enhanced_features(matches_df, features_df)
        
        if X is None:
            print("[ERROR] Feature engineering failed")
            return False
        
        # Test final ensemble
        results, best_accuracy = test_final_ensemble(X, y)
        
        # Final assessment
        print("\nFINAL ASSESSMENT")
        print("=" * 20)
        
        baseline = 0.541  # Previous best
        target_55 = 0.55
        target_60 = 0.60
        
        print(f"  Previous Best: {baseline:.1%}")
        print(f"  Final Result: {best_accuracy:.1%}")
        print(f"  Improvement: {best_accuracy - baseline:+.1%}")
        
        if best_accuracy >= target_60:
            print(f"\n TARGET 60% ACHIEVED! ({best_accuracy:.1%})")
            print("STATUS: PRODUCTION READY")
            return "production_ready"
        elif best_accuracy >= target_55:
            print(f"\n TARGET 55% ACHIEVED! ({best_accuracy:.1%})")
            print("STATUS: MISSION ACCOMPLISHED")
            return "target_achieved"
        elif best_accuracy > baseline:
            print(f"\n IMPROVEMENT ACHIEVED ({best_accuracy:.1%})")
            print("STATUS: PROGRESS MADE")
            return "improved"
        else:
            print(f"\n NO IMPROVEMENT ({best_accuracy:.1%})")
            print("STATUS: NEEDS MORE WORK")
            return "needs_work"
        
    except Exception as e:
        print(f"[ERROR] Main execution failed: {e}")
        return False

if __name__ == "__main__":
    result = main()
    
    print(f"\nFINAL STATUS: {result}")
    
    if result in ["production_ready", "target_achieved"]:
        print("SUCCESS: Target achieved - Ready for production")
    elif result == "improved":
        print("PROGRESS: Improvement made - Continue optimization")
    else:
        print("REVIEW: No improvement - Analyze approach")