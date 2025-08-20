#!/usr/bin/env python3
"""
AUDIT SIMPLE DONNÉES - DIAGNOSTIC PROBLÈMES INGESTION
=====================================================
Version sans emojis pour identifier les vrais problèmes
"""

import os
import numpy as np
import pandas as pd
from datetime import datetime
import warnings
from supabase import create_client, Client
from dotenv import load_dotenv

warnings.filterwarnings('ignore')

def audit_data_problems():
    """Audit simple des problèmes de données"""
    print("AUDIT DONNEES USUALODDS - DIAGNOSTIC PROBLEMES")
    print("==============================================")
    
    # 1. Connexion
    load_dotenv()
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    try:
        supabase = create_client(supabase_url, service_role_key)
        print("  [SUCCESS] Connexion Supabase etablie")
    except Exception as e:
        print(f"  [ERROR] Connexion impossible: {e}")
        return
    
    # 2. AUDIT PLAYER_FEATURES - Problème buteurs
    print("\nAUDIT PLAYER_FEATURES (Probleme buteurs)")
    print("========================================")
    
    try:
        # D'abord voir la structure
        test_player = supabase.table('player_features').select('*').limit(1).execute()
        if test_player.data:
            player_cols = list(test_player.data[0].keys())
            print(f"  Colonnes disponibles: {player_cols}")
            
            # Identifier colonnes goals/name
            name_col = None
            goals_col = None
            
            for col in player_cols:
                if 'name' in col.lower():
                    name_col = col
                if 'goal' in col.lower():
                    goals_col = col
            
            print(f"  Colonne nom detectee: {name_col}")
            print(f"  Colonne goals detectee: {goals_col}")
            
            if goals_col:
                # Extraire top buteurs avec bonne colonne
                response = supabase.table('player_features').select(
                    f'{name_col}, {goals_col}, season, team_name'
                ).order(goals_col, desc=True).limit(10).execute()
                
                top_scorers = response.data
                print(f"\n  TOP 10 BUTEURS:")
                for i, player in enumerate(top_scorers, 1):
                    name = player.get(name_col, 'Unknown')
                    goals = player.get(goals_col, 0)
                    season = player.get('season', 'Unknown')
                    print(f"    {i}. {name}: {goals} buts (saison {season})")
                
                max_goals = max([p.get(goals_col, 0) for p in top_scorers])
                print(f"\n  [DIAGNOSTIC] Max goals trouve: {max_goals}")
                
                if max_goals < 20:
                    print(f"  [PROBLEME CRITIQUE] {max_goals} goals max - impossible!")
                    print(f"    Mbappe/Benzema devraient avoir 25+ goals")
                    print(f"    Probleme ingestion API Football detecte")
                else:
                    print(f"  [OK] Goals semblent realistes")
            
        else:
            print("  [ERROR] Table player_features vide")
            
    except Exception as e:
        print(f"  [ERROR] Audit player_features echoue: {e}")
    
    # 3. AUDIT TEAM_FEATURES - Problème données vides
    print("\nAUDIT TEAM_FEATURES (Donnees vides)")
    print("===================================")
    
    try:
        response = supabase.table('team_features').select('*').limit(100).execute()
        team_data = response.data
        df_teams = pd.DataFrame(team_data)
        
        print(f"  [DATA] {len(df_teams)} team_features extraites")
        
        if len(df_teams) > 0:
            # Colonnes importantes
            important_cols = [
                'elo_rating', 'form_5_points', 'goals_per_game', 
                'possession_avg', 'points', 'wins', 'draws', 'losses'
            ]
            
            print(f"\n  COMPLETUDE DONNEES:")
            total_missing = 0
            
            for col in important_cols:
                if col in df_teams.columns:
                    null_count = df_teams[col].isna().sum()
                    null_pct = null_count / len(df_teams) * 100
                    total_missing += null_pct
                    
                    status = "CRITIQUE" if null_pct > 50 else "MOYEN" if null_pct > 20 else "OK"
                    print(f"    {col}: {null_count} vides ({null_pct:.1f}%) [{status}]")
                else:
                    print(f"    {col}: COLONNE MANQUANTE")
                    total_missing += 100
            
            avg_missing = total_missing / len(important_cols)
            print(f"\n  [DIAGNOSTIC] Moyenne donnees manquantes: {avg_missing:.1f}%")
            
            if avg_missing > 40:
                print(f"  [PROBLEME CRITIQUE] Trop de donnees vides!")
                print(f"    Scripts calculate-advanced-features.js pas executes?")
            else:
                print(f"  [OK] Qualite donnees acceptable")
                
        else:
            print("  [ERROR] Aucune team_features trouvee")
            
    except Exception as e:
        print(f"  [ERROR] Audit team_features echoue: {e}")
    
    # 4. AUDIT MATCHES - Structure données
    print("\nAUDIT MATCHES (Structure)")
    print("=========================")
    
    try:
        response = supabase.table('matches').select('*').limit(10).execute()
        matches_data = response.data
        
        if matches_data:
            cols = list(matches_data[0].keys())
            print(f"  [STRUCTURE] {len(cols)} colonnes disponibles")
            print(f"    Colonnes: {cols}")
            
            # Vérifier champs critiques
            critical_fields = ['home_team_id', 'away_team_id', 'season']
            missing = []
            
            for field in critical_fields:
                if field not in cols:
                    missing.append(field)
                    
            if missing:
                print(f"  [PROBLEME] Champs manquants: {missing}")
            else:
                print(f"  [OK] Champs critiques presents")
                
            # Distribution par saison
            df_matches = pd.DataFrame(matches_data)
            if 'season' in df_matches.columns:
                seasons = df_matches['season'].value_counts()
                print(f"  [SAISONS] Repartition: {dict(seasons)}")
                
        else:
            print("  [ERROR] Aucun match trouve")
            
    except Exception as e:
        print(f"  [ERROR] Audit matches echoue: {e}")
    
    # 5. AUDIT API CONFIGURATION
    print("\nAUDIT CONFIGURATION API")
    print("=======================")
    
    api_key = os.getenv('API_FOOTBALL_KEY')
    api_host = os.getenv('API_FOOTBALL_HOST')
    
    print(f"  API Football Key: {'PRESENTE' if api_key else 'MANQUANTE'}")
    print(f"  API Football Host: {'PRESENT' if api_host else 'MANQUANT'}")
    
    if api_key:
        print(f"    Key (masquee): {api_key[:8]}...{api_key[-4:]}")
    
    if not api_key:
        print("  [PROBLEME CRITIQUE] Pas de cle API - ingestion impossible!")
    
    # 6. RECOMMANDATIONS
    print("\nRECOMMANDATIONS URGENTES")
    print("========================")
    
    print("  1. FIXER INGESTION PLAYER STATS")
    print("     - Verifier scripts d'ingestion API Football")
    print("     - Controler endpoint /players/topscorers")
    print("     - Reingeser donnees saison courante")
    
    print("  2. FIXER TEAM_FEATURES VIDES")
    print("     - Relancer calculate-advanced-features.js")
    print("     - Verifier calculate-historical-team-features.js")  
    print("     - Calculer ELO/Form/Possession manquants")
    
    print("  3. ARRETER ML TEMPORAIREMENT")
    print("     - Ne pas entrainer modeles avec donnees defaillantes")
    print("     - Fixer ingestion d'abord, puis ML")
    
    print("\n  PRIORITE: Reparer donnees avant continuer ML!")

if __name__ == "__main__":
    audit_data_problems()