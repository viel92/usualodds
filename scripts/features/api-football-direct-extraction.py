#!/usr/bin/env python3
"""
API FOOTBALL DIRECT EXTRACTION - USUALODDS 2025
================================================
Récupération directe des statistics via API Football
pour tous les matches manquants (2020-2025)
"""

import os
import sys
import pandas as pd
from supabase import create_client, Client
import requests
import time
import json
from datetime import datetime

def load_env_credentials():
    """Load environment variables"""
    from dotenv import load_dotenv
    load_dotenv()
    
    return {
        'supabase_url': os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        'supabase_key': os.getenv('SUPABASE_SERVICE_ROLE_KEY'),
        'api_football_key': os.getenv('API_FOOTBALL_KEY')
    }

def get_matches_without_statistics(supabase):
    """Récupérer matches sans statistics complètes"""
    print("LOADING MATCHES WITHOUT STATISTICS")
    print("=" * 40)
    
    # Récupérer tous les matches
    matches_response = supabase.table('matches').select(
        'id, api_id, season, home_team_name, away_team_name, date'
    ).eq('status', 'Match Finished').execute()
    
    all_matches = pd.DataFrame(matches_response.data)
    print(f"[INFO] Total matches: {len(all_matches)}")
    
    # Récupérer les matches avec statistics existantes
    stats_response = supabase.table('match_statistics').select('match_id').execute()
    existing_matches = set()
    
    for stat in stats_response.data:
        existing_matches.add(stat['match_id'])
    
    print(f"[INFO] Matches with existing statistics: {len(existing_matches)}")
    
    # Filtrer les matches sans statistics
    matches_without_stats = all_matches[~all_matches['api_id'].isin(existing_matches)]
    
    print(f"[INFO] Matches needing statistics: {len(matches_without_stats)}")
    print(f"[INFO] Coverage gap: {len(matches_without_stats)/len(all_matches)*100:.1f}%")
    
    return matches_without_stats

def fetch_match_statistics(match_api_id, api_key):
    """Récupérer statistics d'un match via API Football"""
    
    url = "https://v3.football.api-sports.io/fixtures/statistics"
    headers = {
        'X-RapidAPI-Key': api_key,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
    }
    
    params = {'fixture': str(match_api_id)}
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get('response'):
            return data['response']
        else:
            return None
            
    except Exception as e:
        print(f"[ERROR] API call failed for match {match_api_id}: {e}")
        return None

def parse_team_statistics(team_stats):
    """Parser les statistics d'une équipe"""
    
    stats_mapping = {
        'Shots on Goal': 'shots_on_goal',
        'Shots off Goal': 'shots_off_goal', 
        'Total Shots': 'shots_total',
        'Blocked Shots': 'shots_blocked',
        'Shots insidebox': 'shots_inside_box',
        'Shots outsidebox': 'shots_outside_box',
        'Fouls': 'fouls',
        'Corner Kicks': 'corner_kicks',
        'Offsides': 'offsides',
        'Ball Possession': 'ball_possession',
        'Yellow Cards': 'yellow_cards',
        'Red Cards': 'red_cards',
        'Goalkeeper Saves': 'goalkeeper_saves',
        'Total passes': 'total_passes',
        'Passes accurate': 'passes_accurate',
        'Passes %': 'passes_percentage',
        'expected_goals': 'expected_goals'
    }
    
    parsed_stats = {}
    
    for stat in team_stats.get('statistics', []):
        stat_type = stat.get('type')
        stat_value = stat.get('value')
        
        if stat_type in stats_mapping:
            field_name = stats_mapping[stat_type]
            
            # Convertir les valeurs
            if stat_value is None:
                parsed_stats[field_name] = None
            elif isinstance(stat_value, str):
                if '%' in stat_value:
                    parsed_stats[field_name] = float(stat_value.replace('%', ''))
                elif stat_value.isdigit():
                    parsed_stats[field_name] = int(stat_value)
                else:
                    try:
                        parsed_stats[field_name] = float(stat_value)
                    except:
                        parsed_stats[field_name] = stat_value
            else:
                parsed_stats[field_name] = stat_value
    
    return parsed_stats

def save_match_statistics(supabase, match_api_id, match_uuid, team_stats_list):
    """Sauvegarder les statistics dans Supabase"""
    
    records_created = 0
    
    for team_stats in team_stats_list:
        team_info = team_stats.get('team', {})
        team_id = team_info.get('id')
        team_name = team_info.get('name')
        
        # Parser les statistics
        parsed_stats = parse_team_statistics(team_stats)
        
        # Créer l'enregistrement
        record = {
            'match_id': match_api_id,
            'team_id': team_id,
            'team_name': team_name,
            'statistics': parsed_stats
        }
        
        # Ajouter les colonnes individuelles
        for field, value in parsed_stats.items():
            record[field] = value
        
        try:
            supabase.table('match_statistics').insert(record).execute()
            records_created += 1
            
        except Exception as e:
            print(f"[ERROR] Failed to save statistics for team {team_name}: {e}")
    
    return records_created

def main():
    """Fonction principale"""
    
    print("API FOOTBALL DIRECT EXTRACTION")
    print("=" * 35)
    
    # Charger credentials
    creds = load_env_credentials()
    
    if not all(creds.values()):
        print("[ERROR] Missing environment variables")
        return False
    
    # Connexion Supabase
    supabase = create_client(creds['supabase_url'], creds['supabase_key'])
    print("[OK] Connected to Supabase")
    
    # Récupérer matches sans statistics
    matches_to_process = get_matches_without_statistics(supabase)
    
    if len(matches_to_process) == 0:
        print("[INFO] All matches already have statistics!")
        return True
    
    # Traitement par batch
    batch_size = 100
    total_processed = 0
    total_created = 0
    
    print(f"\n[PROCESSING] {len(matches_to_process)} matches in batches of {batch_size}")
    
    for i in range(0, len(matches_to_process), batch_size):
        batch = matches_to_process.iloc[i:i+batch_size]
        batch_num = i//batch_size + 1
        
        print(f"\n[BATCH {batch_num}] Processing {len(batch)} matches...")
        
        for _, match in batch.iterrows():
            match_api_id = match['api_id']
            match_uuid = match['id']
            
            # Récupérer statistics via API
            team_stats_list = fetch_match_statistics(match_api_id, creds['api_football_key'])
            
            if team_stats_list:
                records_created = save_match_statistics(
                    supabase, match_api_id, match_uuid, team_stats_list
                )
                total_created += records_created
                
                if records_created > 0:
                    print(f"  [OK] {match['home_team_name']} vs {match['away_team_name']}: {records_created} records")
                else:
                    print(f"  ✗ Failed: {match['home_team_name']} vs {match['away_team_name']}")
            else:
                print(f"  ✗ No data: {match['home_team_name']} vs {match['away_team_name']}")
            
            total_processed += 1
            
            # Rate limiting (API limite)
            time.sleep(0.5)
        
        print(f"[BATCH {batch_num}] Completed. Total created: {total_created}")
        
        # Pause entre batches
        if i + batch_size < len(matches_to_process):
            print("[INFO] Pausing 10 seconds between batches...")
            time.sleep(10)
    
    print(f"\n[RESULTS]")
    print(f"  Matches processed: {total_processed}")
    print(f"  Statistics records created: {total_created}")
    print(f"  Success rate: {total_created/(total_processed*2)*100:.1f}%")
    
    return total_created > 0

if __name__ == "__main__":
    print("ATTENTION: Extraction API Football directe")
    print("Cela va appeler l'API Football pour chaque match manquant")
    print("Estimation: 5-10 minutes selon nombre de matches")
    
    success = main()
    
    if success:
        print("\n[SUCCESS] Extraction completed")
        print("READY: Run team_features recalculation puis test ML")
    else:
        print("\n[FAILED] Extraction encountered issues")