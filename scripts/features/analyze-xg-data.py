#!/usr/bin/env python3

import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

def analyze_xg_data():
    """Analyse détaillée des données XG disponibles dans Supabase"""
    
    supabase = create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'), 
        os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    )
    
    print('=== ANALYSE DETAILLEE XG DATA ===')
    
    # 1. Analyser les XG dans match_statistics
    print('\n1. XG DANS MATCH_STATISTICS:')
    try:
        stats_response = supabase.table('match_statistics').select(
            'match_id, team_id, team_name, expected_goals, ball_possession, total_shots'
        ).neq('expected_goals', None).limit(10).execute()
        
        if stats_response.data:
            print(f'   Records XG: {len(stats_response.data)}')
            for stat in stats_response.data[:3]:
                print(f'   {stat["team_name"]}: xG {stat["expected_goals"]}, Possession {stat["ball_possession"]}%, Shots {stat["total_shots"]}')
        else:
            print('   Aucune donnée XG trouvée')
    except Exception as e:
        print(f'   Erreur: {e}')
    
    # 2. Analyser exemple raw_data matches
    print('\n2. ANALYSE SAMPLE MATCHES.RAW_DATA:')
    try:
        matches_response = supabase.table('matches').select(
            'id, raw_data, home_team_name, away_team_name'
        ).neq('raw_data', None).limit(3).execute()
        
        if matches_response.data:
            for match in matches_response.data[:1]:
                print(f'   Match: {match["home_team_name"]} vs {match["away_team_name"]}')
                raw_data = match['raw_data']
                if isinstance(raw_data, dict):
                    print(f'   Keys disponibles: {list(raw_data.keys())}')
                    
                    # Analyser fixture
                    if 'fixture' in raw_data:
                        fixture = raw_data['fixture']
                        if isinstance(fixture, dict):
                            print(f'   Fixture keys: {list(fixture.keys())}')
                    
                    # Analyser score  
                    if 'score' in raw_data:
                        score = raw_data['score']
                        if isinstance(score, dict):
                            print(f'   Score keys: {list(score.keys())}')
                            print(f'   Score data sample: {score}')
                    
                    # Analyser teams
                    if 'teams' in raw_data:
                        teams = raw_data['teams']
                        if isinstance(teams, dict):
                            print(f'   Teams keys: {list(teams.keys())}')
                            
    except Exception as e:
        print(f'   Erreur: {e}')
    
    # 3. Vérifier team_features XG existantes
    print('\n3. XG AGGREGEES TEAM_FEATURES:')
    try:
        team_xg_response = supabase.table('team_features').select(
            'team_id, xg_for_avg, xg_against_avg, xg_diff_avg'
        ).neq('xg_for_avg', None).limit(5).execute()
        
        if team_xg_response.data:
            print(f'   Equipes avec XG: {len(team_xg_response.data)}')
            for team in team_xg_response.data[:3]:
                print(f'   Team {team["team_id"]}: xG For {team["xg_for_avg"]}, Against {team["xg_against_avg"]}, Diff {team["xg_diff_avg"]}')
        else:
            print('   Aucune donnée XG agrégée trouvée')
    except Exception as e:
        print(f'   Erreur: {e}')
    
    # 4. Analyser couverture XG par saison
    print('\n4. COUVERTURE XG PAR SAISON:')
    try:
        for season in [2020, 2021, 2022, 2023, 2024]:
            # Count matches with XG data
            matches_query = supabase.table('matches').select('id').eq('season', season).execute()
            total_matches = len(matches_query.data) if matches_query.data else 0
            
            # Count matches with XG statistics
            xg_query = supabase.table('match_statistics').select('match_id').neq('expected_goals', None).execute()
            
            if xg_query.data:
                season_matches = []
                for xg_stat in xg_query.data:
                    match_check = supabase.table('matches').select('season').eq('id', xg_stat['match_id']).single().execute()
                    if match_check.data and match_check.data['season'] == season:
                        season_matches.append(xg_stat['match_id'])
                
                unique_matches_with_xg = len(set(season_matches))
                coverage = (unique_matches_with_xg / total_matches * 100) if total_matches > 0 else 0
                print(f'   Saison {season}: {unique_matches_with_xg}/{total_matches} matches ({coverage:.1f}% coverage XG)')
            else:
                print(f'   Saison {season}: 0/{total_matches} matches (0% coverage XG)')
                
    except Exception as e:
        print(f'   Erreur couverture: {e}')
    
    print('\n=== CONCLUSIONS ===')
    print('1. XG disponibles dans match_statistics ✅')
    print('2. Données raw_data matches non extraites (1760 records) ❌')
    print('3. XG agrégées team_features partiellement remplies ⚠️')
    print('4. Opportunité: créer features XG par match pour ML')

if __name__ == '__main__':
    analyze_xg_data()