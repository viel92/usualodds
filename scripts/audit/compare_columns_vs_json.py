#!/usr/bin/env python3
"""
COMPARE COLUMNS VS JSON - Investigation données dupliquées
===========================================================
Vérifier cohérence entre colonnes et données JSON
"""

import os
import json
from supabase import create_client
from dotenv import load_dotenv

def compare_data_consistency():
    print("COMPARAISON COLONNES VS JSON")
    print("="*40)
    
    load_dotenv()
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    try:
        supabase = create_client(supabase_url, service_role_key)
        
        # Extraire player_features avec colonnes et raw_stats
        response = supabase.table('player_features').select(
            'player_id, goals, assists, appearences, minutes_total, raw_stats'
        ).limit(5).execute()
        
        if not response.data:
            print("Pas de données player_features")
            return
        
        print("ANALYSE COHÉRENCE DONNÉES:")
        print("-"*30)
        
        consistent_count = 0
        inconsistent_count = 0
        
        for i, player in enumerate(response.data, 1):
            print(f"\\nJOUEUR {i} (ID: {player.get('player_id', 'Unknown')}):")
            
            # Données des colonnes
            col_goals = player.get('goals', 0) or 0
            col_assists = player.get('assists', 0) or 0  
            col_appearances = player.get('appearences', 0) or 0
            col_minutes = player.get('minutes_total', 0) or 0
            
            print(f"  COLONNES → Goals:{col_goals}, Assists:{col_assists}, Apps:{col_appearances}, Min:{col_minutes}")
            
            # Données du JSON
            raw_stats = player.get('raw_stats')
            json_goals = json_assists = json_appearances = json_minutes = "N/A"
            
            if raw_stats:
                try:
                    if isinstance(raw_stats, str):
                        stats = json.loads(raw_stats)
                    else:
                        stats = raw_stats
                    
                    # Extraire du JSON
                    if 'goals' in stats:
                        json_goals = stats['goals'].get('total', 0) or 0
                        json_assists = stats['goals'].get('assists', 0) or 0
                    
                    if 'games' in stats:
                        json_appearances = stats['games'].get('appearences', 0) or 0
                        json_minutes = stats['games'].get('minutes', 0) or 0
                    
                    print(f"  JSON     → Goals:{json_goals}, Assists:{json_assists}, Apps:{json_appearances}, Min:{json_minutes}")
                    
                    # Vérifier cohérence
                    goals_match = col_goals == json_goals
                    assists_match = col_assists == json_assists  
                    apps_match = col_appearances == json_appearances
                    minutes_match = col_minutes == json_minutes
                    
                    if goals_match and assists_match and apps_match and minutes_match:
                        print(f"  STATUS   → ✅ COHÉRENT")
                        consistent_count += 1
                    else:
                        print(f"  STATUS   → ❌ INCOHÉRENT")
                        print(f"    Goals: {goals_match}, Assists: {assists_match}, Apps: {apps_match}, Min: {minutes_match}")
                        inconsistent_count += 1
                        
                except Exception as e:
                    print(f"  JSON     → ❌ ERREUR PARSING: {str(e)[:50]}")
                    inconsistent_count += 1
            else:
                print(f"  JSON     → ❌ PAS DE RAW_STATS")
                inconsistent_count += 1
        
        print(f"\\n\\nRÉSUMÉ COHÉRENCE:")
        print(f"  Cohérents: {consistent_count}")
        print(f"  Incohérents: {inconsistent_count}")
        print(f"  Pourcentage cohérent: {consistent_count/(consistent_count+inconsistent_count)*100:.1f}%")
        
        # Diagnostic du problème
        print(f"\\nDIAGNOSTIC ORIGINE:")
        if consistent_count > inconsistent_count:
            print("  ✅ Données majoritairement cohérentes")
            print("  🔍 Problème: Double stockage inutile")
            print("  💡 Action: Supprimer JSON redondant")
        else:
            print("  ❌ Données majoritairement incohérentes") 
            print("  🔍 Problème: Scripts ingestion défaillants")
            print("  💡 Action: Fixer mapping colonnes ← JSON")
        
        return {
            'consistent': consistent_count,
            'inconsistent': inconsistent_count,
            'total': consistent_count + inconsistent_count
        }
        
    except Exception as e:
        print(f"ERREUR: {e}")
        return None

if __name__ == "__main__":
    compare_data_consistency()