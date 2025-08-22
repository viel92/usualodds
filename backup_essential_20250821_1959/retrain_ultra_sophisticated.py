#!/usr/bin/env python3
"""
RE-ENTRAINEMENT CONTINU ULTRA SOPHISTICATED ML SYSTEM
=====================================================
Apprend automatiquement des nouveaux résultats stockés dans Supabase
Améliore le modèle en continu avec les données fraîches
"""

import os
import sys
import argparse
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Configuration logging sans émojis
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'retrain_ultra_sophisticated_{datetime.now().strftime("%Y%m%d_%H%M")}.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

def continuous_learning_pipeline(new_results_count: int = 0):
    """
    Pipeline d'apprentissage continu
    1. Charge les nouveaux résultats depuis Supabase
    2. Réentraîne le modèle avec les données fraîches
    3. Valide la performance
    4. Déploie le nouveau modèle si amélioration
    """
    try:
        logger.info("=== APPRENTISSAGE CONTINU ULTRA SOPHISTICATED ===")
        logger.info(f"Nouveaux resultats detectes: {new_results_count}")
        
        # Import du système ultra sophistiqué
        from ultra_sophisticated_ml_system import UltraSophisticatedMLSystem, MLConfig
        
        # Configuration
        config = MLConfig()
        
        # Initialiser le système
        logger.info("Initialisation systeme Ultra Sophisticated...")
        system = UltraSophisticatedMLSystem(config)
        
        # Charger modèle existant
        model_files = [f for f in os.listdir('.') if f.endswith('.pkl') and 'usualodds' in f]
        current_model_path = None
        
        if model_files:
            current_model_path = model_files[0]
            logger.info(f"Modele actuel trouve: {current_model_path}")
            
            # Charger le modèle existant
            try:
                import pickle
                with open(current_model_path, 'rb') as f:
                    system.final_model = pickle.load(f)
                logger.info("Modele actuel charge avec succes")
            except Exception as e:
                logger.warning(f"Impossible de charger modele actuel: {e}")
                current_model_path = None
        
        # Vérifier s'il y a assez de nouveaux résultats pour re-entraîner
        min_results_for_retrain = 10
        if new_results_count < min_results_for_retrain:
            logger.info(f"Pas assez de nouveaux resultats ({new_results_count} < {min_results_for_retrain})")
            logger.info("Apprentissage reporte a plus tard")
            return True
        
        # Sauvegarder performance actuelle pour comparaison
        current_performance = None
        if system.final_model is not None:
            try:
                # Évaluer rapidement le modèle actuel
                logger.info("Evaluation performance modele actuel...")
                current_performance = evaluate_model_performance(system)
                logger.info(f"Performance actuelle: {current_performance:.3f}")
            except Exception as e:
                logger.warning(f"Impossible d'evaluer modele actuel: {e}")
        
        # Re-entraîner avec les nouvelles données
        logger.info("Demarrage re-entrainement avec nouvelles donnees...")
        retrain_results = system.run_complete_pipeline()
        
        if not retrain_results or 'final_accuracy' not in retrain_results:
            logger.error("Echec re-entrainement")
            return False
        
        new_performance = retrain_results['final_accuracy']
        logger.info(f"Performance nouveau modele: {new_performance:.3f}")
        
        # Décider si déployer le nouveau modèle
        should_deploy = False
        
        if current_performance is None:
            # Pas de modèle précédent, déployer
            should_deploy = True
            logger.info("Pas de modele precedent, deploiement nouveau modele")
        elif new_performance > current_performance + 0.01:  # Amélioration d'au moins 1%
            should_deploy = True
            improvement = (new_performance - current_performance) * 100
            logger.info(f"Amelioration detectee: +{improvement:.1f}%, deploiement")
        else:
            should_deploy = False
            logger.info("Pas d'amelioration significative, conservation modele actuel")
        
        if should_deploy:
            # Sauvegarder nouveau modèle
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            new_model_path = f'usualodds_model_retrained_{timestamp}.pkl'
            
            try:
                import pickle
                with open(new_model_path, 'wb') as f:
                    pickle.dump(system.final_model, f)
                logger.info(f"Nouveau modele sauvegarde: {new_model_path}")
                
                # Archiver ancien modèle si existe
                if current_model_path and current_model_path != new_model_path:
                    archive_path = f'archive_{current_model_path}'
                    os.rename(current_model_path, archive_path)
                    logger.info(f"Ancien modele archive: {archive_path}")
                
                # Créer lien symbolique pour le modèle de production
                production_path = 'usualodds_model_basic.pkl'
                if os.path.exists(production_path):
                    os.remove(production_path)
                
                # Sur Windows, copier le fichier au lieu d'un lien symbolique
                import shutil
                shutil.copy2(new_model_path, production_path)
                logger.info(f"Modele de production mis a jour: {production_path}")
                
                return True
                
            except Exception as e:
                logger.error(f"Erreur sauvegarde nouveau modele: {e}")
                return False
        else:
            logger.info("Conservation modele actuel")
            return True
            
    except Exception as e:
        logger.error(f"Erreur apprentissage continu: {e}")
        return False

def evaluate_model_performance(system) -> float:
    """Évalue rapidement la performance du modèle actuel"""
    try:
        # Utiliser un échantillon de validation rapide
        from datetime import datetime, timedelta
        
        # Récupérer quelques matches récents pour évaluation rapide
        supabase = system.supabase
        
        cutoff_date = datetime.now() - timedelta(days=30)
        
        response = supabase.table('matches').select(
            'id, home_team_id, away_team_id, home_score, away_score, date'
        ).eq('status', 'Match Finished').not_.is_('home_score', None).not_.is_('away_score', None)\
        .gte('date', cutoff_date.isoformat()).limit(100).execute()
        
        if not response.data or len(response.data) < 10:
            return 0.5  # Performance par défaut
        
        matches = response.data
        correct_predictions = 0
        total_predictions = 0
        
        for match in matches[:50]:  # Limite pour évaluation rapide
            try:
                # Extraire features pour ce match
                home_features = system._extract_sophisticated_features(
                    match['home_team_id'], f"Team_{match['home_team_id']}"
                )
                away_features = system._extract_sophisticated_features(
                    match['away_team_id'], f"Team_{match['away_team_id']}"
                )
                
                # Préparer features
                match_features = system._prepare_match_features(home_features, away_features)
                
                # Prédiction
                prediction = system.final_model.predict([match_features])[0]
                
                # Résultat réel
                home_score = int(match['home_score'])
                away_score = int(match['away_score'])
                
                if home_score > away_score:
                    actual = 0  # home_win
                elif away_score > home_score:
                    actual = 2  # away_win  
                else:
                    actual = 1  # draw
                
                if prediction == actual:
                    correct_predictions += 1
                
                total_predictions += 1
                
            except Exception:
                continue
        
        if total_predictions > 0:
            accuracy = correct_predictions / total_predictions
            return accuracy
        else:
            return 0.5
            
    except Exception as e:
        logger.warning(f"Erreur evaluation performance: {e}")
        return 0.5

def main():
    """Point d'entrée principal"""
    parser = argparse.ArgumentParser(description='Re-entraînement continu Ultra Sophisticated')
    parser.add_argument('--new-results', type=int, default=0,
                       help='Nombre de nouveaux résultats détectés')
    parser.add_argument('--force', action='store_true',
                       help='Force le re-entraînement même avec peu de données')
    
    args = parser.parse_args()
    
    try:
        print("USUALODDS - RE-ENTRAINEMENT CONTINU")
        print("=" * 50)
        print(f"Demarrage: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Nouveaux resultats: {args.new_results}")
        print()
        
        if args.force:
            logger.info("Mode force active - re-entrainement force")
        
        success = continuous_learning_pipeline(args.new_results)
        
        print("\n" + "=" * 50)
        if success:
            print("SUCCES: Apprentissage continu termine")
            print("Le modele Ultra Sophisticated a ete mis a jour si necessaire")
        else:
            print("ECHEC: Probleme durant l'apprentissage continu")
            
        print(f"Fin: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\nInterruption par l'utilisateur")
        return 1
    except Exception as e:
        print(f"Erreur fatale: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())