#!/usr/bin/env python3
"""
CHECK PLAYER NAMES FIXED
========================
Vérifier si les noms des joueurs sont maintenant présents
"""

import os
from supabase import create_client
from dotenv import load_dotenv

def check_names_fixed():
    print("VERIFICATION NOMS JOUEURS APRES EXTRACTION")
    print("="*45)
    
    load_dotenv()
    supabase = create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    )
    
    try:
        # Top scorers avec noms
        response = supabase.table('player_features').select(
            'player_name, team_name, goals, assists, appearences, minutes_total'
        ).order('goals', desc=True).limit(15).execute()
        
        print("TOP 15 BUTEURS AVEC NOMS:")
        print("-"*50)
        
        names_count = 0
        for i, player in enumerate(response.data, 1):
            name = player.get('player_name', 'NO_NAME')
            team = player.get('team_name', 'NO_TEAM')
            goals = player.get('goals', 0)
            assists = player.get('assists', 0)
            apps = player.get('appearences', 0)
            minutes = player.get('minutes_total', 0)
            
            if name and name != 'NO_NAME':
                names_count += 1
            
            print(f"  {i:2d}. {name:20s} ({team:15s}) - {goals:2d}G {assists:2d}A {apps:2d}M {minutes:4d}min")
        
        # Statistiques globales
        total_response = supabase.table('player_features').select(
            'player_name, team_name', count='exact'
        ).execute()
        
        total_players = total_response.count
        
        # Compter joueurs avec noms
        players_with_name = 0
        players_with_team = 0
        
        for player in total_response.data:
            if player.get('player_name'):
                players_with_name += 1
            if player.get('team_name'):
                players_with_team += 1
        
        print(f"\nSTATISTIQUES GLOBALES:")
        print(f"  Total joueurs: {total_players}")
        print(f"  Avec player_name: {players_with_name} ({players_with_name/total_players*100:.1f}%)")
        print(f"  Avec team_name: {players_with_team} ({players_with_team/total_players*100:.1f}%)")
        
        # Diagnostic
        print(f"\nDIAGNOSTIC:")
        if players_with_name >= total_players * 0.8:
            print("  NOMS: EXCELLENTE extraction (>80%)")
        elif players_with_name >= total_players * 0.5:
            print("  NOMS: BONNE extraction (>50%)")
        else:
            print("  NOMS: PROBLEME - Extraction incomplète")
        
        if players_with_team >= total_players * 0.8:
            print("  TEAMS: EXCELLENTE extraction (>80%)")
        else:
            print("  TEAMS: PROBLEME - Extraction incomplète")
        
        # Problème des données sources
        max_goals = max([p.get('goals', 0) for p in response.data]) if response.data else 0
        print(f"\nPROBLEME DONNEES SOURCES:")
        print(f"  Max buts dans DB: {max_goals}")
        print(f"  Max buts API réels: 21 (Dembélé)")
        print(f"  Problème: DONNÉES SOURCE OBSOLÈTES dans raw_stats")
        print(f"  Solution: RE-INGESTATION depuis API Football 2024")
        
        return {
            'names_ok': players_with_name >= total_players * 0.8,
            'teams_ok': players_with_team >= total_players * 0.8,
            'data_current': max_goals >= 20
        }
        
    except Exception as e:
        print(f"ERREUR: {e}")
        return None

if __name__ == "__main__":
    check_names_fixed()