#!/usr/bin/env python3
"""
FIX PLAYER NAMES - URGENT
=========================
Problème identifié: player_features sans noms de joueurs
Solutions:
1. Vérifier table 'players' séparée  
2. API Football pour récupérer noms
3. Mise à jour player_features avec noms

CRITIQUE: Sans noms, impossible identifier Mbappé et vrais buteurs
"""

import os
import pandas as pd
import requests
from datetime import datetime
import warnings
from supabase import create_client, Client
from dotenv import load_dotenv
import time

warnings.filterwarnings('ignore')

class PlayerNamesFixer:
    """Réparateur des noms de joueurs manquants"""
    
    def __init__(self):
        load_dotenv()
        
        # Supabase
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.supabase = create_client(self.supabase_url, self.service_role_key)
        
        # API Football
        self.api_key = os.getenv('API_FOOTBALL_KEY')
        self.api_host = os.getenv('API_FOOTBALL_HOST')
        self.api_headers = {
            'X-RapidAPI-Key': self.api_key,
            'X-RapidAPI-Host': self.api_host
        }
        
    def check_existing_players_table(self):
        """Vérifie s'il existe une table players séparée"""
        print("\nVERIFICATION TABLE PLAYERS EXISTANTE")
        print("====================================")
        
        try:
            # Tenter d'accéder à table players
            response = self.supabase.table('players').select('*').limit(5).execute()
            
            if response.data:
                players_data = response.data
                print(f"  [SUCCESS] Table 'players' trouvee: {len(players_data)} exemples")
                
                # Analyser structure
                if players_data:
                    cols = list(players_data[0].keys())
                    print(f"  [STRUCTURE] Colonnes: {cols[:10]}...")
                    
                    # Chercher colonne nom
                    name_cols = [col for col in cols if 'name' in col.lower()]
                    id_cols = [col for col in cols if col in ['id', 'player_id', 'api_id']]
                    
                    print(f"  [NOMS] Colonnes nom detectees: {name_cols}")
                    print(f"  [IDS] Colonnes ID detectees: {id_cols}")
                    
                    # Échantillon données
                    print(f"\n  [ECHANTILLON] 5 premiers joueurs:")
                    for i, player in enumerate(players_data[:5], 1):
                        name = player.get(name_cols[0] if name_cols else 'unknown', 'No Name')
                        player_id = player.get('id', 'No ID')
                        print(f"    {i}. {name} (ID: {player_id})")
                
                return True, name_cols[0] if name_cols else None, id_cols[0] if id_cols else None
            else:
                print(f"  [INFO] Table players existe mais vide")
                return True, None, None
                
        except Exception as e:
            print(f"  [INFO] Table players inexistante: {e}")
            return False, None, None
    
    def get_top_scorers_api_football(self, season=2024, league_id=61):
        """Récupère top buteurs via API Football pour vérification"""
        print(f"\nRECUPERATION TOP SCORERS API FOOTBALL")
        print(f"=====================================")
        
        try:
            url = f"https://{self.api_host}/players/topscorers"
            params = {
                'season': season,
                'league': league_id  # Ligue 1
            }
            
            print(f"  [QUERY] API Football - Season {season}, League {league_id}")
            response = requests.get(url, headers=self.api_headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                top_scorers = data.get('response', [])
                
                print(f"  [SUCCESS] {len(top_scorers)} buteurs récupérés")
                
                print(f"\n  [TOP 10 BUTEURS RÉELS API FOOTBALL]")
                for i, scorer in enumerate(top_scorers[:10], 1):
                    player = scorer.get('player', {})
                    stats = scorer.get('statistics', [{}])[0]
                    
                    name = player.get('name', 'Unknown')
                    goals = stats.get('goals', {}).get('total', 0)
                    team = stats.get('team', {}).get('name', 'Unknown')
                    
                    print(f"    {i}. {name} ({team}): {goals} buts")
                
                # Vérification réalisme
                max_goals_api = max([
                    s.get('statistics', [{}])[0].get('goals', {}).get('total', 0) 
                    for s in top_scorers
                ])
                
                print(f"\n  [REALISME CHECK]")
                print(f"    Max goals API Football: {max_goals_api}")
                
                if max_goals_api >= 20:
                    print(f"    STATUS: REALISTE - Goals API cohérents")
                else:
                    print(f"    STATUS: SUSPECT - Même API a peu de goals")
                
                return top_scorers
                
            else:
                print(f"  [ERROR] API request failed: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"  [ERROR] API Football request échoué: {e}")
            return []
    
    def compare_db_vs_api_scorers(self, api_scorers):
        """Compare nos données DB vs API Football"""
        print(f"\nCOMPARAISON DB vs API FOOTBALL")
        print(f"==============================")
        
        try:
            # Récupérer nos top buteurs DB
            response = self.supabase.table('player_features').select(
                'player_id, goals, goals_per90, season, team_id'
            ).order('goals', desc=True).limit(20).execute()
            
            db_scorers = response.data
            print(f"  [DB] {len(db_scorers)} buteurs extraits de notre DB")
            
            if db_scorers:
                max_goals_db = max([s.get('goals', 0) for s in db_scorers])
                avg_goals_db = sum([s.get('goals', 0) for s in db_scorers]) / len(db_scorers)
                
                print(f"\n  [COMPARAISON STATISTIQUES]")
                print(f"    DB Max Goals: {max_goals_db}")
                print(f"    DB Avg Goals (top 20): {avg_goals_db:.1f}")
                
                if api_scorers:
                    max_goals_api = max([
                        s.get('statistics', [{}])[0].get('goals', {}).get('total', 0) 
                        for s in api_scorers
                    ])
                    
                    print(f"    API Max Goals: {max_goals_api}")
                    print(f"    Écart: {max_goals_api - max_goals_db} goals")
                    
                    if max_goals_api > max_goals_db * 1.5:
                        print(f"    DIAGNOSTIC: INGESTION DB DÉFAILLANTE")
                        print(f"      API a {max_goals_api} vs DB {max_goals_db}")
                        print(f"      Problème majeur d'ingestion confirmé")
                    else:
                        print(f"    DIAGNOSTIC: Données cohérentes")
            
        except Exception as e:
            print(f"  [ERROR] Comparaison échouée: {e}")
    
    def create_player_id_name_mapping(self, api_scorers):
        """Crée mapping player_id → name depuis API"""
        print(f"\nCREATION MAPPING PLAYER_ID -> NAME")
        print(f"==================================")
        
        mapping = {}
        
        try:
            for scorer in api_scorers:
                player = scorer.get('player', {})
                stats = scorer.get('statistics', [{}])[0]
                
                player_api_id = player.get('id')
                player_name = player.get('name')
                
                if player_api_id and player_name:
                    mapping[player_api_id] = {
                        'name': player_name,
                        'goals_api': stats.get('goals', {}).get('total', 0),
                        'team_api': stats.get('team', {}).get('name', '')
                    }
            
            print(f"  [SUCCESS] Mapping créé pour {len(mapping)} joueurs")
            
            # Échantillon mapping
            print(f"\n  [ECHANTILLON MAPPING]")
            for i, (player_id, info) in enumerate(list(mapping.items())[:5], 1):
                print(f"    {player_id} -> {info['name']} ({info['goals_api']} goals)")
            
            return mapping
            
        except Exception as e:
            print(f"  [ERROR] Création mapping échouée: {e}")
            return {}
    
    def update_player_features_with_names(self, mapping):
        """Met à jour player_features avec les noms"""
        print(f"\nMISE A JOUR PLAYER_FEATURES AVEC NOMS")
        print(f"=====================================")
        
        print(f"  [WARNING] Mise à jour DB requise")
        print(f"  [INFO] Cette étape nécessite permissions write sur Supabase")
        print(f"  [MAPPING] {len(mapping)} noms à ajouter")
        
        # Pour l'instant, juste simulation de ce qui serait fait
        print(f"\n  [SIMULATION] Actions qui seraient effectuées:")
        print(f"    1. ALTER TABLE player_features ADD COLUMN player_name TEXT")
        print(f"    2. UPDATE player_features SET player_name = ? WHERE player_id = ?")
        print(f"    3. {len(mapping)} mises à jour de noms")
        
        print(f"\n  [NEXT STEPS MANUAL]")
        print(f"    - Contacter admin DB pour permissions write")
        print(f"    - Ou utiliser interface Supabase Dashboard")
        print(f"    - Ou script d'update avec service role key")

def main():
    """Fonction principale de réparation noms joueurs"""
    print("FIX PLAYER NAMES - REPARATION URGENTE")
    print("=====================================")
    print(f"Début: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    fixer = PlayerNamesFixer()
    
    # 1. Vérifier table players existante
    players_exists, name_col, id_col = fixer.check_existing_players_table()
    
    # 2. Récupérer vrais buteurs depuis API Football
    api_scorers = fixer.get_top_scorers_api_football(season=2024)
    
    # 3. Comparer nos données vs API
    if api_scorers:
        fixer.compare_db_vs_api_scorers(api_scorers)
    
    # 4. Créer mapping pour mise à jour
    if api_scorers:
        mapping = fixer.create_player_id_name_mapping(api_scorers)
        
        # 5. Simulation mise à jour (pas de write real)
        if mapping:
            fixer.update_player_features_with_names(mapping)
    
    print(f"\nRÉSUMÉ FIX PLAYER NAMES")
    print(f"=======================")
    print(f"  Table players existe: {'Oui' if players_exists else 'Non'}")
    print(f"  API buteurs récupérés: {len(api_scorers) if api_scorers else 0}")
    print(f"  Status: Diagnostic complet - Actions requises identifiées")
    print(f"  Fin: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()