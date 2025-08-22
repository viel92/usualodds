#!/usr/bin/env python3
"""
Script de génération de prédictions sophistiquées pour l'API Next.js
Utilise l'Ultra Sophisticated ML System avec toutes les features riches
"""

import os
import sys
import argparse
import logging
from datetime import datetime

# Configuration logging sans émojis
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'sophisticated_predictions_{datetime.now().strftime("%Y%m%d_%H%M")}.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Import du système ultra sophistiqué
from ultra_sophisticated_ml_system import UltraSophisticatedMLSystem, MLConfig

def generate_predictions_for_api(matches_limit: int = 40) -> bool:
    """
    Génère prédictions sophistiquées et les sauve en cache pour l'API
    """
    try:
        logger.info("=== GENERATION PREDICTIONS SOPHISTIQUEES ===")
        logger.info(f"Limite matches: {matches_limit}")
        
        # Configuration du système ML
        config = MLConfig()
        
        # Initialisation système ultra sophistiqué
        logger.info("Initialisation Ultra Sophisticated ML System...")
        system = UltraSophisticatedMLSystem(config)
        
        # Vérifier si modèle existe déjà
        model_files = [f for f in os.listdir('.') if f.endswith('.pkl') and 'usualodds' in f]
        
        if model_files:
            logger.info(f"Modele trouve: {model_files[0]}")
            # Charger modèle existant si possible
            try:
                import pickle
                with open(model_files[0], 'rb') as f:
                    system.final_model = pickle.load(f)
                logger.info("Modele charge avec succes")
            except Exception as e:
                logger.warning(f"Impossible de charger modele: {e}")
                logger.info("Entrainement nouveau modele...")
                system.run_complete_pipeline()
        else:
            logger.info("Aucun modele trouve, entrainement necessaire...")
            system.run_complete_pipeline()
        
        # Génération prédictions sophistiquées
        logger.info("Generation predictions avec features sophistiquees...")
        predictions = system.predict_upcoming_matches(limit=matches_limit)
        
        if not predictions:
            logger.error("Aucune prediction generee!")
            return False
        
        # Sauvegarde cache pour API Next.js
        system.save_predictions_cache(predictions, 'api_sophisticated')
        
        # Sauvegarde cache de backup
        system.save_predictions_cache(predictions, 'backup_latest')
        
        # Statistiques
        logger.info(f"=== RESULTATS ===")
        logger.info(f"Predictions generees: {len(predictions)}")
        
        if predictions:
            confidences = [p['confidence'] for p in predictions]
            avg_confidence = sum(confidences) / len(confidences)
            logger.info(f"Confiance moyenne: {avg_confidence:.1f}%")
            
            predictions_types = {}
            for p in predictions:
                pred_type = p['prediction']
                predictions_types[pred_type] = predictions_types.get(pred_type, 0) + 1
            
            logger.info(f"Repartition predictions: {predictions_types}")
        
        logger.info("Cache API mis a jour avec succes!")
        return True
        
    except Exception as e:
        logger.error(f"Erreur generation predictions: {e}")
        return False

def main():
    """Point d'entrée principal"""
    parser = argparse.ArgumentParser(description='Générateur de prédictions sophistiquées')
    parser.add_argument('--matches', type=int, default=40,
                       help='Nombre de matches à prédire (défaut: 40)')
    parser.add_argument('--verbose', action='store_true',
                       help='Mode verbose')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        print("USUALODDS - GENERATEUR PREDICTIONS SOPHISTIQUEES")
        print("=" * 60)
        print(f"Demarrage: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        success = generate_predictions_for_api(args.matches)
        
        print("\n" + "=" * 60)
        if success:
            print("SUCCES: Predictions sophistiquees generees!")
            print("L'API Next.js peut maintenant utiliser les predictions riches.")
            print("\nFichiers crees:")
            print("- predictions_cache_api_sophisticated.json")
            print("- predictions_cache_backup_latest.json")
        else:
            print("ECHEC: Impossible de generer les predictions.")
            
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