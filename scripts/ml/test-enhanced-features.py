#!/usr/bin/env python3

import os
import pandas as pd
import numpy as np
from dotenv import load_dotenv
from supabase import create_client
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score, classification_report
import warnings
warnings.filterwarnings('ignore')

load_dotenv()

def test_enhanced_features():
    """Test ML avec les nouvelles features ELO/Form/Volatilité"""
    
    supabase = create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    )
    
    print('TEST ML AVEC FEATURES ENHANCEES')
    print('=================================')
    print('Nouvelles features: ELO + Form + Volatilite + Features existantes')
    
    # 1. Charger matches
    print('\n[INFO] Chargement matches...')
    matches_response = supabase.table('matches').select(
        'id, season, home_team_id, away_team_id, home_team_name, away_team_name, home_score, away_score'
    ).execute()
    
    matches_df = pd.DataFrame(matches_response.data)
    # Filter matches with results
    matches_df = matches_df[(matches_df['home_score'].notna()) & (matches_df['away_score'].notna())]
    print(f'[OK] {len(matches_df)} matches avec resultats charges')
    
    # 2. Charger features enhancées
    print('\n[INFO] Chargement features enhancees...')
    features_response = supabase.table('team_features').select('*').execute()
    features_df = pd.DataFrame(features_response.data)
    print(f'[OK] {len(features_df)} features equipes chargees')
    
    # 3. Préparer dataset ML
    print('\n[INFO] Preparation dataset ML avec features enhancees...')
    X, y = create_enhanced_features(matches_df, features_df)
    
    if X is None:
        print('[ERROR] Impossible de creer le dataset')
        return
    
    print(f'[OK] Dataset: {X.shape[0]} matches, {X.shape[1]} features')
    
    # 4. Test par saisons (walk-forward)
    print('\n[INFO] Test performance par saison (walk-forward)...')
    results = []
    
    seasons = sorted(X['season'].unique())
    for i, test_season in enumerate(seasons[1:], 1):  # Skip first season
        train_seasons = seasons[:i]
        
        # Split temporel
        train_mask = X['season'].isin(train_seasons)
        test_mask = X['season'] == test_season
        
        X_train = X[train_mask].drop(['season', 'date', 'match_id'], axis=1, errors='ignore')
        y_train = y[train_mask]
        X_test = X[test_mask].drop(['season', 'date', 'match_id'], axis=1, errors='ignore')
        y_test = y[test_mask]
        
        if len(X_test) < 10:  # Skip if not enough test data
            continue
            
        # Train model
        model = RandomForestClassifier(
            n_estimators=200, max_depth=10, min_samples_split=5,
            random_state=42, n_jobs=-1
        )
        
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f'[RESULT] Saison {test_season}: {accuracy:.1%} accuracy ({len(X_test)} matches test)')
        results.append({
            'season': test_season,
            'accuracy': accuracy,
            'test_matches': len(X_test),
            'train_seasons': train_seasons
        })
    
    # 5. Résumé performance
    print('\n' + '='*50)
    print('PERFORMANCE AVEC FEATURES ENHANCEES')
    print('='*50)
    
    if results:
        accuracies = [r['accuracy'] for r in results]
        avg_accuracy = np.mean(accuracies)
        std_accuracy = np.std(accuracies)
        
        print(f'\nPerformance moyenne: {avg_accuracy:.1%}')
        print(f'Écart-type: {std_accuracy:.1%}')
        print(f'Meilleure saison: {max(accuracies):.1%}')
        print(f'Pire saison: {min(accuracies):.1%}')
        
        # Comparaison avec baseline
        baseline = 0.458  # Performance précédente
        improvement = avg_accuracy - baseline
        print(f'\nComparaison baseline (45.8%):')
        print(f'Amélioration: {improvement:+.1%} points')
        print(f'Amélioration relative: {improvement/baseline*100:+.1f}%')
        
        # Feature importance
        if len(X_train) > 0:
            feature_names = X_train.columns.tolist()
            importance = model.feature_importances_
            top_features = sorted(zip(feature_names, importance), key=lambda x: x[1], reverse=True)
            
            print(f'\nTop 10 features importantes:')
            for i, (feature, imp) in enumerate(top_features[:10], 1):
                print(f'  {i}. {feature}: {imp:.3f}')
    
    return results

def create_enhanced_features(matches_df, features_df):
    """Cree dataset ML avec features enhancees"""
    
    try:
        # Merge home team features
        matches_enhanced = matches_df.merge(
            features_df,
            left_on=['home_team_id', 'season'],
            right_on=['team_id', 'season'],
            how='left',
            suffixes=('', '_home_temp')
        )
        
        # Merge away team features
        matches_enhanced = matches_enhanced.merge(
            features_df,
            left_on=['away_team_id', 'season'],
            right_on=['team_id', 'season'],
            how='left',
            suffixes=('_home', '_away')
        )
        
        # Features disponibles (nouvelles + existantes)
        feature_columns = []
        
        # 1. ELO features (nouvelles)
        elo_features = ['elo_rating', 'elo_home', 'elo_away']
        for feat in elo_features:
            if f'{feat}_home' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_home')
            if f'{feat}_away' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_away')
        
        # 2. Form features (nouvelles)
        form_features = ['form_5_points', 'form_10_points']
        for feat in form_features:
            if f'{feat}_home' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_home')
            if f'{feat}_away' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_away')
        
        # 3. Volatility features (nouvelles)
        volatility_features = ['volatility_index']
        for feat in volatility_features:
            if f'{feat}_home' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_home')
            if f'{feat}_away' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_away')
        
        # 4. Features existantes
        existing_features = [
            'current_rank', 'points', 'points_difference',
            'goals_for', 'goals_against', 'goal_difference',
            'games_played', 'wins', 'draws', 'losses'
        ]
        for feat in existing_features:
            if f'{feat}_home' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_home')
            if f'{feat}_away' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_away')
        
        # Garder seulement les features qui existent
        available_features = [f for f in feature_columns if f in matches_enhanced.columns]
        
        if len(available_features) == 0:
            print('[ERROR] Aucune feature disponible')
            return None, None
        
        print(f'[INFO] Features utilisées: {len(available_features)}')
        print('Features principales:')
        for feat in available_features[:15]:  # Show first 15
            print(f'  - {feat}')
        if len(available_features) > 15:
            print(f'  ... et {len(available_features) - 15} autres')
        
        # Créer X
        X = matches_enhanced[available_features].copy()
        
        # Features dérivées (avantages)
        if 'elo_rating_home' in X.columns and 'elo_rating_away' in X.columns:
            X['elo_advantage'] = X['elo_rating_home'] - X['elo_rating_away']
        
        if 'form_5_points_home' in X.columns and 'form_5_points_away' in X.columns:
            X['form_advantage'] = X['form_5_points_home'] - X['form_5_points_away']
        
        if 'current_rank_home' in X.columns and 'current_rank_away' in X.columns:
            X['rank_advantage'] = X['current_rank_away'] - X['current_rank_home']  # Rank inversé
        
        # Métadonnées
        X['season'] = matches_enhanced['season']
        if 'id' in matches_enhanced.columns:
            X['match_id'] = matches_enhanced['id']
        
        # Target
        y = matches_enhanced.apply(
            lambda row: 1 if row['home_score'] > row['away_score'] else 
                       (2 if row['home_score'] < row['away_score'] else 0), 
            axis=1
        )
        
        # Clean NaN
        X = X.fillna(0)
        
        return X, y
        
    except Exception as e:
        print(f'[ERROR] Erreur création features: {e}')
        return None, None

if __name__ == '__main__':
    test_enhanced_features()