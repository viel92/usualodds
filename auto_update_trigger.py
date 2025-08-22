#!/usr/bin/env python3
"""
DÉCLENCHEUR AUTOMATIQUE POST-MATCH
==================================

Script qui se lance automatiquement après chaque match terminé pour:
1. Mettre à jour les ELO des équipes
2. Recalculer la forme (5 derniers matchs)  
3. Actualiser les stats joueurs
4. Enrichir les features ML

Peut être appelé:
- Manuellement: python auto_update_trigger.py --match-id 12345
- Via cron: */15 * * * * python auto_update_trigger.py --check-recent
- Via webhook API: python auto_update_trigger.py --webhook
"""

import argparse
import sys
import json
from datetime import datetime, timedelta
from typing import Dict
from ml_learning_system_architecture import DynamicMLLearningSystem
import logging

# Configuration logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ml_updates.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class AutoUpdateTrigger:
    """Déclencheur automatique des mises à jour ML"""
    
    def __init__(self):
        self.ml_system = DynamicMLLearningSystem()
        
    def process_single_match(self, match_id: int) -> Dict:
        """Traite un match spécifique"""
        logger.info(f"=== Traitement match {match_id} ===")
        
        try:
            result = self.ml_system.process_finished_match(match_id)
            
            if 'error' in result:
                logger.error(f"Erreur match {match_id}: {result['error']}")
                return result
            
            # Log des updates
            logger.info(f"Match {match_id} traité avec succès:")
            for update in result.get('updates', []):
                update_type = update.get('type', 'unknown')
                success = update.get('success', False)
                logger.info(f"  - {update_type}: {'OK' if success else 'ERREUR'}")
                
                if update_type == 'elo_update' and success:
                    home = update.get('home_team', {})
                    away = update.get('away_team', {})
                    logger.info(f"    ELO Home: {home.get('old_elo', 0):.0f} -> {home.get('new_elo', 0):.0f}")
                    logger.info(f"    ELO Away: {away.get('old_elo', 0):.0f} -> {away.get('new_elo', 0):.0f}")
            
            return result
            
        except Exception as e:
            logger.error(f"Erreur critique match {match_id}: {e}")
            return {'error': str(e), 'match_id': match_id}
    
    def check_recent_matches(self, hours: int = 24) -> Dict:
        """Vérifie et traite les matchs terminés récemment"""
        logger.info(f"=== Vérification matchs terminés (dernières {hours}h) ===")
        
        try:
            # Date limite
            cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()
            
            # Récupérer matchs récents terminés
            response = self.ml_system.supabase.table('matches').select(
                'id, home_team_id, away_team_id, home_score, away_score, date, status_short'
            ).eq('status_short', 'FT').gte('date', cutoff).execute()
            
            if not response.data:
                logger.info("Aucun match terminé récent trouvé")
                return {'processed': 0, 'total': 0}
            
            matches = response.data
            logger.info(f"{len(matches)} matchs terminés trouvés")
            
            # Traiter chaque match
            results = []
            processed = 0
            errors = 0
            
            for match in matches:
                try:
                    result = self.process_single_match(match['id'])
                    if 'error' not in result:
                        processed += 1
                    else:
                        errors += 1
                    results.append(result)
                    
                except Exception as e:
                    logger.error(f"Erreur traitement match {match['id']}: {e}")
                    errors += 1
                    results.append({'match_id': match['id'], 'error': str(e)})
            
            summary = {
                'total': len(matches),
                'processed': processed,
                'errors': errors,
                'results': results,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"=== RÉSUMÉ: {processed}/{len(matches)} matchs traités, {errors} erreurs ===")
            
            return summary
            
        except Exception as e:
            logger.error(f"Erreur vérification matchs récents: {e}")
            return {'error': str(e)}
    
    def check_data_freshness(self) -> Dict:
        """Vérifie la fraîcheur des données ML"""
        logger.info("=== Vérification fraîcheur données ===")
        
        try:
            stale_check = self.ml_system.check_stale_data()
            
            logger.info(f"Équipes avec données obsolètes: {stale_check['stale_teams']}")
            logger.info(f"Joueurs avec données obsolètes: {stale_check['stale_players']}")
            
            # Alertes si trop de données obsolètes
            if stale_check['stale_teams'] > 10:
                logger.warning(f"ALERTE: {stale_check['stale_teams']} équipes avec données obsolètes!")
            
            if stale_check['stale_players'] > 50:
                logger.warning(f"ALERTE: {stale_check['stale_players']} joueurs avec données obsolètes!")
            
            return stale_check
            
        except Exception as e:
            logger.error(f"Erreur vérification fraîcheur: {e}")
            return {'error': str(e)}
    
    def run_full_maintenance(self) -> Dict:
        """Lance une maintenance complète du système ML"""
        logger.info("=== MAINTENANCE COMPLÈTE SYSTÈME ML ===")
        
        results = {
            'start_time': datetime.now().isoformat(),
            'tasks': []
        }
        
        try:
            # 1. Traiter matchs récents
            logger.info("1. Traitement matchs récents...")
            recent_result = self.check_recent_matches(48)  # 48h
            results['tasks'].append({
                'task': 'recent_matches',
                'result': recent_result,
                'success': 'error' not in recent_result
            })
            
            # 2. Vérifier fraîcheur données
            logger.info("2. Vérification fraîcheur données...")
            freshness_result = self.check_data_freshness()
            results['tasks'].append({
                'task': 'data_freshness',
                'result': freshness_result,
                'success': 'error' not in freshness_result
            })
            
            # 3. Mise à jour batch si nécessaire
            if recent_result.get('processed', 0) > 0:
                logger.info("3. Mise à jour batch supplémentaire...")
                batch_result = self.ml_system.run_batch_updates()
                results['tasks'].append({
                    'task': 'batch_update',
                    'result': batch_result,
                    'success': batch_result.get('processed', 0) > 0
                })
            
            results['end_time'] = datetime.now().isoformat()
            results['success'] = all(task['success'] for task in results['tasks'])
            
            logger.info(f"=== MAINTENANCE TERMINÉE: {'SUCCÈS' if results['success'] else 'ERREURS'} ===")
            
            return results
            
        except Exception as e:
            logger.error(f"Erreur maintenance complète: {e}")
            results['error'] = str(e)
            results['success'] = False
            return results
    
    def webhook_endpoint(self, match_data: Dict) -> Dict:
        """Point d'entrée webhook pour traitement temps réel"""
        logger.info("=== WEBHOOK REÇU ===")
        
        try:
            match_id = match_data.get('match_id')
            status = match_data.get('status', '')
            
            if not match_id:
                return {'error': 'match_id required'}
            
            if status != 'FT':
                return {'message': 'Match not finished, ignoring', 'status': status}
            
            logger.info(f"Traitement webhook match {match_id}")
            
            result = self.process_single_match(match_id)
            
            # Ajouter métadonnées webhook
            result['webhook'] = True
            result['received_at'] = datetime.now().isoformat()
            
            return result
            
        except Exception as e:
            logger.error(f"Erreur webhook: {e}")
            return {'error': str(e), 'webhook': True}

def main():
    """Interface CLI"""
    parser = argparse.ArgumentParser(description='Déclencheur automatique mises à jour ML')
    
    parser.add_argument('--match-id', type=int, help='Traiter un match spécifique')
    parser.add_argument('--check-recent', type=int, default=24, help='Vérifier matchs récents (heures)')
    parser.add_argument('--maintenance', action='store_true', help='Maintenance complète')
    parser.add_argument('--freshness', action='store_true', help='Vérifier fraîcheur données')
    parser.add_argument('--webhook', type=str, help='JSON webhook data')
    parser.add_argument('--output', type=str, help='Fichier output JSON')
    
    args = parser.parse_args()
    
    trigger = AutoUpdateTrigger()
    result = None
    
    try:
        if args.match_id:
            # Traiter match spécifique
            result = trigger.process_single_match(args.match_id)
            
        elif args.webhook:
            # Mode webhook
            webhook_data = json.loads(args.webhook)
            result = trigger.webhook_endpoint(webhook_data)
            
        elif args.maintenance:
            # Maintenance complète
            result = trigger.run_full_maintenance()
            
        elif args.freshness:
            # Vérifier fraîcheur uniquement
            result = trigger.check_data_freshness()
            
        else:
            # Mode par défaut: vérifier matchs récents
            result = trigger.check_recent_matches(args.check_recent)
        
        # Output
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(result, f, indent=2, default=str)
            logger.info(f"Résultats sauvés dans {args.output}")
        else:
            print(json.dumps(result, indent=2, default=str))
        
        # Code sortie
        if result and result.get('success', True) and 'error' not in result:
            sys.exit(0)
        else:
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Erreur CLI: {e}")
        print(json.dumps({'error': str(e)}, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()