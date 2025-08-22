#!/usr/bin/env python3
"""
SYSTÈME COMPLET DE MISE À JOUR ML AUTOMATIQUE
==============================================

ORCHESTRATEUR PRINCIPAL qui résout le problème critique des données figées:

AVANT (PROBLÈME):
- Paris FC: ELO 1350 figé depuis toujours
- team_features: 101 enregistrements qui ne bougent jamais
- player_features: 2415 entrées multi-saisons sans logique
- Après chaque match: RIEN ne se met à jour

APRÈS (SOLUTION):
- ELO dynamique calculé après chaque match
- Forme recalculée automatiquement (5 derniers matchs)
- Joueurs multi-saisons gérés intelligemment  
- Système d'apprentissage continu

UTILISATION:
1. Automatique: Lance après chaque match terminé
2. Manuel: python complete_ml_update_system.py --match-id 12345
3. Maintenance: python complete_ml_update_system.py --full-maintenance
4. Webhook: Intégration temps réel
"""

import sys
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Imports des modules du système
from ml_learning_system_architecture import DynamicMLLearningSystem
from player_multiseason_manager import PlayerMultiSeasonManager
from auto_update_trigger import AutoUpdateTrigger

# Configuration logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('complete_ml_system.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class CompleteLearningSystem:
    """Système complet d'apprentissage ML automatique"""
    
    def __init__(self):
        # Initialiser tous les composants
        self.ml_system = DynamicMLLearningSystem()
        self.player_manager = PlayerMultiSeasonManager()  
        self.trigger = AutoUpdateTrigger()
        
        logger.info("=== SYSTÈME ML COMPLET INITIALISÉ ===")
    
    def solve_static_data_problem(self) -> Dict:
        """
        RÉSOUT LE PROBLÈME PRINCIPAL: données complètement figées
        Lance une mise à jour complète de tous les éléments statiques
        """
        
        logger.info("RESOLUTION PROBLEME DONNEES FIGEES")
        
        results = {
            'start_time': datetime.now().isoformat(),
            'problem': 'static_data_complete_freeze',
            'solutions_applied': [],
            'metrics': {},
            'success': False
        }
        
        try:
            # 1. DIAGNOSTIC INITIAL
            logger.info("1. Diagnostic données figées...")
            
            diagnostic = self.diagnose_static_data()
            results['diagnostic'] = diagnostic
            results['solutions_applied'].append(diagnostic)
            
            # 2. MISE À JOUR BATCH TOUS LES ELO
            logger.info("2. Mise à jour batch ELO toutes équipes...")
            
            elo_batch = self.batch_update_all_elos()
            results['elo_batch'] = elo_batch
            results['solutions_applied'].append(elo_batch)
            
            # 3. RECALCUL TOUTES LES FORMES
            logger.info("3. Recalcul batch toutes les formes...")
            
            form_batch = self.batch_update_all_forms()
            results['form_batch'] = form_batch
            results['solutions_applied'].append(form_batch)
            
            # 4. GESTION JOUEURS MULTI-SAISONS
            logger.info("4. Correction joueurs multi-saisons...")
            
            players_fix = self.fix_multiseason_players()
            results['players_fix'] = players_fix
            results['solutions_applied'].append(players_fix)
            
            # 5. CRÉATION ENTRÉES MANQUANTES SAISON COURANTE
            logger.info("5. Création entrées manquantes 2024...")
            
            missing_entries = self.player_manager.batch_create_missing_entries()
            results['missing_entries'] = missing_entries
            results['solutions_applied'].append(missing_entries)
            
            # 6. TRAITEMENT MATCHS RÉCENTS NON TRAITÉS
            logger.info("6. Traitement matchs récents non traités...")
            
            recent_matches = self.process_unprocessed_matches()
            results['recent_matches'] = recent_matches
            results['solutions_applied'].append(recent_matches)
            
            # 7. VÉRIFICATION FINALE
            logger.info("7. Vérification post-correction...")
            
            verification = self.verify_fixes()
            results['verification'] = verification
            results['solutions_applied'].append(verification)
            
            # Calculer métriques de succès
            results['metrics'] = {
                'elos_updated': elo_batch.get('updated_teams', 0),
                'forms_updated': form_batch.get('updated_teams', 0), 
                'players_created': missing_entries.get('created', 0),
                'matches_processed': recent_matches.get('processed', 0),
                'total_fixes': len([s for s in results['solutions_applied'] if s.get('success', False)])
            }
            
            # Déterminer succès global
            critical_fixes = [elo_batch.get('success', False), form_batch.get('success', False)]
            results['success'] = all(critical_fixes) and results['metrics']['total_fixes'] >= 4
            
            results['end_time'] = datetime.now().isoformat()
            
            if results['success']:
                logger.info("PROBLEME DONNEES FIGEES RESOLU!")
            else:
                logger.warning("Correction partielle, certains problemes persistent")
            
            return results
            
        except Exception as e:
            logger.error(f"Erreur critique resolution: {e}")
            results['error'] = str(e)
            results['success'] = False
            return results
    
    def diagnose_static_data(self) -> Dict:
        """Diagnostique détaillé du problème de données figées"""
        
        try:
            # Compter données jamais mises à jour
            old_date = (datetime.now() - timedelta(days=30)).isoformat()
            
            # Teams avec ELO figé
            stale_teams = self.ml_system.supabase.table('team_features').select(
                'team_id, elo_rating, updated_at'
            ).lt('updated_at', old_date).execute()
            
            # Équipes avec ELO par défaut (1500)
            default_elos = self.ml_system.supabase.table('team_features').select(
                'team_id, elo_rating'
            ).eq('elo_rating', 1500).execute()
            
            # Paris FC spécifiquement (problème mentionné)
            paris_fc = self.ml_system.supabase.table('team_features').select(
                'team_id, elo_rating, form_5_points, updated_at'
            ).eq('elo_rating', 1350).execute()
            
            diagnostic = {
                'type': 'static_data_diagnostic',
                'stale_teams_count': len(stale_teams.data) if stale_teams.data else 0,
                'default_elo_count': len(default_elos.data) if default_elos.data else 0,
                'paris_fc_found': len(paris_fc.data) if paris_fc.data else 0,
                'cutoff_date': old_date,
                'timestamp': datetime.now().isoformat(),
                'success': True
            }
            
            logger.info(f"Diagnostic: {diagnostic['stale_teams_count']} équipes figées, {diagnostic['default_elo_count']} ELO par défaut")
            
            return diagnostic
            
        except Exception as e:
            return {'type': 'diagnostic', 'success': False, 'error': str(e)}
    
    def batch_update_all_elos(self) -> Dict:
        """Met à jour l'ELO de toutes les équipes basé sur leurs matchs récents"""
        
        try:
            # Récupérer toutes les équipes
            teams = self.ml_system.supabase.table('team_features').select(
                'team_id, elo_rating'
            ).eq('season', 2024).execute()
            
            if not teams.data:
                return {'type': 'elo_batch', 'success': False, 'error': 'no_teams'}
            
            updated_count = 0
            errors = 0
            
            for team in teams.data:
                team_id = team['team_id']
                current_elo = team['elo_rating']
                
                try:
                    # Calculer nouvel ELO basé sur derniers matchs
                    new_elo = self.calculate_team_elo_from_results(team_id, current_elo)
                    
                    if new_elo != current_elo:
                        # Mettre à jour
                        self.ml_system.supabase.table('team_features').update({
                            'elo_rating': new_elo,
                            'elo_home': new_elo + 50,
                            'elo_away': new_elo - 50,
                            'updated_at': datetime.now().isoformat()
                        }).eq('team_id', team_id).eq('season', 2024).execute()
                        
                        updated_count += 1
                        logger.info(f"ELO team {team_id}: {current_elo:.0f} -> {new_elo:.0f}")
                
                except Exception as e:
                    errors += 1
                    logger.warning(f"Erreur ELO team {team_id}: {e}")
            
            return {
                'type': 'elo_batch_update',
                'success': True,
                'updated_teams': updated_count,
                'errors': errors,
                'total_teams': len(teams.data)
            }
            
        except Exception as e:
            return {'type': 'elo_batch', 'success': False, 'error': str(e)}
    
    def calculate_team_elo_from_results(self, team_id: int, current_elo: float) -> float:
        """Calcule ELO d'une équipe basé sur ses 10 derniers résultats"""
        
        # Récupérer derniers matchs de l'équipe
        matches = self.ml_system.supabase.table('matches').select(
            'id, home_team_id, away_team_id, home_score, away_score, date'
        ).or_(
            f'home_team_id.eq.{team_id},away_team_id.eq.{team_id}'
        ).eq('status_short', 'FT').order('date', desc=True).limit(10).execute()
        
        if not matches.data:
            return current_elo
        
        # Simuler évolution ELO
        elo = current_elo
        
        for match in reversed(matches.data):  # Plus ancien vers plus récent
            is_home = match['home_team_id'] == team_id
            team_goals = match['home_score'] if is_home else match['away_score']
            opponent_goals = match['away_score'] if is_home else match['home_score']
            
            # Estimer ELO adversaire (ou utiliser 1500 par défaut)
            opponent_id = match['away_team_id'] if is_home else match['home_team_id']
            opponent_elo = 1500  # Simplification pour ce batch
            
            # Appliquer mise à jour ELO
            if team_goals > opponent_goals:
                result = 1.0
            elif team_goals < opponent_goals:
                result = 0.0
            else:
                result = 0.5
            
            # Calcul probabilité et nouveau ELO
            if is_home:
                expected = 1 / (1 + 10**((opponent_elo - (elo + 100)) / 400))
            else:
                expected = 1 / (1 + 10**((opponent_elo - elo) / 400))
            
            elo = elo + 32 * (result - expected)
        
        return round(elo, 1)
    
    def batch_update_all_forms(self) -> Dict:
        """Met à jour la forme de toutes les équipes"""
        
        try:
            teams = self.ml_system.supabase.table('team_features').select(
                'team_id'
            ).eq('season', 2024).execute()
            
            if not teams.data:
                return {'type': 'form_batch', 'success': False, 'error': 'no_teams'}
            
            updated_count = 0
            errors = 0
            
            for team in teams.data:
                team_id = team['team_id']
                
                try:
                    # Calculer nouvelle forme
                    form_data = self.ml_system.calculate_team_form(team_id, 5)
                    
                    # Mettre à jour
                    self.ml_system.supabase.table('team_features').update({
                        'form_5_points': form_data['form_points'],
                        'updated_at': datetime.now().isoformat()
                    }).eq('team_id', team_id).eq('season', 2024).execute()
                    
                    updated_count += 1
                    logger.info(f"Forme team {team_id}: {form_data['form_points']} pts ({form_data['form_string']})")
                
                except Exception as e:
                    errors += 1
                    logger.warning(f"Erreur forme team {team_id}: {e}")
            
            return {
                'type': 'form_batch_update',
                'success': True,
                'updated_teams': updated_count,
                'errors': errors,
                'total_teams': len(teams.data)
            }
            
        except Exception as e:
            return {'type': 'form_batch', 'success': False, 'error': str(e)}
    
    def fix_multiseason_players(self) -> Dict:
        """Corrige le problème des joueurs multi-saisons"""
        
        try:
            # Identifier joueurs avec multiples saisons
            all_players = self.ml_system.supabase.table('player_features').select(
                'player_id'
            ).execute()
            
            if not all_players.data:
                return {'type': 'players_fix', 'success': False, 'error': 'no_players'}
            
            # Compter occurrences par joueur
            player_counts = {}
            for player in all_players.data:
                pid = player['player_id']
                player_counts[pid] = player_counts.get(pid, 0) + 1
            
            # Joueurs multi-saisons
            multi_season_players = [pid for pid, count in player_counts.items() if count > 1]
            
            fixed_count = 0
            for player_id in multi_season_players[:50]:  # Limiter à 50 pour test
                try:
                    # Analyser et optimiser
                    career = self.player_manager.analyze_player_career(player_id)
                    
                    if career and 'error' not in career:
                        # Vérifier si a entrée saison courante
                        has_current = career.get('current_status', {}).get('is_current_season', False)
                        
                        if not has_current and career.get('transfer_history'):
                            # Joueur actif sans entrée 2024, créer
                            latest_team = career['current_status'].get('team_id')
                            if latest_team:
                                result = self.player_manager.create_current_season_entry(player_id, latest_team)
                                if result['success']:
                                    fixed_count += 1
                
                except Exception as e:
                    logger.warning(f"Erreur fix player {player_id}: {e}")
            
            return {
                'type': 'multiseason_players_fix',
                'success': True,
                'multi_season_count': len(multi_season_players),
                'fixed_count': fixed_count,
                'total_players': len(player_counts)
            }
            
        except Exception as e:
            return {'type': 'players_fix', 'success': False, 'error': str(e)}
    
    def process_unprocessed_matches(self) -> Dict:
        """Traite les matchs récents qui n'ont pas déclenché de mises à jour"""
        
        try:
            # Matchs terminés derniers 7 jours
            recent_result = self.trigger.check_recent_matches(168)  # 7 jours = 168h
            
            return {
                'type': 'recent_matches_processing',
                'success': 'error' not in recent_result,
                'processed': recent_result.get('processed', 0),
                'total': recent_result.get('total', 0),
                'errors': recent_result.get('errors', 0)
            }
            
        except Exception as e:
            return {'type': 'recent_matches', 'success': False, 'error': str(e)}
    
    def verify_fixes(self) -> Dict:
        """Vérifie que les corrections ont bien fonctionné"""
        
        try:
            # Vérifications post-correction
            recent_date = (datetime.now() - timedelta(hours=1)).isoformat()
            
            # Compter mises à jour récentes
            recent_updates = self.ml_system.supabase.table('team_features').select(
                'team_id'
            ).gte('updated_at', recent_date).execute()
            
            # Vérifier ELO non par défaut
            non_default_elos = self.ml_system.supabase.table('team_features').select(
                'team_id'
            ).neq('elo_rating', 1500).execute()
            
            # Forme non nulle
            good_forms = self.ml_system.supabase.table('team_features').select(
                'team_id'
            ).gt('form_5_points', 0).execute()
            
            verification = {
                'type': 'post_fix_verification',
                'recent_updates': len(recent_updates.data) if recent_updates.data else 0,
                'non_default_elos': len(non_default_elos.data) if non_default_elos.data else 0,
                'good_forms': len(good_forms.data) if good_forms.data else 0,
                'verification_time': datetime.now().isoformat(),
                'success': True
            }
            
            # Score de santé (0-100)
            health_score = (verification['recent_updates'] * 2 + 
                          verification['non_default_elos'] + 
                          verification['good_forms']) / 4
            verification['health_score'] = min(100, health_score * 10)
            
            logger.info(f"Score santé système: {verification['health_score']:.0f}%")
            
            return verification
            
        except Exception as e:
            return {'type': 'verification', 'success': False, 'error': str(e)}
    
    def setup_automated_triggers(self) -> Dict:
        """Configure les déclencheurs automatiques"""
        
        logger.info("Configuration déclencheurs automatiques...")
        
        # Instructions pour configuration
        instructions = {
            'cron_job': {
                'command': 'python complete_ml_update_system.py --check-recent',
                'schedule': '*/15 * * * *',  # Toutes les 15 minutes
                'description': 'Vérifier et traiter matchs terminés'
            },
            'webhook_api': {
                'endpoint': '/api/ml-update-webhook',
                'method': 'POST',
                'payload': {'match_id': 'int', 'status': 'FT'},
                'response_time': '< 2s'
            },
            'daily_maintenance': {
                'command': 'python complete_ml_update_system.py --full-maintenance', 
                'schedule': '0 2 * * *',  # 2h du matin
                'description': 'Maintenance complète quotidienne'
            }
        }
        
        return {
            'type': 'automation_setup',
            'success': True,
            'instructions': instructions,
            'next_steps': [
                'Configurer cron job sur serveur',
                'Intégrer webhook dans API',
                'Tester déclenchement automatique'
            ]
        }

def main():
    """Interface CLI principale"""
    
    import argparse
    
    parser = argparse.ArgumentParser(description='Système complet ML automatique')
    parser.add_argument('--solve-static', action='store_true', help='Résoudre problème données figées')
    parser.add_argument('--check-recent', action='store_true', help='Vérifier matchs récents')
    parser.add_argument('--full-maintenance', action='store_true', help='Maintenance complète')
    parser.add_argument('--setup-automation', action='store_true', help='Configurer automatisation')
    parser.add_argument('--match-id', type=int, help='Traiter match spécifique')
    parser.add_argument('--test-system', action='store_true', help='Test complet système')
    
    args = parser.parse_args()
    
    system = CompleteLearningSystem()
    
    try:
        if args.solve_static:
            # RESOUDRE LE PROBLEME PRINCIPAL
            print("RESOLUTION PROBLEME DONNEES FIGEES")
            result = system.solve_static_data_problem()
            print(json.dumps(result, indent=2, default=str))
            
        elif args.match_id:
            # Traiter match spécifique
            result = system.trigger.process_single_match(args.match_id)
            print(json.dumps(result, indent=2, default=str))
            
        elif args.check_recent:
            # Vérifier matchs récents
            result = system.trigger.check_recent_matches()
            print(json.dumps(result, indent=2, default=str))
            
        elif args.full_maintenance:
            # Maintenance complète
            result = system.trigger.run_full_maintenance()
            print(json.dumps(result, indent=2, default=str))
            
        elif args.setup_automation:
            # Configuration automatisation
            result = system.setup_automated_triggers()
            print(json.dumps(result, indent=2, default=str))
            
        elif args.test_system:
            # Test complet
            print("=== TEST SYSTÈME COMPLET ===")
            
            # Test diagnostic
            print("\n1. Diagnostic...")
            diagnostic = system.diagnose_static_data()
            print(f"Équipes figées: {diagnostic.get('stale_teams_count', 0)}")
            
            # Test calcul ELO
            print("\n2. Test calcul ELO...")
            sample_elo = system.calculate_team_elo_from_results(1063, 1350)  # Paris FC
            print(f"Nouvel ELO calculé: {sample_elo}")
            
            # Test joueurs multi-saisons
            print("\n3. Test joueurs multi-saisons...")
            missing = system.player_manager.find_players_needing_current_season()
            print(f"Joueurs sans entrée 2024: {len(missing)}")
            
        else:
            print("Usage: python complete_ml_update_system.py [--solve-static|--test-system|--full-maintenance]")
            print("Voir --help pour toutes les options")
    
    except Exception as e:
        logger.error(f"Erreur CLI: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()