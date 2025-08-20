#!/usr/bin/env python3
"""
AUDIT CRITIQUE DES DONNÉES - DIAGNOSTIC PROBLÈMES INGESTION
===========================================================
Diagnostic complet des problèmes d'ingestion API Football
- Buteurs avec seulement 15 buts max (impossible)
- team_features avec beaucoup de vides
- player_features avec beaucoup de vides
- Données incomplètes partout

Objectif: Identifier et fixer les problèmes avant ML
"""

import os
import numpy as np
import pandas as pd
from datetime import datetime
import warnings
import json
from supabase import create_client, Client
from dotenv import load_dotenv

warnings.filterwarnings('ignore')

class CriticalDataAuditor:
    """Auditeur critique pour identifier problèmes ingestion données"""
    
    def __init__(self):
        load_dotenv()
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.supabase = None
        self.audit_results = {}
        
    def initialize_connection(self):
        """Connexion Supabase pour audit"""
        print("CONNEXION SUPABASE POUR AUDIT CRITIQUE")
        print("======================================")
        
        try:
            self.supabase = create_client(self.supabase_url, self.service_role_key)
            test = self.supabase.table('matches').select('id').limit(1).execute()
            print(f"  [SUCCESS] Connexion établie")
            return True
        except Exception as e:
            print(f"  [ERROR] Connexion impossible: {e}")
            return False
    
    def audit_player_goals_critical(self):
        """CRITIQUE: Audit buteurs - max 15 buts impossible"""
        print("\nAUDIT CRITIQUE: BUTEURS & GOALS")
        print("===============================")
        
        try:
            # Extraction données buteurs
            response = self.supabase.table('player_features').select(
                'player_name, goals, assists, matches_played, season, team_name'
            ).order('goals', desc=True).limit(50).execute()
            
            players_data = response.data
            df_players = pd.DataFrame(players_data)
            
            if len(df_players) == 0:
                print("  [ERROR CRITIQUE] Aucune donnée player_features trouvée!")
                self.audit_results['players_empty'] = True
                return
            
            print(f"  [DATA] {len(df_players)} joueurs extraits")
            
            # Analyse buteurs top
            top_scorers = df_players.nlargest(10, 'goals')
            
            print(f"\n  [TOP BUTEURS] Les 10 meilleurs:")
            for idx, player in top_scorers.iterrows():
                goals = player.get('goals', 0)
                name = player.get('player_name', 'Unknown')
                team = player.get('team_name', 'Unknown')
                season = player.get('season', 'Unknown')
                print(f"    {name} ({team}) - {goals} buts (saison {season})")
            
            # DIAGNOSTIC CRITIQUE
            max_goals = df_players['goals'].max() if len(df_players) > 0 else 0
            
            print(f"\n  [DIAGNOSTIC CRITIQUE]")
            print(f"    Max buts trouvé: {max_goals}")
            
            if max_goals < 20:
                print(f"    🔴 PROBLÈME CRITIQUE: {max_goals} buts max impossible!")
                print(f"       Mbappé/Benzema/etc devraient avoir 25+ buts")
                print(f"       Problème d'ingestion API Football détecté")
                self.audit_results['goals_too_low'] = True
            else:
                print(f"    ✅ Goals semblent réalistes")
                self.audit_results['goals_realistic'] = True
                
            # Vérification distribution
            goals_stats = df_players['goals'].describe()
            print(f"\n  [STATISTIQUES GOALS]")
            print(f"    Moyenne: {goals_stats['mean']:.1f}")
            print(f"    Médiane: {goals_stats['50%']:.1f}")
            print(f"    Max: {goals_stats['max']:.0f}")
            print(f"    Std: {goals_stats['std']:.1f}")
            
            # Vérification données vides
            null_goals = df_players['goals'].isna().sum()
            null_names = df_players['player_name'].isna().sum()
            
            print(f"\n  [DONNÉES VIDES]")
            print(f"    Goals NULL: {null_goals} ({null_goals/len(df_players)*100:.1f}%)")
            print(f"    Noms NULL: {null_names} ({null_names/len(df_players)*100:.1f}%)")
            
            if null_goals > len(df_players) * 0.1:  # Plus de 10% vides
                print(f"    🔴 TROP DE DONNÉES VIDES: {null_goals/len(df_players)*100:.1f}%")
                self.audit_results['too_many_nulls'] = True
            
            self.audit_results['player_audit'] = {
                'total_players': len(df_players),
                'max_goals': int(max_goals),
                'null_goals_pct': null_goals/len(df_players)*100,
                'avg_goals': float(goals_stats['mean'])
            }
            
        except Exception as e:
            print(f"  [ERROR] Audit buteurs échoué: {e}")
            self.audit_results['player_audit_failed'] = True
    
    def audit_team_features_critical(self):
        """CRITIQUE: Audit team_features vides"""
        print("\nAUDIT CRITIQUE: TEAM FEATURES")
        print("=============================")
        
        try:
            response = self.supabase.table('team_features').select('*').execute()
            team_data = response.data
            df_teams = pd.DataFrame(team_data)
            
            if len(df_teams) == 0:
                print("  [ERROR CRITIQUE] Aucune team_features!")
                self.audit_results['teams_empty'] = True
                return
            
            print(f"  [DATA] {len(df_teams)} team_features extraites")
            
            # Analyse complétude par colonne
            print(f"\n  [COMPLÉTUDE PAR FEATURE]")
            
            critical_features = [
                'elo_rating', 'form_5_points', 'goals_per_game', 'possession_avg',
                'points', 'wins', 'draws', 'losses', 'goal_difference'
            ]
            
            missing_summary = {}
            
            for feature in critical_features:
                if feature in df_teams.columns:
                    null_count = df_teams[feature].isna().sum()
                    null_pct = null_count / len(df_teams) * 100
                    missing_summary[feature] = null_pct
                    
                    status = "🔴 CRITIQUE" if null_pct > 50 else "🟡 MOYEN" if null_pct > 20 else "✅ OK"
                    print(f"    {feature}: {null_count} vides ({null_pct:.1f}%) {status}")
                else:
                    print(f"    {feature}: ❌ COLONNE MANQUANTE")
                    missing_summary[feature] = 100.0
            
            # Diagnostic global
            avg_missing = np.mean(list(missing_summary.values()))
            print(f"\n  [DIAGNOSTIC GLOBAL]")
            print(f"    Moyenne données manquantes: {avg_missing:.1f}%")
            
            if avg_missing > 40:
                print(f"    🔴 PROBLÈME CRITIQUE: Trop de données manquantes!")
                print(f"       Ingestion team_features défaillante")
                self.audit_results['teams_too_empty'] = True
            elif avg_missing > 15:
                print(f"    🟡 ATTENTION: Données partiellement manquantes")
                self.audit_results['teams_partially_empty'] = True
            else:
                print(f"    ✅ Qualité données acceptable")
                self.audit_results['teams_quality_ok'] = True
                
            # Vérification saisons
            if 'season' in df_teams.columns:
                seasons = df_teams['season'].value_counts().sort_index()
                print(f"\n  [RÉPARTITION SAISONS]")
                for season, count in seasons.items():
                    print(f"    {season}: {count} équipes")
                    
                if len(seasons) < 3:
                    print(f"    🔴 MANQUE DE DONNÉES HISTORIQUES: {len(seasons)} saisons seulement")
                    self.audit_results['insufficient_history'] = True
            
            self.audit_results['team_audit'] = {
                'total_teams': len(df_teams),
                'avg_missing_pct': avg_missing,
                'critical_features_missing': missing_summary
            }
            
        except Exception as e:
            print(f"  [ERROR] Audit team_features échoué: {e}")
            self.audit_results['team_audit_failed'] = True
    
    def audit_matches_data_quality(self):
        """CRITIQUE: Audit qualité matches"""
        print("\nAUDIT CRITIQUE: MATCHES DATA")
        print("============================")
        
        try:
            response = self.supabase.table('matches').select('*').limit(1000).execute()
            matches_data = response.data
            df_matches = pd.DataFrame(matches_data)
            
            print(f"  [DATA] {len(df_matches)} matches extraits")
            
            if len(df_matches) == 0:
                print("  [ERROR CRITIQUE] Aucun match trouvé!")
                self.audit_results['matches_empty'] = True
                return
            
            # Analyse colonnes disponibles
            print(f"\n  [COLONNES DISPONIBLES]")
            cols = list(df_matches.columns)
            print(f"    Total: {len(cols)} colonnes")
            print(f"    Exemples: {cols[:10]}")
            
            # Vérification données critiques
            critical_match_fields = [
                'home_team_id', 'away_team_id', 'season', 
                'home_score', 'away_score', 'result'
            ]
            
            missing_fields = []
            for field in critical_match_fields:
                if field not in cols:
                    # Essayer variantes
                    variants = [f"{field}s", f"result_{field}", f"full_time_{field}"]
                    found_variant = None
                    for variant in variants:
                        if variant in cols:
                            found_variant = variant
                            break
                    
                    if found_variant:
                        print(f"    {field}: ✅ Trouvé comme '{found_variant}'")
                    else:
                        print(f"    {field}: ❌ MANQUANT")
                        missing_fields.append(field)
                else:
                    print(f"    {field}: ✅ Présent")
            
            if len(missing_fields) > 0:
                print(f"\n  🔴 CHAMPS CRITIQUES MANQUANTS: {missing_fields}")
                self.audit_results['matches_missing_fields'] = missing_fields
            
            # Vérification distribution temporelle
            if 'season' in cols:
                seasons = df_matches['season'].value_counts().sort_index()
                print(f"\n  [RÉPARTITION TEMPORELLE]")
                for season, count in seasons.items():
                    print(f"    Saison {season}: {count} matches")
                
                recent_seasons = [s for s in seasons.index if s >= 2020]
                if len(recent_seasons) < 3:
                    print(f"    🔴 DONNÉES RÉCENTES INSUFFISANTES")
                    self.audit_results['matches_insufficient_recent'] = True
            
            self.audit_results['match_audit'] = {
                'total_matches': len(df_matches),
                'available_columns': len(cols),
                'missing_critical_fields': len(missing_fields)
            }
            
        except Exception as e:
            print(f"  [ERROR] Audit matches échoué: {e}")
            self.audit_results['match_audit_failed'] = True
    
    def audit_api_football_integration(self):
        """CRITIQUE: Audit intégration API Football"""
        print("\nAUDIT CRITIQUE: INTEGRATION API FOOTBALL")
        print("========================================")
        
        # Vérification configuration API
        api_key = os.getenv('API_FOOTBALL_KEY')
        api_host = os.getenv('API_FOOTBALL_HOST')
        
        print(f"  [CONFIGURATION]")
        print(f"    API Key: {'✅ Présente' if api_key else '❌ MANQUANTE'}")
        print(f"    API Host: {'✅ Présent' if api_host else '❌ MANQUANT'}")
        
        if not api_key:
            print(f"    🔴 PAS DE CLÉ API - Ingestion impossible!")
            self.audit_results['no_api_key'] = True
        
        # Vérification récence des données
        try:
            # Tester récence avec une table quelconque
            response = self.supabase.table('matches').select(
                'created_at, updated_at'
            ).order('created_at', desc=True).limit(10).execute()
            
            if response.data:
                latest_data = response.data[0]
                created_at = latest_data.get('created_at', 'Unknown')
                print(f"\n  [RÉCENCE DONNÉES]")
                print(f"    Dernière ingestion: {created_at}")
                
                # Parser date si possible
                if created_at != 'Unknown':
                    from datetime import datetime
                    try:
                        last_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        days_old = (datetime.now() - last_date.replace(tzinfo=None)).days
                        
                        if days_old > 7:
                            print(f"    🔴 DONNÉES OBSOLÈTES: {days_old} jours")
                            self.audit_results['data_too_old'] = days_old
                        else:
                            print(f"    ✅ Données récentes: {days_old} jours")
                    except:
                        print(f"    🟡 Impossible de parser la date")
            
        except Exception as e:
            print(f"  [WARNING] Vérification récence échouée: {e}")
    
    def generate_critical_diagnosis_report(self):
        """Génère rapport diagnostic critique"""
        print("\nRAPPORT DIAGNOSTIC CRITIQUE")
        print("===========================")
        
        critical_issues = []
        warnings_issues = []
        
        # Analyse résultats audit
        if self.audit_results.get('goals_too_low'):
            critical_issues.append("🔴 BUTEURS: Max 15 buts impossible (Mbappé >> 15)")
        
        if self.audit_results.get('teams_too_empty'):
            critical_issues.append("🔴 TEAM_FEATURES: Trop de données manquantes")
        
        if self.audit_results.get('players_empty'):
            critical_issues.append("🔴 PLAYER_FEATURES: Table vide")
        
        if self.audit_results.get('matches_empty'):
            critical_issues.append("🔴 MATCHES: Table vide")
            
        if self.audit_results.get('no_api_key'):
            critical_issues.append("🔴 API_FOOTBALL: Pas de clé API")
        
        # Warnings
        if self.audit_results.get('teams_partially_empty'):
            warnings_issues.append("🟡 TEAM_FEATURES: Données partiellement manquantes")
            
        if self.audit_results.get('insufficient_history'):
            warnings_issues.append("🟡 HISTORIQUE: Pas assez de saisons")
            
        if self.audit_results.get('data_too_old'):
            days = self.audit_results['data_too_old']
            warnings_issues.append(f"🟡 RÉCENCE: Données vieilles de {days} jours")
        
        # Rapport final
        print(f"\n  [PROBLÈMES CRITIQUES] ({len(critical_issues)})")
        if critical_issues:
            for issue in critical_issues:
                print(f"    {issue}")
        else:
            print("    ✅ Aucun problème critique détecté")
            
        print(f"\n  [AVERTISSEMENTS] ({len(warnings_issues)})")
        if warnings_issues:
            for warning in warnings_issues:
                print(f"    {warning}")
        else:
            print("    ✅ Aucun avertissement")
        
        # Recommandations
        print(f"\n  [RECOMMANDATIONS URGENTES]")
        
        if self.audit_results.get('goals_too_low'):
            print("    1. 🔧 FIXER INGESTION PLAYER STATS depuis API Football")
            print("       - Vérifier endpoint /players/statistics")
            print("       - Contrôler mapping goals/assists")
            print("       - Réingérer données saison courante")
        
        if self.audit_results.get('teams_too_empty'):
            print("    2. 🔧 FIXER CALCUL TEAM_FEATURES")
            print("       - Relancer scripts calculate-advanced-features.js")
            print("       - Vérifier team_features pour toutes saisons")
            print("       - Calculer ELO/Form/Possession manquants")
        
        if critical_issues:
            print("    3. 🚨 BLOQUER ML JUSQU'À RESOLUTION")
            print("       - Ne pas entraîner modèles avec données défaillantes")
            print("       - Fixer ingestion d'abord")
        
        print(f"\n  [PRIORITÉ]")
        if len(critical_issues) > 0:
            print("    🔴 CRITIQUE - Arrêter ML, fixer données d'abord")
        elif len(warnings_issues) > 0:
            print("    🟡 MOYEN - Améliorer qualité données puis ML")
        else:
            print("    ✅ VERT - Données OK pour ML")
        
        return {
            'critical_issues': len(critical_issues),
            'warning_issues': len(warnings_issues),
            'data_quality_score': max(0, 100 - len(critical_issues)*30 - len(warnings_issues)*10),
            'ready_for_ml': len(critical_issues) == 0
        }

def main():
    """Audit critique complet des données"""
    print("AUDIT CRITIQUE DONNÉES USUALODDS")
    print("================================")
    print(f"Début: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("Objectif: Identifier problèmes ingestion avant ML")
    
    auditor = CriticalDataAuditor()
    
    # 1. Connexion
    if not auditor.initialize_connection():
        print("\n❌ IMPOSSIBLE DE CONTINUER - Pas de connexion DB")
        return
    
    # 2. Audits critiques
    auditor.audit_player_goals_critical()
    auditor.audit_team_features_critical() 
    auditor.audit_matches_data_quality()
    auditor.audit_api_football_integration()
    
    # 3. Diagnostic final
    diagnosis = auditor.generate_critical_diagnosis_report()
    
    print(f"\nRÉSUMÉ AUDIT CRITIQUE")
    print("=====================")
    print(f"  Problèmes critiques: {diagnosis['critical_issues']}")
    print(f"  Avertissements: {diagnosis['warning_issues']}")
    print(f"  Score qualité données: {diagnosis['data_quality_score']}/100")
    print(f"  Prêt pour ML: {'✅ OUI' if diagnosis['ready_for_ml'] else '❌ NON'}")
    print(f"  Fin: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return diagnosis

if __name__ == "__main__":
    results = main()