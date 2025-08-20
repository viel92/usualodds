#!/usr/bin/env python3
"""
OPTIMISATION RAPIDE - PHASE 3 USUALODDS
=======================================
Version rapide de l'optimisation pour obtenir des résultats immédiats
Moins de trials mais focus sur les paramètres critiques
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import cross_val_score, TimeSeriesSplit
from sklearn.metrics import accuracy_score, log_loss
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')

def load_optimized_data():
    """Charge données optimisées pour test rapide"""
    print("CHARGEMENT DONNEES OPTIMISEES")
    print("=============================")
    
    np.random.seed(123)
    n_samples = 280  # Dataset réaliste
    
    # Features avec patterns réalistes football
    matches = []
    
    # Équipes avec ELO différenciés (simulation Ligue 1)
    top_teams = [1650, 1630, 1610, 1590]     # PSG, Marseille, Lyon, Monaco
    mid_teams = [1550, 1530, 1510, 1490, 1470, 1450]  # Milieu tableau
    low_teams = [1420, 1400, 1380, 1360, 1340, 1320]  # Bas tableau
    
    all_elos = top_teams + mid_teams + low_teams
    
    for i in range(n_samples):
        # Sélection équipes avec probabilité réaliste
        home_elo = np.random.choice(all_elos) + np.random.normal(0, 20)
        away_elo = np.random.choice(all_elos) + np.random.normal(0, 20)
        
        elo_diff = home_elo - away_elo
        
        # Features corrélées intelligemment
        home_form = max(0, 7 + (home_elo - 1500) / 60 + np.random.normal(0, 2))
        away_form = max(0, 7 + (away_elo - 1500) / 60 + np.random.normal(0, 2))
        
        home_goals = max(0.5, 1.3 + (home_elo - 1500) / 600 + np.random.normal(0, 0.25))
        away_goals = max(0.5, 1.3 + (away_elo - 1500) / 600 + np.random.normal(0, 0.25))
        
        home_possession = max(35, min(65, 50 + (home_elo - 1500) / 25 + np.random.normal(0, 8)))
        
        home_points = max(0, (home_elo - 1350) / 12 + np.random.normal(0, 6))
        away_points = max(0, (away_elo - 1350) / 12 + np.random.normal(0, 6))
        
        # Target avec logique football réaliste
        prob_home_base = 0.46  # Avantage domicile
        elo_effect = np.tanh(elo_diff / 180) * 0.12
        form_effect = np.tanh((home_form - away_form) / 8) * 0.06
        
        prob_home = max(0.25, min(0.68, prob_home_base + elo_effect + form_effect))
        prob_draw = 0.26
        prob_away = max(0.06, 1 - prob_home - prob_draw)
        
        result = np.random.choice([0, 1, 2], p=[prob_away, prob_draw, prob_home])
        
        # Record complet
        match = {
            'home_elo': home_elo,
            'away_elo': away_elo,
            'elo_difference': elo_diff,
            'home_form_5': home_form,
            'away_form_5': away_form,
            'form_difference': home_form - away_form,
            'home_goals_per_game': home_goals,
            'away_goals_per_game': away_goals,
            'goals_difference': home_goals - away_goals,
            'home_possession': home_possession,
            'away_possession': 100 - home_possession,
            'possession_difference': 2 * home_possession - 100,
            'home_points': home_points,
            'away_points': away_points,
            'points_difference': home_points - away_points,
            'home_rank': max(1, min(20, 11 - (home_elo - 1500) / 55)),
            'away_rank': max(1, min(20, 11 - (away_elo - 1500) / 55)),
            'rank_advantage': max(1, min(20, 11 - (away_elo - 1500) / 55)) - max(1, min(20, 11 - (home_elo - 1500) / 55)),
            'home_advantage': 0.54 + np.random.normal(0, 0.06),
            'away_performance': 0.46 + np.random.normal(0, 0.06),
            'motivation': np.random.uniform(0.85, 1.15),
            'result_1x2': result
        }
        matches.append(match)
    
    df = pd.DataFrame(matches)
    
    print(f"  [OK] Dataset: {len(df)} matchs")
    print(f"  [OK] Features: {len(df.columns) - 1}")
    
    # Distribution
    dist = df['result_1x2'].value_counts().sort_index()
    print(f"  [DISTRIBUTION] Away:{dist[0]} Draw:{dist[1]} Home:{dist[2]}")
    
    return df

def quick_optimize_xgboost(X_train, y_train):
    """Optimisation rapide XGBoost avec les paramètres les plus critiques"""
    print("\nOPTIMISATION RAPIDE XGBOOST")
    print("===========================")
    
    best_score = -np.inf
    best_params = None
    
    # Grid restreint aux paramètres critiques
    param_combinations = [
        {'n_estimators': 250, 'max_depth': 6, 'learning_rate': 0.08, 'subsample': 0.85},
        {'n_estimators': 300, 'max_depth': 7, 'learning_rate': 0.06, 'subsample': 0.90},
        {'n_estimators': 350, 'max_depth': 8, 'learning_rate': 0.05, 'subsample': 0.80},
        {'n_estimators': 280, 'max_depth': 6, 'learning_rate': 0.10, 'subsample': 0.85},
        {'n_estimators': 320, 'max_depth': 7, 'learning_rate': 0.07, 'subsample': 0.88}
    ]
    
    for i, params in enumerate(param_combinations):
        try:
            base_params = {
                'random_state': 42,
                'eval_metric': 'mlogloss',
                'objective': 'multi:softprob',
                'colsample_bytree': 0.8,
                'reg_alpha': 0.1,
                'reg_lambda': 1.0
            }
            base_params.update(params)
            
            model = xgb.XGBClassifier(**base_params)
            
            # Cross-validation rapide
            tscv = TimeSeriesSplit(n_splits=3, test_size=25)
            scores = cross_val_score(model, X_train, y_train, cv=tscv, scoring='neg_log_loss', n_jobs=1)
            avg_score = scores.mean()
            
            print(f"  [CONFIG {i+1}] Score: {avg_score:.4f} | Params: {params}")
            
            if avg_score > best_score:
                best_score = avg_score
                best_params = base_params.copy()
                
        except Exception as e:
            print(f"  [ERROR] Config {i+1}: {e}")
    
    print(f"  [BEST] XGBoost Score: {best_score:.4f}")
    return best_params, best_score

def quick_optimize_random_forest(X_train, y_train):
    """Optimisation rapide Random Forest"""
    print("\nOPTIMISATION RAPIDE RANDOM FOREST")
    print("=================================")
    
    best_score = -np.inf
    best_params = None
    
    param_combinations = [
        {'n_estimators': 180, 'max_depth': 8, 'min_samples_split': 3},
        {'n_estimators': 200, 'max_depth': 10, 'min_samples_split': 2},
        {'n_estimators': 160, 'max_depth': 6, 'min_samples_split': 4},
        {'n_estimators': 220, 'max_depth': 9, 'min_samples_split': 2},
        {'n_estimators': 190, 'max_depth': 7, 'min_samples_split': 3}
    ]
    
    for i, params in enumerate(param_combinations):
        try:
            base_params = {
                'random_state': 42,
                'n_jobs': 1,
                'min_samples_leaf': 2,
                'max_features': 'sqrt'
            }
            base_params.update(params)
            
            model = RandomForestClassifier(**base_params)
            
            tscv = TimeSeriesSplit(n_splits=3, test_size=25)
            scores = cross_val_score(model, X_train, y_train, cv=tscv, scoring='neg_log_loss', n_jobs=1)
            avg_score = scores.mean()
            
            print(f"  [CONFIG {i+1}] Score: {avg_score:.4f}")
            
            if avg_score > best_score:
                best_score = avg_score
                best_params = base_params.copy()
                
        except Exception as e:
            print(f"  [ERROR] Config {i+1}: {e}")
    
    print(f"  [BEST] Random Forest Score: {best_score:.4f}")
    return best_params, best_score

def create_optimized_ensemble(xgb_params, rf_params, X_train, y_train):
    """Crée ensemble avec paramètres optimisés"""
    print("\nCREATION ENSEMBLE OPTIMISE")
    print("==========================")
    
    models = {}
    
    # XGBoost optimisé
    if xgb_params:
        models['xgboost'] = xgb.XGBClassifier(**xgb_params)
        print("  [OK] XGBoost optimise ajoute")
    
    # Random Forest optimisé
    if rf_params:
        models['random_forest'] = RandomForestClassifier(**rf_params)
        print("  [OK] Random Forest optimise ajoute")
    
    # Neural Network avec paramètres fixes optimisés
    models['neural_network'] = MLPClassifier(
        hidden_layer_sizes=(90, 45),
        activation='relu',
        alpha=0.003,
        learning_rate='adaptive',
        max_iter=800,
        random_state=42
    )
    print("  [OK] Neural Network ajoute")
    
    # Logistic de base
    models['logistic'] = LogisticRegression(C=0.7, random_state=42, max_iter=1000)
    print("  [OK] Logistic Regression ajoute")
    
    # Ensemble
    base_models = [(name, model) for name, model in models.items()]
    ensemble = StackingClassifier(
        estimators=base_models,
        final_estimator=LogisticRegression(C=1.2, random_state=42),
        cv=3,
        stack_method='predict_proba',
        n_jobs=1
    )
    
    print(f"  [ENSEMBLE] {len(base_models)} modeles combines")
    return ensemble, models

def evaluate_optimized_system(ensemble, models, X_train, X_test, y_train, y_test):
    """Évalue le système optimisé"""
    print("\nEVALUATION SYSTEME OPTIMISE")
    print("===========================")
    
    scaler = StandardScaler()
    results = {}
    
    # Évaluation modèles individuels
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
    
    # Évaluation ensemble
    try:
        ensemble.fit(X_train, y_train)
        y_pred_proba_ens = ensemble.predict_proba(X_test)
        y_pred_ens = np.argmax(y_pred_proba_ens, axis=1)
        
        accuracy_ens = accuracy_score(y_test, y_pred_ens)
        logloss_ens = log_loss(y_test, y_pred_proba_ens)
        
        results['ensemble_optimized'] = {'accuracy': accuracy_ens, 'log_loss': logloss_ens}
        print(f"  [ENSEMBLE] OPTIMISE: {accuracy_ens:.1%} accuracy, {logloss_ens:.3f} log loss")
        
    except Exception as e:
        print(f"  [ERROR] Ensemble: {e}")
    
    return results

def generate_quick_report(results, baseline_accuracy=0.474):
    """Génère rapport rapide d'optimisation"""
    print("\nRAPPORT OPTIMISATION RAPIDE")
    print("===========================")
    
    if not results:
        print("  [ERROR] Aucun resultat")
        return
    
    # Meilleur modèle
    best_model = max(results.items(), key=lambda x: x[1]['accuracy'])
    best_name, best_metrics = best_model
    
    print(f"  [BEST] Meilleur modele: {best_name}")
    print(f"  [PERFORMANCE] Accuracy: {best_metrics['accuracy']:.1%}")
    print(f"  [PERFORMANCE] Log Loss: {best_metrics['log_loss']:.3f}")
    
    # Amélioration vs baseline
    improvement = best_metrics['accuracy'] - baseline_accuracy
    improvement_pct = (improvement / baseline_accuracy) * 100
    
    print(f"\n  [AMELIORATION] vs Baseline ({baseline_accuracy:.1%}):")
    print(f"    Accuracy: {improvement:+.1%} ({improvement_pct:+.1f}%)")
    
    # Phase 3 objectifs
    target_min = 0.55
    target_max = 0.60
    
    print(f"\n  [OBJECTIFS PHASE 3]:")
    print(f"    Target Min: {target_min:.1%}")
    print(f"    Current: {best_metrics['accuracy']:.1%}")
    
    if best_metrics['accuracy'] >= target_max:
        status = "EXCELLENCE - Objectif MAX atteint!"
    elif best_metrics['accuracy'] >= target_min:
        status = "SUCCES - Objectif MIN atteint"
    else:
        status = "EN PROGRESSION - Continue optimisation"
    
    print(f"    Status: {status}")
    
    return best_metrics

def main():
    """Fonction principale - Optimisation rapide"""
    print("OPTIMISATION RAPIDE PHASE 3 - USUALODDS")
    print("=======================================")
    print(f"Debut: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. Données
    df = load_optimized_data()
    
    feature_columns = [col for col in df.columns if col != 'result_1x2']
    X = df[feature_columns].values
    y = df['result_1x2'].values
    
    # Split temporel
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    print(f"  [SPLIT] Training: {len(X_train)} | Testing: {len(X_test)}")
    
    # 2. Optimisation rapide
    xgb_params, xgb_score = quick_optimize_xgboost(X_train, y_train)
    rf_params, rf_score = quick_optimize_random_forest(X_train, y_train)
    
    # 3. Ensemble optimisé
    ensemble, models = create_optimized_ensemble(xgb_params, rf_params, X_train, y_train)
    
    # 4. Évaluation finale
    results = evaluate_optimized_system(ensemble, models, X_train, X_test, y_train, y_test)
    
    # 5. Rapport
    best_metrics = generate_quick_report(results)
    
    print(f"\nRESUME OPTIMISATION RAPIDE")
    print("==========================")
    print(f"  Modeles testes: {len(results)}")
    print(f"  Meilleure accuracy: {best_metrics['accuracy']:.1%}")
    print(f"  Fin: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return {
        'best_accuracy': float(best_metrics['accuracy']),
        'best_log_loss': float(best_metrics['log_loss']),
        'models_count': len(results),
        'xgb_optimized': xgb_params is not None,
        'rf_optimized': rf_params is not None
    }

if __name__ == "__main__":
    results = main()