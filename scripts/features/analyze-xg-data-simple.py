#!/usr/bin/env python3
# -*- coding: utf-8 -*-

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
    
    print('=== ANALYSE XG DATA ===')
    
    # 1. Analyser les XG dans match_statistics
    print('\n1. XG DANS MATCH_STATISTICS:')
    try:
        stats_response = supabase.table('match_statistics').select(
            'match_id, team_id, team_name, expected_goals, ball_possession, total_shots'
        ).limit(10).execute()
        
        if stats_response.data:
            xg_records = [r for r in stats_response.data if r.get('expected_goals') is not None]
            print(f'   Total records: {len(stats_response.data)}')
            print(f'   Records avec XG: {len(xg_records)}')
            
            for stat in xg_records[:3]:
                xg = stat.get('expected_goals', 'N/A')
                possession = stat.get('ball_possession', 'N/A')
                shots = stat.get('total_shots', 'N/A')
                print(f'   {stat["team_name"]}: xG {xg}, Possession {possession}%, Shots {shots}')
        else:
            print('   Aucune donnée trouvée')
    except Exception as e:
        print(f'   Erreur: {e}')
    
    # 2. Analyser raw_data matches
    print('\n2. SAMPLE MATCHES.RAW_DATA:')
    try:
        matches_response = supabase.table('matches').select(
            'id, raw_data, home_team_name, away_team_name'
        ).limit(3).execute()
        
        if matches_response.data:
            raw_data_records = [r for r in matches_response.data if r.get('raw_data') is not None]
            print(f'   Total matches: {len(matches_response.data)}')
            print(f'   Matches avec raw_data: {len(raw_data_records)}')
            
            if raw_data_records:
                match = raw_data_records[0]
                print(f'   Match exemple: {match["home_team_name"]} vs {match["away_team_name"]}')
                raw_data = match['raw_data']
                if isinstance(raw_data, dict):
                    print(f'   Keys disponibles: {list(raw_data.keys())}')
        else:
            print('   Aucune donnée trouvée')
            
    except Exception as e:
        print(f'   Erreur: {e}')
    
    # 3. Team features XG
    print('\n3. XG TEAM_FEATURES:')
    try:
        team_response = supabase.table('team_features').select(
            'team_id, xg_for_avg, xg_against_avg, xg_diff_avg'
        ).limit(10).execute()
        
        if team_response.data:
            xg_teams = [r for r in team_response.data if r.get('xg_for_avg') is not None]
            print(f'   Total équipes: {len(team_response.data)}')
            print(f'   Équipes avec XG: {len(xg_teams)}')
            
            for team in xg_teams[:3]:
                print(f'   Team {team["team_id"]}: xG For {team["xg_for_avg"]}, Against {team["xg_against_avg"]}')
        else:
            print('   Aucune donnée trouvée')
    except Exception as e:
        print(f'   Erreur: {e}')
    
    # 4. Count total XG coverage
    print('\n4. COUVERTURE XG:')
    try:
        # Total match_statistics records
        all_stats = supabase.table('match_statistics').select('expected_goals').execute()
        total_stats = len(all_stats.data) if all_stats.data else 0
        
        xg_stats = [r for r in all_stats.data if r.get('expected_goals') is not None] if all_stats.data else []
        xg_coverage = len(xg_stats)
        
        print(f'   Total match statistics: {total_stats}')
        print(f'   Avec XG: {xg_coverage}')
        print(f'   Coverage: {(xg_coverage/total_stats*100):.1f}%' if total_stats > 0 else '   Coverage: 0%')
        
        # Total matches
        all_matches = supabase.table('matches').select('id').execute()
        total_matches = len(all_matches.data) if all_matches.data else 0
        print(f'   Total matches DB: {total_matches}')
        
    except Exception as e:
        print(f'   Erreur: {e}')
    
    print('\n=== DIAGNOSTIC ===')
    print('1. XG disponibles par équipe dans match_statistics')
    print('2. XG agrégées dans team_features (moyennes par saison)')
    print('3. Raw_data matches (1760 records) à extraire pour plus de détails')
    print('4. Opportunité: calculer XG features par match pour ML')

if __name__ == '__main__':
    analyze_xg_data()