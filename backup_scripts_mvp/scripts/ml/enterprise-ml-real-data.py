#!/usr/bin/env python3
"""
🚀 ENTERPRISE ML SYSTEM - VRAIES DONNÉES USUALODDS
==================================================
Version PRODUCTION utilisant nos vraies données Supabase 2020-2024
+ ELO, Form, Possession, Volatilité calculés
Target: 65%+ accuracy avec architecture ML optimisée

Phase 2 Roadmap MVP Stable
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, log_loss, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split, cross_val_score
import xgboost as xgb
from datetime import datetime
import warnings
import os
from supabase import create_client, Client

warnings.filterwarnings('ignore')

class UsualOddsMLEnterprise:
    """Système ML Enterprise UsualOdds avec vraies données Supabase"""
    
    def __init__(self):
        """Initialisation avec vraies credentials Supabase"""
        print("INITIALISATION USUALODDS ML ENTERPRISE")
        print("=========================================")
        
        # Configuration Supabase PRODUCTION (SERVICE_ROLE_KEY pour accès complet)
        from dotenv import load_dotenv
        load_dotenv()
        
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Variables SUPABASE manquantes dans .env")
            
        self.supabase = create_client(self.supabase_url, self.supabase_key)
        print("  Connexion Supabase SERVICE_ROLE etablie")
        
        # Containers pour données
        self.matches_df = None
        self.team_features_df = None 
        self.match_statistics_df = None
        self.ml_dataset = None
        
        # Modèles
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.models = {}
        self.ensemble_model = None
        
    def extract_real_data(self):
        """Extraction COMPLÈTE des vraies données Supabase"""
        print("\nEXTRACTION VRAIES DONNEES 2020-2024")
        print("======================================")
        
        # 1. MATCHES avec PAGINATION COMPLÈTE (1760 records attendus)
        print("  Extraction matches avec pagination...")
        
        all_matches = []
        page = 0
        page_size = 500
        
        while True:
            offset = page * page_size
            print(f"    Page {page + 1}: offset {offset}...")
            
            matches_response = self.supabase.table('matches').select(
                'id, season, home_team_id, away_team_id, home_team_name, away_team_name, '
                'home_score, away_score, date, status'
            ).range(offset, offset + page_size - 1).execute()
            
            if not matches_response.data or len(matches_response.data) == 0:
                break
                
            all_matches.extend(matches_response.data)
            print(f"      {len(matches_response.data)} records (total: {len(all_matches)})")
            page += 1
            
            if len(matches_response.data) < page_size:
                break
        
        self.matches_df = pd.DataFrame(all_matches)
        # Filtrer matches avec scores valides
        self.matches_df = self.matches_df.dropna(subset=['home_score', 'away_score'])
        print(f"    TOTAL: {len(all_matches)} matches extraits")
        print(f"    UTILISABLES: {len(self.matches_df)} matches (avec scores)")
        
        # 2. TEAM_FEATURES avec PAGINATION COMPLÈTE
        print("  Extraction team features (ELO, Form, Volatilite)...")
        
        all_features = []
        page = 0
        page_size = 200
        
        while True:
            offset = page * page_size
            
            features_response = self.supabase.table('team_features').select(
                'team_id, season, elo_rating, elo_home, elo_away, '
                'form_5_points, form_10_points, possession_avg, volatility_index, '
                'points, wins, draws, losses, goals_for, goals_against, goal_difference'
            ).range(offset, offset + page_size - 1).execute()
            
            if not features_response.data or len(features_response.data) == 0:
                break
                
            all_features.extend(features_response.data)
            page += 1
            
            if len(features_response.data) < page_size:
                break
        
        self.team_features_df = pd.DataFrame(all_features)
        print(f"    {len(self.team_features_df)} team-features extraites")
        
        # 3. MATCH_STATISTICS avec PAGINATION COMPLÈTE
        print("  Extraction match statistics (possession, shots, etc)...")
        
        all_stats = []
        page = 0
        page_size = 300
        
        while True:
            offset = page * page_size
            
            stats_response = self.supabase.table('match_statistics').select(
                'match_id, team_id, ball_possession, total_shots, shots_on_goal, '
                'expected_goals, total_passes, passes_accurate, fouls, yellow_cards'
            ).range(offset, offset + page_size - 1).execute()
            
            if not stats_response.data or len(stats_response.data) == 0:
                break
                
            all_stats.extend(stats_response.data)
            page += 1
            
            if len(stats_response.data) < page_size:
                break
        
        self.match_statistics_df = pd.DataFrame(all_stats)
        # Filtrer statistics avec possession valide
        self.match_statistics_df = self.match_statistics_df.dropna(subset=['ball_possession'])
        print(f"    TOTAL: {len(all_stats)} match-statistics extraites")
        print(f"    UTILISABLES: {len(self.match_statistics_df)} (avec possession)")
        
        return True
        
    def create_ml_dataset(self):
        """Création dataset ML avec feature engineering avancé"""
        print("\nCREATION DATASET ML ENTERPRISE")
        print("=================================")
        
        if self.matches_df is None:
            raise ValueError("Données non extraites - appeler extract_real_data()")
            
        # Préparer dataset matches avec features
        ml_data = []
        
        for idx, match in self.matches_df.iterrows():
            # Résultat du match (target)
            if match['home_score'] > match['away_score']:
                result = 'H'  # Home win
            elif match['home_score'] < match['away_score']:
                result = 'A'  # Away win  
            else:
                result = 'D'  # Draw
                
            # Features équipe domicile
            home_features = self.team_features_df[
                (self.team_features_df['team_id'] == match['home_team_id']) & 
                (self.team_features_df['season'] == match['season'])
            ]
            
            # Features équipe extérieur
            away_features = self.team_features_df[
                (self.team_features_df['team_id'] == match['away_team_id']) & 
                (self.team_features_df['season'] == match['season'])
            ]
            
            # Vérifier que les features existent
            if len(home_features) == 0 or len(away_features) == 0:
                continue
                
            home_feat = home_features.iloc[0]
            away_feat = away_features.iloc[0]
            
            # Construction record ML
            record = {
                'match_id': match['id'],
                'season': match['season'],
                'result': result,
                
                # Features ELO
                'home_elo': home_feat.get('elo_rating', 1500),
                'away_elo': away_feat.get('elo_rating', 1500), 
                'elo_diff': home_feat.get('elo_rating', 1500) - away_feat.get('elo_rating', 1500),
                'home_elo_home': home_feat.get('elo_home', 1500),
                'away_elo_away': away_feat.get('elo_away', 1500),
                
                # Features Form
                'home_form_5': home_feat.get('form_5_points', 7),
                'away_form_5': away_feat.get('form_5_points', 7),
                'form_5_diff': home_feat.get('form_5_points', 7) - away_feat.get('form_5_points', 7),
                'home_form_10': home_feat.get('form_10_points', 14),
                'away_form_10': away_feat.get('form_10_points', 14),
                
                # Features Performance
                'home_goals_per_game': home_feat.get('goals_for', 30) / max(1, home_feat.get('wins', 1) + home_feat.get('draws', 1) + home_feat.get('losses', 1)),
                'away_goals_per_game': away_feat.get('goals_for', 30) / max(1, away_feat.get('wins', 1) + away_feat.get('draws', 1) + away_feat.get('losses', 1)),
                'home_goals_against_per_game': home_feat.get('goals_against', 30) / max(1, home_feat.get('wins', 1) + home_feat.get('draws', 1) + home_feat.get('losses', 1)),
                'away_goals_against_per_game': away_feat.get('goals_against', 30) / max(1, away_feat.get('wins', 1) + away_feat.get('draws', 1) + away_feat.get('losses', 1)),
                
                # Features Volatilité & Possession
                'home_volatility': home_feat.get('volatility_index', 1.0),
                'away_volatility': away_feat.get('volatility_index', 1.0),
                'home_possession': home_feat.get('possession_avg', 50),
                'away_possession': away_feat.get('possession_avg', 50),
                
                # Features Contextuelles
                'points_diff': home_feat.get('points', 30) - away_feat.get('points', 30),
                'goal_diff_combined': home_feat.get('goal_difference', 0) - away_feat.get('goal_difference', 0),
            }
            
            ml_data.append(record)
            
        self.ml_dataset = pd.DataFrame(ml_data)
        print(f"  Dataset ML cree: {len(self.ml_dataset)} matches")
        print(f"  Distribution resultats:")
        print(f"    - Victoires domicile: {len(self.ml_dataset[self.ml_dataset['result'] == 'H'])}")
        print(f"    - Victoires extérieur: {len(self.ml_dataset[self.ml_dataset['result'] == 'A'])}") 
        print(f"    - Matchs nuls: {len(self.ml_dataset[self.ml_dataset['result'] == 'D'])}")
        
        return self.ml_dataset
        
    def prepare_features_and_target(self):
        """Préparation features et target pour ML"""
        print("\nPREPARATION FEATURES & TARGET")
        print("===============================")
        
        if self.ml_dataset is None:
            raise ValueError("Dataset ML non créé")
            
        # Features numériques
        feature_columns = [
            'home_elo', 'away_elo', 'elo_diff', 'home_elo_home', 'away_elo_away',
            'home_form_5', 'away_form_5', 'form_5_diff', 'home_form_10', 'away_form_10',
            'home_goals_per_game', 'away_goals_per_game', 'home_goals_against_per_game', 'away_goals_against_per_game',
            'home_volatility', 'away_volatility', 'home_possession', 'away_possession',
            'points_diff', 'goal_diff_combined'
        ]
        
        X = self.ml_dataset[feature_columns].fillna(0)  # Remplacer NaN par 0
        y = self.ml_dataset['result']
        
        print(f"  Features: {X.shape[1]} colonnes, {X.shape[0]} echantillons")
        print(f"  Target: {len(y.unique())} classes {list(y.unique())}")
        
        # Normalisation features
        X_scaled = self.scaler.fit_transform(X)
        
        # Encodage target
        y_encoded = self.label_encoder.fit_transform(y)
        
        return X_scaled, y_encoded, feature_columns
        
    def train_enterprise_models(self, X, y):
        """Entraînement ensemble de modèles enterprise"""
        print("\nENTRAINEMENT MODELES ENTERPRISE")
        print("=================================")
        
        # Split train/test temporel (2020-2023 train, 2024 test)
        train_mask = self.ml_dataset['season'] <= 2023
        test_mask = self.ml_dataset['season'] == 2024
        
        X_train, X_test = X[train_mask], X[test_mask]
        y_train, y_test = y[train_mask], y[test_mask]
        
        print(f"  Train: {X_train.shape[0]} matches | Test: {X_test.shape[0]} matches")
        
        # Modèles individuels OPTIMISÉS pour 3 classes (H/A/D)
        models = {
            'RandomForest': RandomForestClassifier(
                n_estimators=300, max_depth=15, min_samples_split=8,
                min_samples_leaf=2, class_weight='balanced',  # Améliore prédiction nuls
                random_state=42, n_jobs=-1
            ),
            'XGBoost': xgb.XGBClassifier(
                n_estimators=200, max_depth=10, learning_rate=0.08,
                subsample=0.8, colsample_bytree=0.8,
                scale_pos_weight=1,  # Équilibrage classes
                random_state=42, n_jobs=-1
            ),
            'MLP': MLPClassifier(
                hidden_layer_sizes=(150, 100, 50), max_iter=800,
                learning_rate_init=0.001, alpha=0.01,  # Régularisation
                random_state=42
            )
        }
        
        # Entraînement et évaluation
        model_scores = {}
        
        for name, model in models.items():
            print(f"\n  Entrainement {name}...")
            model.fit(X_train, y_train)
            
            train_score = model.score(X_train, y_train)
            test_score = model.score(X_test, y_test)
            
            print(f"    Train Accuracy: {train_score:.3f}")
            print(f"    Test Accuracy: {test_score:.3f}")
            
            self.models[name] = model
            model_scores[name] = test_score
            
        # Ensemble Stacking
        print(f"\n  Creation Ensemble Stacking...")
        base_models = [(name, model) for name, model in self.models.items()]
        
        self.ensemble_model = StackingClassifier(
            estimators=base_models,
            final_estimator=LogisticRegression(random_state=42),
            cv=5
        )
        
        self.ensemble_model.fit(X_train, y_train)
        
        ensemble_train = self.ensemble_model.score(X_train, y_train)
        ensemble_test = self.ensemble_model.score(X_test, y_test)
        
        print(f"    Ensemble Train: {ensemble_train:.3f}")
        print(f"    Ensemble Test: {ensemble_test:.3f}")
        
        # Prédictions détaillées
        y_pred = self.ensemble_model.predict(X_test)
        y_true_labels = self.label_encoder.inverse_transform(y_test)
        y_pred_labels = self.label_encoder.inverse_transform(y_pred)
        
        print(f"\n  RAPPORT CLASSIFICATION FINAL:")
        print("  " + "="*35)
        print(classification_report(y_true_labels, y_pred_labels, target_names=['Away', 'Draw', 'Home']))
        
        return ensemble_test, model_scores
        
    def run_full_pipeline(self):
        """Exécution pipeline ML complet"""
        print("DEMARRAGE PIPELINE ML USUALODDS ENTERPRISE")
        print("=" * 50)
        
        try:
            # 1. Extraction données
            self.extract_real_data()
            
            # 2. Création dataset ML
            self.create_ml_dataset()
            
            # 3. Préparation features
            X, y, feature_names = self.prepare_features_and_target()
            
            # 4. Entraînement modèles
            ensemble_accuracy, individual_scores = self.train_enterprise_models(X, y)
            
            # 5. Résultats finaux
            print(f"\nRESULTATS FINAUX USUALODDS ML")
            print("=" * 35)
            print(f"  Ensemble Accuracy: {ensemble_accuracy:.1%}")
            print(f"  Modeles individuels:")
            for model, score in individual_scores.items():
                print(f"    - {model}: {score:.1%}")
                
            target_reached = ensemble_accuracy >= 0.60
            print(f"\n  Target 60%+: {'ATTEINT' if target_reached else 'EN COURS'}")
            
            if ensemble_accuracy >= 0.65:
                print("  EXCELLENT! Pret pour production MVP")
            elif ensemble_accuracy >= 0.55:
                print("  BON! Optimisation possible")
            else:
                print("  Ajustements necessaires")
                
            return ensemble_accuracy
            
        except Exception as e:
            print(f"ERREUR PIPELINE: {e}")
            import traceback
            traceback.print_exc()
            return None

if __name__ == "__main__":
    # Exécution
    ml_system = UsualOddsMLEnterprise()
    final_accuracy = ml_system.run_full_pipeline()
    
    if final_accuracy:
        print(f"\nPIPELINE TERMINE - Accuracy: {final_accuracy:.1%}")
    else:
        print("\nPIPELINE ECHOUE")