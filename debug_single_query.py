#!/usr/bin/env python3
"""
DEBUG: Test exact API query with .single()
==========================================

Tester la requête exacte de l'API avec .single() pour identifier
pourquoi elle échoue et retourne les valeurs par défaut.
"""

from supabase import create_client, Client

def test_single_query():
    print("DEBUG: Test exact API query with .single()")
    print("=============================================\n")
    
    # Configuration Supabase
    url = 'https://agysfqhijfbnqzzooyeo.supabase.co'
    service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    
    try:
        supabase: Client = create_client(url, service_key)
        
        # Test avec PSG (team_id=85) qui a plusieurs saisons
        team_id = 85
        print(f"Test avec team_id={team_id} (PSG)")
        
        # 1. D'abord voir tous les records pour cette équipe
        print("\n1. Tous les records pour team_id=85:")
        response = supabase.table('team_features') \
            .select('team_id, elo_rating, form_5_points, season') \
            .eq('team_id', team_id) \
            .execute()
            
        print(f"Records trouvés: {len(response.data)}")
        for i, record in enumerate(response.data):
            print(f"  #{i+1}: ELO={record.get('elo_rating')}, Form={record.get('form_5_points')}, Season={record.get('season')}")
        
        # 2. Test query avec ORDER BY et LIMIT (sans .single())
        print(f"\n2. Query avec ORDER BY season DESC LIMIT 1 (sans .single()):")
        response = supabase.table('team_features') \
            .select('elo_rating, form_5_points, season') \
            .eq('team_id', team_id) \
            .order('season', desc=True) \
            .limit(1) \
            .execute()
            
        print(f"Response data: {response.data}")
        if response.data:
            record = response.data[0]
            print(f"SUCCESS: ELO={record.get('elo_rating')}, Form={record.get('form_5_points')}, Season={record.get('season')}")
        else:
            print("❌ Aucune donnée retournée")
        
        # 3. Test query EXACTE de l'API (avec .single())
        print(f"\n3. Query EXACTE de l'API avec .single():")
        
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
                .eq('team_id', team_id) \
                .order('season', desc=True) \
                .limit(1) \
                .single() \
                .execute()
            
            print(f"✅ API Query SUCCESS avec .single()!")
            record = response.data
            print(f"   ELO: {record.get('elo_rating')}")
            print(f"   Form: {record.get('form_5_points')}")
            print(f"   Season: {record.get('season')}")
            print(f"   Goals/game: {record.get('goals_per_game')}")
            print(f"   xG: {record.get('xg_for_avg')}")
            
        except Exception as e:
            print(f"❌ API Query FAILED avec .single(): {str(e)}")
            print(f"   Error type: {type(e)}")
            
            # Tester sans .single() pour voir la différence
            try:
                response_no_single = supabase.table('team_features') \
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
                    .eq('team_id', team_id) \
                    .order('season', desc=True) \
                    .limit(1) \
                    .execute()
                
                print(f"   ✅ MAIS sans .single() ça marche: {len(response_no_single.data)} records")
                if response_no_single.data:
                    print(f"   Données: ELO={response_no_single.data[0].get('elo_rating')}")
                
            except Exception as e2:
                print(f"   ❌ Même sans .single() ça échoue: {str(e2)}")
        
        # 4. Test avec une équipe qui n'existe pas
        print(f"\n4. Test avec team_id inexistant (999999):")
        try:
            response = supabase.table('team_features') \
                .select('elo_rating, form_5_points') \
                .eq('team_id', 999999) \
                .order('season', desc=True) \
                .limit(1) \
                .single() \
                .execute()
            
            print(f"Résultat inattendu: {response.data}")
            
        except Exception as e:
            print(f"❌ Expected error: {str(e)}")
            print("   C'est normal, cette équipe n'existe pas")
        
        # 5. Test avec Paris FC (team_id=114) qui était manquant
        print(f"\n5. Test avec team_id=114 (Paris FC) qui était signalé manquant:")
        
        # D'abord vérifier s'il existe
        exists_response = supabase.table('team_features') \
            .select('team_id, elo_rating') \
            .eq('team_id', 114) \
            .execute()
        
        print(f"Records pour team_id=114: {len(exists_response.data)}")
        if exists_response.data:
            for record in exists_response.data:
                print(f"  ELO: {record.get('elo_rating')}")
        else:
            print("  Confirme: team_id=114 n'existe pas dans team_features")
            
            # Chercher dans la table teams
            teams_response = supabase.table('teams') \
                .select('api_id, name') \
                .eq('api_id', 114) \
                .execute()
            
            if teams_response.data:
                print(f"  MAIS existe dans teams: {teams_response.data[0]['name']}")
                print("  ➡️ Il faut ajouter cette équipe dans team_features!")
            else:
                print("  Et n'existe pas non plus dans teams")
                
        print("\nFIN DU TEST")
        
    except Exception as error:
        print(f"ERREUR GENERALE: {error}")

if __name__ == "__main__":
    test_single_query()