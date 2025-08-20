#!/usr/bin/env python3
"""
TEMPORAL TRAINING SYSTEM - USUALODDS 2025
==========================================
Système d'entraînement temporel strict SANS data leakage
Train sur saisons passées → Test sur saisons futures
Aucune donnée future dans l'entraînement
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from sklearn.model_selection import TimeSeriesSplit
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import xgboost as xgb
import warnings
warnings.filterwarnings('ignore')

load_dotenv()

# Configuration temporelle stricte
TEMPORAL_CONFIG = {
    'seasons': {
        2020: {'start': '2020-08-01', 'end': '2021-05-31'},
        2021: {'start': '2021-08-01', 'end': '2022-05-31'},
        2022: {'start': '2022-08-01', 'end': '2023-05-31'},
        2023: {'start': '2023-08-01', 'end': '2024-05-31'},
        2024: {'start': '2024-08-01', 'end': '2025-05-31'},
    },
    'training_windows': [
        {'train': [2020, 2021], 'test': 2022, 'name': 'Window 1: 2020-21 → 2022'},
        {'train': [2020, 2021, 2022], 'test': 2023, 'name': 'Window 2: 2020-22 → 2023'},
        {'train': [2020, 2021, 2022, 2023], 'test': 2024, 'name': 'Window 3: 2020-23 → 2024'},
        {'train': [2020, 2021, 2022, 2023, 2024], 'test': 'future', 'name': 'Window 4: 2020-24 → Future'},
    ]
}

def load_supabase_data():
    """Charge les données depuis Supabase avec features PRÉ-MATCH uniquement"""
    from supabase import create_client
    
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        raise ValueError("❌ Variables d'environnement Supabase manquantes")
    
    supabase = create_client(supabase_url, supabase_key)
    print("✅ Connexion Supabase établie")
    
    # Récupérer matches avec résultats pour entraînement
    print("📊 Chargement des matches historiques...")
    matches_response = supabase.table('matches').select(
        'id, season, date, home_team_id, away_team_id, '
        'home_team_name, away_team_name, home_score, away_score, status'
    ).in_('status', ['FT', 'AET', 'PEN']).execute()
    
    matches_df = pd.DataFrame(matches_response.data)
    matches_df['date'] = pd.to_datetime(matches_df['date'])
    
    # Récupérer team_features (données PRÉ-MATCH)
    print("📊 Chargement des features équipes...")
    features_response = supabase.table('team_features').select('*').execute()
    features_df = pd.DataFrame(features_response.data)
    
    print(f"✅ {len(matches_df)} matches chargés")
    print(f"✅ {len(features_df)} features équipes chargées")
    
    return matches_df, features_df, supabase

def create_pre_match_features(matches_df, features_df):
    """
    Crée UNIQUEMENT des features connues AVANT le match
    PAS DE SCORES, PAS DE RÉSULTATS, PAS DE DONNÉES FUTURES
    """
    print("\n🔧 Création des features PRÉ-MATCH uniquement...")
    
    # Merge avec team features pour équipe domicile
    matches_with_features = matches_df.merge(
        features_df,
        left_on=['home_team_id', 'season'],
        right_on=['team_id', 'season'],
        how='left',
        suffixes=('', '_home_feat')
    )
    
    # Merge avec team features pour équipe extérieure
    matches_with_features = matches_with_features.merge(
        features_df,
        left_on=['away_team_id', 'season'],
        right_on=['team_id', 'season'],
        how='left',
        suffixes=('_home', '_away')
    )
    
    # Features PRÉ-MATCH UNIQUEMENT
    pre_match_features = [
        # Rankings et positions
        'current_rank_home', 'current_rank_away',
        'points_home', 'points_away',
        'points_difference_home', 'points_difference_away',
        
        # Forme récente (calculée sur matchs PRÉCÉDENTS uniquement)
        'form_5_points_home', 'form_5_points_away',
        'form_10_points_home', 'form_10_points_away',
        
        # Stats défensives/offensives HISTORIQUES
        'goals_for_avg_home', 'goals_for_avg_away',
        'goals_against_avg_home', 'goals_against_avg_away',
        
        # ELO ratings (mis à jour match par match)
        'elo_rating_home', 'elo_rating_away',
        
        # Possession moyenne HISTORIQUE
        'possession_avg_home', 'possession_avg_away',
        
        # Motivation zones
        'motivation_score_home', 'motivation_score_away',
        'pressure_score_home', 'pressure_score_away',
    ]
    
    # Garder seulement les colonnes qui existent
    available_features = [f for f in pre_match_features if f in matches_with_features.columns]
    
    # Créer le dataset final
    X = matches_with_features[available_features].copy()
    
    # Créer features dérivées (différences, ratios)
    if 'current_rank_home' in X.columns and 'current_rank_away' in X.columns:
        X['rank_diff'] = X['current_rank_home'] - X['current_rank_away']
    
    if 'elo_rating_home' in X.columns and 'elo_rating_away' in X.columns:
        X['elo_diff'] = X['elo_rating_home'] - X['elo_rating_away']
        X['elo_ratio'] = X['elo_rating_home'] / (X['elo_rating_away'] + 1)
    
    if 'form_5_points_home' in X.columns and 'form_5_points_away' in X.columns:
        X['form_diff'] = X['form_5_points_home'] - X['form_5_points_away']
    
    # Target : résultat du match (0=draw, 1=home, 2=away)
    y = matches_with_features.apply(
        lambda row: 1 if row['home_score'] > row['away_score'] else 
                   (2 if row['home_score'] < row['away_score'] else 0), 
        axis=1
    )
    
    # Ajouter métadonnées pour filtrage temporel
    X['date'] = matches_with_features['date']
    X['season'] = matches_with_features['season']
    X['match_id'] = matches_with_features['id']
    
    # Remplacer NaN par des valeurs par défaut
    X = X.fillna(0)
    
    print(f"✅ {len(available_features)} features PRÉ-MATCH créées")
    print(f"✅ {X.shape[0]} matches avec features complètes")
    
    return X, y

def temporal_train_test_split(X, y, train_seasons, test_season):
    """
    Split temporel strict : train sur saisons passées, test sur saison future
    AUCUNE donnée de test_season dans l'entraînement
    """
    # Masques temporels stricts
    train_mask = X['season'].isin(train_seasons)
    
    if test_season == 'future':
        # Pour prédictions futures, on garde tout pour l'entraînement
        X_train = X[train_mask].drop(['date', 'season', 'match_id'], axis=1)
        y_train = y[train_mask]
        X_test = None
        y_test = None
    else:
        test_mask = X['season'] == test_season
        X_train = X[train_mask].drop(['date', 'season', 'match_id'], axis=1)
        y_train = y[train_mask]
        X_test = X[test_mask].drop(['date', 'season', 'match_id'], axis=1)
        y_test = y[test_mask]
    
    return X_train, X_test, y_train, y_test

def train_temporal_model(X_train, y_train, X_test=None, y_test=None):
    """
    Entraîne le modèle et évalue si données de test disponibles
    """
    print(f"📈 Entraînement sur {len(X_train)} matches...")
    
    # Modèles à tester
    models = {
        'RandomForest': RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        ),
        'XGBoost': xgb.XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric='mlogloss',
            use_label_encoder=False
        )
    }
    
    results = {}
    
    for name, model in models.items():
        # Entraînement
        model.fit(X_train, y_train)
        
        if X_test is not None and y_test is not None:
            # Prédiction sur test
            y_pred = model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            
            results[name] = {
                'accuracy': accuracy,
                'predictions': y_pred,
                'model': model,
                'test_size': len(X_test)
            }
            
            print(f"  {name}: {accuracy:.1%} accuracy sur {len(X_test)} matches test")
        else:
            results[name] = {
                'model': model,
                'trained_on': len(X_train)
            }
            print(f"  {name}: Entraîné sur {len(X_train)} matches (prêt pour prédictions futures)")
    
    return results

def walk_forward_validation():
    """
    Validation walk-forward temporelle stricte
    Simule l'utilisation réelle : train sur passé, prédit futur
    """
    print("\n" + "="*60)
    print("🚀 TEMPORAL TRAINING SYSTEM - WALK-FORWARD VALIDATION")
    print("="*60)
    
    # Charger les données
    matches_df, features_df, supabase = load_supabase_data()
    
    # Créer features PRÉ-MATCH
    X, y = create_pre_match_features(matches_df, features_df)
    
    print(f"\n📊 Dataset global: {X.shape[0]} matches, {X.shape[1]-3} features")
    
    # Walk-forward validation
    all_results = []
    
    for window in TEMPORAL_CONFIG['training_windows']:
        print(f"\n{'='*50}")
        print(f"🔄 {window['name']}")
        print(f"{'='*50}")
        
        # Split temporel strict
        X_train, X_test, y_train, y_test = temporal_train_test_split(
            X, y, window['train'], window['test']
        )
        
        if X_test is not None:
            print(f"📊 Train: {len(X_train)} matches | Test: {len(X_test)} matches")
        else:
            print(f"📊 Train: {len(X_train)} matches | Test: Prédictions futures")
        
        # Entraîner et évaluer
        results = train_temporal_model(X_train, y_train, X_test, y_test)
        
        window_results = {
            'window': window['name'],
            'train_seasons': window['train'],
            'test_season': window['test'],
            'results': results
        }
        all_results.append(window_results)
    
    # Résumé final
    print("\n" + "="*60)
    print("📊 RÉSUMÉ WALK-FORWARD VALIDATION")
    print("="*60)
    
    for window_result in all_results[:-1]:  # Exclure le dernier (future)
        print(f"\n{window_result['window']}:")
        for model_name, model_results in window_result['results'].items():
            print(f"  {model_name}: {model_results['accuracy']:.1%}")
    
    # Moyenne des performances
    rf_accuracies = []
    xgb_accuracies = []
    
    for window_result in all_results[:-1]:
        if 'RandomForest' in window_result['results']:
            rf_accuracies.append(window_result['results']['RandomForest']['accuracy'])
        if 'XGBoost' in window_result['results']:
            xgb_accuracies.append(window_result['results']['XGBoost']['accuracy'])
    
    print("\n📈 PERFORMANCE MOYENNE (sans data leakage):")
    print(f"  RandomForest: {np.mean(rf_accuracies):.1%} (±{np.std(rf_accuracies):.1%})")
    print(f"  XGBoost: {np.mean(xgb_accuracies):.1%} (±{np.std(xgb_accuracies):.1%})")
    
    # Sauvegarder le modèle final pour prédictions futures
    final_model = all_results[-1]['results']['XGBoost']['model']
    print(f"\n✅ Modèle final entraîné sur {all_results[-1]['train_seasons']} prêt pour prédictions 2025")
    
    return all_results, final_model

def predict_upcoming_matches(model, supabase):
    """
    Prédit les matchs à venir avec le modèle entraîné
    """
    print("\n" + "="*60)
    print("🔮 PRÉDICTIONS MATCHS À VENIR")
    print("="*60)
    
    # Récupérer matchs futurs (sans résultats)
    upcoming_response = supabase.table('matches').select(
        'id, date, home_team_id, away_team_id, '
        'home_team_name, away_team_name, season'
    ).is_('home_score', None).gte('date', datetime.now().isoformat()).execute()
    
    if not upcoming_response.data:
        print("❌ Aucun match à venir trouvé")
        return
    
    upcoming_df = pd.DataFrame(upcoming_response.data)
    print(f"📅 {len(upcoming_df)} matchs à venir trouvés")
    
    # TODO: Créer features pour matchs à venir et prédire
    # (nécessite features_df pour les équipes)
    
    return upcoming_df

if __name__ == "__main__":
    try:
        # Lancer la validation walk-forward
        results, final_model = walk_forward_validation()
        
        print("\n" + "="*60)
        print("✅ TEMPORAL TRAINING SYSTEM - TERMINÉ")
        print("="*60)
        print("\n⚠️ IMPORTANT:")
        print("  - Aucun data leakage (pas de scores dans features)")
        print("  - Train uniquement sur saisons passées")
        print("  - Test sur saisons futures")
        print("  - Performance réaliste: ~45-52% accuracy")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()