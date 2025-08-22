#!/usr/bin/env python3
"""
DEBUG: Team ID mapping issue
============================

Le problème est identifié: les team_ids dans 'matches' ne correspondent pas 
aux team_ids dans 'team_features'. Il faut identifier la source du problème.
"""

import os
from supabase import create_client, Client

def debug_team_mapping():
    print("DEBUG: Team ID mapping issue")
    print("================================\n")
    
    # Configuration Supabase (hardcoded pour debug)
    url = 'https://agysfqhijfbnqzzooyeo.supabase.co'
    service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    
    try:
        supabase: Client = create_client(url, service_key)
        print("Connexion OK\n")
        
        # 1. VÉRIFIER S'IL Y A UNE TABLE TEAMS MAITRE
        print("1. Tables disponibles qui contiennent 'team':")
        # On ne peut pas lister les tables directement avec supabase-py
        # Donc on teste les noms de tables communes
        possible_team_tables = ['teams', 'team_profiles', 'team_master', 'team_mapping']
        
        existing_tables = []
        for table_name in possible_team_tables:
            try:
                response = supabase.table(table_name).select('*').limit(1).execute()
                existing_tables.append(table_name)
                print(f"  - {table_name}: EXISTE ({len(response.data)} records)")
            except Exception as e:
                if 'does not exist' in str(e):
                    print(f"  - {table_name}: N'EXISTE PAS")
                else:
                    print(f"  - {table_name}: ERREUR - {str(e)}")
        
        # 2. ANALYSER LA TABLE 'teams' SI ELLE EXISTE
        if 'teams' in existing_tables:
            print("\n2. Analyse de la table 'teams':")
            response = supabase.table('teams').select('*').limit(5).execute()
            
            if response.data:
                print(f"Structure: {list(response.data[0].keys())}")
                print("Premiers records:")
                for i, team in enumerate(response.data):
                    print(f"  #{i+1}: ID={team.get('id', 'N/A')}, Name={team.get('name', 'N/A')}")
                
                # Comparer avec matches et team_features
                print("\n2.1 Correspondance avec matches:")
                matches_response = supabase.table('matches').select('home_team_id, away_team_id, home_team_name, away_team_name').limit(5).execute()
                
                for match in matches_response.data:
                    # Chercher dans teams par api_id (pas par uuid id)
                    home_team = supabase.table('teams').select('*').eq('api_id', match['home_team_id']).execute()
                    away_team = supabase.table('teams').select('*').eq('api_id', match['away_team_id']).execute()
                    
                    print(f"  Match: {match['home_team_name']} vs {match['away_team_name']}")
                    print(f"    Home ID {match['home_team_id']}: {'TROUVE' if home_team.data else 'ABSENT'}")
                    print(f"    Away ID {match['away_team_id']}: {'TROUVE' if away_team.data else 'ABSENT'}")
        
        # 3. ANALYSER LA CORRESPONDANCE ENTRE NOMS D'ÉQUIPES
        print("\n3. Correspondance par nom d'équipe:")
        
        # Récupérer quelques matches avec noms
        matches_response = supabase.table('matches').select('home_team_id, away_team_id, home_team_name, away_team_name').limit(5).execute()
        
        # Récupérer team_features avec leur ID et voir s'il y a une colonne nom
        features_response = supabase.table('team_features').select('*').limit(5).execute()
        
        if features_response.data:
            feature_columns = list(features_response.data[0].keys())
            name_columns = [col for col in feature_columns if 'name' in col.lower()]
            print(f"Colonnes 'name' dans team_features: {name_columns}")
            
            if name_columns:
                # Essayer de faire correspondre par nom
                name_col = name_columns[0]  # Prendre la première colonne nom trouvée
                
                for match in matches_response.data[:3]:
                    print(f"\nMatch: {match['home_team_name']} vs {match['away_team_name']}")
                    
                    # Chercher par nom dans team_features
                    home_search = supabase.table('team_features').select(f'team_id, {name_col}, elo_rating').ilike(name_col, f"%{match['home_team_name']}%").execute()
                    away_search = supabase.table('team_features').select(f'team_id, {name_col}, elo_rating').ilike(name_col, f"%{match['away_team_name']}%").execute()
                    
                    print(f"  Home '{match['home_team_name']}' (match ID: {match['home_team_id']}):")
                    for result in home_search.data[:3]:
                        print(f"    Trouvé: ID={result['team_id']}, Name='{result[name_col]}', ELO={result.get('elo_rating', 'N/A')}")
                    
                    print(f"  Away '{match['away_team_name']}' (match ID: {match['away_team_id']}):")
                    for result in away_search.data[:3]:
                        print(f"    Trouvé: ID={result['team_id']}, Name='{result[name_col]}', ELO={result.get('elo_rating', 'N/A')}")
        
        # 4. VÉRIFIER LES SOURCES DE DONNÉES
        print("\n4. Sources de données possibles:")
        
        # Vérifier si les IDs dans team_features correspondent à des IDs d'API externes
        print("Echantillon team_ids de team_features:")
        features_sample = supabase.table('team_features').select('team_id, elo_rating').order('elo_rating', desc=True).limit(10).execute()
        
        for team in features_sample.data:
            print(f"  team_id={team['team_id']}, elo={team.get('elo_rating', 'N/A')}")
        
        print("\nEchantillon team_ids de matches:")
        from datetime import datetime
        now = datetime.now().isoformat()
        matches_sample = supabase.table('matches').select('home_team_id, away_team_id, home_team_name, away_team_name').gte('date', now).limit(5).execute()
        
        for match in matches_sample.data:
            print(f"  home={match['home_team_id']} ({match['home_team_name']}), away={match['away_team_id']} ({match['away_team_name']})")
        
        # 5. RECOMMANDATIONS
        print("\n5. RECOMMANDATIONS POUR CORRIGER LE PROBLEME:")
        print("="*50)
        
        # Récupérer tous les team_ids uniques de matches
        all_matches = supabase.table('matches').select('home_team_id, away_team_id').execute()
        match_team_ids = set()
        for match in all_matches.data:
            match_team_ids.add(match['home_team_id'])
            match_team_ids.add(match['away_team_id'])
        
        # Récupérer tous les team_ids uniques de team_features
        all_features = supabase.table('team_features').select('team_id').execute()
        feature_team_ids = set(row['team_id'] for row in all_features.data)
        
        common_ids = match_team_ids & feature_team_ids
        missing_in_features = match_team_ids - feature_team_ids
        
        print(f"Team IDs dans matches: {len(match_team_ids)}")
        print(f"Team IDs dans team_features: {len(feature_team_ids)}")
        print(f"IDs communs: {len(common_ids)} ({len(common_ids)/len(match_team_ids)*100:.1f}%)")
        print(f"IDs manquants dans team_features: {len(missing_in_features)}")
        
        if len(common_ids) < len(match_team_ids) * 0.5:
            print("\n🚨 PROBLÈME CRITIQUE: Moins de 50% des team_ids correspondent!")
            print("Solutions possibles:")
            print("1. Créer un mapping entre les IDs")  
            print("2. Réimporter les données team_features avec les bons IDs")
            print("3. Utiliser une correspondance par nom d'équipe")
            print("4. Vérifier la source des données (API différente?)")
            
            print(f"\nExemples d'IDs manquants: {list(missing_in_features)[:10]}")
        
        print("\nFIN DU DEBUG")
        
    except Exception as error:
        print(f"ERREUR: {error}")

if __name__ == "__main__":
    debug_team_mapping()