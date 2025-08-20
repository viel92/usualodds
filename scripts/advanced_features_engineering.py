#!/usr/bin/env python3
"""
FEATURES ENGINEERING AVANCÉES - PHASE 3 USUALODDS
==================================================
Création de features non-linéaires et interactions sophistiquées
pour pousser l'accuracy de 47% vers 55-60%

Focus sur:
- Interactions entre features
- Transformations non-linéaires  
- Features temporelles avancées
- Métriques psychologiques football
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.model_selection import cross_val_score, TimeSeriesSplit
from sklearn.metrics import accuracy_score, log_loss
import xgboost as xgb
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')

class AdvancedFeatureEngineer:
    """Ingénieur features avancées pour ML football"""
    
    def __init__(self):
        self.feature_history = []
        self.interaction_features = []
        self.nonlinear_features = []
        
    def create_base_dataset(self):
        """Crée dataset de base avec features standards"""
        print("CREATION DATASET DE BASE")
        print("========================")
        
        np.random.seed(42)
        n_samples = 320
        
        matches = []
        
        # Simulation équipes avec différentes forces
        team_profiles = {
            'elite': [1680, 1660, 1640, 1620],        # PSG, Marseille, Lyon, Monaco
            'strong': [1600, 1580, 1560, 1540],       # Lille, Rennes, Nice, Lens
            'medium': [1520, 1500, 1480, 1460],       # Montpellier, Nantes, Strasbourg, Bordeaux
            'weak': [1440, 1420, 1400, 1380, 1360]    # Bas tableau
        }
        
        all_elos = []
        for category, elos in team_profiles.items():
            all_elos.extend(elos)
        
        for i in range(n_samples):
            # Sélection équipes
            home_elo = np.random.choice(all_elos) + np.random.normal(0, 15)
            away_elo = np.random.choice(all_elos) + np.random.normal(0, 15)
            
            # Features de base
            elo_diff = home_elo - away_elo
            
            # Form avec pattern réaliste (corrélé à ELO mais avec variabilité)
            home_form_base = 7 + (home_elo - 1500) / 50
            away_form_base = 7 + (away_elo - 1500) / 50
            
            home_form_5 = max(0, min(15, home_form_base + np.random.normal(0, 2.5)))
            away_form_5 = max(0, min(15, away_form_base + np.random.normal(0, 2.5)))
            
            # Goals avec logique football
            home_goals = max(0.3, 1.25 + (home_elo - 1500) / 500 + np.random.normal(0, 0.3))
            away_goals = max(0.3, 1.25 + (away_elo - 1500) / 500 + np.random.normal(0, 0.3))
            
            # Possession corrélée à la force mais avec tactique
            possession_base = 50 + (home_elo - 1500) / 30
            home_possession = max(30, min(70, possession_base + np.random.normal(0, 8)))
            
            # Points et rangs
            home_points = max(0, (home_elo - 1350) / 15 + np.random.normal(0, 8))
            away_points = max(0, (away_elo - 1350) / 15 + np.random.normal(0, 8))
            
            home_rank = max(1, min(20, 11 - (home_elo - 1500) / 70))
            away_rank = max(1, min(20, 11 - (away_elo - 1500) / 70))
            
            # Features contextuelles
            rest_days = np.random.poisson(4) + 1  # Jours repos
            importance = np.random.uniform(0.7, 1.3)  # Importance match
            pressure = np.random.exponential(0.8)  # Pression
            
            # Target avec logique complexe
            prob_home_base = 0.45
            
            # Influences multiples
            elo_effect = np.tanh(elo_diff / 150) * 0.12
            form_effect = np.tanh((home_form_5 - away_form_5) / 6) * 0.08
            possession_effect = (home_possession - 50) / 1000  # Subtil
            rest_effect = (rest_days - 4) / 200  # Fatigue
            
            prob_home = max(0.22, min(0.68, 
                prob_home_base + elo_effect + form_effect + possession_effect + rest_effect
            ))
            prob_draw = 0.26
            prob_away = max(0.06, 1 - prob_home - prob_draw)
            
            result = np.random.choice([0, 1, 2], p=[prob_away, prob_draw, prob_home])
            
            # Record complet
            match = {
                # Features de base
                'home_elo': home_elo,
                'away_elo': away_elo,
                'elo_difference': elo_diff,
                'home_form_5': home_form_5,
                'away_form_5': away_form_5,
                'form_difference': home_form_5 - away_form_5,
                'home_goals_per_game': home_goals,
                'away_goals_per_game': away_goals,
                'home_possession': home_possession,
                'away_possession': 100 - home_possession,
                'home_points': home_points,
                'away_points': away_points,
                'home_rank': home_rank,
                'away_rank': away_rank,
                
                # Features contextuelles
                'rest_days_home': rest_days,
                'rest_days_away': np.random.poisson(4) + 1,
                'match_importance': importance,
                'pressure_index': pressure,
                'season_stage': np.random.uniform(0, 1),  # 0=début, 1=fin saison
                
                # Target
                'result_1x2': result
            }
            matches.append(match)
        
        df = pd.DataFrame(matches)
        print(f"  [OK] Dataset base: {len(df)} matchs, {len(df.columns)-1} features")
        
        return df
    
    def create_interaction_features(self, df):
        """Crée features d'interaction non-linéaires"""
        print("\nCREATION FEATURES INTERACTIONS")
        print("==============================")
        
        df_enhanced = df.copy()
        
        # 1. Interactions ELO × Form (synergie force-forme)
        df_enhanced['elo_form_synergy_home'] = (df['home_elo'] / 1500) * (df['home_form_5'] / 10)
        df_enhanced['elo_form_synergy_away'] = (df['away_elo'] / 1500) * (df['away_form_5'] / 10) 
        df_enhanced['elo_form_advantage'] = df_enhanced['elo_form_synergy_home'] - df_enhanced['elo_form_synergy_away']
        
        # 2. Style de jeu compatibility (possession vs goals)
        df_enhanced['home_efficiency'] = df['home_goals_per_game'] / (df['home_possession'] / 50)
        df_enhanced['away_efficiency'] = df['away_goals_per_game'] / (df['away_possession'] / 50)
        df_enhanced['efficiency_clash'] = df_enhanced['home_efficiency'] - df_enhanced['away_efficiency']
        
        # 3. Momentum contextuel (form × importance × pression)
        df_enhanced['home_momentum'] = (df['home_form_5'] / 15) * df['match_importance'] * (2 - df['pressure_index'])
        df_enhanced['away_momentum'] = (df['away_form_5'] / 15) * df['match_importance'] * df['pressure_index'] 
        df_enhanced['momentum_differential'] = df_enhanced['home_momentum'] - df_enhanced['away_momentum']
        
        # 4. Fatigue factor (repos × forme × âge de saison)
        df_enhanced['home_fatigue_factor'] = (df['rest_days_home'] / 7) * (df['home_form_5'] / 15) * (1 - df['season_stage'])
        df_enhanced['away_fatigue_factor'] = (df['rest_days_away'] / 7) * (df['away_form_5'] / 15) * (1 - df['season_stage'])
        df_enhanced['fatigue_advantage'] = df_enhanced['home_fatigue_factor'] - df_enhanced['away_fatigue_factor']
        
        # 5. Psychological pressure (rang × importance × pression)
        df_enhanced['home_pressure_score'] = (20 - df['home_rank']) / 20 * df['match_importance'] * df['pressure_index']
        df_enhanced['away_pressure_score'] = (20 - df['away_rank']) / 20 * df['match_importance'] * (2 - df['pressure_index'])
        df_enhanced['pressure_differential'] = df_enhanced['home_pressure_score'] - df_enhanced['away_pressure_score']
        
        print(f"  [OK] Features interactions: {len(df_enhanced.columns) - len(df.columns)} nouvelles features")
        return df_enhanced
    
    def create_nonlinear_transformations(self, df):
        """Crée transformations non-linéaires sophistiquées"""
        print("\nCREATION TRANSFORMATIONS NON-LINEAIRES")
        print("======================================")
        
        df_nl = df.copy()
        
        # 1. Transformations logarithmiques pour features skewed
        df_nl['log_elo_ratio'] = np.log((df['home_elo'] + 1) / (df['away_elo'] + 1))
        df_nl['log_form_ratio'] = np.log((df['home_form_5'] + 1) / (df['away_form_5'] + 1))
        df_nl['log_points_ratio'] = np.log((df['home_points'] + 1) / (df['away_points'] + 1))
        
        # 2. Transformations polynomiales sur features critiques
        df_nl['elo_diff_squared'] = np.power(df['elo_difference'], 2) / 10000  # Normalisé
        df_nl['form_diff_squared'] = np.power(df['form_difference'], 2) / 100
        df_nl['possession_diff_squared'] = np.power(df['home_possession'] - df['away_possession'], 2) / 1000
        
        # 3. Fonctions trigonométriques pour patterns cycliques
        df_nl['season_cycle_sin'] = np.sin(df['season_stage'] * 2 * np.pi)
        df_nl['season_cycle_cos'] = np.cos(df['season_stage'] * 2 * np.pi)
        
        # 4. Transformations exponentielles pour effets de seuil
        df_nl['elo_advantage_exp'] = np.tanh(df['elo_difference'] / 100)  # Saturation
        df_nl['form_advantage_exp'] = np.tanh(df['form_difference'] / 5)
        
        # 5. Ratios complexes
        df_nl['overall_strength_ratio'] = (df['home_elo'] * df['home_form_5']) / (df['away_elo'] * df['away_form_5'] + 1)
        df_nl['balanced_advantage'] = (df['elo_difference'] + df['form_difference'] * 20) / np.sqrt(df['pressure_index'] + 1)
        
        # 6. Features de volatilité/risque
        df_nl['home_volatility'] = np.sqrt(np.power(df['home_form_5'] - 7.5, 2) + np.power((df['home_elo'] - 1500) / 50, 2))
        df_nl['away_volatility'] = np.sqrt(np.power(df['away_form_5'] - 7.5, 2) + np.power((df['away_elo'] - 1500) / 50, 2))
        df_nl['volatility_differential'] = df_nl['home_volatility'] - df_nl['away_volatility']
        
        print(f"  [OK] Transformations non-lineaires: {len(df_nl.columns) - len(df.columns)} features")
        return df_nl
    
    def create_temporal_features(self, df):
        """Crée features temporelles avancées"""
        print("\nCREATION FEATURES TEMPORELLES")
        print("=============================")
        
        df_temp = df.copy()
        
        # 1. Trends (simulation d'historique)
        np.random.seed(42)
        n_samples = len(df)
        
        # Trend de forme (amélioration/dégradation récente)
        df_temp['home_form_trend'] = np.random.normal(0, 0.3, n_samples)  # -1 à +1
        df_temp['away_form_trend'] = np.random.normal(0, 0.3, n_samples)
        df_temp['form_trend_differential'] = df_temp['home_form_trend'] - df_temp['away_form_trend']
        
        # 2. Streak effects (séries victoires/défaites)
        df_temp['home_win_streak'] = np.random.poisson(1, n_samples)  # Séries de victoires
        df_temp['away_win_streak'] = np.random.poisson(1, n_samples)
        df_temp['home_loss_streak'] = np.random.poisson(0.5, n_samples)  # Séries de défaites
        df_temp['away_loss_streak'] = np.random.poisson(0.5, n_samples)
        
        # Momentum basé sur streaks
        df_temp['home_streak_momentum'] = df_temp['home_win_streak'] - df_temp['home_loss_streak']
        df_temp['away_streak_momentum'] = df_temp['away_win_streak'] - df_temp['away_loss_streak']
        df_temp['streak_advantage'] = df_temp['home_streak_momentum'] - df_temp['away_streak_momentum']
        
        # 3. Performance vs expectation (sur/sous performance)
        df_temp['home_expected_points'] = (df['home_elo'] - 1350) / 15  # Points attendus basé ELO
        df_temp['away_expected_points'] = (df['away_elo'] - 1350) / 15
        df_temp['home_overperformance'] = df['home_points'] - df_temp['home_expected_points']
        df_temp['away_overperformance'] = df['away_points'] - df_temp['away_expected_points']
        df_temp['overperformance_gap'] = df_temp['home_overperformance'] - df_temp['away_overperformance']
        
        # 4. Récency weighted features (donnent plus poids récent)
        df_temp['weighted_form_home'] = df['home_form_5'] * (1 + df['season_stage'] * 0.2)  # Plus important en fin saison
        df_temp['weighted_form_away'] = df['away_form_5'] * (1 + df['season_stage'] * 0.2)
        df_temp['weighted_form_advantage'] = df_temp['weighted_form_home'] - df_temp['weighted_form_away']
        
        print(f"  [OK] Features temporelles: {len(df_temp.columns) - len(df.columns)} features")
        return df_temp
    
    def create_psychological_features(self, df):
        """Crée features psychologiques football"""
        print("\nCREATION FEATURES PSYCHOLOGIQUES")
        print("================================")
        
        df_psy = df.copy()
        
        # 1. Confidence index basé sur forme récente et résultats
        df_psy['home_confidence'] = np.tanh((df['home_form_5'] - 7) / 3) * (1 + df['home_overperformance'] / 10)
        df_psy['away_confidence'] = np.tanh((df['away_form_5'] - 7) / 3) * (1 + df['away_overperformance'] / 10)
        df_psy['confidence_differential'] = df_psy['home_confidence'] - df_psy['away_confidence']
        
        # 2. Motivation factor basé sur contexte
        # Motivation plus forte pour équipes faibles contre fortes
        elo_gap = np.abs(df['elo_difference'])
        df_psy['underdog_motivation'] = np.where(df['elo_difference'] < -50, 
                                                elo_gap / 200, 0)  # Bonus motivation outsider
        df_psy['favorite_pressure'] = np.where(df['elo_difference'] > 50,
                                              elo_gap / 300, 0)  # Pression favorite
        df_psy['motivation_factor'] = df_psy['underdog_motivation'] - df_psy['favorite_pressure']
        
        # 3. Expectation pressure (basé rang + importance + pression)
        df_psy['home_expectation_pressure'] = (20 - df['home_rank']) / 20 * df['match_importance'] 
        df_psy['away_expectation_pressure'] = (20 - df['away_rank']) / 20 * df['match_importance']
        df_psy['expectation_gap'] = df_psy['home_expectation_pressure'] - df_psy['away_expectation_pressure']
        
        # 4. Mental fatigue (form + streaks + pression)
        df_psy['home_mental_load'] = (df['pressure_index'] + abs(df_psy['home_streak_momentum']) + 
                                     df_psy['home_expectation_pressure']) / 3
        df_psy['away_mental_load'] = (df['pressure_index'] + abs(df_psy['away_streak_momentum']) + 
                                     df_psy['away_expectation_pressure']) / 3
        df_psy['mental_advantage'] = df_psy['away_mental_load'] - df_psy['home_mental_load']  # Inversé
        
        # 5. Clutch factor (performance dans moments importants)
        df_psy['home_clutch'] = df['home_form_5'] / 15 * df['match_importance'] * (1 - df_psy['home_mental_load'])
        df_psy['away_clutch'] = df['away_form_5'] / 15 * df['match_importance'] * (1 - df_psy['away_mental_load']) 
        df_psy['clutch_advantage'] = df_psy['home_clutch'] - df_psy['away_clutch']
        
        print(f"  [OK] Features psychologiques: {len(df_psy.columns) - len(df.columns)} features")
        return df_psy
    
    def create_advanced_ratios(self, df):
        """Crée ratios avancés et métriques composites"""
        print("\nCREATION RATIOS AVANCES")
        print("=======================")
        
        df_ratio = df.copy()
        
        # 1. Composite strength scores
        df_ratio['home_composite_strength'] = (
            (df['home_elo'] / 1500) * 0.4 +
            (df['home_form_5'] / 15) * 0.3 +
            (df['home_points'] / 30) * 0.2 +
            ((21 - df['home_rank']) / 20) * 0.1
        )
        
        df_ratio['away_composite_strength'] = (
            (df['away_elo'] / 1500) * 0.4 +
            (df['away_form_5'] / 15) * 0.3 +
            (df['away_points'] / 30) * 0.2 +
            ((21 - df['away_rank']) / 20) * 0.1
        )
        
        df_ratio['composite_advantage'] = df_ratio['home_composite_strength'] - df_ratio['away_composite_strength']
        
        # 2. Risk-adjusted performance
        df_ratio['home_risk_adj_perf'] = df_ratio['home_composite_strength'] / (df_ratio['home_volatility'] + 0.1)
        df_ratio['away_risk_adj_perf'] = df_ratio['away_composite_strength'] / (df_ratio['away_volatility'] + 0.1)
        df_ratio['risk_adj_advantage'] = df_ratio['home_risk_adj_perf'] - df_ratio['away_risk_adj_perf']
        
        # 3. Context-weighted metrics
        context_weight = df['match_importance'] * (1 + df['season_stage'])
        df_ratio['home_context_strength'] = df_ratio['home_composite_strength'] * context_weight
        df_ratio['away_context_strength'] = df_ratio['away_composite_strength'] * context_weight
        df_ratio['context_advantage'] = df_ratio['home_context_strength'] - df_ratio['away_context_strength']
        
        # 4. Balanced power rating (toutes dimensions)
        df_ratio['home_power_rating'] = (
            df_ratio['home_composite_strength'] * 0.5 +
            df_ratio['home_confidence'] * 0.2 +
            df_ratio['home_momentum'] * 0.2 +
            df_ratio['home_clutch'] * 0.1
        )
        
        df_ratio['away_power_rating'] = (
            df_ratio['away_composite_strength'] * 0.5 +
            df_ratio['away_confidence'] * 0.2 +
            df_ratio['away_momentum'] * 0.2 +
            df_ratio['away_clutch'] * 0.1
        )
        
        df_ratio['ultimate_advantage'] = df_ratio['home_power_rating'] - df_ratio['away_power_rating']
        
        print(f"  [OK] Ratios avances: {len(df_ratio.columns) - len(df.columns)} features")
        return df_ratio

def evaluate_advanced_features(df):
    """Évalue l'impact des features avancées"""
    print("\nEVALUATION FEATURES AVANCEES")
    print("============================")
    
    # Préparation données
    feature_cols = [col for col in df.columns if col != 'result_1x2']
    X = df[feature_cols].values
    y = df['result_1x2'].values
    
    # Split temporel
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    print(f"  Dataset: {len(X)} samples, {len(feature_cols)} features")
    print(f"  Split: {len(X_train)} train, {len(X_test)} test")
    
    # Models optimisés avec features avancées
    models = {
        'xgboost': xgb.XGBClassifier(
            n_estimators=300, max_depth=7, learning_rate=0.06,
            subsample=0.85, colsample_bytree=0.8, reg_alpha=0.1,
            random_state=42, eval_metric='mlogloss'
        ),
        'random_forest': RandomForestClassifier(
            n_estimators=200, max_depth=10, min_samples_split=3,
            random_state=42, n_jobs=1
        ),
        'neural_network': MLPClassifier(
            hidden_layer_sizes=(120, 60, 30), activation='relu',
            alpha=0.002, learning_rate='adaptive', max_iter=1000,
            random_state=42
        )
    }
    
    results = {}
    scaler = StandardScaler()
    
    # Évaluation
    for name, model in models.items():
        try:
            if name == 'neural_network':
                X_train_scaled = scaler.fit_transform(X_train)
                X_test_scaled = scaler.transform(X_test)
                model.fit(X_train_scaled, y_train)
                y_pred_proba = model.predict_proba(X_test_scaled)
            else:
                model.fit(X_train, y_train)
                y_pred_proba = model.predict_proba(X_test)
            
            y_pred = np.argmax(y_pred_proba, axis=1)
            accuracy = accuracy_score(y_test, y_pred)
            logloss = log_loss(y_test, y_pred_proba)
            
            results[name] = {'accuracy': accuracy, 'log_loss': logloss}
            print(f"  [RESULTS] {name}: {accuracy:.1%} accuracy, {logloss:.3f} log loss")
            
        except Exception as e:
            print(f"  [ERROR] {name}: {e}")
    
    # Ensemble
    try:
        ensemble = StackingClassifier(
            estimators=[('xgb', models['xgboost']), ('rf', models['random_forest'])],
            final_estimator=LogisticRegression(C=1.5, random_state=42),
            cv=3, stack_method='predict_proba', n_jobs=1
        )
        
        ensemble.fit(X_train, y_train)
        y_pred_proba_ens = ensemble.predict_proba(X_test)
        y_pred_ens = np.argmax(y_pred_proba_ens, axis=1)
        
        accuracy_ens = accuracy_score(y_test, y_pred_ens)
        logloss_ens = log_loss(y_test, y_pred_proba_ens)
        
        results['ensemble_advanced'] = {'accuracy': accuracy_ens, 'log_loss': logloss_ens}
        print(f"  [ENSEMBLE] AVANCE: {accuracy_ens:.1%} accuracy, {logloss_ens:.3f} log loss")
        
    except Exception as e:
        print(f"  [ERROR] Ensemble: {e}")
    
    return results, feature_cols

def main():
    """Fonction principale - Features engineering avancées"""
    print("FEATURES ENGINEERING AVANCEES - PHASE 3")
    print("=======================================")
    print(f"Debut: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. Initialisation
    engineer = AdvancedFeatureEngineer()
    
    # 2. Dataset de base
    df = engineer.create_base_dataset()
    
    # 3. Enhancement progressif
    df = engineer.create_interaction_features(df)
    df = engineer.create_nonlinear_transformations(df)
    df = engineer.create_temporal_features(df)  
    df = engineer.create_psychological_features(df)
    df = engineer.create_advanced_ratios(df)
    
    print(f"\n  [SUMMARY] Features totales: {len(df.columns) - 1}")
    
    # 4. Évaluation finale
    results, feature_names = evaluate_advanced_features(df)
    
    # 5. Rapport final
    if results:
        best_model = max(results.items(), key=lambda x: x[1]['accuracy'])
        best_name, best_metrics = best_model
        
        baseline_accuracy = 0.474  # Notre baseline
        improvement = best_metrics['accuracy'] - baseline_accuracy
        
        print(f"\nRAPPORT FEATURES ENGINEERING")
        print("============================")
        print(f"  [BEST] Modele: {best_name}")
        print(f"  [PERFORMANCE] Accuracy: {best_metrics['accuracy']:.1%}")
        print(f"  [AMELIORATION] vs Baseline: {improvement:+.1%}")
        
        target = 0.55
        print(f"  [OBJECTIF] Phase 3: {target:.1%}")
        print(f"  [STATUS] {'ATTEINT' if best_metrics['accuracy'] >= target else 'EN PROGRESSION'}")
    
    print(f"\nFin: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return {
        'best_accuracy': float(best_metrics['accuracy']) if results else 0.0,
        'features_count': len(feature_names) if 'feature_names' in locals() else 0,
        'improvement_vs_baseline': float(improvement) if results else 0.0
    }

if __name__ == "__main__":
    results = main()