#!/usr/bin/env python3

import os
import pandas as pd
import numpy as np
from dotenv import load_dotenv
from supabase import create_client
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix
import warnings
warnings.filterwarnings('ignore')

load_dotenv()

def analyze_prediction_errors():
    """Analyse detaillee des erreurs de prediction pour auto-amelioration"""
    
    supabase = create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    )
    
    print('ANALYSE DES ERREURS DE PREDICTION')
    print('=================================')
    print('Objectif: Comprendre pourquoi le modele se trompe pour s\'auto-corriger')
    
    # 1. Charger données complètes
    print('\n[INFO] Chargement donnees completes...')
    matches_df, features_df = load_complete_data(supabase)
    X, y = create_enhanced_features(matches_df, features_df)
    
    if X is None:
        return
    
    print(f'[OK] Dataset: {X.shape[0]} matches pour analyse')
    
    # 2. Focus sur saison 2024 (meilleure performance)
    print('\n[INFO] Analyse detaillee saison 2024...')
    analyze_season_errors(X, y, matches_df, test_season=2024)
    
    # 3. Analyse patterns generaux d'erreurs
    print('\n[INFO] Patterns generaux d\'erreurs...')
    analyze_error_patterns(X, y, matches_df)
    
    # 4. Suggestions d'amelioration
    print('\n[INFO] Suggestions auto-correction...')
    suggest_improvements(X, y, matches_df)

def load_complete_data(supabase):
    """Charge toutes les donnees avec pagination"""
    
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

def analyze_season_errors(X, y, matches_df, test_season=2024):
    """Analyse detaillee des erreurs pour une saison specifique"""
    
    print(f'\n=== ANALYSE ERREURS SAISON {test_season} ===')
    
    # Train sur saisons precedentes
    train_seasons = [s for s in sorted(X['season'].unique()) if s < test_season]
    train_mask = X['season'].isin(train_seasons)
    test_mask = X['season'] == test_season
    
    X_train = X[train_mask].drop(['season', 'match_id'], axis=1, errors='ignore')
    y_train = y[train_mask]
    X_test = X[test_mask].drop(['season', 'match_id'], axis=1, errors='ignore')
    y_test = y[test_mask]
    
    if len(X_test) == 0:
        print(f'[ERROR] Pas de donnees test pour saison {test_season}')
        return
    
    # Entrainer modele
    model = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    # Predictions avec probabilites
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)
    
    # Analyser les erreurs
    test_matches = matches_df[matches_df['season'] == test_season].copy()
    test_matches = test_matches.iloc[:len(y_test)]  # S'assurer meme longueur
    
    # Ajouter predictions et probabilites
    test_matches['prediction'] = y_pred
    test_matches['actual'] = y_test.values
    test_matches['correct'] = (y_pred == y_test.values)
    test_matches['confidence'] = np.max(y_pred_proba, axis=1)
    
    # Statistiques globales
    accuracy = accuracy_score(y_test, y_pred)
    errors = test_matches[~test_matches['correct']]
    correct_preds = test_matches[test_matches['correct']]
    
    print(f'\\nSTATISTIQUES SAISON {test_season}:')
    print(f'  Total matches: {len(test_matches)}')
    print(f'  Predictions correctes: {len(correct_preds)} ({accuracy:.1%})')
    print(f'  Erreurs: {len(errors)} ({1-accuracy:.1%})')
    print(f'  Confiance moyenne: {test_matches["confidence"].mean():.1%}')
    
    # Analyse des erreurs par type
    print(f'\\nANALYSE DES {len(errors)} ERREURS:')
    
    # 1. Erreurs par confiance
    high_confidence_errors = errors[errors['confidence'] > 0.6]
    print(f'\\n1. ERREURS HAUTE CONFIANCE (>60%): {len(high_confidence_errors)}')
    if len(high_confidence_errors) > 0:
        print('   Exemples problematiques:')
        for _, match in high_confidence_errors.head(3).iterrows():
            result_names = {0: 'Nul', 1: 'Victoire Home', 2: 'Victoire Away'}
            print(f'     {match["home_team_name"]} vs {match["away_team_name"]}')
            print(f'     Predit: {result_names[match["prediction"]]} (confiance {match["confidence"]:.1%})')
            print(f'     Reel: {result_names[match["actual"]]} | Score: {match["home_score"]}-{match["away_score"]}')
    
    # 2. Erreurs par type de resultat
    print(f'\\n2. ERREURS PAR TYPE:')
    error_types = {}
    result_names = {0: 'Nul', 1: 'Victoire Home', 2: 'Victoire Away'}
    
    for actual in [0, 1, 2]:
        actual_errors = errors[errors['actual'] == actual]
        if len(actual_errors) > 0:
            error_types[actual] = len(actual_errors)
            predicted_as = actual_errors['prediction'].value_counts()
            print(f'   {result_names[actual]} mal predits: {len(actual_errors)}')
            for pred, count in predicted_as.items():
                print(f'     -> Predits comme {result_names[pred]}: {count}')
    
    # 3. Erreurs par equipes
    print(f'\\n3. EQUIPES PROBLEMATIQUES:')
    team_errors = {}
    for _, match in errors.iterrows():
        home_team = match['home_team_name']
        away_team = match['away_team_name']
        team_errors[home_team] = team_errors.get(home_team, 0) + 1
        team_errors[away_team] = team_errors.get(away_team, 0) + 1
    
    worst_teams = sorted(team_errors.items(), key=lambda x: x[1], reverse=True)[:5]
    for team, error_count in worst_teams:
        total_team_matches = len(test_matches[
            (test_matches['home_team_name'] == team) | 
            (test_matches['away_team_name'] == team)
        ])
        error_rate = error_count / total_team_matches if total_team_matches > 0 else 0
        print(f'   {team}: {error_count} erreurs sur {total_team_matches} matchs ({error_rate:.1%})')
    
    # 4. Patterns temporels
    print(f'\\n4. PATTERNS TEMPORELS:')
    if 'date' in test_matches.columns:
        # Si on a les dates, analyser par periode
        print('   [INFO] Analyse temporelle necessiterait colonne date')
    
    return errors, correct_preds, model

def analyze_error_patterns(X, y, matches_df):
    """Analyse patterns generaux d'erreurs sur toutes les saisons"""
    
    print(f'\\n=== PATTERNS GENERAUX D\'ERREURS ===')
    
    all_errors = []
    all_correct = []
    
    # Walk-forward sur toutes les saisons
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
        
        model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)
        
        # Stocker erreurs et succès
        test_season_matches = matches_df[matches_df['season'] == test_season].iloc[:len(y_test)].copy()
        test_season_matches['prediction'] = y_pred
        test_season_matches['actual'] = y_test.values
        test_season_matches['correct'] = (y_pred == y_test.values)
        test_season_matches['confidence'] = np.max(y_pred_proba, axis=1)
        test_season_matches['season'] = test_season
        
        all_errors.extend(test_season_matches[~test_season_matches['correct']].to_dict('records'))
        all_correct.extend(test_season_matches[test_season_matches['correct']].to_dict('records'))
    
    errors_df = pd.DataFrame(all_errors)
    correct_df = pd.DataFrame(all_correct)
    
    if len(errors_df) == 0:
        print('[ERROR] Pas d\'erreurs trouvees')
        return
    
    print(f'\\nANALYSE {len(errors_df)} ERREURS vs {len(correct_df)} SUCCÈS:')
    
    # 1. Distribution des erreurs par resultat
    print(f'\\n1. DISTRIBUTION ERREURS:')
    result_names = {0: 'Nul', 1: 'Victoire Home', 2: 'Victoire Away'}
    for result in [0, 1, 2]:
        errors_for_result = len(errors_df[errors_df['actual'] == result])
        total_for_result = len(errors_df[errors_df['actual'] == result]) + len(correct_df[correct_df['actual'] == result])
        if total_for_result > 0:
            error_rate = errors_for_result / total_for_result
            print(f'   {result_names[result]}: {error_rate:.1%} erreurs ({errors_for_result}/{total_for_result})')
    
    # 2. Confiance dans les erreurs vs succès
    print(f'\\n2. CONFIANCE:')
    print(f'   Confiance moyenne erreurs: {errors_df["confidence"].mean():.1%}')
    print(f'   Confiance moyenne succès: {correct_df["confidence"].mean():.1%}')
    
    low_conf_errors = len(errors_df[errors_df['confidence'] < 0.4])
    high_conf_errors = len(errors_df[errors_df['confidence'] > 0.7])
    print(f'   Erreurs faible confiance (<40%): {low_conf_errors} ({low_conf_errors/len(errors_df):.1%})')
    print(f'   Erreurs haute confiance (>70%): {high_conf_errors} ({high_conf_errors/len(errors_df):.1%})')

def suggest_improvements(X, y, matches_df):
    """Suggestions concretes d'amelioration basees sur l'analyse"""
    
    print(f'\\n=== SUGGESTIONS AUTO-AMELIORATION ===')
    
    print('\\n1. GESTION DE LA CONFIANCE:')
    print('   → Implementer seuil de confiance: rejeter predictions <50%')
    print('   → Signaler matches haute confiance mais incorrects pour analyse')
    print('   → Utiliser ensemble de modeles pour reduire overconfidence')
    
    print('\\n2. FEATURES MANQUANTES IDENTIFIEES:')
    print('   → Expected Goals (XG): crucial pour evaluer vraie qualite')
    print('   → Forme recent (3 derniers matchs): plus reactive que form_5')
    print('   → Motivational context: relegation/champions league impact')
    print('   → Injuries/suspensions: impact majeur non capture')
    
    print('\\n3. STRATEGIES D\'AUTO-CORRECTION:')
    print('   → Online learning: retrainer apres chaque journee')
    print('   → Adaptive weighting: donner plus poids aux matchs recents')
    print('   → Error-specific models: modeles specialises par type erreur')
    print('   → Uncertainty quantification: modeliser incertitude predictions')
    
    print('\\n4. MONITORING EN TEMPS REEL:')
    print('   → Tracker drift performance par equipe/saison')
    print('   → Alertes automatiques si accuracy <threshold')
    print('   → A/B testing: comparer versions modeles')
    print('   → Feedback loop: integrer nouvelles donnees immediatement')
    
    print('\\n5. FEATURES D\'AMELIORATION PROPOSEES:')
    improvement_features = [
        'recent_form_3_matches',
        'xg_for_last_5_matches', 
        'xg_against_last_5_matches',
        'motivation_score_dynamic',
        'key_players_availability',
        'head_to_head_last_3_seasons',
        'home_advantage_team_specific',
        'referee_bias_historical',
        'weather_conditions',
        'rest_days_difference'
    ]
    
    for i, feature in enumerate(improvement_features, 1):
        print(f'   {i}. {feature}')

def create_enhanced_features(matches_df, features_df):
    """Version simplifiee pour l'analyse"""
    
    try:
        matches_enhanced = matches_df.merge(
            features_df, left_on=['home_team_id', 'season'], 
            right_on=['team_id', 'season'], how='left', suffixes=('', '_home_temp')
        ).merge(
            features_df, left_on=['away_team_id', 'season'],
            right_on=['team_id', 'season'], how='left', suffixes=('_home', '_away')
        )
        
        feature_columns = []
        base_features = ['elo_rating', 'form_5_points', 'volatility_index', 'current_rank', 'points']
        
        for feat in base_features:
            if f'{feat}_home' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_home')
            if f'{feat}_away' in matches_enhanced.columns:
                feature_columns.append(f'{feat}_away')
        
        available_features = [f for f in feature_columns if f in matches_enhanced.columns]
        
        if len(available_features) == 0:
            return None, None
        
        X = matches_enhanced[available_features].copy()
        
        # Features derivees
        if 'elo_rating_home' in X.columns and 'elo_rating_away' in X.columns:
            X['elo_advantage'] = X['elo_rating_home'] - X['elo_rating_away']
        
        X['season'] = matches_enhanced['season']
        X = X.fillna(0)
        
        y = matches_enhanced.apply(
            lambda row: 1 if row['home_score'] > row['away_score'] else 
                       (2 if row['home_score'] < row['away_score'] else 0), axis=1
        )
        
        return X, y
        
    except Exception as e:
        print(f'[ERROR] {e}')
        return None, None

if __name__ == '__main__':
    analyze_prediction_errors()