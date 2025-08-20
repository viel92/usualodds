#!/usr/bin/env python3
"""
BACKTEST HISTORICAL PERFORMANCE - USUALODDS 2025
===============================================
Validation du modèle ML 62.1% sur données historiques par saison
Test de robustesse et consistency sur 2020-2024
"""

import pandas as pd
import numpy as np
from datetime import datetime
import os
from dotenv import load_dotenv
import sys

# Charger variables environnement
load_dotenv()

def load_data():
    """Charge les données depuis Supabase"""
    try:
        from supabase import create_client
        
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            raise Exception("Variables Supabase manquantes")
            
        supabase = create_client(supabase_url, supabase_key)
        print("[OK] Connexion Supabase établie")
        
        # Récupérer matches historiques avec résultats
        print("[INFO] Récupération matches historiques...")
        matches_response = supabase.table('matches').select(
            'id, season, home_team_id, away_team_id, home_team_name, away_team_name, '
            'home_score, away_score, date, status'
        ).not_.is_('home_score', None).not_.is_('away_score', None).execute()
        
        matches_df = pd.DataFrame(matches_response.data)
        print(f"[OK] {len(matches_df)} matches avec résultats chargés")
        
        return matches_df, supabase
        
    except Exception as e:
        print(f"[ERROR] Erreur chargement données: {e}")
        sys.exit(1)

def get_team_features(supabase):
    """Récupère toutes les team features pour ML"""
    try:
        print("[INFO] Récupération team features...")
        
        # Features principales
        team_features = supabase.table('team_features').select(
            'team_id, season, elo_rating, elo_home, elo_away, '
            'form_5_points, form_10_points, possession_avg, volatility_index, '
            'points, goal_difference, wins, draws, losses'
        ).execute()
        
        features_df = pd.DataFrame(team_features.data)
        print(f"[OK] {len(features_df)} team features chargées")
        
        return features_df
        
    except Exception as e:
        print(f"[ERROR] Erreur features: {e}")
        return pd.DataFrame()

def prepare_ml_features(matches_df, features_df):
    """Prépare les features ML comme dans le modèle original"""
    try:
        print("[INFO] Préparation features ML...")
        
        ml_data = []
        
        for _, match in matches_df.iterrows():
            # Features équipe domicile
            home_features = features_df[
                (features_df['team_id'] == match['home_team_id']) & 
                (features_df['season'] == match['season'])
            ]
            
            # Features équipe extérieur
            away_features = features_df[
                (features_df['team_id'] == match['away_team_id']) & 
                (features_df['season'] == match['season'])
            ]
            
            if home_features.empty or away_features.empty:
                continue
                
            home_f = home_features.iloc[0]
            away_f = away_features.iloc[0]
            
            # Calculer résultat réel
            home_score = match['home_score']
            away_score = match['away_score']
            
            if home_score > away_score:
                result = 0  # Home win
            elif home_score < away_score:
                result = 2  # Away win  
            else:
                result = 1  # Draw
            
            # Features comme dans le modèle original
            features = {
                # Basic info
                'season': match['season'],
                'match_id': match['id'],
                'home_team': match['home_team_name'],
                'away_team': match['away_team_name'],
                'date': match['date'],
                'actual_result': result,
                
                # ELO features
                'home_elo': home_f.get('elo_rating', 1500),
                'away_elo': away_f.get('elo_rating', 1500),
                'elo_diff': home_f.get('elo_rating', 1500) - away_f.get('elo_rating', 1500),
                'home_elo_home': home_f.get('elo_home', 1500),
                'away_elo_away': away_f.get('elo_away', 1500),
                
                # Form features
                'home_form_5': home_f.get('form_5_points', 7.5),
                'away_form_5': away_f.get('form_5_points', 7.5),
                'form_5_diff': home_f.get('form_5_points', 7.5) - away_f.get('form_5_points', 7.5),
                'home_form_10': home_f.get('form_10_points', 15),
                'away_form_10': away_f.get('form_10_points', 15),
                
                # Possession & style
                'home_possession': home_f.get('possession_avg', 50),
                'away_possession': away_f.get('possession_avg', 50),
                'possession_diff': home_f.get('possession_avg', 50) - away_f.get('possession_avg', 50),
                
                # Volatility
                'home_volatility': home_f.get('volatility_index', 1.0),
                'away_volatility': away_f.get('volatility_index', 1.0),
                
                # League position
                'home_points': home_f.get('points', 30),
                'away_points': away_f.get('points', 30),
                'points_diff': home_f.get('points', 30) - away_f.get('points', 30),
                'goal_diff_combined': home_f.get('goal_difference', 0) - away_f.get('goal_difference', 0),
                
                # Record
                'home_wins': home_f.get('wins', 10),
                'away_wins': away_f.get('wins', 10),
                'home_losses': home_f.get('losses', 10),
                'away_losses': away_f.get('losses', 10)
            }
            
            ml_data.append(features)
        
        ml_df = pd.DataFrame(ml_data)
        print(f"[OK] {len(ml_df)} matches preparés pour ML")
        
        return ml_df
        
    except Exception as e:
        print(f"[ERROR] Erreur préparation features: {e}")
        return pd.DataFrame()

def train_and_test_by_season(ml_df):
    """Entraîne et teste le modèle par saison"""
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score, classification_report
        from sklearn.preprocessing import StandardScaler
        
        print("[INFO] Backtesting par saison...")
        
        # Features pour ML (même que modèle original)
        feature_columns = [
            'home_elo', 'away_elo', 'elo_diff', 'home_elo_home', 'away_elo_away',
            'home_form_5', 'away_form_5', 'form_5_diff', 'home_form_10', 'away_form_10',
            'home_possession', 'away_possession', 'possession_diff',
            'home_volatility', 'away_volatility',
            'home_points', 'away_points', 'points_diff', 'goal_diff_combined',
            'home_wins', 'away_wins', 'home_losses', 'away_losses'
        ]
        
        results = {}
        seasons = sorted(ml_df['season'].unique())
        
        for season in seasons:
            print(f"\n[INFO] Saison {season}...")
            
            # Données de la saison
            season_data = ml_df[ml_df['season'] == season].copy()
            
            if len(season_data) < 50:  # Pas assez de données
                print(f"[WARN] Pas assez de données pour {season} ({len(season_data)} matches)")
                continue
            
            # Features et target
            X = season_data[feature_columns].fillna(0)
            y = season_data['actual_result']
            
            # Split train/test (80/20)
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Normalisation
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Modèle (même config que l'original optimisé)
            model = RandomForestClassifier(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                class_weight='balanced',
                random_state=42,
                n_jobs=-1
            )
            
            # Entraînement
            model.fit(X_train_scaled, y_train)
            
            # Prédictions
            y_pred = model.predict(X_test_scaled)
            
            # Métriques
            accuracy = accuracy_score(y_test, y_pred)
            
            # Analyse par classe
            from sklearn.metrics import confusion_matrix
            cm = confusion_matrix(y_test, y_pred)
            
            results[season] = {
                'accuracy': accuracy,
                'total_matches': len(season_data),
                'test_matches': len(y_test),
                'confusion_matrix': cm,
                'class_distribution': y.value_counts().to_dict()
            }
            
            print(f"[OK] Accuracy: {accuracy:.1%}")
            print(f"[INFO] Matches test: {len(y_test)}")
            
        return results
        
    except Exception as e:
        print(f"[ERROR] Erreur backtesting: {e}")
        return {}

def analyze_results(results):
    """Analyse les résultats du backtesting"""
    print("\n" + "="*50)
    print("ANALYSE PERFORMANCE HISTORIQUE")
    print("="*50)
    
    if not results:
        print("[ERROR] Aucun résultat à analyser")
        return
    
    # Performance globale
    accuracies = [r['accuracy'] for r in results.values()]
    avg_accuracy = np.mean(accuracies)
    std_accuracy = np.std(accuracies)
    
    print(f"\n[PERF] PERFORMANCE GLOBALE:")
    print(f"Accuracy moyenne: {avg_accuracy:.1%}")
    print(f"Écart-type: {std_accuracy:.1%}")
    print(f"Meilleure saison: {max(accuracies):.1%}")
    print(f"Pire saison: {min(accuracies):.1%}")
    
    # Détail par saison
    print(f"\n[DETAIL] PAR SAISON:")
    for season, result in results.items():
        acc = result['accuracy']
        status = "[OK]" if acc >= 0.60 else "[WARN]" if acc >= 0.55 else "[FAIL]"
        print(f"{status} {season}: {acc:.1%} ({result['test_matches']} matches test)")
    
    # Distribution des résultats
    print(f"\n[ANALYSE]:")
    seasons_60_plus = sum(1 for acc in accuracies if acc >= 0.60)
    seasons_55_plus = sum(1 for acc in accuracies if acc >= 0.55)
    
    print(f"Saisons >=60%: {seasons_60_plus}/{len(accuracies)}")
    print(f"Saisons >=55%: {seasons_55_plus}/{len(accuracies)}")
    
    # Stabilité
    if std_accuracy < 0.05:
        print("[OK] Modèle STABLE (écart-type <5%)")
    elif std_accuracy < 0.08:
        print("[WARN] Modèle MOYENNEMENT stable (écart-type 5-8%)")
    else:
        print("[FAIL] Modèle INSTABLE (écart-type >8%)")
    
    # Validation vs objectif 62.1%
    print(f"\n[VALIDATION] MODÈLE:")
    if avg_accuracy >= 0.621:
        print(f"[OK] Performance VALIDEE: {avg_accuracy:.1%} >= 62.1%")
    elif avg_accuracy >= 0.58:
        print(f"[WARN] Performance ACCEPTABLE: {avg_accuracy:.1%} (>=58% requis)")
    else:
        print(f"[FAIL] Performance INSUFFISANTE: {avg_accuracy:.1%} (<58%)")
    
    return {
        'avg_accuracy': avg_accuracy,
        'std_accuracy': std_accuracy,
        'seasons_results': results
    }

def main():
    """Script principal"""
    print("BACKTEST HISTORICAL PERFORMANCE")
    print("=" * 40)
    
    # 1. Charger données
    matches_df, supabase = load_data()
    
    # 2. Charger features
    features_df = get_team_features(supabase)
    
    if features_df.empty:
        print("❌ Pas de team features - impossible de continuer")
        sys.exit(1)
    
    # 3. Préparer features ML
    ml_df = prepare_ml_features(matches_df, features_df)
    
    if ml_df.empty:
        print("❌ Aucune donnée ML préparée")
        sys.exit(1)
    
    # 4. Backtesting par saison
    results = train_and_test_by_season(ml_df)
    
    # 5. Analyse des résultats
    final_analysis = analyze_results(results)
    
    print(f"\n[COMPLETE] BACKTEST TERMINE!")
    print(f"Performance moyenne: {final_analysis['avg_accuracy']:.1%}")

if __name__ == "__main__":
    main()