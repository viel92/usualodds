#!/usr/bin/env python3
"""
DEBOGAGE URGENT: ELO ratings bloques a 1500
==========================================

Script pour identifier pourquoi les donnees team_features (100 records avec vrais ELOs)
ne sont PAS recuperees par l'API predictions/route.ts
"""

import os
import json
from supabase import create_client, Client

def debug_elo_issue():
    print("DEBOGAGE - ELO ratings bloques a 1500")
    print("==========================================\n")
    
    # Configuration Supabase (hardcoded pour debug)
    url = 'https://agysfqhijfbnqzzooyeo.supabase.co'
    service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    
    if not url or not service_key:
        print("Variables d'environnement Supabase manquantes!")
        print(f"URL: {'OK' if url else 'MANQUANT'}")
        print(f"Service Key: {'OK' if service_key else 'MANQUANT'}")
        return
        
    try:
        supabase: Client = create_client(url, service_key)
        print("Connexion Supabase OK\n")
        
        # 1. VERIFIER STRUCTURE TABLE team_features
        print("1. Structure de la table team_features:")
        response = supabase.table('team_features').select('*').limit(1).execute()
        
        if response.data:
            columns = list(response.data[0].keys()) if response.data else []
            print(f"Structure OK, colonnes: {len(columns)} disponibles")
            print(f"Principales colonnes: {columns[:10]}")
        else:
            print("ERREUR: Aucune donnee trouvee dans team_features")
            return
            
        # 2. VERIFIER NOMBRE TOTAL D'ENREGISTREMENTS  
        print("\n2. Nombre total d'enregistrements team_features:")
        response = supabase.table('team_features').select('*', count='exact').execute()
        count = response.count
        print(f"Total: {count} enregistrements")
        
        # 3. VERIFIER ECHANTILLON DE DONNEES ELO
        print("\n3. Echantillon donnees ELO (top 10):")
        response = supabase.table('team_features') \
            .select('team_id, elo_rating, season') \
            .order('elo_rating', desc=True) \
            .limit(10) \
            .execute()
            
        for i, team in enumerate(response.data[:5]):  # Limite à 5 pour lisibilité
            print(f"  #{i+1}: Team ID: {team['team_id']}")
            print(f"      ELO: {team['elo_rating']}, Saison: {team.get('season', 'N/A')}")
            
        # 4. RECUPERER MATCHES A VENIR POUR TEST
        print("\n4. Recuperation matches a venir pour test:")
        from datetime import datetime
        now = datetime.now().isoformat()
        
        response = supabase.table('matches') \
            .select('id, home_team_id, away_team_id, home_team_name, away_team_name, date') \
            .gte('date', now) \
            .order('date') \
            .limit(3) \
            .execute()
            
        matches = response.data
        print(f"Matches trouves: {len(matches)}")
        
        if len(matches) == 0:
            print("ATTENTION: Aucun match a venir trouve!")
            # Essayer avec des matches recents
            response = supabase.table('matches') \
                .select('id, home_team_id, away_team_id, home_team_name, away_team_name, date') \
                .order('date', desc=True) \
                .limit(3) \
                .execute()
            matches = response.data
            print(f"Fallback sur matches recents: {len(matches)}")
        
        # 5. TESTER LES REQUETES EXACTES DE L'API POUR CHAQUE MATCH
        print("\n5. Test requetes API exactes pour chaque match:")
        
        for i, match in enumerate(matches):
            print(f"\nMATCH TEST #{i+1}: {match['home_team_name']} vs {match['away_team_name']}")
            print(f"IDs: Home={match['home_team_id']}, Away={match['away_team_id']}")
            
            # Test team_id existance d'abord
            for team_type, team_id in [('HOME', match['home_team_id']), ('AWAY', match['away_team_id'])]:
                print(f"\n  {team_type} team (ID {team_id}):")
                
                # Simple existance check
                response = supabase.table('team_features') \
                    .select('team_id, elo_rating, season') \
                    .eq('team_id', team_id) \
                    .execute()
                
                found_records = len(response.data)
                print(f"    Records trouves: {found_records}")
                
                if found_records > 0:
                    # Montrer tous les records pour ce team_id
                    for j, record in enumerate(response.data):
                        print(f"      #{j+1}: Team ID {record['team_id']}")
                        print(f"           ELO: {record['elo_rating']}, Saison: {record.get('season', 'N/A')}")
                    
                    # Test la requete exacte de l'API (avec .single())
                    try:
                        api_response = supabase.table('team_features') \
                            .select('elo_rating, form_5_points, season') \
                            .eq('team_id', team_id) \
                            .order('season', desc=True) \
                            .limit(1) \
                            .execute()
                        
                        if api_response.data:
                            single_record = api_response.data[0]
                            print(f"    API Query SUCCESS: ELO {single_record['elo_rating']}")
                            print(f"                       Form: {single_record.get('form_5_points', 'N/A')}")
                            print(f"                       Season: {single_record.get('season', 'N/A')}")
                        else:
                            print(f"    API Query FAILED: Aucune donnee avec order by season")
                            
                    except Exception as e:
                        print(f"    API Query ERROR: {str(e)}")
                else:
                    print(f"    PROBLEME: Team ID {team_id} n'existe pas dans team_features!")
                    
        # 6. VERIFICATION: Distribution des saisons
        print("\n6. Distribution des saisons dans team_features:")
        response = supabase.table('team_features') \
            .select('season') \
            .execute()
            
        if response.data:
            seasons = {}
            for row in response.data:
                season = row.get('season')
                if season is not None:
                    seasons[season] = seasons.get(season, 0) + 1
                else:
                    seasons['NULL'] = seasons.get('NULL', 0) + 1
                    
            print("Distribution:")
            for season, count in sorted(seasons.items()):
                print(f"   Saison {season}: {count} teams")
                
        # 7. VERIFICATION CRITIQUE: team_id format
        print("\n7. Verification format team_id:")
        
        # Echantillon team_ids de matches
        response = supabase.table('matches') \
            .select('home_team_id, away_team_id') \
            .limit(5) \
            .execute()
            
        match_team_ids = []
        for match in response.data:
            match_team_ids.extend([match['home_team_id'], match['away_team_id']])
            
        # Echantillon team_ids de team_features
        response = supabase.table('team_features') \
            .select('team_id') \
            .limit(5) \
            .execute()
            
        feature_team_ids = [row['team_id'] for row in response.data]
        
        print(f"Exemples team_id dans MATCHES: {match_team_ids[:5]}")
        print(f"Types: {[type(tid) for tid in match_team_ids[:3]]}")
        print(f"Exemples team_id dans TEAM_FEATURES: {feature_team_ids[:5]}")  
        print(f"Types: {[type(tid) for tid in feature_team_ids[:3]]}")
        
        # Test correspondance
        common_ids = set(match_team_ids) & set(feature_team_ids)
        print(f"IDs communs trouves: {len(common_ids)}")
        print(f"Exemples communs: {list(common_ids)[:3]}")
        
        print("\nFIN DU DEBOGAGE")
        print("="*50)
        
    except Exception as error:
        print(f"ERREUR GENERALE: {error}")

if __name__ == "__main__":
    debug_elo_issue()