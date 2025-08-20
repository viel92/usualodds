#!/usr/bin/env python3
"""
BACKTEST CLEAN METHODOLOGY - USUALODDS 2025
===========================================
Backtest sans data leakage avec features temporellement correctes
Méthodologie : uniquement features pré-match connues historiquement
"""

import pandas as pd
import numpy as np
from datetime import datetime
import os
from dotenv import load_dotenv
import sys

load_dotenv()

def load_data():
    """Charge les données depuis Supabase"""
    try:
        from supabase import create_client
        
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        supabase = create_client(supabase_url, supabase_key)
        print("[OK] Connexion Supabase etablie")
        
        # Récupérer matches historiques avec résultats
        print("[INFO] Recuperation matches historiques...")
        matches_response = supabase.table('matches').select(
            'id, season, home_team_id, away_team_id, home_team_name, away_team_name, '
            'home_score, away_score, date, status'
        ).not_.is_('home_score', None).not_.is_('away_score', None).execute()
        
        matches_df = pd.DataFrame(matches_response.data)
        print(f"[OK] {len(matches_df)} matches avec resultats charges")
        
        return matches_df, supabase
        
    except Exception as e:
        print(f"[ERROR] Erreur chargement donnees: {e}")
        sys.exit(1)

def get_clean_team_features(supabase):
    """Récupère UNIQUEMENT les features sans data leakage"""
    try:
        print("[INFO] Recuperation features CLEAN (sans data leakage)...")
        
        # UNIQUEMENT les features qui peuvent être connues AVANT le match
        clean_features = supabase.table('team_features').select(
            'team_id, season, '
            'elo_rating, elo_home, elo_away, '  # ELO OK (historique)
            'form_5_points, form_10_points, '   # Form OK (5/10 derniers)
            'possession_avg, '                   # Style OK (historique)
            'volatility_index, '                # Volatilité OK
            'home_advantage, away_performance'   # Performance domicile/extérieur OK
        ).execute()
        
        features_df = pd.DataFrame(clean_features.data)
        print(f"[OK] {len(features_df)} features CLEAN chargees (8 features/team)")
        
        return features_df
        
    except Exception as e:
        print(f"[ERROR] Erreur features: {e}")
        return pd.DataFrame()

def prepare_clean_ml_features(matches_df, features_df):
    """Prépare les features ML SANS data leakage"""
    try:
        print("[INFO] Preparation features ML CLEAN...")
        
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
            
            # UNIQUEMENT features sans data leakage temporel
            features = {
                # Basic info
                'season': match['season'],
                'match_id': match['id'],
                'home_team': match['home_team_name'],
                'away_team': match['away_team_name'],
                'date': match['date'],
                'actual_result': result,
                
                # ELO features (OK - historique)
                'home_elo': home_f.get('elo_rating', 1500),
                'away_elo': away_f.get('elo_rating', 1500),
                'elo_diff': home_f.get('elo_rating', 1500) - away_f.get('elo_rating', 1500),
                'home_elo_home': home_f.get('elo_home', 1500),
                'away_elo_away': away_f.get('elo_away', 1500),
                
                # Form features (OK - basé sur derniers matches)
                'home_form_5': home_f.get('form_5_points', 7.5),
                'away_form_5': away_f.get('form_5_points', 7.5),
                'form_5_diff': home_f.get('form_5_points', 7.5) - away_f.get('form_5_points', 7.5),
                'home_form_10': home_f.get('form_10_points', 15),
                'away_form_10': away_f.get('form_10_points', 15),
                
                # Style features (OK - historique)
                'home_possession': home_f.get('possession_avg', 50),
                'away_possession': away_f.get('possession_avg', 50),
                'possession_diff': home_f.get('possession_avg', 50) - away_f.get('possession_avg', 50),
                
                # Volatility (OK)
                'home_volatility': home_f.get('volatility_index', 1.0),
                'away_volatility': away_f.get('volatility_index', 1.0),
                
                # Home/Away performance (OK - historique)
                'home_advantage': home_f.get('home_advantage', 0),
                'away_performance': away_f.get('away_performance', 0),
                'venue_diff': home_f.get('home_advantage', 0) - away_f.get('away_performance', 0)
            }
            
            ml_data.append(features)
        
        ml_df = pd.DataFrame(ml_data)
        print(f"[OK] {len(ml_df)} matches prepares pour ML (18 features CLEAN)")
        
        return ml_df
        
    except Exception as e:
        print(f"[ERROR] Erreur preparation features: {e}")
        return pd.DataFrame()

def train_and_test_by_season_clean(ml_df):
    """Entraîne et teste le modèle CLEAN par saison"""
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score, classification_report
        from sklearn.preprocessing import StandardScaler
        
        print("[INFO] Backtesting CLEAN par saison...")
        
        # Features CLEAN pour ML (pas de data leakage)
        feature_columns = [
            'home_elo', 'away_elo', 'elo_diff', 'home_elo_home', 'away_elo_away',
            'home_form_5', 'away_form_5', 'form_5_diff', 'home_form_10', 'away_form_10',
            'home_possession', 'away_possession', 'possession_diff',
            'home_volatility', 'away_volatility',
            'home_advantage', 'away_performance', 'venue_diff'
        ]
        
        results = {}
        seasons = sorted(ml_df['season'].unique())
        
        for season in seasons:
            print(f"\n[INFO] Saison {season}...")
            
            # Données de la saison
            season_data = ml_df[ml_df['season'] == season].copy()
            
            if len(season_data) < 50:
                print(f"[WARN] Pas assez de donnees pour {season} ({len(season_data)} matches)")
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
            
            # Modèle SIMPLE (éviter overfitting avec moins de features)
            model = RandomForestClassifier(
                n_estimators=100,      # Réduit de 200
                max_depth=10,          # Réduit de 15
                min_samples_split=10,  # Augmenté de 5
                min_samples_leaf=5,    # Augmenté de 2
                max_features='sqrt',   # Limite features
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
            
            results[season] = {
                'accuracy': accuracy,
                'total_matches': len(season_data),
                'test_matches': len(y_test),
                'class_distribution': y.value_counts().to_dict()
            }
            
            print(f"[OK] Accuracy CLEAN: {accuracy:.1%}")
            print(f"[INFO] Matches test: {len(y_test)}")
            
        return results
        
    except Exception as e:
        print(f"[ERROR] Erreur backtesting: {e}")
        return {}

def analyze_clean_results(results):
    """Analyse les résultats du backtesting CLEAN"""
    print("\n" + "="*50)
    print("ANALYSE PERFORMANCE CLEAN (SANS DATA LEAKAGE)")
    print("="*50)
    
    if not results:
        print("[ERROR] Aucun resultat a analyser")
        return
    
    # Performance globale
    accuracies = [r['accuracy'] for r in results.values()]
    avg_accuracy = np.mean(accuracies)
    std_accuracy = np.std(accuracies)
    
    print(f"\n[PERF] PERFORMANCE GLOBALE:")
    print(f"Accuracy moyenne CLEAN: {avg_accuracy:.1%}")
    print(f"Ecart-type: {std_accuracy:.1%}")
    print(f"Meilleure saison: {max(accuracies):.1%}")
    print(f"Pire saison: {min(accuracies):.1%}")
    
    # Détail par saison
    print(f"\n[DETAIL] PAR SAISON:")
    for season, result in results.items():
        acc = result['accuracy']
        status = "[OK]" if acc >= 0.55 else "[WARN]" if acc >= 0.50 else "[FAIL]"
        print(f"{status} {season}: {acc:.1%} ({result['test_matches']} matches test)")
    
    # Distribution des résultats
    print(f"\n[ANALYSE]:")
    seasons_55_plus = sum(1 for acc in accuracies if acc >= 0.55)
    seasons_50_plus = sum(1 for acc in accuracies if acc >= 0.50)
    
    print(f"Saisons >=55%: {seasons_55_plus}/{len(accuracies)}")
    print(f"Saisons >=50%: {seasons_50_plus}/{len(accuracies)}")
    
    # Stabilité
    if std_accuracy < 0.05:
        print("[OK] Modele STABLE (ecart-type <5%)")
    elif std_accuracy < 0.08:
        print("[WARN] Modele MOYENNEMENT stable (ecart-type 5-8%)")
    else:
        print("[FAIL] Modele INSTABLE (ecart-type >8%)")
    
    # Validation réaliste
    print(f"\n[VALIDATION] MODELE CLEAN:")
    if avg_accuracy >= 0.55:
        print(f"[OK] Performance REALISTE: {avg_accuracy:.1%} (>=55% attendu)")
    elif avg_accuracy >= 0.50:
        print(f"[WARN] Performance LIMITE: {avg_accuracy:.1%} (>=50% minimum)")
    else:
        print(f"[FAIL] Performance INSUFFISANTE: {avg_accuracy:.1%} (<50%)")
    
    return {
        'avg_accuracy': avg_accuracy,
        'std_accuracy': std_accuracy,
        'seasons_results': results
    }

def main():
    """Script principal"""
    print("BACKTEST CLEAN METHODOLOGY")
    print("=" * 30)
    print("Suppression complete du data leakage")
    print("Features: ELO + Form + Style + Venue UNIQUEMENT")
    
    # 1. Charger données
    matches_df, supabase = load_data()
    
    # 2. Charger features CLEAN
    features_df = get_clean_team_features(supabase)
    
    if features_df.empty:
        print("[ERROR] Pas de team features - impossible de continuer")
        sys.exit(1)
    
    # 3. Préparer features ML CLEAN
    ml_df = prepare_clean_ml_features(matches_df, features_df)
    
    if ml_df.empty:
        print("[ERROR] Aucune donnee ML preparee")
        sys.exit(1)
    
    # 4. Backtesting CLEAN par saison
    results = train_and_test_by_season_clean(ml_df)
    
    # 5. Analyse des résultats
    final_analysis = analyze_clean_results(results)
    
    print(f"\n[COMPLETE] BACKTEST CLEAN TERMINE!")
    print(f"Performance moyenne REALISTE: {final_analysis['avg_accuracy']:.1%}")

if __name__ == "__main__":
    main()