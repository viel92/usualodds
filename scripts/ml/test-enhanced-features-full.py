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

def test_enhanced_features_full():
    """Test ML avec TOUS les matches (pagination) et features enhancees"""
    
    supabase = create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    )
    
    print('TEST ML COMPLET - TOUS LES MATCHES')
    print('==================================')
    print('Recuperation avec pagination pour avoir les 1760 matches')
    
    # 1. Charger TOUS les matches avec pagination
    print('\n[INFO] Chargement TOUS les matches avec pagination...')
    all_matches = []
    page = 0
    page_size = 500
    
    while True:
        offset = page * page_size
        print(f'  Page {page + 1}: offset {offset}...')
        
        response = supabase.table('matches').select(
            'id, season, home_team_id, away_team_id, home_team_name, away_team_name, home_score, away_score'
        ).range(offset, offset + page_size - 1).execute()
        
        if not response.data or len(response.data) == 0:
            break
            
        all_matches.extend(response.data)
        print(f'    {len(response.data)} matches recuperes (total: {len(all_matches)})')
        page += 1
    
    matches_df = pd.DataFrame(all_matches)
    print(f'[OK] TOTAL matches recuperes: {len(matches_df)}')
    
    # Filter matches with results
    matches_df = matches_df[(matches_df['home_score'].notna()) & (matches_df['away_score'].notna())]
    print(f'[OK] Matches avec resultats: {len(matches_df)}')
    
    # 2. Charger features avec pagination aussi
    print('\n[INFO] Chargement features avec pagination...')
    all_features = []
    page = 0
    
    while True:
        offset = page * page_size
        response = supabase.table('team_features').select('*').range(offset, offset + page_size - 1).execute()
        
        if not response.data or len(response.data) == 0:
            break
            
        all_features.extend(response.data)
        page += 1
    
    features_df = pd.DataFrame(all_features)
    print(f'[OK] Features equipes: {len(features_df)}')
    
    # 3. Preparer dataset
    print('\n[INFO] Preparation dataset ML complet...')
    X, y = create_enhanced_features(matches_df, features_df)
    
    if X is None:
        print('[ERROR] Impossible de creer le dataset')
        return
    
    print(f'[OK] Dataset COMPLET: {X.shape[0]} matches, {X.shape[1]} features')
    
    # 4. Repartition par saison
    print('\n[INFO] Repartition par saison:')
    for season in sorted(X['season'].unique()):
        season_count = len(X[X['season'] == season])
        print(f'  Saison {season}: {season_count} matches')
    
    # 5. Test performance walk-forward sur dataset complet
    print('\n[INFO] Test performance walk-forward (dataset complet)...')
    results = []
    
    seasons = sorted(X['season'].unique())
    for i, test_season in enumerate(seasons[1:], 1):
        train_seasons = seasons[:i]
        
        train_mask = X['season'].isin(train_seasons)
        test_mask = X['season'] == test_season
        
        X_train = X[train_mask].drop(['season', 'match_id'], axis=1, errors='ignore')
        y_train = y[train_mask]
        X_test = X[test_mask].drop(['season', 'match_id'], axis=1, errors='ignore')
        y_test = y[test_mask]
        
        if len(X_test) < 10:
            continue
            
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
            'test_matches': len(X_test)
        })
    
    # 6. Comparaison resultats
    print('\n' + '='*60)
    print('COMPARAISON: DATASET PARTIEL vs COMPLET')
    print('='*60)
    
    if results:
        accuracies = [r['accuracy'] for r in results]
        avg_accuracy = np.mean(accuracies)
        total_test_matches = sum(r['test_matches'] for r in results)
        
        print(f'\nDATASET COMPLET ({len(matches_df)} matches):')
        print(f'  Performance moyenne: {avg_accuracy:.1%}')
        print(f'  Total matches test: {total_test_matches}')
        print(f'  Ecart-type: {np.std(accuracies):.1%}')
        
        print(f'\nDATASET PARTIEL PRECEDENT (856 matches):')
        print(f'  Performance moyenne: 54.4%')
        print(f'  Total matches test: 694')
        
        difference = avg_accuracy - 0.544
        print(f'\nDIFFERENCE: {difference:+.1%} points')
        
        if abs(difference) > 0.02:
            print('⚠️  DIFFERENCE SIGNIFICATIVE - Dataset partiel biaise!')
        else:
            print('✅ Resultats coherents entre les deux datasets')
        
        # Feature importance sur dataset complet
        if len(X_train) > 0:
            feature_names = X_train.columns.tolist()
            importance = model.feature_importances_
            top_features = sorted(zip(feature_names, importance), key=lambda x: x[1], reverse=True)
            
            print(f'\nTop 10 features (dataset complet):')
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
        
        # Features enhancees
        feature_columns = []
        
        # ELO features
        elo_features = ['elo_rating', 'elo_home', 'elo_away']
        for feat in elo_features:
            if f'{feat}_home' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_home')
            if f'{feat}_away' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_away')
        
        # Form features
        form_features = ['form_5_points', 'form_10_points']
        for feat in form_features:
            if f'{feat}_home' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_home')
            if f'{feat}_away' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_away')
        
        # Volatility features
        volatility_features = ['volatility_index']
        for feat in volatility_features:
            if f'{feat}_home' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_home')
            if f'{feat}_away' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_away')
        
        # Features existantes
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
        
        available_features = [f for f in feature_columns if f in matches_enhanced.columns]
        
        if len(available_features) == 0:
            print('[ERROR] Aucune feature disponible')
            return None, None
        
        X = matches_enhanced[available_features].copy()
        
        # Features derivees
        if 'elo_rating_home' in X.columns and 'elo_rating_away' in X.columns:
            X['elo_advantage'] = X['elo_rating_home'] - X['elo_rating_away']
        
        if 'form_5_points_home' in X.columns and 'form_5_points_away' in X.columns:
            X['form_advantage'] = X['form_5_points_home'] - X['form_5_points_away']
        
        if 'current_rank_home' in X.columns and 'current_rank_away' in X.columns:
            X['rank_advantage'] = X['current_rank_away'] - X['current_rank_home']
        
        # Metadonnees
        X['season'] = matches_enhanced['season']
        if 'id' in matches_enhanced.columns:
            X['match_id'] = matches_enhanced['id']
        
        # Target
        y = matches_enhanced.apply(
            lambda row: 1 if row['home_score'] > row['away_score'] else 
                       (2 if row['home_score'] < row['away_score'] else 0), 
            axis=1
        )
        
        X = X.fillna(0)
        return X, y
        
    except Exception as e:
        print(f'[ERROR] Erreur creation features: {e}')
        return None, None

if __name__ == '__main__':
    test_enhanced_features_full()