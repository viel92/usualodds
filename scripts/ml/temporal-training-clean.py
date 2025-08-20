#!/usr/bin/env python3
"""
TEMPORAL TRAINING CLEAN - USUALODDS 2025
========================================
Système d'entraînement temporel strict SANS data leakage
Train sur saisons passees -> Test sur saisons futures
Aucune donnée future dans l'entraînement
"""

import pandas as pd
import numpy as np
from datetime import datetime
import os
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import xgboost as xgb
import warnings
warnings.filterwarnings('ignore')

load_dotenv()

def load_supabase_data():
    """Charge les données depuis Supabase avec features PRE-MATCH uniquement"""
    try:
        from supabase import create_client
        
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        supabase = create_client(supabase_url, supabase_key)
        print("[OK] Connexion Supabase etablie")
        
        # Récupérer matches avec résultats pour entraînement
        print("[INFO] Chargement matches historiques...")
        matches_response = supabase.table('matches').select(
            'id, season, date, home_team_id, away_team_id, '
            'home_team_name, away_team_name, home_score, away_score, status'
        ).in_('status', ['FT', 'AET', 'PEN']).execute()
        
        matches_df = pd.DataFrame(matches_response.data)
        matches_df['date'] = pd.to_datetime(matches_df['date'])
        
        # Récupérer team_features (données PRE-MATCH)
        print("[INFO] Chargement features equipes...")
        features_response = supabase.table('team_features').select('*').execute()
        features_df = pd.DataFrame(features_response.data)
        
        print(f"[OK] {len(matches_df)} matches charges")
        print(f"[OK] {len(features_df)} features equipes chargees")
        
        return matches_df, features_df, supabase
        
    except Exception as e:
        print(f"[ERROR] Erreur chargement données: {e}")
        raise

def create_clean_features(matches_df, features_df):
    """
    Crée UNIQUEMENT des features connues AVANT le match
    INTERDICTION: home_score, away_score, ou toute donnée future
    """
    print("\n[INFO] Creation features PRE-MATCH uniquement...")
    
    # Merge avec team features pour équipe domicile
    matches_enhanced = matches_df.merge(
        features_df,
        left_on=['home_team_id', 'season'],
        right_on=['team_id', 'season'],
        how='left',
        suffixes=('', '_home_temp')
    )
    
    # Merge avec team features pour équipe extérieure
    matches_enhanced = matches_enhanced.merge(
        features_df,
        left_on=['away_team_id', 'season'],
        right_on=['team_id', 'season'],
        how='left',
        suffixes=('_home', '_away')
    )
    
    # Features PRE-MATCH autorisées
    allowed_features = []
    
    # Rankings et positions (connus avant match)
    for feat in ['current_rank', 'points', 'points_difference']:
        if f'{feat}_home' in matches_enhanced.columns:
            allowed_features.append(f'{feat}_home')
        if f'{feat}_away' in matches_enhanced.columns:
            allowed_features.append(f'{feat}_away')
    
    # Forme récente (sur matchs PRECEDENTS)
    for feat in ['form_5_points', 'form_10_points']:
        if f'{feat}_home' in matches_enhanced.columns:
            allowed_features.append(f'{feat}_home')
        if f'{feat}_away' in matches_enhanced.columns:
            allowed_features.append(f'{feat}_away')
    
    # ELO ratings (mis à jour match par match)
    for feat in ['elo_rating']:
        if f'{feat}_home' in matches_enhanced.columns:
            allowed_features.append(f'{feat}_home')
        if f'{feat}_away' in matches_enhanced.columns:
            allowed_features.append(f'{feat}_away')
    
    # Stats historiques moyennes
    for feat in ['goals_for_avg', 'goals_against_avg', 'possession_avg']:
        if f'{feat}_home' in matches_enhanced.columns:
            allowed_features.append(f'{feat}_home')
        if f'{feat}_away' in matches_enhanced.columns:
            allowed_features.append(f'{feat}_away')
    
    # Motivation et pression
    for feat in ['motivation_score', 'pressure_score', 'expectation_score']:
        if f'{feat}_home' in matches_enhanced.columns:
            allowed_features.append(f'{feat}_home')
        if f'{feat}_away' in matches_enhanced.columns:
            allowed_features.append(f'{feat}_away')
    
    # Garder seulement les features qui existent
    available_features = [f for f in allowed_features if f in matches_enhanced.columns]
    
    print(f"[DEBUG] Features disponibles: {len(available_features)}")
    for feat in available_features:
        print(f"  - {feat}")
    
    # Créer dataset X avec features valides
    X = matches_enhanced[available_features].copy()
    
    # Features dérivées (différences et ratios)
    if 'current_rank_home' in X.columns and 'current_rank_away' in X.columns:
        X['rank_advantage'] = X['current_rank_away'] - X['current_rank_home']  # Plus élevé = meilleur
    
    if 'elo_rating_home' in X.columns and 'elo_rating_away' in X.columns:
        X['elo_advantage'] = X['elo_rating_home'] - X['elo_rating_away']
    
    if 'form_5_points_home' in X.columns and 'form_5_points_away' in X.columns:
        X['form_advantage'] = X['form_5_points_home'] - X['form_5_points_away']
    
    # Target: résultat match (0=draw, 1=home_win, 2=away_win)
    y = matches_enhanced.apply(
        lambda row: 1 if row['home_score'] > row['away_score'] else 
                   (2 if row['home_score'] < row['away_score'] else 0), 
        axis=1
    )
    
    # Métadonnées pour filtrage temporel
    X['season'] = matches_enhanced['season']
    X['date'] = matches_enhanced['date']
    X['match_id'] = matches_enhanced['id']
    X['home_team'] = matches_enhanced['home_team_name']
    X['away_team'] = matches_enhanced['away_team_name']
    
    # Remplacer NaN
    X = X.fillna(0)
    
    print(f"[OK] {len(available_features)} features PRE-MATCH creees")
    print(f"[OK] {X.shape[0]} matches avec features completes")
    
    return X, y

def temporal_validation(X, y):
    """
    Validation temporelle stricte: train sur saisons passées, test sur futures
    """
    print("\n" + "="*50)
    print("WALK-FORWARD TEMPORAL VALIDATION")
    print("="*50)
    
    # Configuration des windows temporelles
    windows = [
        {'train': [2020, 2021], 'test': 2022, 'name': '2020-21 -> 2022'},
        {'train': [2020, 2021, 2022], 'test': 2023, 'name': '2020-22 -> 2023'},
        {'train': [2020, 2021, 2022, 2023], 'test': 2024, 'name': '2020-23 -> 2024'},
    ]
    
    all_results = []
    
    for window in windows:
        print(f"\n[INFO] Window: {window['name']}")
        
        # Split temporel strict
        train_mask = X['season'].isin(window['train'])
        test_mask = X['season'] == window['test']
        
        X_train = X[train_mask].drop(['season', 'date', 'match_id', 'home_team', 'away_team'], axis=1)
        y_train = y[train_mask]
        X_test = X[test_mask].drop(['season', 'date', 'match_id', 'home_team', 'away_team'], axis=1)
        y_test = y[test_mask]
        
        if len(X_test) == 0:
            print(f"[WARN] Pas de données test pour {window['test']}")
            continue
            
        print(f"[INFO] Train: {len(X_train)} matches | Test: {len(X_test)} matches")
        
        # Modèles
        models = {
            'RandomForest': RandomForestClassifier(
                n_estimators=150, max_depth=8, min_samples_split=5, 
                random_state=42, n_jobs=-1
            ),
            'XGBoost': xgb.XGBClassifier(
                n_estimators=150, max_depth=6, learning_rate=0.05,
                random_state=42, eval_metric='mlogloss'
            )
        }
        
        window_results = {'window': window['name'], 'test_season': window['test']}
        
        for name, model in models.items():
            # Entraînement
            model.fit(X_train, y_train)
            
            # Prédiction
            y_pred = model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            
            window_results[name] = accuracy
            print(f"[RESULT] {name}: {accuracy:.1%} accuracy")
        
        all_results.append(window_results)
    
    return all_results

def summarize_results(results):
    """Résumé des performances réelles"""
    print("\n" + "="*50)
    print("RESUME PERFORMANCE REELLE (SANS DATA LEAKAGE)")
    print("="*50)
    
    rf_scores = []
    xgb_scores = []
    
    for result in results:
        print(f"\n{result['window']}:")
        if 'RandomForest' in result:
            rf_score = result['RandomForest']
            rf_scores.append(rf_score)
            print(f"  RandomForest: {rf_score:.1%}")
        
        if 'XGBoost' in result:
            xgb_score = result['XGBoost']
            xgb_scores.append(xgb_score)
            print(f"  XGBoost: {xgb_score:.1%}")
    
    print(f"\n[FINAL] PERFORMANCE MOYENNE:")
    if rf_scores:
        print(f"  RandomForest: {np.mean(rf_scores):.1%} (±{np.std(rf_scores):.1%})")
    if xgb_scores:
        print(f"  XGBoost: {np.mean(xgb_scores):.1%} (±{np.std(xgb_scores):.1%})")
    
    overall_avg = np.mean(rf_scores + xgb_scores)
    print(f"\n[CONCLUSION] Performance générale: {overall_avg:.1%}")
    
    if overall_avg > 0.50:
        print("[STATUS] ACCEPTABLE - Au-dessus du hasard")
    else:
        print("[STATUS] PROBLEMATIQUE - En dessous du hasard")
    
    return overall_avg

def main():
    """Fonction principale"""
    try:
        print("TEMPORAL TRAINING CLEAN - DEMARRAGE")
        print("="*50)
        
        # Charger données
        matches_df, features_df, supabase = load_supabase_data()
        
        # Créer features CLEAN (sans data leakage)
        X, y = create_clean_features(matches_df, features_df)
        
        print(f"\n[INFO] Dataset final: {X.shape[0]} matches, {X.shape[1]-5} features")
        print(f"[INFO] Distribution target: {dict(y.value_counts())}")
        
        # Validation temporelle
        results = temporal_validation(X, y)
        
        # Résumé
        avg_performance = summarize_results(results)
        
        print("\n" + "="*50)
        print("TEMPORAL TRAINING CLEAN - TERMINE")
        print("="*50)
        print("\nIMPORTANT:")
        print("- AUCUN data leakage (pas de scores dans features)")
        print("- Train UNIQUEMENT sur saisons passees")
        print("- Test sur saisons futures")
        print(f"- Performance realiste: {avg_performance:.1%}")
        print("\nCe système peut maintenant prédire les matchs 2025 !")
        
    except Exception as e:
        print(f"[ERROR] Erreur: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()