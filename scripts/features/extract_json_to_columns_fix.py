#!/usr/bin/env python3
"""
EXTRACT JSON TO COLUMNS - FIX COMPLET
======================================
Extraire toutes les données du JSON raw_stats vers les colonnes appropriées
Ajouter player_name depuis le JSON team info
"""

import os
import json
from supabase import create_client
from dotenv import load_dotenv

class JSONToColumnsExtractor:
    def __init__(self):
        load_dotenv()
        self.supabase = create_client(
            os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        )
    
    def analyze_extraction_needed(self):
        """Analyser combien de données doivent être extraites"""
        print("ANALYSE EXTRACTION NECESSAIRE")
        print("="*35)
        
        try:
            # Compter total joueurs
            response = self.supabase.table('player_features').select('id', count='exact').execute()
            total_players = response.count
            
            # Échantillon pour analyse
            sample = self.supabase.table('player_features').select(
                'id, player_id, goals, assists, appearences, minutes_total, raw_stats'
            ).limit(20).execute()
            
            print(f"Total joueurs: {total_players}")
            print(f"Échantillon analysé: {len(sample.data)}")
            
            empty_columns = 0
            filled_json = 0
            extraction_needed = 0
            
            for player in sample.data:
                # Vérifier colonnes vides
                col_goals = player.get('goals') or 0
                col_assists = player.get('assists') or 0
                col_apps = player.get('appearences') or 0
                
                columns_empty = (col_goals == 0 and col_assists == 0 and col_apps == 0)
                
                # Vérifier JSON rempli
                raw_stats = player.get('raw_stats')
                json_has_data = False
                
                if raw_stats:
                    try:
                        if isinstance(raw_stats, str):
                            stats = json.loads(raw_stats)
                        else:
                            stats = raw_stats
                        
                        # Check si le JSON a des données utiles
                        if 'goals' in stats or 'games' in stats or 'team' in stats:
                            json_has_data = True
                    except:
                        pass
                
                if columns_empty:
                    empty_columns += 1
                if json_has_data:
                    filled_json += 1
                if columns_empty and json_has_data:
                    extraction_needed += 1
            
            print(f"\nRÉSULTATS ANALYSE:")
            print(f"  Colonnes vides: {empty_columns}/{len(sample.data)} ({empty_columns/len(sample.data)*100:.1f}%)")
            print(f"  JSON avec données: {filled_json}/{len(sample.data)} ({filled_json/len(sample.data)*100:.1f}%)")
            print(f"  Extraction nécessaire: {extraction_needed}/{len(sample.data)} ({extraction_needed/len(sample.data)*100:.1f}%)")
            
            # Estimation totale
            estimated_extractions = int((extraction_needed / len(sample.data)) * total_players)
            print(f"  Estimation totale à extraire: {estimated_extractions} joueurs")
            
            return {
                'total_players': total_players,
                'estimated_extractions': estimated_extractions,
                'extraction_rate': extraction_needed / len(sample.data)
            }
            
        except Exception as e:
            print(f"ERREUR analyse: {e}")
            return None
    
    def add_missing_columns(self):
        """Ajouter les colonnes manquantes (player_name, team_name)"""
        print("\nAJOUT COLONNES MANQUANTES")
        print("="*30)
        
        print("ATTENTION: Cette étape doit être faite manuellement dans Supabase Dashboard")
        print("\nSQL à exécuter dans Supabase SQL Editor:")
        print("-"*50)
        
        sql_commands = [
            "-- Ajouter colonne player_name",
            "ALTER TABLE player_features ADD COLUMN IF NOT EXISTS player_name TEXT;",
            "",
            "-- Ajouter colonne team_name", 
            "ALTER TABLE player_features ADD COLUMN IF NOT EXISTS team_name TEXT;",
            "",
            "-- Ajouter index pour performances",
            "CREATE INDEX IF NOT EXISTS idx_player_features_name ON player_features(player_name);",
            "CREATE INDEX IF NOT EXISTS idx_player_features_team_name ON player_features(team_name);"
        ]
        
        for cmd in sql_commands:
            print(cmd)
        
        print("-"*50)
        print("\nAPRÈS avoir exécuté le SQL, appuyez sur Entrée pour continuer...")
        input()
        return True
    
    def extract_player_data(self, limit=None):
        """Extraire les données JSON vers colonnes pour tous les joueurs"""
        print(f"\nEXTRACTION DONNÉES JOUEURS")
        print("="*35)
        
        try:
            # Récupérer joueurs avec raw_stats
            query = self.supabase.table('player_features').select(
                'id, player_id, raw_stats, goals, assists, appearences, minutes_total'
            )
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            
            if not response.data:
                print("Aucune donnée trouvée")
                return False
            
            print(f"Traitement {len(response.data)} joueurs...")
            
            updated_count = 0
            error_count = 0
            
            for i, player in enumerate(response.data, 1):
                if i % 50 == 0:
                    print(f"  Traitement: {i}/{len(response.data)}")
                
                try:
                    player_id = player.get('id')
                    raw_stats = player.get('raw_stats')
                    
                    if not raw_stats:
                        continue
                    
                    # Parser JSON
                    if isinstance(raw_stats, str):
                        stats = json.loads(raw_stats)
                    else:
                        stats = raw_stats
                    
                    # Extraire données
                    updates = {}
                    
                    # Goals et assists
                    if 'goals' in stats:
                        goals_data = stats['goals']
                        if 'total' in goals_data and goals_data['total'] is not None:
                            updates['goals'] = goals_data['total']
                        if 'assists' in goals_data and goals_data['assists'] is not None:
                            updates['assists'] = goals_data['assists']
                    
                    # Games data
                    if 'games' in stats:
                        games_data = stats['games']
                        if 'appearences' in games_data and games_data['appearences'] is not None:
                            updates['appearences'] = games_data['appearences']
                        if 'minutes' in games_data and games_data['minutes'] is not None:
                            updates['minutes_total'] = games_data['minutes']
                    
                    # Team name
                    if 'team' in stats and 'name' in stats['team']:
                        updates['team_name'] = stats['team']['name']
                    
                    # Player name (essayer plusieurs sources)
                    player_name = None
                    if 'player' in stats and 'name' in stats['player']:
                        player_name = stats['player']['name']
                    elif 'name' in stats:
                        player_name = stats['name']
                    
                    if player_name:
                        updates['player_name'] = player_name
                    
                    # Mettre à jour si on a des données
                    if updates:
                        result = self.supabase.table('player_features').update(updates).eq('id', player_id).execute()
                        
                        if not result.data:
                            error_count += 1
                        else:
                            updated_count += 1
                    
                except Exception as e:
                    error_count += 1
                    if error_count <= 3:  # Only show first few errors
                        print(f"    ERREUR joueur {i}: {str(e)[:100]}")
            
            print(f"\nRÉSULTATS EXTRACTION:")
            print(f"  Mis à jour: {updated_count}")
            print(f"  Erreurs: {error_count}")
            print(f"  Taux succès: {updated_count/(updated_count+error_count)*100:.1f}%")
            
            return updated_count > 0
            
        except Exception as e:
            print(f"ERREUR extraction: {e}")
            return False
    
    def verify_extraction(self):
        """Vérifier que l'extraction a fonctionné"""
        print(f"\nVÉRIFICATION EXTRACTION")
        print("="*25)
        
        try:
            # Top scorers après extraction
            response = self.supabase.table('player_features').select(
                'player_name, team_name, goals, assists, appearences, minutes_total'
            ).order('goals', desc=True).limit(10).execute()
            
            print("TOP 10 BUTEURS APRÈS EXTRACTION:")
            print("-"*40)
            
            for i, player in enumerate(response.data, 1):
                name = player.get('player_name', 'Unknown')
                team = player.get('team_name', 'Unknown')
                goals = player.get('goals', 0)
                assists = player.get('assists', 0)
                apps = player.get('appearences', 0)
                
                print(f"  {i:2d}. {name:20s} ({team:15s}) - {goals:2d} buts, {assists:2d} assists, {apps:2d} matchs")
            
            # Statistiques globales
            total_response = self.supabase.table('player_features').select(
                'goals, player_name', count='exact'
            ).execute()
            
            total_players = total_response.count
            players_with_name = len([p for p in total_response.data if p.get('player_name')])
            players_with_goals = len([p for p in total_response.data if p.get('goals', 0) > 0])
            
            print(f"\nSTATISTIQUES GLOBALES:")
            print(f"  Total joueurs: {total_players}")
            print(f"  Avec nom: {players_with_name} ({players_with_name/total_players*100:.1f}%)")
            print(f"  Avec buts: {players_with_goals} ({players_with_goals/total_players*100:.1f}%)")
            
            max_goals = max([p.get('goals', 0) for p in response.data]) if response.data else 0
            print(f"  Max buts: {max_goals}")
            
            if max_goals >= 15:
                print("  STATUS: ✅ EXTRACTION RÉUSSIE")
                return True
            else:
                print("  STATUS: ❌ EXTRACTION INCOMPLÈTE")
                return False
                
        except Exception as e:
            print(f"ERREUR vérification: {e}")
            return False

def main():
    print("EXTRACTION JSON TO COLUMNS - FIX COMPLET")
    print("="*45)
    
    extractor = JSONToColumnsExtractor()
    
    # 1. Analyser le besoin
    analysis = extractor.analyze_extraction_needed()
    if not analysis:
        return False
    
    if analysis['estimated_extractions'] == 0:
        print("\nAucune extraction nécessaire")
        return True
    
    # 2. Ajouter colonnes manquantes
    print(f"\nÉtape 1: Ajouter colonnes manquantes")
    if not extractor.add_missing_columns():
        return False
    
    # 3. Extraire données (par batch)
    print(f"\nÉtape 2: Extraction données")
    
    # Test avec un petit échantillon d'abord
    print("Test extraction (10 joueurs)...")
    if not extractor.extract_player_data(limit=10):
        print("❌ Test échoué")
        return False
    
    print("✅ Test réussi - Lancement extraction complète...")
    if not extractor.extract_player_data():
        print("❌ Extraction complète échouée")
        return False
    
    # 4. Vérifier résultats
    print(f"\nÉtape 3: Vérification")
    success = extractor.verify_extraction()
    
    print(f"\n{'='*45}")
    print(f"FIX COMPLET: {'✅ RÉUSSI' if success else '❌ ÉCHEC'}")
    return success

if __name__ == "__main__":
    main()