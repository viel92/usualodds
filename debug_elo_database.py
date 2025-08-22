#!/usr/bin/env python3
"""
DÉBOGAGE URGENT: ELO ratings bloqués à 1500
=============================================

Script pour identifier pourquoi les données team_features (100 records avec vrais ELOs)
ne sont PAS récupérées par l'API predictions/route.ts
"""

import os
import json
from supabase import create_client, Client

def debug_elo_issue():
    print("DEBOGAGE - ELO ratings bloques a 1500")
    print("==========================================\n")
    
    # Configuration Supabase
    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not service_key:
        print("❌ Variables d'environnement Supabase manquantes!")
        print(f"URL: {'✅' if url else '❌'}")
        print(f"Service Key: {'✅' if service_key else '❌'}")
        return
        
    try:
        supabase: Client = create_client(url, service_key)
        
        # 1. VÉRIFIER STRUCTURE TABLE team_features
        print("1. Structure de la table team_features:")
        response = supabase.table('team_features').select('*').limit(1).execute()
        
        if response.data:
            columns = list(response.data[0].keys()) if response.data else []
            print(f"✅ Structure OK, colonnes disponibles: {columns}")
        else:
            print("❌ Aucune donnée trouvée dans team_features")
            return
            
        # 2. VÉRIFIER NOMBRE TOTAL D'ENREGISTREMENTS  
        print("\n2. Nombre total d'enregistrements team_features:")
        response = supabase.table('team_features').select('*', count='exact').execute()
        count = response.count
        print(f"✅ Total: {count} enregistrements")
        
        # 3. VÉRIFIER ÉCHANTILLON DE DONNÉES ELO
        print("\n3. Échantillon données ELO (top 10):")
        response = supabase.table('team_features') \
            .select('team_id, team_name, elo_rating, season') \
            .order('elo_rating', desc=True) \
            .limit(10) \
            .execute()
            
        for team in response.data:
            print(f"  - {team['team_name']} (ID: {team['team_id']}): ELO {team['elo_rating']} (Saison {team.get('season', 'N/A')})")
            
        # 4. RÉCUPÉRER QUELQUES MATCHES À VENIR POUR TEST
        print("\n4. Récupération matches à venir pour test:")
        from datetime import datetime
        now = datetime.now().isoformat()
        
        response = supabase.table('matches') \
            .select('id, home_team_id, away_team_id, home_team_name, away_team_name, date') \
            .gte('date', now) \
            .order('date') \
            .limit(3) \
            .execute()
            
        matches = response.data
        print(f"✅ {len(matches)} matches trouvés")
        
        # 5. TESTER LES REQUÊTES EXACTES DE L'API POUR CHAQUE MATCH
        print("\n5. Test requêtes API exactes pour chaque match:")
        
        for match in matches:
            print(f"\n🔬 MATCH TEST: {match['home_team_name']} vs {match['away_team_name']}")
            print(f"   IDs: Home={match['home_team_id']}, Away={match['away_team_id']}")
            
            # REQUÊTE EXACTE DE L'API - HOME TEAM
            print("\n   🏠 Requête HOME team (copie exacte API):")
            
            try:
                response = supabase.table('team_features') \
                    .select('''
                        elo_rating, 
                        form_5_points, 
                        possession_avg,
                        goals_per_game,
                        goals_conceded_per_game,
                        xg_for_avg,
                        xg_against_avg,
                        shots_per_game,
                        shots_against_per_game,
                        shots_on_target_avg,
                        corners_for,
                        corners_against,
                        corners_conversion_rate,
                        yellow_cards,
                        red_cards,
                        discipline_index,
                        pressing_intensity,
                        tempo_score,
                        season
                    '''.replace('\n', '').replace('    ', '')) \
                    .eq('team_id', match['home_team_id']) \
                    .order('season', desc=True) \
                    .limit(1) \
                    .execute()
                    
                home_data = response.data[0] if response.data else None
                
                if home_data:
                    print(f"   ✅ HOME SUCCESS: ELO {home_data['elo_rating']}, Form {home_data.get('form_5_points', 'N/A')}")
                else:
                    print(f"   ❌ HOME: Aucune donnée trouvée")
                    
                    # Test si team_id existe du tout
                    test_response = supabase.table('team_features') \
                        .select('team_id, team_name, elo_rating, season') \
                        .eq('team_id', match['home_team_id']) \
                        .execute()
                    
                    print(f"   🔍 Team {match['home_team_id']} existe? {len(test_response.data)} records")
                    for team in test_response.data[:3]:  # Max 3 résultats
                        print(f"       - {team.get('team_name', 'N/A')}, ELO: {team['elo_rating']}, Saison: {team.get('season', 'N/A')}")
                        
            except Exception as e:
                print(f"   ❌ HOME ERROR: {str(e)}")
                
            # REQUÊTE EXACTE DE L'API - AWAY TEAM  
            print("\n   🏃 Requête AWAY team (copie exacte API):")
            
            try:
                response = supabase.table('team_features') \
                    .select('''
                        elo_rating, 
                        form_5_points, 
                        possession_avg,
                        goals_per_game,
                        goals_conceded_per_game,
                        xg_for_avg,
                        xg_against_avg,
                        shots_per_game,
                        shots_against_per_game,
                        shots_on_target_avg,
                        corners_for,
                        corners_against,
                        corners_conversion_rate,
                        yellow_cards,
                        red_cards,
                        discipline_index,
                        pressing_intensity,
                        tempo_score,
                        season
                    '''.replace('\n', '').replace('    ', '')) \
                    .eq('team_id', match['away_team_id']) \
                    .order('season', desc=True) \
                    .limit(1) \
                    .execute()
                    
                away_data = response.data[0] if response.data else None
                
                if away_data:
                    print(f"   ✅ AWAY SUCCESS: ELO {away_data['elo_rating']}, Form {away_data.get('form_5_points', 'N/A')}")
                else:
                    print(f"   ❌ AWAY: Aucune donnée trouvée")
                    
                    # Test si team_id existe du tout
                    test_response = supabase.table('team_features') \
                        .select('team_id, team_name, elo_rating, season') \
                        .eq('team_id', match['away_team_id']) \
                        .execute()
                    
                    print(f"   🔍 Team {match['away_team_id']} existe? {len(test_response.data)} records")
                    for team in test_response.data[:3]:  # Max 3 résultats
                        print(f"       - {team.get('team_name', 'N/A')}, ELO: {team['elo_rating']}, Saison: {team.get('season', 'N/A')}")
                        
            except Exception as e:
                print(f"   ❌ AWAY ERROR: {str(e)}")
                
            # RÉCAPITULATIF MATCH
            home_elo = home_data['elo_rating'] if home_data else 1500
            away_elo = away_data['elo_rating'] if away_data else 1500
            
            print(f"\n   📊 RÉSULTAT: {match['home_team_name']} ({home_elo}) vs {match['away_team_name']} ({away_elo})")
            
            if home_elo == 1500 and away_elo == 1500:
                print(f"   ⚠️ PROBLÈME DÉTECTÉ: Les deux équipes utilisent ELO par défaut!")
                
        # 6. VÉRIFICATION SUPPLÉMENTAIRE: Distribution des saisons
        print("\n6. Distribution des saisons dans team_features:")
        response = supabase.table('team_features') \
            .select('season') \
            .not_('season', 'is', None) \
            .execute()
            
        if response.data:
            seasons = {}
            for row in response.data:
                season = row.get('season')
                if season:
                    seasons[season] = seasons.get(season, 0) + 1
                    
            for season, count in sorted(seasons.items()):
                print(f"   - Saison {season}: {count} teams")
                
        # 7. VÉRIFICATION: team_id des matches vs team_features
        print("\n7. Vérification correspondance team_id:")
        
        # Récupérer tous les team_ids des matches
        response = supabase.table('matches') \
            .select('home_team_id, away_team_id') \
            .gte('date', now) \
            .limit(20) \
            .execute()
            
        match_team_ids = set()
        for match in response.data:
            match_team_ids.add(match['home_team_id'])
            match_team_ids.add(match['away_team_id'])
            
        print(f"   📊 {len(match_team_ids)} team_ids uniques dans les matches")
        
        # Vérifier combien existent dans team_features
        existing_teams = 0
        for team_id in list(match_team_ids)[:10]:  # Test les 10 premiers
            response = supabase.table('team_features') \
                .select('team_id') \
                .eq('team_id', team_id) \
                .limit(1) \
                .execute()
                
            if response.data:
                existing_teams += 1
                
        print(f"   ✅ {existing_teams}/10 team_ids testés existent dans team_features")
        
        print("\n🏁 DÉBOGAGE TERMINÉ")
        
    except Exception as error:
        print(f"❌ Erreur générale: {error}")

if __name__ == "__main__":
    debug_elo_issue()