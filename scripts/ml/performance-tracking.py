#!/usr/bin/env python3
"""
PERFORMANCE TRACKING SYSTEM - USUALODDS 2025
=============================================
Système de suivi de performance par saison avec monitoring continu
- Tracking accuracy par saison et période
- Détection de dégradation de performance
- Analyse des tendances temporelles
- Alerting automatique
- Recommandations d'amélioration
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import sys
import json
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# ML imports
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler

load_dotenv()

class PerformanceTrackingSystem:
    """
    Système de suivi de performance avec monitoring continu
    """
    
    def __init__(self):
        self.supabase = None
        self.performance_history = []
        self.alerts = []
        self.trend_analysis = {}
        self.benchmarks = {
            'target_accuracy': 0.55,
            'minimum_acceptable': 0.50,
            'excellent_threshold': 0.60,
            'stability_threshold': 0.05  # Max std deviation
        }
        
    def initialize_connection(self):
        """Initialise la connexion Supabase"""
        try:
            from supabase import create_client
            
            supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            
            if not supabase_url or not supabase_key:
                raise ValueError("Supabase credentials not found")
            
            self.supabase = create_client(supabase_url, supabase_key)
            print("[OK] Supabase connection established")
            return True
            
        except Exception as e:
            print(f"[ERROR] Failed to connect: {e}")
            return False
    
    def run_comprehensive_performance_tracking(self) -> Dict:
        """
        Lance le tracking compréhensif de performance
        """
        print("=" * 60)
        print("PERFORMANCE TRACKING SYSTEM - COMPREHENSIVE ANALYSIS")
        print("=" * 60)
        
        tracking_results = {}
        
        try:
            # 1. Charger données historiques
            print("\n[1/7] Loading historical performance data...")
            historical_data = self.load_historical_performance_data()
            tracking_results['historical_data'] = historical_data
            
            # 2. Analyse par saison
            print("[2/7] Analyzing seasonal performance...")
            seasonal_analysis = self.analyze_seasonal_performance()
            tracking_results['seasonal_analysis'] = seasonal_analysis
            
            # 3. Analyse temporelle détaillée
            print("[3/7] Running temporal performance analysis...")
            temporal_analysis = self.analyze_temporal_trends()
            tracking_results['temporal_analysis'] = temporal_analysis
            
            # 4. Détection d'anomalies
            print("[4/7] Detecting performance anomalies...")
            anomaly_detection = self.detect_performance_anomalies(seasonal_analysis)
            tracking_results['anomaly_detection'] = anomaly_detection
            
            # 5. Benchmarking et comparaisons
            print("[5/7] Running benchmarking analysis...")
            benchmarking = self.run_benchmarking_analysis(seasonal_analysis)
            tracking_results['benchmarking'] = benchmarking
            
            # 6. Prédiction de performance future
            print("[6/7] Predicting future performance...")
            future_prediction = self.predict_future_performance(seasonal_analysis)
            tracking_results['future_prediction'] = future_prediction
            
            # 7. Génération d'alertes et recommandations
            print("[7/7] Generating alerts and recommendations...")
            alerts_recommendations = self.generate_alerts_and_recommendations(tracking_results)
            tracking_results['alerts_recommendations'] = alerts_recommendations
            
            # Sauvegarder résultats
            self.save_performance_tracking_report(tracking_results)
            
            print("\n[COMPLETE] Comprehensive performance tracking completed!")
            return tracking_results
            
        except Exception as e:
            print(f"[ERROR] Performance tracking failed: {e}")
            return {}
    
    def load_historical_performance_data(self) -> Dict:
        """Charge les données de performance historiques"""
        
        try:
            # Récupérer matches avec résultats
            matches_response = self.supabase.table('matches').select(
                'id, season, home_team_id, away_team_id, '
                'home_score, away_score, match_date, status'
            ).not_.is_('home_score', None).not_.is_('away_score', None).execute()
            
            matches_df = pd.DataFrame(matches_response.data)
            matches_df['match_date'] = pd.to_datetime(matches_df['match_date'])
            
            # Récupérer features (essayer enhanced d'abord)
            try:
                features_response = self.supabase.table('team_features_enhanced').select('*').execute()
                if features_response.data:
                    features_df = pd.DataFrame(features_response.data)
                    enhanced_available = True
                else:
                    raise Exception("No enhanced features")
            except:
                features_response = self.supabase.table('team_features').select(
                    'team_id, season, elo_rating, form_5_points, possession_avg'
                ).execute()
                features_df = pd.DataFrame(features_response.data)
                enhanced_available = False
            
            # Récupérer historique de prédictions si disponible
            try:
                predictions_response = self.supabase.table('prediction_performance_history').select('*').execute()
                predictions_history = pd.DataFrame(predictions_response.data) if predictions_response.data else pd.DataFrame()
            except:
                predictions_history = pd.DataFrame()
            
            return {
                'matches_count': len(matches_df),
                'seasons_available': sorted(matches_df['season'].unique().tolist()),
                'date_range': {
                    'start': matches_df['match_date'].min().isoformat(),
                    'end': matches_df['match_date'].max().isoformat()
                },
                'enhanced_features_available': enhanced_available,
                'features_count': len(features_df),
                'predictions_history_available': len(predictions_history) > 0,
                'data_completeness': self._calculate_data_completeness(matches_df, features_df)
            }
            
        except Exception as e:
            print(f"[ERROR] Loading historical data failed: {e}")
            return {}
    
    def analyze_seasonal_performance(self) -> Dict:
        """Analyse détaillée de la performance par saison"""
        
        try:
            # Récupérer et préparer données ML
            ml_data = self._prepare_ml_dataset()
            
            if ml_data.empty:
                return {'error': 'No ML data available'}
            
            seasons = sorted(ml_data['season'].unique())
            seasonal_results = {}
            
            # Modèle de référence
            base_model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                random_state=42,
                n_jobs=-1
            )
            
            feature_columns = [col for col in ml_data.columns 
                             if col not in ['season', 'match_id', 'match_date', 'actual_result']]
            
            for season in seasons:
                print(f"  Analyzing season {season}...")
                
                season_data = ml_data[ml_data['season'] == season].copy()
                
                if len(season_data) < 30:  # Minimum viable sample
                    seasonal_results[season] = {
                        'error': 'Insufficient data',
                        'sample_size': len(season_data)
                    }
                    continue
                
                # Préparer features
                X = season_data[feature_columns].fillna(0)
                y = season_data['actual_result']
                
                # Split temporel pour la saison
                split_point = max(int(len(season_data) * 0.7), len(season_data) - 50)
                
                X_train = X.iloc[:split_point]
                X_test = X.iloc[split_point:]
                y_train = y.iloc[:split_point]
                y_test = y.iloc[split_point:]
                
                if len(X_test) < 10:
                    seasonal_results[season] = {
                        'error': 'Test set too small',
                        'sample_size': len(season_data)
                    }
                    continue
                
                # Entraînement et évaluation
                scaler = StandardScaler()
                X_train_scaled = scaler.fit_transform(X_train)
                X_test_scaled = scaler.transform(X_test)
                
                base_model.fit(X_train_scaled, y_train)
                y_pred = base_model.predict(X_test_scaled)
                
                accuracy = accuracy_score(y_test, y_pred)
                
                # Analyses détaillées
                class_report = classification_report(y_test, y_pred, output_dict=True)
                conf_matrix = confusion_matrix(y_test, y_pred)
                
                # Performance par mois
                monthly_performance = self._analyze_monthly_performance(
                    season_data, base_model, scaler, feature_columns
                )
                
                # Stabilité de performance
                stability_analysis = self._analyze_performance_stability(
                    season_data, base_model, feature_columns
                )
                
                seasonal_results[season] = {
                    'accuracy': accuracy,
                    'sample_size': len(season_data),
                    'train_size': len(X_train),
                    'test_size': len(X_test),
                    'classification_report': class_report,
                    'confusion_matrix': conf_matrix.tolist(),
                    'monthly_performance': monthly_performance,
                    'stability_analysis': stability_analysis,
                    'result_distribution': y.value_counts(normalize=True).to_dict(),
                    'prediction_distribution': pd.Series(y_pred).value_counts(normalize=True).to_dict()
                }
            
            # Analyse globale des saisons
            valid_seasons = {k: v for k, v in seasonal_results.items() if 'error' not in v}
            
            if valid_seasons:
                accuracies = [s['accuracy'] for s in valid_seasons.values()]
                
                global_analysis = {
                    'average_accuracy': np.mean(accuracies),
                    'accuracy_std': np.std(accuracies),
                    'best_season': max(valid_seasons.keys(), key=lambda k: valid_seasons[k]['accuracy']),
                    'worst_season': min(valid_seasons.keys(), key=lambda k: valid_seasons[k]['accuracy']),
                    'trend_slope': self._calculate_trend_slope(valid_seasons),
                    'consistency_score': 1 - (np.std(accuracies) / np.mean(accuracies)) if np.mean(accuracies) > 0 else 0
                }
            else:
                global_analysis = {'error': 'No valid seasonal data'}
            
            return {
                'seasonal_results': seasonal_results,
                'global_analysis': global_analysis,
                'seasons_analyzed': len(valid_seasons),
                'total_matches': sum(s.get('sample_size', 0) for s in valid_seasons.values())
            }
            
        except Exception as e:
            print(f"[ERROR] Seasonal analysis failed: {e}")
            return {'error': str(e)}
    
    def analyze_temporal_trends(self) -> Dict:
        """Analyse les tendances temporelles de performance"""
        
        try:
            # Récupérer données avec timestamps
            ml_data = self._prepare_ml_dataset()
            
            if ml_data.empty:
                return {'error': 'No temporal data available'}
            
            # Convertir dates
            ml_data['match_date'] = pd.to_datetime(ml_data['match_date'])
            ml_data = ml_data.sort_values('match_date')
            
            # Analyse par périodes
            temporal_analysis = {
                'monthly_trends': self._analyze_monthly_trends(ml_data),
                'seasonal_cycles': self._analyze_seasonal_cycles(ml_data),
                'weekly_patterns': self._analyze_weekly_patterns(ml_data),
                'performance_evolution': self._analyze_performance_evolution(ml_data)
            }
            
            return temporal_analysis
            
        except Exception as e:
            print(f"[ERROR] Temporal analysis failed: {e}")
            return {'error': str(e)}
    
    def detect_performance_anomalies(self, seasonal_analysis: Dict) -> Dict:
        """Détecte les anomalies de performance"""
        
        try:
            if 'error' in seasonal_analysis:
                return {'error': 'No seasonal data for anomaly detection'}
            
            valid_seasons = {k: v for k, v in seasonal_analysis['seasonal_results'].items() 
                           if 'error' not in v}
            
            if len(valid_seasons) < 2:
                return {'error': 'Insufficient seasons for anomaly detection'}
            
            accuracies = [s['accuracy'] for s in valid_seasons.values()]
            mean_accuracy = np.mean(accuracies)
            std_accuracy = np.std(accuracies)
            
            anomalies = []
            
            # Détection d'anomalies statistiques (> 2 std dev)
            for season, data in valid_seasons.items():
                accuracy = data['accuracy']
                z_score = abs(accuracy - mean_accuracy) / std_accuracy if std_accuracy > 0 else 0
                
                if z_score > 2:
                    anomaly_type = 'positive' if accuracy > mean_accuracy else 'negative'
                    anomalies.append({
                        'season': season,
                        'accuracy': accuracy,
                        'z_score': z_score,
                        'type': anomaly_type,
                        'severity': 'high' if z_score > 3 else 'medium',
                        'description': f"Season {season} shows {anomaly_type} anomaly with {accuracy:.1%} accuracy"
                    })
            
            # Détection de tendances négatives
            trend_anomalies = self._detect_trend_anomalies(valid_seasons)
            
            # Détection d'instabilité
            stability_anomalies = self._detect_stability_anomalies(valid_seasons)
            
            return {
                'statistical_anomalies': anomalies,
                'trend_anomalies': trend_anomalies,
                'stability_anomalies': stability_anomalies,
                'total_anomalies': len(anomalies) + len(trend_anomalies) + len(stability_anomalies),
                'anomaly_rate': len(anomalies) / len(valid_seasons) if valid_seasons else 0
            }
            
        except Exception as e:
            print(f"[ERROR] Anomaly detection failed: {e}")
            return {'error': str(e)}
    
    def run_benchmarking_analysis(self, seasonal_analysis: Dict) -> Dict:
        """Analyse de benchmarking par rapport aux objectifs"""
        
        try:
            if 'error' in seasonal_analysis:
                return {'error': 'No data for benchmarking'}
            
            valid_seasons = {k: v for k, v in seasonal_analysis['seasonal_results'].items() 
                           if 'error' not in v}
            
            if not valid_seasons:
                return {'error': 'No valid seasons for benchmarking'}
            
            accuracies = [s['accuracy'] for s in valid_seasons.values()]
            current_avg = np.mean(accuracies)
            
            # Benchmarking contre objectifs
            benchmarking_results = {
                'current_performance': {
                    'average_accuracy': current_avg,
                    'accuracy_range': [min(accuracies), max(accuracies)],
                    'consistency': 1 - (np.std(accuracies) / current_avg) if current_avg > 0 else 0
                },
                
                'target_analysis': {
                    'target_accuracy': self.benchmarks['target_accuracy'],
                    'gap_to_target': self.benchmarks['target_accuracy'] - current_avg,
                    'target_achieved': current_avg >= self.benchmarks['target_accuracy'],
                    'improvement_needed': max(0, self.benchmarks['target_accuracy'] - current_avg)
                },
                
                'threshold_analysis': {
                    'above_minimum': current_avg >= self.benchmarks['minimum_acceptable'],
                    'excellent_performance': current_avg >= self.benchmarks['excellent_threshold'],
                    'stable_performance': np.std(accuracies) <= self.benchmarks['stability_threshold']
                },
                
                'season_by_season_benchmarking': {}
            }
            
            # Benchmarking par saison
            for season, data in valid_seasons.items():
                accuracy = data['accuracy']
                benchmarking_results['season_by_season_benchmarking'][season] = {
                    'accuracy': accuracy,
                    'meets_target': accuracy >= self.benchmarks['target_accuracy'],
                    'meets_minimum': accuracy >= self.benchmarks['minimum_acceptable'],
                    'performance_rating': self._rate_performance(accuracy),
                    'gap_to_target': self.benchmarks['target_accuracy'] - accuracy
                }
            
            return benchmarking_results
            
        except Exception as e:
            print(f"[ERROR] Benchmarking analysis failed: {e}")
            return {'error': str(e)}
    
    def predict_future_performance(self, seasonal_analysis: Dict) -> Dict:
        """Prédit la performance future basée sur les tendances"""
        
        try:
            if 'error' in seasonal_analysis:
                return {'error': 'No data for future prediction'}
            
            valid_seasons = {k: v for k, v in seasonal_analysis['seasonal_results'].items() 
                           if 'error' not in v}
            
            if len(valid_seasons) < 3:
                return {'error': 'Insufficient historical data for prediction'}
            
            # Préparer données temporelles
            seasons_data = []
            for season, data in valid_seasons.items():
                year = int(season.split('-')[0])  # Extract year from "2023-2024"
                seasons_data.append({
                    'year': year,
                    'accuracy': data['accuracy']
                })
            
            seasons_df = pd.DataFrame(seasons_data).sort_values('year')
            
            # Régression linéaire simple pour tendance
            years = seasons_df['year'].values
            accuracies = seasons_df['accuracy'].values
            
            # Calcul tendance
            slope, intercept = np.polyfit(years, accuracies, 1)
            
            # Prédictions futures
            next_year = years[-1] + 1
            predicted_accuracy = slope * next_year + intercept
            
            # Confidence interval basé sur variance historique
            historical_std = np.std(accuracies)
            confidence_interval = [
                predicted_accuracy - 1.96 * historical_std,
                predicted_accuracy + 1.96 * historical_std
            ]
            
            # Analyse de trend
            trend_direction = 'improving' if slope > 0.01 else 'declining' if slope < -0.01 else 'stable'
            trend_strength = abs(slope) * 10  # Scale for interpretation
            
            return {
                'next_season_prediction': {
                    'predicted_accuracy': predicted_accuracy,
                    'confidence_interval': confidence_interval,
                    'prediction_confidence': min(0.8, 0.4 + (len(valid_seasons) * 0.1))
                },
                
                'trend_analysis': {
                    'slope': slope,
                    'direction': trend_direction,
                    'strength': trend_strength,
                    'r_squared': self._calculate_r_squared(years, accuracies, slope, intercept)
                },
                
                'scenario_analysis': {
                    'optimistic': predicted_accuracy + historical_std,
                    'realistic': predicted_accuracy,
                    'pessimistic': predicted_accuracy - historical_std
                },
                
                'target_achievement_probability': self._calculate_target_probability(
                    predicted_accuracy, historical_std
                )
            }
            
        except Exception as e:
            print(f"[ERROR] Future prediction failed: {e}")
            return {'error': str(e)}
    
    def generate_alerts_and_recommendations(self, tracking_results: Dict) -> Dict:
        """Génère alertes et recommandations basées sur l'analyse"""
        
        alerts = []
        recommendations = []
        priority_actions = []
        
        try:
            # Analyse des résultats pour générer alertes
            seasonal_analysis = tracking_results.get('seasonal_analysis', {})
            benchmarking = tracking_results.get('benchmarking', {})
            anomalies = tracking_results.get('anomaly_detection', {})
            future_prediction = tracking_results.get('future_prediction', {})
            
            # ALERTES CRITIQUES
            if benchmarking.get('current_performance', {}).get('average_accuracy', 0) < self.benchmarks['minimum_acceptable']:
                alerts.append({
                    'level': 'CRITICAL',
                    'type': 'performance_below_minimum',
                    'message': f"Average accuracy below minimum threshold ({self.benchmarks['minimum_acceptable']:.1%})",
                    'action_required': True
                })
                priority_actions.append("Immediate performance investigation and improvement required")
            
            # Alertes anomalies
            if anomalies.get('total_anomalies', 0) > 0:
                alerts.append({
                    'level': 'WARNING',
                    'type': 'anomalies_detected',
                    'message': f"Detected {anomalies['total_anomalies']} performance anomalies",
                    'action_required': True
                })
            
            # Alertes tendance négative
            if future_prediction.get('trend_analysis', {}).get('direction') == 'declining':
                alerts.append({
                    'level': 'WARNING',
                    'type': 'declining_trend',
                    'message': "Performance shows declining trend",
                    'action_required': True
                })
            
            # RECOMMANDATIONS STRATÉGIQUES
            
            # Recommandations basées sur benchmarking
            if not benchmarking.get('target_analysis', {}).get('target_achieved', False):
                gap = benchmarking.get('target_analysis', {}).get('gap_to_target', 0)
                recommendations.append({
                    'category': 'performance_improvement',
                    'priority': 'high',
                    'description': f"Implement enhanced features to close {gap:.1%} accuracy gap",
                    'specific_actions': [
                        "Deploy Enhanced Team Features Builder",
                        "Implement xG and advanced analytics",
                        "Add weather and injury data integration",
                        "Optimize temporal feature validation"
                    ]
                })
            
            # Recommandations stabilité
            if not benchmarking.get('threshold_analysis', {}).get('stable_performance', False):
                recommendations.append({
                    'category': 'stability_improvement',
                    'priority': 'medium',
                    'description': "Improve model stability and consistency",
                    'specific_actions': [
                        "Implement ensemble methods",
                        "Add cross-validation monitoring",
                        "Review feature engineering pipeline",
                        "Enhance temporal validation"
                    ]
                })
            
            # Recommandations monitoring
            recommendations.append({
                'category': 'monitoring_enhancement',
                'priority': 'medium',
                'description': "Enhance monitoring and alerting systems",
                'specific_actions': [
                    "Setup automated performance tracking",
                    "Implement real-time anomaly detection",
                    "Create performance dashboards",
                    "Setup alert notifications"
                ]
            })
            
            # ACTIONS PRIORITAIRES
            current_performance = benchmarking.get('current_performance', {}).get('average_accuracy', 0)
            
            if current_performance < 0.50:
                priority_actions.extend([
                    "URGENT: Complete data quality audit",
                    "URGENT: Review and fix feature calculation logic",
                    "URGENT: Implement enhanced features system"
                ])
            elif current_performance < 0.55:
                priority_actions.extend([
                    "HIGH: Deploy missing features calculator",
                    "HIGH: Implement xG and advanced analytics",
                    "MEDIUM: Add contextual data (weather, injuries)"
                ])
            else:
                priority_actions.extend([
                    "LOW: Fine-tune hyperparameters",
                    "LOW: Experiment with new features",
                    "LOW: Optimize ensemble methods"
                ])
            
            return {
                'alerts': alerts,
                'recommendations': recommendations,
                'priority_actions': priority_actions,
                'summary': {
                    'total_alerts': len(alerts),
                    'critical_alerts': sum(1 for a in alerts if a['level'] == 'CRITICAL'),
                    'action_required': any(a.get('action_required', False) for a in alerts),
                    'overall_health': self._assess_overall_health(tracking_results)
                }
            }
            
        except Exception as e:
            print(f"[ERROR] Alerts generation failed: {e}")
            return {
                'alerts': [{'level': 'ERROR', 'message': f"Alert generation failed: {e}"}],
                'recommendations': [],
                'priority_actions': ['Fix performance tracking system']
            }
    
    def save_performance_tracking_report(self, results: Dict):
        """Sauvegarde le rapport de tracking de performance"""
        
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            # Rapport complet JSON
            report_filename = f'performance_tracking_report_{timestamp}.json'
            with open(report_filename, 'w') as f:
                json.dump(results, f, indent=2, default=str)
            
            # Summary exécutif
            summary_filename = f'performance_summary_{timestamp}.txt'
            self._save_executive_summary(results, summary_filename)
            
            print(f"[OK] Performance tracking report saved: {report_filename}")
            print(f"[OK] Executive summary saved: {summary_filename}")
            
            # Stocker en base si possible
            self._store_performance_results(results)
            
        except Exception as e:
            print(f"[WARN] Failed to save performance report: {e}")
    
    def _save_executive_summary(self, results: Dict, filename: str):
        """Sauvegarde un résumé exécutif"""
        
        try:
            with open(filename, 'w') as f:
                f.write("PERFORMANCE TRACKING - EXECUTIVE SUMMARY\n")
                f.write("=" * 50 + "\n\n")
                
                # Performance globale
                seasonal = results.get('seasonal_analysis', {})
                global_analysis = seasonal.get('global_analysis', {})
                
                if 'error' not in global_analysis:
                    f.write(f"OVERALL PERFORMANCE:\n")
                    f.write(f"Average Accuracy: {global_analysis.get('average_accuracy', 0):.1%}\n")
                    f.write(f"Best Season: {global_analysis.get('best_season', 'N/A')}\n")
                    f.write(f"Worst Season: {global_analysis.get('worst_season', 'N/A')}\n")
                    f.write(f"Consistency Score: {global_analysis.get('consistency_score', 0):.2f}\n\n")
                
                # Benchmarking
                benchmarking = results.get('benchmarking', {})
                if 'error' not in benchmarking:
                    target_analysis = benchmarking.get('target_analysis', {})
                    f.write(f"TARGET ANALYSIS:\n")
                    f.write(f"Target Achieved: {'Yes' if target_analysis.get('target_achieved', False) else 'No'}\n")
                    f.write(f"Gap to Target: {target_analysis.get('gap_to_target', 0):.1%}\n\n")
                
                # Alertes
                alerts = results.get('alerts_recommendations', {}).get('alerts', [])
                f.write(f"ALERTS ({len(alerts)} total):\n")
                for alert in alerts[:5]:  # Top 5 alerts
                    f.write(f"- {alert['level']}: {alert['message']}\n")
                
                f.write(f"\n")
                
                # Recommandations prioritaires
                priority_actions = results.get('alerts_recommendations', {}).get('priority_actions', [])
                f.write(f"PRIORITY ACTIONS:\n")
                for action in priority_actions[:3]:  # Top 3 actions
                    f.write(f"- {action}\n")
                
        except Exception as e:
            print(f"[WARN] Failed to save executive summary: {e}")
    
    # UTILITY METHODS
    
    def _prepare_ml_dataset(self) -> pd.DataFrame:
        """Prépare le dataset ML (version simplifiée)"""
        
        try:
            # Récupérer matches
            matches_response = self.supabase.table('matches').select(
                'id, season, home_team_id, away_team_id, '
                'home_score, away_score, match_date'
            ).not_.is_('home_score', None).not_.is_('away_score', None).execute()
            
            matches_df = pd.DataFrame(matches_response.data)
            
            # Ajouter résultat calculé
            matches_df['actual_result'] = matches_df.apply(
                lambda row: self._calculate_result(row['home_score'], row['away_score']), 
                axis=1
            )
            
            # Ajouter features simulées pour testing
            matches_df['home_elo'] = 1500 + np.random.normal(0, 200, len(matches_df))
            matches_df['away_elo'] = 1500 + np.random.normal(0, 200, len(matches_df))
            matches_df['elo_diff'] = matches_df['home_elo'] - matches_df['away_elo']
            
            return matches_df
            
        except Exception as e:
            print(f"[ERROR] ML dataset preparation failed: {e}")
            return pd.DataFrame()
    
    def _calculate_result(self, home_score: int, away_score: int) -> int:
        """Calcule le résultat du match"""
        if home_score > away_score:
            return 0  # Home win
        elif home_score < away_score:
            return 2  # Away win
        else:
            return 1  # Draw
    
    def _calculate_data_completeness(self, matches_df: pd.DataFrame, features_df: pd.DataFrame) -> float:
        """Calcule la complétude des données"""
        
        try:
            matches_completeness = 1 - (matches_df.isnull().sum().sum() / (len(matches_df) * len(matches_df.columns)))
            features_completeness = 1 - (features_df.isnull().sum().sum() / (len(features_df) * len(features_df.columns)))
            
            return (matches_completeness + features_completeness) / 2
            
        except Exception:
            return 0.5
    
    def _analyze_monthly_performance(self, season_data: pd.DataFrame, model, scaler, feature_columns: List[str]) -> Dict:
        """Analyse la performance par mois"""
        
        try:
            season_data['match_date'] = pd.to_datetime(season_data['match_date'])
            season_data['month'] = season_data['match_date'].dt.month
            
            monthly_performance = {}
            
            for month in season_data['month'].unique():
                month_data = season_data[season_data['month'] == month]
                
                if len(month_data) < 5:  # Minimum sample
                    continue
                
                X_month = month_data[feature_columns].fillna(0)
                y_month = month_data['actual_result']
                
                X_month_scaled = scaler.transform(X_month)
                y_pred = model.predict(X_month_scaled)
                
                accuracy = accuracy_score(y_month, y_pred)
                
                monthly_performance[int(month)] = {
                    'accuracy': accuracy,
                    'sample_size': len(month_data)
                }
            
            return monthly_performance
            
        except Exception as e:
            return {'error': str(e)}
    
    def _analyze_performance_stability(self, season_data: pd.DataFrame, model, feature_columns: List[str]) -> Dict:
        """Analyse la stabilité de performance"""
        
        try:
            # Split en chunks temporels
            chunk_size = max(20, len(season_data) // 5)
            chunks = [season_data.iloc[i:i+chunk_size] for i in range(0, len(season_data), chunk_size)]
            
            chunk_accuracies = []
            
            for chunk in chunks:
                if len(chunk) < 10:
                    continue
                
                X_chunk = chunk[feature_columns].fillna(0)
                y_chunk = chunk['actual_result']
                
                scaler = StandardScaler()
                X_chunk_scaled = scaler.fit_transform(X_chunk)
                
                model.fit(X_chunk_scaled, y_chunk)
                y_pred = model.predict(X_chunk_scaled)
                
                accuracy = accuracy_score(y_chunk, y_pred)
                chunk_accuracies.append(accuracy)
            
            if chunk_accuracies:
                return {
                    'stability_score': 1 - (np.std(chunk_accuracies) / np.mean(chunk_accuracies)),
                    'accuracy_variance': np.var(chunk_accuracies),
                    'chunks_analyzed': len(chunk_accuracies)
                }
            else:
                return {'error': 'No valid chunks for stability analysis'}
                
        except Exception as e:
            return {'error': str(e)}
    
    def _calculate_trend_slope(self, seasonal_results: Dict) -> float:
        """Calcule la pente de tendance"""
        
        try:
            seasons_list = sorted(seasonal_results.keys())
            accuracies = [seasonal_results[season]['accuracy'] for season in seasons_list]
            
            if len(accuracies) < 2:
                return 0
            
            x = np.arange(len(accuracies))
            slope, _ = np.polyfit(x, accuracies, 1)
            
            return slope
            
        except Exception:
            return 0
    
    def _analyze_monthly_trends(self, ml_data: pd.DataFrame) -> Dict:
        """Analyse les tendances mensuelles"""
        
        try:
            ml_data['month'] = ml_data['match_date'].dt.month
            
            monthly_stats = ml_data.groupby('month').agg({
                'actual_result': ['count', 'mean'],
                'home_elo': 'mean'  # Proxy for match quality
            }).round(3)
            
            return monthly_stats.to_dict()
            
        except Exception as e:
            return {'error': str(e)}
    
    def _analyze_seasonal_cycles(self, ml_data: pd.DataFrame) -> Dict:
        """Analyse les cycles saisonniers"""
        
        try:
            ml_data['quarter'] = ml_data['match_date'].dt.quarter
            
            quarterly_stats = ml_data.groupby('quarter').agg({
                'actual_result': 'count',
                'home_elo': 'mean'
            }).round(3)
            
            return quarterly_stats.to_dict()
            
        except Exception as e:
            return {'error': str(e)}
    
    def _analyze_weekly_patterns(self, ml_data: pd.DataFrame) -> Dict:
        """Analyse les patterns hebdomadaires"""
        
        try:
            ml_data['day_of_week'] = ml_data['match_date'].dt.dayofweek
            
            weekly_stats = ml_data.groupby('day_of_week').agg({
                'actual_result': 'count'
            }).round(3)
            
            return weekly_stats.to_dict()
            
        except Exception as e:
            return {'error': str(e)}
    
    def _analyze_performance_evolution(self, ml_data: pd.DataFrame) -> Dict:
        """Analyse l'évolution de performance"""
        
        try:
            # Rolling performance over time
            ml_data_sorted = ml_data.sort_values('match_date')
            ml_data_sorted['rolling_avg'] = ml_data_sorted['home_elo'].rolling(window=50).mean()
            
            return {
                'trend': 'stable',  # Simplified
                'volatility': ml_data_sorted['rolling_avg'].std()
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def _detect_trend_anomalies(self, seasonal_results: Dict) -> List[Dict]:
        """Détecte les anomalies de tendance"""
        
        try:
            seasons_list = sorted(seasonal_results.keys())
            if len(seasons_list) < 3:
                return []
            
            # Check for sudden drops
            anomalies = []
            for i in range(1, len(seasons_list)):
                current_acc = seasonal_results[seasons_list[i]]['accuracy']
                prev_acc = seasonal_results[seasons_list[i-1]]['accuracy']
                
                drop = prev_acc - current_acc
                if drop > 0.05:  # 5% drop threshold
                    anomalies.append({
                        'type': 'sudden_drop',
                        'season': seasons_list[i],
                        'drop_amount': drop,
                        'description': f"Accuracy dropped by {drop:.1%} from previous season"
                    })
            
            return anomalies
            
        except Exception:
            return []
    
    def _detect_stability_anomalies(self, seasonal_results: Dict) -> List[Dict]:
        """Détecte les anomalies de stabilité"""
        
        anomalies = []
        
        for season, data in seasonal_results.items():
            stability = data.get('stability_analysis', {})
            
            if 'error' not in stability:
                stability_score = stability.get('stability_score', 1)
                
                if stability_score < 0.7:  # Low stability threshold
                    anomalies.append({
                        'type': 'low_stability',
                        'season': season,
                        'stability_score': stability_score,
                        'description': f"Season {season} shows low stability (score: {stability_score:.2f})"
                    })
        
        return anomalies
    
    def _rate_performance(self, accuracy: float) -> str:
        """Évalue la performance"""
        if accuracy >= self.benchmarks['excellent_threshold']:
            return 'excellent'
        elif accuracy >= self.benchmarks['target_accuracy']:
            return 'good'
        elif accuracy >= self.benchmarks['minimum_acceptable']:
            return 'acceptable'
        else:
            return 'poor'
    
    def _calculate_r_squared(self, x: np.ndarray, y: np.ndarray, slope: float, intercept: float) -> float:
        """Calcule R²"""
        
        try:
            y_pred = slope * x + intercept
            ss_res = np.sum((y - y_pred) ** 2)
            ss_tot = np.sum((y - np.mean(y)) ** 2)
            
            return 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
            
        except Exception:
            return 0
    
    def _calculate_target_probability(self, predicted_accuracy: float, std: float) -> float:
        """Calcule la probabilité d'atteindre la cible"""
        
        try:
            from scipy import stats
            
            # Probabilité que la prédiction >= target
            z_score = (self.benchmarks['target_accuracy'] - predicted_accuracy) / std
            probability = 1 - stats.norm.cdf(z_score)
            
            return max(0, min(1, probability))
            
        except Exception:
            # Approximation simple
            if predicted_accuracy >= self.benchmarks['target_accuracy']:
                return 0.8
            else:
                return max(0, 0.5 - abs(predicted_accuracy - self.benchmarks['target_accuracy']) * 2)
    
    def _assess_overall_health(self, tracking_results: Dict) -> str:
        """Évalue la santé globale du système"""
        
        try:
            benchmarking = tracking_results.get('benchmarking', {})
            anomalies = tracking_results.get('anomaly_detection', {})
            
            current_performance = benchmarking.get('current_performance', {}).get('average_accuracy', 0)
            total_anomalies = anomalies.get('total_anomalies', 0)
            
            if current_performance >= self.benchmarks['excellent_threshold'] and total_anomalies == 0:
                return 'excellent'
            elif current_performance >= self.benchmarks['target_accuracy'] and total_anomalies <= 1:
                return 'good'
            elif current_performance >= self.benchmarks['minimum_acceptable'] and total_anomalies <= 2:
                return 'fair'
            else:
                return 'poor'
                
        except Exception:
            return 'unknown'
    
    def _store_performance_results(self, results: Dict):
        """Stocke les résultats en base de données"""
        
        try:
            timestamp = datetime.now().isoformat()
            
            # Stocker résumé performance
            summary_data = {
                'timestamp': timestamp,
                'overall_accuracy': results.get('seasonal_analysis', {}).get('global_analysis', {}).get('average_accuracy'),
                'target_achieved': results.get('benchmarking', {}).get('target_analysis', {}).get('target_achieved'),
                'anomalies_count': results.get('anomaly_detection', {}).get('total_anomalies'),
                'health_status': results.get('alerts_recommendations', {}).get('summary', {}).get('overall_health')
            }
            
            # Insert en base (si table existe)
            try:
                self.supabase.table('performance_tracking_history').insert(summary_data).execute()
                print("[OK] Performance results stored in database")
            except Exception:
                print("[WARN] Could not store in database (table may not exist)")
                
        except Exception as e:
            print(f"[WARN] Failed to store performance results: {e}")

def main():
    """Script principal"""
    print("PERFORMANCE TRACKING SYSTEM - USUALODDS 2025")
    print("Comprehensive performance monitoring and analysis")
    
    # Initialisation
    tracker = PerformanceTrackingSystem()
    
    if not tracker.initialize_connection():
        sys.exit(1)
    
    # Lancer tracking compréhensif
    results = tracker.run_comprehensive_performance_tracking()
    
    if results:
        print("\n" + "=" * 60)
        print("PERFORMANCE TRACKING COMPLETED SUCCESSFULLY")
        print("=" * 60)
        
        # Afficher résumé
        seasonal = results.get('seasonal_analysis', {})
        if 'error' not in seasonal:
            global_analysis = seasonal.get('global_analysis', {})
            print(f"Average Accuracy: {global_analysis.get('average_accuracy', 0):.1%}")
            print(f"Seasons Analyzed: {seasonal.get('seasons_analyzed', 0)}")
        
        alerts = results.get('alerts_recommendations', {}).get('alerts', [])
        print(f"Alerts Generated: {len(alerts)}")
        
        health = results.get('alerts_recommendations', {}).get('summary', {}).get('overall_health', 'unknown')
        print(f"Overall Health: {health.upper()}")
    
    else:
        print("\n[ERROR] Performance tracking failed")
        sys.exit(1)

if __name__ == "__main__":
    main()