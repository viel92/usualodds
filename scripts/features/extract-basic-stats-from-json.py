#!/usr/bin/env python3
"""
Extraction stats basiques depuis JSON vers colonnes dédiées
Objectif: Corriger le problème des 39 colonnes critiques
"""

import os
import sys
import pandas as pd
import json
from supabase import create_client, Client

def load_env_credentials():
    """Load Supabase credentials"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value.strip('"')
    
    return os.environ.get('NEXT_PUBLIC_SUPABASE_URL'), os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

def extract_from_match_statistics(supabase):
    """Extraire stats depuis match_statistics JSON"""
    print("EXTRACTION DEPUIS MATCH_STATISTICS")
    print("=" * 40)
    
    try:
        # Load toutes les match_statistics
        print("[LOADING] Match statistics avec JSON...")
        
        all_stats = []
        batch_size = 100
        offset = 0
        
        while True:
            batch = supabase.table('match_statistics').select('*').range(offset, offset + batch_size - 1).execute()
            
            if not batch.data:
                break
                
            all_stats.extend(batch.data)
            print(f"  Loaded batch: +{len(batch.data)} (total: {len(all_stats)})")
            
            if len(batch.data) < batch_size:
                break
                
            offset += batch_size
        
        print(f"[SUCCESS] {len(all_stats)} match statistics loaded")
        
        # Parser et extraire
        extracted_stats = []
        successful_extractions = 0
        
        for stat in all_stats:
            try:
                match_id = stat['match_id']
                team_id = stat['team_id']
                team_name = stat['team_name']
                
                # Parser le JSON statistics
                if stat['statistics']:
                    # Le JSON est déjà parsé par Supabase
                    statistics = stat['statistics']
                    
                    # Extraire les stats basiques
                    extracted = {
                        'match_id': match_id,
                        'team_id': team_id,
                        'team_name': team_name,
                        
                        # Stats basiques qui devraient être dans des colonnes
                        'goals': None,
                        'total_shots': None,
                        'shots_on_target': None,
                        'shots_off_target': None,
                        'ball_possession': None,
                        'corner_kicks': None,
                        'yellow_cards': None,
                        'red_cards': None,
                        'fouls': None,
                        'offsides': None,
                        'total_passes': None,
                        'passes_accurate': None,
                        'passes_percentage': None,
                        'expected_goals': None,
                        'goalkeeper_saves': None
                    }
                    
                    # Mapper les champs JSON vers nos colonnes
                    if isinstance(statistics, list):
                        # Format API Football standard avec liste de stats
                        for stat_item in statistics:
                            stat_type = stat_item.get('type', '').lower()
                            stat_value = stat_item.get('value')
                            
                            # Mapping des noms API vers nos colonnes
                            mapping = {
                                'goals': 'goals',
                                'total shots': 'total_shots',
                                'shots on goal': 'shots_on_target',
                                'shots off goal': 'shots_off_target',
                                'ball possession': 'ball_possession',
                                'corner kicks': 'corner_kicks',
                                'yellow cards': 'yellow_cards',
                                'red cards': 'red_cards',
                                'fouls': 'fouls',
                                'offsides': 'offsides',
                                'total passes': 'total_passes',
                                'passes accurate': 'passes_accurate',
                                'passes %': 'passes_percentage',
                                'expected goals': 'expected_goals',
                                'goalkeeper saves': 'goalkeeper_saves'
                            }
                            
                            if stat_type in mapping:
                                extracted[mapping[stat_type]] = stat_value
                    
                    elif isinstance(statistics, dict):
                        # Format direct dictionnaire
                        direct_mapping = {
                            'goals': 'goals',
                            'shots_total': 'total_shots',
                            'shots_on_target': 'shots_on_target',
                            'shots_off_target': 'shots_off_target',
                            'possession': 'ball_possession',
                            'corners': 'corner_kicks',
                            'yellow_cards': 'yellow_cards',
                            'red_cards': 'red_cards',
                            'fouls': 'fouls',
                            'offsides': 'offsides',
                            'passes_total': 'total_passes',
                            'passes_accurate': 'passes_accurate',
                            'passes_percentage': 'passes_percentage',
                            'expected_goals': 'expected_goals',
                            'saves': 'goalkeeper_saves'
                        }
                        
                        for json_key, column_key in direct_mapping.items():
                            if json_key in statistics:
                                extracted[column_key] = statistics[json_key]
                    
                    # Convertir les valeurs en numeric quand possible
                    for key, value in extracted.items():
                        if key not in ['match_id', 'team_id', 'team_name'] and value is not None:
                            try:
                                # Nettoyer les valeurs (enlever %, etc.)
                                if isinstance(value, str):
                                    value = value.replace('%', '').replace(',', '.')
                                extracted[key] = float(value)
                            except (ValueError, TypeError):
                                extracted[key] = None
                    
                    extracted_stats.append(extracted)
                    successful_extractions += 1
                    
            except Exception as e:
                print(f"  [WARNING] Error extracting match {stat.get('match_id', 'unknown')}: {e}")
                continue
        
        print(f"[SUCCESS] {successful_extractions} stats successfully extracted")
        
        # Analyser ce qu'on a trouvé
        if extracted_stats:
            df = pd.DataFrame(extracted_stats)
            
            print(f"\n[ANALYSIS] Stats extraites:")
            for column in df.columns:
                if column not in ['match_id', 'team_id', 'team_name']:
                    non_null = df[column].notna().sum()
                    total = len(df)
                    pct = (non_null / total) * 100
                    print(f"  {column}: {non_null}/{total} ({pct:.1f}%)")
            
            return df
        else:
            print("[ERROR] No stats extracted")
            return None
            
    except Exception as e:
        print(f"[ERROR] Extraction failed: {e}")
        return None

def update_match_statistics_columns(supabase, extracted_df):
    """Update match_statistics avec les colonnes extraites"""
    print(f"\nUPDATE MATCH_STATISTICS COLUMNS")
    print("=" * 35)
    
    if extracted_df is None or len(extracted_df) == 0:
        print("[ERROR] No data to update")
        return False
    
    try:
        updates_count = 0
        
        print(f"[UPDATING] {len(extracted_df)} records...")
        
        for idx, row in extracted_df.iterrows():
            try:
                match_id = int(row['match_id'])
                team_id = int(row['team_id'])
                
                # Préparer les données d'update (seulement les colonnes non-null)
                update_data = {}
                
                for column in extracted_df.columns:
                    if column not in ['match_id', 'team_id', 'team_name'] and pd.notna(row[column]):
                        update_data[column] = float(row[column])
                
                if update_data:
                    # Update le record correspondant
                    result = supabase.table('match_statistics').update(update_data).eq('match_id', match_id).eq('team_id', team_id).execute()
                    
                    if result.data:
                        updates_count += 1
                        if updates_count % 50 == 0:
                            print(f"  Updated {updates_count} records...")
                
            except Exception as e:
                print(f"  [WARNING] Error updating match {row.get('match_id')}, team {row.get('team_id')}: {e}")
                continue
        
        print(f"[SUCCESS] {updates_count} records updated in match_statistics")
        return True
        
    except Exception as e:
        print(f"[ERROR] Update failed: {e}")
        return False

def aggregate_to_team_features(supabase, extracted_df):
    """Aggreger les stats vers team_features"""
    print(f"\nAGGREGATE TO TEAM_FEATURES")
    print("=" * 30)
    
    if extracted_df is None or len(extracted_df) == 0:
        print("[ERROR] No data to aggregate")
        return False
    
    try:
        # Joindre avec matches pour avoir season/league
        print("[LOADING] Match data for aggregation...")
        matches_response = supabase.table('matches').select('id,season,league_id').execute()
        matches_df = pd.DataFrame(matches_response.data)
        
        # Merger avec extracted stats
        merged_df = extracted_df.merge(
            matches_df, 
            left_on='match_id', 
            right_on='id', 
            how='left'
        )
        
        print(f"[INFO] {len(merged_df)} stats merged with match data")
        
        # Aggreger par team/season
        numeric_columns = [col for col in merged_df.columns 
                          if col not in ['match_id', 'team_id', 'team_name', 'id', 'season', 'league_id']
                          and merged_df[col].dtype in ['float64', 'int64']]
        
        aggregations = {}
        for col in numeric_columns:
            aggregations[col] = 'mean'  # Moyenne par équipe/saison
        
        team_aggregated = merged_df.groupby(['team_id', 'season', 'league_id']).agg(aggregations).reset_index()
        
        print(f"[SUCCESS] {len(team_aggregated)} team/season aggregations created")
        
        # Update team_features
        updates_count = 0
        
        for idx, row in team_aggregated.iterrows():
            try:
                team_id = int(row['team_id'])
                season = int(row['season'])
                league_id = int(row['league_id'])
                
                # Préparer update data
                update_data = {}
                for col in numeric_columns:
                    if pd.notna(row[col]):
                        # Mapping vers les colonnes team_features
                        if col == 'corner_kicks':
                            update_data['corners_for'] = float(row[col])
                        elif col == 'yellow_cards':
                            update_data['yellow_cards'] = float(row[col])
                        elif col == 'red_cards':
                            update_data['red_cards'] = float(row[col])
                        elif col == 'total_shots':
                            update_data['shots_per_game'] = float(row[col])
                        elif col == 'shots_on_target':
                            update_data['shots_on_target_avg'] = float(row[col])
                        # Ajouter d'autres mappings si nécessaire
                
                if update_data:
                    # Update team_features
                    result = supabase.table('team_features').update(update_data).eq('team_id', team_id).eq('season', season).eq('league_id', league_id).execute()
                    
                    if result.data:
                        updates_count += 1
                        if updates_count % 20 == 0:
                            print(f"  Updated {updates_count} team features...")
                
            except Exception as e:
                print(f"  [WARNING] Error updating team {row.get('team_id')} season {row.get('season')}: {e}")
                continue
        
        print(f"[SUCCESS] {updates_count} team_features updated")
        return True
        
    except Exception as e:
        print(f"[ERROR] Aggregation failed: {e}")
        return False

def main():
    """Main extraction process"""
    print("EXTRACTION STATS BASIQUES DEPUIS JSON")
    print("=" * 50)
    print("Objectif: Corriger 39 colonnes critiques")
    print("Approche: JSON → Colonnes dédiées")
    
    # Connect
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Credentials manquantes")
        return False
    
    try:
        supabase = create_client(url, key)
        print(f"[OK] Connecté pour extraction")
        
        # Extraction depuis match_statistics JSON
        extracted_df = extract_from_match_statistics(supabase)
        
        if extracted_df is not None:
            # Update match_statistics avec colonnes extraites
            stats_updated = update_match_statistics_columns(supabase, extracted_df)
            
            # Aggreger vers team_features
            if stats_updated:
                features_updated = aggregate_to_team_features(supabase, extracted_df)
                
                if features_updated:
                    print(f"\n🎯 EXTRACTION RÉUSSIE!")
                    print(f"✅ Match statistics: colonnes populées")
                    print(f"✅ Team features: stats agrégées")
                    print(f"📈 Impact ML attendu: +2-5% accuracy")
                    return True
                else:
                    print(f"\n⚠️ EXTRACTION PARTIELLE")
                    print(f"✅ Match statistics: OK")
                    print(f"❌ Team features: échec")
                    return False
            else:
                print(f"\n❌ EXTRACTION ÉCHOUÉE")
                print(f"❌ Match statistics: échec")
                return False
        else:
            print(f"\n❌ AUCUNE DONNÉE EXTRAITE")
            return False
        
    except Exception as e:
        print(f"[ERROR] Process failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    
    if success:
        print("\nProchaine étape: Tester impact sur ML")
    else:
        print("\nAction: Debug extraction JSON")