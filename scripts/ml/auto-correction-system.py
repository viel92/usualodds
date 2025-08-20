#!/usr/bin/env python3

import os
import pandas as pd
import numpy as np
from dotenv import load_dotenv
from supabase import create_client
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import warnings
warnings.filterwarnings('ignore')

load_dotenv()

def create_auto_correction_system():
    """Systeme d'auto-correction base sur l'analyse des erreurs"""
    
    print('SYSTEME AUTO-CORRECTION ML')
    print('==========================')
    print('Implementation des corrections identifiees')
    
    supabase = create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    )
    
    # 1. Charger donnees
    matches_df, features_df = load_complete_data(supabase)
    
    # 2. Tester modele ameliore avec corrections
    print('\n[INFO] Test modele avec auto-corrections...')
    test_improved_model(matches_df, features_df)

def load_complete_data(supabase):
    """Charge donnees completes"""
    
    # Matches
    all_matches = []
    page = 0
    while True:
        offset = page * 500
        response = supabase.table('matches').select(
            'id, season, home_team_id, away_team_id, home_team_name, away_team_name, home_score, away_score'
        ).range(offset, offset + 499).execute()
        
        if not response.data:
            break
        all_matches.extend(response.data)
        page += 1
    
    matches_df = pd.DataFrame(all_matches)
    matches_df = matches_df[(matches_df['home_score'].notna()) & (matches_df['away_score'].notna())]
    
    # Features
    all_features = []
    page = 0
    while True:
        offset = page * 500
        response = supabase.table('team_features').select('*').range(offset, offset + 499).execute()
        if not response.data:
            break
        all_features.extend(response.data)
        page += 1
    
    features_df = pd.DataFrame(all_features)
    return matches_df, features_df

def test_improved_model(matches_df, features_df):
    """Test modele avec ameliorations anti-erreurs"""
    
    print('\n=== MODELE AMELIORE ANTI-ERREURS ===')
    
    # Creer features avec corrections
    X, y = create_corrected_features(matches_df, features_df)
    
    if X is None:
        return
    
    # Test walk-forward avec modele ameliore
    seasons = sorted(X['season'].unique())
    results_baseline = []
    results_improved = []
    
    for i, test_season in enumerate(seasons[1:], 1):
        train_seasons = seasons[:i]
        
        train_mask = X['season'].isin(train_seasons)
        test_mask = X['season'] == test_season
        
        X_train = X[train_mask].drop(['season'], axis=1, errors='ignore')
        y_train = y[train_mask]
        X_test = X[test_mask].drop(['season'], axis=1, errors='ignore')
        y_test = y[test_mask]
        
        if len(X_test) < 50:  # Skip small test sets
            continue
        
        # Modele baseline
        model_baseline = RandomForestClassifier(
            n_estimators=200, max_depth=10, random_state=42, n_jobs=-1
        )
        model_baseline.fit(X_train, y_train)
        y_pred_baseline = model_baseline.predict(X_test)
        acc_baseline = accuracy_score(y_test, y_pred_baseline)
        
        # Modele ameliore avec corrections
        model_improved = create_improved_model()
        model_improved.fit(X_train, y_train)
        y_pred_improved = model_improved.predict(X_test)
        y_pred_proba = model_improved.predict_proba(X_test)
        
        # Post-processing pour corriger predictions nuls
        y_pred_corrected = apply_draw_correction(
            y_pred_improved, y_pred_proba, X_test
        )
        
        acc_improved = accuracy_score(y_test, y_pred_corrected)
        
        print(f'Saison {test_season}:')
        print(f'  Baseline: {acc_baseline:.1%}')
        print(f'  Ameliore: {acc_improved:.1%}')
        print(f'  Gain: {acc_improved - acc_baseline:+.1%}')
        
        results_baseline.append(acc_baseline)
        results_improved.append(acc_improved)
    
    # Resume
    if results_baseline and results_improved:
        print(f'\\nRESUME AMELIORATIONS:')
        print(f'  Performance baseline: {np.mean(results_baseline):.1%}')
        print(f'  Performance amelioree: {np.mean(results_improved):.1%}')
        print(f'  Gain moyen: {np.mean(results_improved) - np.mean(results_baseline):+.1%}')
        
        # Analyse des gains par saison
        gains = [improved - baseline for improved, baseline in zip(results_improved, results_baseline)]
        positive_gains = [g for g in gains if g > 0]
        print(f'  Saisons ameliorees: {len(positive_gains)}/{len(gains)}')
        print(f'  Gain maximum: {max(gains):+.1%}')

def create_corrected_features(matches_df, features_df):
    """Cree features avec corrections anti-erreurs"""
    
    try:
        matches_enhanced = matches_df.merge(
            features_df, left_on=['home_team_id', 'season'], 
            right_on=['team_id', 'season'], how='left', suffixes=('', '_home_temp')
        ).merge(
            features_df, left_on=['away_team_id', 'season'],
            right_on=['team_id', 'season'], how='left', suffixes=('_home', '_away')
        )
        
        # Features de base
        feature_columns = []
        base_features = ['elo_rating', 'form_5_points', 'volatility_index', 'current_rank', 'points']
        
        for feat in base_features:
            if f'{feat}_home' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_home')
            if f'{feat}_away' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_away')
        
        available_features = [f for f in feature_columns if f in matches_enhanced.columns]
        X = matches_enhanced[available_features].copy()
        
        # CORRECTION 1: Features anti-nuls ameliorees
        if 'elo_rating_home' in X.columns and 'elo_rating_away' in X.columns:
            X['elo_advantage'] = X['elo_rating_home'] - X['elo_rating_away']
            X['elo_balance'] = abs(X['elo_advantage'])  # Plus equlibre = plus chance nul
            X['elo_very_close'] = (X['elo_balance'] < 50).astype(int)  # Tres equlibre
        
        if 'form_5_points_home' in X.columns and 'form_5_points_away' in X.columns:
            X['form_advantage'] = X['form_5_points_home'] - X['form_5_points_away']
            X['form_balance'] = abs(X['form_advantage'])
            X['form_very_close'] = (X['form_balance'] < 3).astype(int)
        
        # CORRECTION 2: Detecteur equipes difficiles
        if 'volatility_index_home' in X.columns and 'volatility_index_away' in X.columns:
            X['both_volatile'] = ((X['volatility_index_home'] > X['volatility_index_home'].median()) & 
                                 (X['volatility_index_away'] > X['volatility_index_away'].median())).astype(int)
        
        # CORRECTION 3: Detecteur surprises (equipes faibles vs fortes)
        if 'current_rank_home' in X.columns and 'current_rank_away' in X.columns:
            X['rank_advantage'] = X['current_rank_away'] - X['current_rank_home']
            X['big_rank_diff'] = (abs(X['rank_advantage']) > 10).astype(int)
            X['underdog_home'] = (X['rank_advantage'] < -10).astype(int)
            X['underdog_away'] = (X['rank_advantage'] > 10).astype(int)
        
        # CORRECTION 4: Features contextuelles
        X['draw_probability_indicator'] = (
            X.get('elo_very_close', 0) + 
            X.get('form_very_close', 0) + 
            X.get('both_volatile', 0)
        )
        
        X['season'] = matches_enhanced['season']
        X = X.fillna(0)
        
        y = matches_enhanced.apply(
            lambda row: 1 if row['home_score'] > row['away_score'] else 
                       (2 if row['home_score'] < row['away_score'] else 0), axis=1
        )
        
        print(f'[OK] Features corrigees: {X.shape[1]} features avec anti-erreurs')
        return X, y
        
    except Exception as e:
        print(f'[ERROR] {e}')
        return None, None

def create_improved_model():
    """Cree modele ameliore pour reduire erreurs"""
    
    # Ajustements pour mieux predire les nuls
    return RandomForestClassifier(
        n_estimators=300,  # Plus d'arbres pour plus de stabilite
        max_depth=12,      # Plus profond pour capturer interactions
        min_samples_split=3,  # Plus sensible aux patterns
        min_samples_leaf=1,   # Plus flexible
        class_weight='balanced',  # Compenser desequilibre nuls
        random_state=42,
        n_jobs=-1
    )

def apply_draw_correction(predictions, probabilities, X_test):
    """Post-processing pour corriger predictions nuls"""
    
    corrected_predictions = predictions.copy()
    
    for i, pred in enumerate(predictions):
        # Si prediction est victoire mais indicateurs suggèrent nul possible
        if pred != 0:  # Pas deja predit comme nul
            draw_indicator = X_test.iloc[i].get('draw_probability_indicator', 0)
            confidence = max(probabilities[i])
            
            # Conditions pour forcer prediction nul
            force_draw = False
            
            # 1. Faible confiance + indicateurs nul forts
            if confidence < 0.55 and draw_indicator >= 2:
                force_draw = True
            
            # 2. Equipes tres equilibrees
            if (X_test.iloc[i].get('elo_very_close', 0) == 1 and 
                X_test.iloc[i].get('form_very_close', 0) == 1):
                force_draw = True
            
            # 3. Probabilite nul pas trop faible
            draw_proba = probabilities[i][0] if len(probabilities[i]) > 0 else 0
            if draw_proba > 0.25 and confidence < 0.6:
                force_draw = True
            
            if force_draw:
                corrected_predictions[i] = 0  # Forcer nul
    
    return corrected_predictions

if __name__ == '__main__':
    create_auto_correction_system()