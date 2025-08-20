#!/usr/bin/env python3
"""
Vérifier le schéma exact de match_statistics 
Pour identifier les colonnes qui existent vraiment
"""

import os
import sys
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

def check_table_schema(supabase, table_name):
    """Vérifier le schéma d'une table"""
    print(f"SCHEMA CHECK: {table_name}")
    print("=" * 30)
    
    try:
        # Get one record to see all columns
        response = supabase.table(table_name).select('*').limit(1).execute()
        
        if not response.data:
            print(f"[ERROR] No data in {table_name}")
            return None
            
        record = response.data[0]
        columns = list(record.keys())
        
        print(f"Total columns: {len(columns)}")
        print(f"\nColumns in {table_name}:")
        
        # Group columns by type for better readability
        basic_cols = []
        stat_cols = []
        other_cols = []
        
        for col in sorted(columns):
            if col in ['id', 'match_id', 'team_id', 'created_at', 'updated_at']:
                basic_cols.append(col)
            elif any(stat in col.lower() for stat in ['shot', 'goal', 'card', 'corner', 'foul', 'pass', 'possession']):
                stat_cols.append(col)
            else:
                other_cols.append(col)
        
        print(f"\nBASIC COLUMNS ({len(basic_cols)}):")
        for col in basic_cols:
            print(f"  - {col}")
        
        print(f"\nSTATISTIC COLUMNS ({len(stat_cols)}):")
        for col in stat_cols:
            print(f"  - {col}")
        
        print(f"\nOTHER COLUMNS ({len(other_cols)}):")
        for col in other_cols:
            print(f"  - {col}")
        
        return columns
        
    except Exception as e:
        print(f"[ERROR] Schema check failed: {e}")
        return None

def validate_extraction_mapping(columns):
    """Valider quelles colonnes du mapping existent vraiment"""
    print(f"\nVALIDATION MAPPING")
    print("=" * 20)
    
    # Mapping du script original
    api_mappings = {
        'corner_kicks': 'corner_kicks',
        'yellow_cards': 'yellow_cards',
        'red_cards': 'red_cards', 
        'total_shots': 'total_shots',
        'shots_on_goal': 'shots_on_goal',
        'shots_off_goal': 'shots_off_goal',
        'expected_goals': 'expected_goals',
        'ball_possession': 'ball_possession',
        'fouls': 'fouls',
        'offsides': 'offsides',
        'total_passes': 'total_passes',
        'passes_accurate': 'passes_accurate',
        'passes_%': 'passes_percentage',
        'goalkeeper_saves': 'goalkeeper_saves',
        'shots_insidebox': 'shots_insidebox',
        'shots_outsidebox': 'shots_outsidebox',
        'blocked_shots': 'blocked_shots'
    }
    
    valid_mappings = {}
    invalid_mappings = {}
    
    for json_key, column_key in api_mappings.items():
        if column_key in columns:
            valid_mappings[json_key] = column_key
            print(f"  OK {json_key} -> {column_key}")
        else:
            invalid_mappings[json_key] = column_key
            print(f"  MISSING {json_key} -> {column_key} [COLUMN NOT FOUND]")
    
    print(f"\nRESULTS:")
    print(f"  Valid mappings: {len(valid_mappings)}")
    print(f"  Invalid mappings: {len(invalid_mappings)}")
    
    return valid_mappings, invalid_mappings

def main():
    """Main schema check"""
    print("MATCH STATISTICS SCHEMA CHECK")
    print("=" * 35)
    
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Credentials manquantes")
        return
    
    try:
        supabase = create_client(url, key)
        print("[OK] Connected for schema check")
        
        # Check match_statistics schema
        columns = check_table_schema(supabase, 'match_statistics')
        
        if columns:
            valid_mappings, invalid_mappings = validate_extraction_mapping(columns)
            
            print(f"\nRECOMMANDATIONS:")
            print(f"1. Use ONLY valid mappings in extraction script")
            print(f"2. Remove invalid columns from mapping:")
            for json_key, column_key in invalid_mappings.items():
                print(f"   - Remove '{json_key}' → '{column_key}'")
            
            print(f"\n3. CORRECTED MAPPING for script:")
            print("api_mappings = {")
            for json_key, column_key in valid_mappings.items():
                print(f"    '{json_key}': '{column_key}',")
            print("}")
        
    except Exception as e:
        print(f"[ERROR] Schema check failed: {e}")

if __name__ == "__main__":
    main()