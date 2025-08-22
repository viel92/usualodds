#!/usr/bin/env python3
"""
Vérifier quelles équipes manquent dans team_features
"""

import os
from supabase import create_client, Client
from datetime import datetime, timedelta

def check_missing_teams():
    print("ANALYSE: Équipes manquantes dans team_features")
    print("="*60)
    
    # Configuration Supabase
    url = 'https://agysfqhijfbnqzzooyeo.supabase.co'
    service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    
    supabase: Client = create_client(url, service_key)
    
    # 1. Récupérer tous les team_ids uniques des matches récents et à venir
    print("\n1. Collecte des équipes des matches...")
    
    # Matches récents (30 derniers jours)
    date_limit = (datetime.now() - timedelta(days=30)).isoformat()
    
    response = supabase.table('matches') \
        .select('home_team_id, away_team_id, home_team_name, away_team_name') \
        .gte('date', date_limit) \
        .execute()
    
    matches = response.data
    print(f"   - {len(matches)} matches trouvés")
    
    # Collecter tous les team_ids uniques
    teams_in_matches = {}
    for match in matches:
        teams_in_matches[match['home_team_id']] = match['home_team_name']
        teams_in_matches[match['away_team_id']] = match['away_team_name']
    
    print(f"   - {len(teams_in_matches)} équipes uniques trouvées")
    
    # 2. Récupérer les team_ids qui ont des données dans team_features
    print("\n2. Vérification dans team_features...")
    
    response = supabase.table('team_features') \
        .select('team_id') \
        .execute()
    
    teams_with_features = set()
    for record in response.data:
        teams_with_features.add(record['team_id'])
    
    print(f"   - {len(teams_with_features)} team_ids uniques dans team_features")
    
    # 3. Identifier les équipes manquantes
    print("\n3. Équipes MANQUANTES dans team_features:")
    print("-"*40)
    
    missing_teams = []
    for team_id, team_name in teams_in_matches.items():
        if team_id not in teams_with_features:
            missing_teams.append((team_id, team_name))
            print(f"   [X] ID {team_id}: {team_name}")
    
    if not missing_teams:
        print("   [OK] Toutes les équipes ont des données!")
    else:
        print(f"\n   Total: {len(missing_teams)} équipes manquantes sur {len(teams_in_matches)}")
    
    # 4. Vérifier les équipes présentes
    print("\n4. Équipes PRÉSENTES dans team_features:")
    print("-"*40)
    
    present_teams = []
    for team_id, team_name in teams_in_matches.items():
        if team_id in teams_with_features:
            present_teams.append((team_id, team_name))
    
    # Afficher quelques exemples
    for team_id, team_name in present_teams[:10]:
        print(f"   [OK] ID {team_id}: {team_name}")
    
    if len(present_teams) > 10:
        print(f"   ... et {len(present_teams) - 10} autres équipes")
    
    # 5. Statistiques finales
    print("\n5. RÉSUMÉ:")
    print("-"*40)
    print(f"   - Équipes dans les matches: {len(teams_in_matches)}")
    print(f"   - Équipes avec données: {len(present_teams)} ({len(present_teams)*100//len(teams_in_matches)}%)")
    print(f"   - Équipes sans données: {len(missing_teams)} ({len(missing_teams)*100//len(teams_in_matches)}%)")
    
    # 6. Générer des données ELO par défaut pour les équipes manquantes
    if missing_teams:
        print("\n6. SOLUTION PROPOSÉE:")
        print("-"*40)
        print("   Créer des entrées par défaut pour les équipes manquantes")
        print("   avec ELO=1500 et autres valeurs par défaut")
        
        response = input("\n   Voulez-vous créer les données manquantes? (y/n): ")
        
        if response.lower() == 'y':
            print("\n   Création des données...")
            
            for team_id, team_name in missing_teams:
                try:
                    # Créer une entrée par défaut
                    data = {
                        'team_id': team_id,
                        'season': 2024,
                        'league_id': 61,  # Ligue 1
                        'elo_rating': 1500,
                        'form_5_points': 7.5,
                        'goals_per_game': 1.2,
                        'goals_conceded_per_game': 1.2,
                        'xg_for_avg': 1.2,
                        'xg_against_avg': 1.2,
                        'possession_avg': 50,
                        'shots_per_game': 12,
                        'shots_against_per_game': 12,
                        'shots_on_target_avg': 4,
                        'pressing_intensity': 50,
                        'tempo_score': 50,
                        'discipline_index': 0.5
                    }
                    
                    response = supabase.table('team_features').insert(data).execute()
                    print(f"   [OK] Créé: {team_name} (ID {team_id})")
                    
                except Exception as e:
                    print(f"   [X] Erreur pour {team_name}: {e}")
            
            print("\n   Données créées avec succès!")
    
    print("\n" + "="*60)
    print("FIN DE L'ANALYSE")

if __name__ == "__main__":
    check_missing_teams()