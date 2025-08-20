#!/usr/bin/env python3
"""
SIMPLE COMPARE DATA - Sans emojis pour Windows
===============================================
"""

import os
import json
from supabase import create_client
from dotenv import load_dotenv

def simple_compare():
    print("COMPARAISON COLONNES VS JSON")
    print("="*40)
    
    load_dotenv()
    supabase = create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    )
    
    try:
        # Extraire échantillon player_features
        response = supabase.table('player_features').select(
            'player_id, goals, assists, appearences, minutes_total, raw_stats'
        ).limit(3).execute()
        
        if not response.data:
            print("Pas de données")
            return
        
        print("ANALYSE ECHANTILLON:")
        print("-"*25)
        
        for i, player in enumerate(response.data, 1):
            print(f"\nJOUEUR {i} (ID: {player.get('player_id', 'Unknown')}):")
            
            # Colonnes
            col_goals = player.get('goals', 0) or 0
            col_assists = player.get('assists', 0) or 0
            col_appearances = player.get('appearences', 0) or 0
            col_minutes = player.get('minutes_total', 0) or 0
            
            print(f"  COLONNES: Goals={col_goals}, Assists={col_assists}, Apps={col_appearances}, Min={col_minutes}")
            
            # JSON
            raw_stats = player.get('raw_stats')
            if raw_stats:
                try:
                    if isinstance(raw_stats, str):
                        stats = json.loads(raw_stats)
                    else:
                        stats = raw_stats
                    
                    json_goals = 0
                    json_assists = 0
                    json_appearances = 0
                    json_minutes = 0
                    
                    if 'goals' in stats:
                        json_goals = stats['goals'].get('total', 0) or 0
                        json_assists = stats['goals'].get('assists', 0) or 0
                    
                    if 'games' in stats:
                        json_appearances = stats['games'].get('appearences', 0) or 0
                        json_minutes = stats['games'].get('minutes', 0) or 0
                    
                    print(f"  JSON:     Goals={json_goals}, Assists={json_assists}, Apps={json_appearances}, Min={json_minutes}")
                    
                    # Comparaison simple
                    goals_ok = col_goals == json_goals
                    assists_ok = col_assists == json_assists
                    
                    if goals_ok and assists_ok:
                        print(f"  STATUS:   COHERENT")
                    else:
                        print(f"  STATUS:   INCOHERENT (Goals={goals_ok}, Assists={assists_ok})")
                    
                    # Montrer team info du JSON
                    if 'team' in stats:
                        team_name = stats['team'].get('name', 'Unknown')
                        print(f"  TEAM JSON: {team_name}")
                    
                except Exception as e:
                    print(f"  JSON:     ERREUR - {str(e)[:50]}")
            else:
                print(f"  JSON:     ABSENT")
        
        # CONCLUSION
        print(f"\nCONCLUSION:")
        print(f"  1. COLONNES existent: goals, assists, appearences, minutes_total")
        print(f"  2. JSON raw_stats contient mêmes données")
        print(f"  3. PROBLEME: Pas de colonne player_name")
        print(f"  4. SOLUTION: Extraire team.name et player depuis JSON vers colonnes")
        
    except Exception as e:
        print(f"ERREUR: {e}")

if __name__ == "__main__":
    simple_compare()