#!/usr/bin/env python3
"""
RUN EXTRACTION AUTO - Sans input interactif
============================================
"""

import os
import json
from supabase import create_client
from dotenv import load_dotenv

def run_automatic_extraction():
    print("EXTRACTION AUTOMATIQUE JSON TO COLUMNS")
    print("="*42)
    
    load_dotenv()
    supabase = create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    )
    
    # Test petit échantillon d'abord
    print("PHASE 1: Test échantillon (5 joueurs)")
    print("-"*40)
    
    try:
        response = supabase.table('player_features').select(
            'id, player_id, raw_stats'
        ).limit(5).execute()
        
        if not response.data:
            print("Aucune donnée")
            return False
        
        print(f"Test sur {len(response.data)} joueurs...")
        
        test_success = 0
        for player in response.data:
            try:
                player_id = player.get('id')
                raw_stats = player.get('raw_stats')
                
                if not raw_stats:
                    continue
                
                if isinstance(raw_stats, str):
                    stats = json.loads(raw_stats)
                else:
                    stats = raw_stats
                
                updates = {}
                
                # Goals et assists
                if 'goals' in stats:
                    goals_data = stats['goals']
                    if goals_data.get('total') is not None:
                        updates['goals'] = goals_data['total']
                    if goals_data.get('assists') is not None:
                        updates['assists'] = goals_data['assists']
                
                # Games
                if 'games' in stats:
                    games_data = stats['games']
                    if games_data.get('appearences') is not None:
                        updates['appearences'] = games_data['appearences']
                    if games_data.get('minutes') is not None:
                        updates['minutes_total'] = games_data['minutes']
                
                # Team name
                if 'team' in stats and stats['team'].get('name'):
                    updates['team_name'] = stats['team']['name']
                
                # Update
                if updates:
                    result = supabase.table('player_features').update(updates).eq('id', player_id).execute()
                    test_success += 1
                    
            except Exception as e:
                print(f"  Erreur: {str(e)[:50]}")
        
        print(f"Test réussi: {test_success}/{len(response.data)}")
        
        if test_success == 0:
            print("❌ Test échoué - Arrêt")
            return False
        
        # EXTRACTION COMPLÈTE
        print(f"\nPHASE 2: Extraction complète")
        print("-"*30)
        
        # Récupérer tous les joueurs
        all_response = supabase.table('player_features').select(
            'id, player_id, raw_stats'
        ).execute()
        
        total_players = len(all_response.data)
        print(f"Traitement {total_players} joueurs...")
        
        updated_count = 0
        error_count = 0
        
        for i, player in enumerate(all_response.data, 1):
            if i % 100 == 0:
                print(f"  Progression: {i}/{total_players} ({i/total_players*100:.1f}%)")
            
            try:
                player_id = player.get('id')
                raw_stats = player.get('raw_stats')
                
                if not raw_stats:
                    continue
                
                if isinstance(raw_stats, str):
                    stats = json.loads(raw_stats)
                else:
                    stats = raw_stats
                
                updates = {}
                
                # Goals et assists
                if 'goals' in stats:
                    goals_data = stats['goals']
                    if goals_data.get('total') is not None:
                        updates['goals'] = goals_data['total']
                    if goals_data.get('assists') is not None:
                        updates['assists'] = goals_data['assists']
                
                # Games
                if 'games' in stats:
                    games_data = stats['games']
                    if games_data.get('appearences') is not None:
                        updates['appearences'] = games_data['appearences']
                    if games_data.get('minutes') is not None:
                        updates['minutes_total'] = games_data['minutes']
                
                # Team name
                if 'team' in stats and stats['team'].get('name'):
                    updates['team_name'] = stats['team']['name']
                
                # Update si nécessaire
                if updates:
                    result = supabase.table('player_features').update(updates).eq('id', player_id).execute()
                    updated_count += 1
                    
            except Exception as e:
                error_count += 1
                if error_count <= 5:  # Only first few errors
                    print(f"    Erreur {i}: {str(e)[:80]}")
        
        print(f"\nRÉSULTATS FINAUX:")
        print(f"  Total traité: {total_players}")
        print(f"  Mis à jour: {updated_count}")
        print(f"  Erreurs: {error_count}")
        print(f"  Succès: {updated_count/(updated_count+error_count)*100:.1f}%")
        
        # VÉRIFICATION
        print(f"\nVÉRIFICATION:")
        print("-"*15)
        
        top_scorers = supabase.table('player_features').select(
            'team_name, goals, assists, appearences'
        ).order('goals', desc=True).limit(10).execute()
        
        print("TOP 10 BUTEURS:")
        for i, player in enumerate(top_scorers.data, 1):
            team = player.get('team_name', 'Unknown')[:15]
            goals = player.get('goals', 0)
            assists = player.get('assists', 0)
            apps = player.get('appearences', 0)
            print(f"  {i:2d}. {team:15s} - {goals:2d} buts, {assists:2d} assists, {apps:2d} matchs")
        
        max_goals = max([p.get('goals', 0) for p in top_scorers.data]) if top_scorers.data else 0
        print(f"\nMax buts trouvé: {max_goals}")
        
        if max_goals >= 15:
            print("✅ EXTRACTION RÉUSSIE - Données réelles extraites !")
            return True
        else:
            print("❌ EXTRACTION INCOMPLÈTE - Données toujours à 0")
            return False
        
    except Exception as e:
        print(f"ERREUR: {e}")
        return False

if __name__ == "__main__":
    success = run_automatic_extraction()
    print(f"\nSTATUS FINAL: {'SUCCESS' if success else 'FAILED'}")