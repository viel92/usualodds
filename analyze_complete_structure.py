#!/usr/bin/env python3
"""
Analyse complète de toutes les 16 tables Supabase
pour concevoir le système d'apprentissage automatique
"""

from supabase import create_client, Client
import json

def analyze_all_tables():
    url = 'https://agysfqhijfbnqzzooyeo.supabase.co'
    service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    
    supabase: Client = create_client(url, service_key)
    
    # Liste des 16 tables principales
    tables = [
        'matches', 'teams', 'leagues', 'seasons',
        'team_features', 'player_features', 
        'match_statistics', 'match_events',
        'predictions', 'prediction_features',
        'betting_odds', 'market_movements',
        'weather_conditions', 'referee_features',
        'injury_reports', 'venue_features'
    ]
    
    analysis = {}
    
    for table in tables:
        print(f"\nAnalyse de la table: {table}")
        print("=" * 50)
        
        try:
            # Compter les enregistrements
            count_response = supabase.table(table).select('*', count='exact').limit(1).execute()
            total_rows = count_response.count if count_response.count else 0
            
            # Récupérer un échantillon
            sample_response = supabase.table(table).select('*').limit(1).execute()
            
            if sample_response.data and len(sample_response.data) > 0:
                sample = sample_response.data[0]
                columns = list(sample.keys())
                
                print(f"Total enregistrements: {total_rows}")
                print(f"Nombre de colonnes: {len(columns)}")
                print("\nColonnes principales:")
                
                key_columns = []
                for col in columns[:10]:  # Première 10 colonnes
                    value = sample[col]
                    col_type = type(value).__name__
                    print(f"  - {col}: {col_type}")
                    key_columns.append({'name': col, 'type': col_type, 'sample': str(value)[:50]})
                
                analysis[table] = {
                    'total_rows': total_rows,
                    'total_columns': len(columns),
                    'all_columns': columns,
                    'key_columns': key_columns,
                    'sample_data': sample
                }
                
                # Identifier les colonnes importantes pour ML
                ml_important = []
                if 'elo' in str(columns).lower():
                    ml_important.append('ELO_RATING')
                if 'form' in str(columns).lower():
                    ml_important.append('FORM')
                if 'xg' in str(columns).lower():
                    ml_important.append('XG_DATA')
                if 'result' in str(columns).lower() or 'score' in str(columns).lower():
                    ml_important.append('RESULTS')
                if 'date' in str(columns).lower() or 'time' in str(columns).lower():
                    ml_important.append('TEMPORAL')
                
                if ml_important:
                    print(f"Importance ML: {', '.join(ml_important)}")
                    analysis[table]['ml_importance'] = ml_important
                
            else:
                print(f"Aucune donnee dans {table}")
                analysis[table] = {
                    'total_rows': 0,
                    'status': 'empty'
                }
                
        except Exception as e:
            print(f"Erreur analyse {table}: {str(e)}")
            analysis[table] = {
                'error': str(e)
            }
    
    # Sauvegarder l'analyse
    with open('tables_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(analysis, f, indent=2, default=str, ensure_ascii=False)
    
    print("\n" + "="*60)
    print("RESUME ANALYSE COMPLETE")
    print("="*60)
    
    total_data = sum([t.get('total_rows', 0) for t in analysis.values() if isinstance(t.get('total_rows'), int)])
    print(f"Total enregistrements dans toute la base: {total_data:,}")
    
    # Tables critiques pour ML
    critical_tables = ['matches', 'team_features', 'match_statistics', 'match_events']
    print(f"\nTABLES CRITIQUES POUR ML:")
    for table in critical_tables:
        if table in analysis and 'total_rows' in analysis[table]:
            rows = analysis[table]['total_rows']
            print(f"  - {table}: {rows:,} enregistrements")
    
    # Identifier problèmes
    print(f"\nPROBLEMES IDENTIFIES:")
    static_data_count = 0
    for table, data in analysis.items():
        if isinstance(data, dict) and data.get('total_rows', 0) > 0:
            if 'updated_at' not in data.get('all_columns', []):
                static_data_count += 1
                print(f"  - {table}: Pas de colonne updated_at (donnees statiques)")
    
    print(f"\nRESULTAT: {static_data_count} tables sans mise a jour automatique!")
    print("Analyse sauvegardee dans tables_analysis.json")

if __name__ == "__main__":
    analyze_all_tables()