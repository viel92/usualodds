#!/usr/bin/env python3
"""
Validation du nettoyage des features
Verifie que les doublons ont ete correctement supprimes
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

def load_environment():
    """Charge les variables d'environnement"""
    if os.path.exists('.env.local'):
        load_dotenv('.env.local')
        return True
    return False

def get_table_columns(supabase: Client, table_name: str):
    """Recupere les colonnes d'une table"""
    try:
        # Essayer d'obtenir la structure via une requete vide
        response = supabase.table(table_name).select('*').limit(0).execute()
        
        if response.data is not None:
            # Pas de donnees mais structure OK
            return []
        
        # Sinon essayer avec une requete qui retourne une ligne
        response = supabase.table(table_name).select('*').limit(1).execute()
        
        if response.data and len(response.data) > 0:
            return list(response.data[0].keys())
        else:
            return []
            
    except Exception as e:
        print(f"Erreur acces table {table_name}: {e}")
        return None

def validate_duplicates_removed(supabase: Client):
    """Valide que les doublons ont ete supprimes"""
    print("VALIDATION SUPPRESSION DOUBLONS")
    print("=" * 40)
    
    # Colonnes qui devraient avoir ete supprimees
    removed_columns = {
        'match_statistics': [
            'total_shots',      # Doublon de shots_total
            'shots_on_goal',    # Doublon de shots_on_target  
            'shots_insidebox',  # Doublon de shots_inside_box
            'shots_outsidebox'  # Doublon de shots_outside_box
        ],
        'team_features': [
            'corners_conversion_rate'  # Doublon de corner_conversion
        ]
    }
    
    # Colonnes qui devraient etre conservees
    kept_columns = {
        'match_statistics': [
            'shots_total',
            'shots_on_target', 
            'shots_inside_box',
            'shots_outside_box'
        ],
        'team_features': [
            'corner_conversion'
        ]
    }
    
    validation_results = {}
    
    for table_name in removed_columns.keys():
        print(f"\nTable: {table_name}")
        print("-" * 20)
        
        # Obtenir colonnes actuelles
        current_columns = get_table_columns(supabase, table_name)
        
        if current_columns is None:
            print(f"  ERREUR: Impossible d'acceder a {table_name}")
            validation_results[table_name] = 'error'
            continue
        
        table_results = {
            'removed_correctly': [],
            'not_removed': [],
            'kept_correctly': [],
            'accidentally_removed': []
        }
        
        # Verifier suppressions
        for col in removed_columns[table_name]:
            if col not in current_columns:
                table_results['removed_correctly'].append(col)
                print(f"  OK Supprime: {col}")
            else:
                table_results['not_removed'].append(col)
                print(f"  ERREUR Pas supprime: {col}")
        
        # Verifier conservations
        for col in kept_columns[table_name]:
            if col in current_columns:
                table_results['kept_correctly'].append(col)
                print(f"  OK Conserve: {col}")
            else:
                table_results['accidentally_removed'].append(col)
                print(f"  ERREUR Supprime par accident: {col}")
        
        validation_results[table_name] = table_results
    
    return validation_results

def calculate_cleanup_impact(supabase: Client):
    """Calcule l'impact du nettoyage"""
    print("\nIMPACT DU NETTOYAGE")
    print("=" * 25)
    
    tables_info = {}
    
    for table_name in ['match_statistics', 'team_features']:
        columns = get_table_columns(supabase, table_name)
        
        if columns is not None:
            tables_info[table_name] = {
                'current_columns': len(columns),
                'sample_columns': columns[:5] if len(columns) > 5 else columns
            }
        else:
            tables_info[table_name] = {'current_columns': 'unknown'}
    
    # Calculer reduction estimee
    original_total = 31 + 90  # match_statistics + team_features (avant cleanup)
    current_total = sum(
        info['current_columns'] for info in tables_info.values() 
        if isinstance(info['current_columns'], int)
    )
    
    if current_total > 0:
        removed_count = original_total - current_total
        reduction_percent = (removed_count / original_total) * 100
        
        print(f"Colonnes avant nettoyage: {original_total}")
        print(f"Colonnes apres nettoyage: {current_total}")
        print(f"Colonnes supprimees: {removed_count}")
        print(f"Reduction: {reduction_percent:.1f}%")
    
    for table_name, info in tables_info.items():
        if isinstance(info['current_columns'], int):
            print(f"\n{table_name}: {info['current_columns']} colonnes")
            print(f"  Exemples: {', '.join(info['sample_columns'])}")
    
    return tables_info

def check_data_integrity(supabase: Client):
    """Verifie l'integrite des donnees apres nettoyage"""
    print("\nVERIFICATION INTEGRITE DONNEES")
    print("=" * 35)
    
    integrity_checks = []
    
    # Test 1: Verifier que les tables sont toujours accessibles
    for table_name in ['match_statistics', 'team_features']:
        try:
            response = supabase.table(table_name).select('id').limit(1).execute()
            
            if response.error:
                integrity_checks.append(f"ERREUR {table_name}: {response.error.message}")
            else:
                integrity_checks.append(f"OK {table_name}: Table accessible")
                
        except Exception as e:
            integrity_checks.append(f"ERREUR {table_name}: {str(e)}")
    
    # Test 2: Compter les lignes pour s'assurer qu'aucune donnee n'a ete perdue
    try:
        for table_name in ['match_statistics', 'team_features']:
            response = supabase.table(table_name).select('*', count='exact').limit(0).execute()
            
            if response.count is not None:
                integrity_checks.append(f"OK {table_name}: {response.count} lignes")
            else:
                integrity_checks.append(f"WARNING {table_name}: Impossible de compter")
                
    except Exception as e:
        integrity_checks.append(f"ERREUR comptage: {str(e)}")
    
    # Afficher resultats
    for check in integrity_checks:
        print(f"  {check}")
    
    return integrity_checks

def generate_cleanup_report(validation_results, tables_info, integrity_checks):
    """Genere un rapport de nettoyage"""
    print("\n" + "=" * 50)
    print("RAPPORT FINAL DE NETTOYAGE")
    print("=" * 50)
    
    # Calculer score de reussite
    total_validations = 0
    successful_validations = 0
    
    for table_name, results in validation_results.items():
        if isinstance(results, dict):
            total_validations += len(results['removed_correctly']) + len(results['kept_correctly'])
            total_validations += len(results['not_removed']) + len(results['accidentally_removed'])
            
            successful_validations += len(results['removed_correctly']) + len(results['kept_correctly'])
    
    success_rate = (successful_validations / total_validations * 100) if total_validations > 0 else 0
    
    print(f"Taux de reussite: {success_rate:.1f}% ({successful_validations}/{total_validations})")
    
    # Problemes detectes
    problems = []
    for table_name, results in validation_results.items():
        if isinstance(results, dict):
            problems.extend([f"{table_name}: {col} pas supprime" for col in results['not_removed']])
            problems.extend([f"{table_name}: {col} supprime par accident" for col in results['accidentally_removed']])
    
    if problems:
        print(f"\nProblemes detectes ({len(problems)}):")
        for problem in problems:
            print(f"  - {problem}")
    else:
        print("\nAucun probleme detecte")
    
    # Statut integrite
    error_checks = [check for check in integrity_checks if 'ERREUR' in check]
    if error_checks:
        print(f"\nProblemes d'integrite ({len(error_checks)}):")
        for error in error_checks:
            print(f"  - {error}")
    else:
        print("\nIntegrite des donnees: OK")
    
    # Recommandations
    print("\nRECOMMANDATIONS:")
    if success_rate >= 90:
        print("  + Nettoyage reussi, passer a la Phase P1")
        print("  + Surveiller les performances du modele")
    elif success_rate >= 70:
        print("  - Corriger les problemes detectes avant P1")
        print("  - Re-executer la validation")
    else:
        print("  ! Nettoyage echoue, analyser les erreurs")
        print("  ! Possiblement restaurer depuis backup")
    
    return {
        'success_rate': success_rate,
        'problems_count': len(problems),
        'integrity_errors': len(error_checks)
    }

def main():
    """Fonction principale"""
    print("VALIDATION NETTOYAGE FEATURES - USUALODDS")
    print("=" * 50)
    
    # Charger environnement
    if not load_environment():
        print("ERREUR: Fichier .env.local non trouve")
        sys.exit(1)
    
    # Connexion Supabase
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if not url or not key:
        print("ERREUR: Variables Supabase manquantes")
        sys.exit(1)
    
    try:
        supabase: Client = create_client(url, key)
        print("Connexion Supabase etablie")
    except Exception as e:
        print(f"ERREUR connexion Supabase: {e}")
        sys.exit(1)
    
    # Executer validations
    validation_results = validate_duplicates_removed(supabase)
    tables_info = calculate_cleanup_impact(supabase)
    integrity_checks = check_data_integrity(supabase)
    
    # Generer rapport
    report = generate_cleanup_report(validation_results, tables_info, integrity_checks)
    
    # Code de sortie
    exit_code = 0 if report['success_rate'] >= 90 and report['integrity_errors'] == 0 else 1
    sys.exit(exit_code)

if __name__ == "__main__":
    main()