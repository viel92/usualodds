#!/usr/bin/env python3
"""
Vérifier les types de colonnes dans match_statistics
Pour adapter le script d'extraction
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

def check_column_data_types(supabase):
    """Vérifier les types de colonnes statistiques"""
    print("COLUMN DATA TYPES CHECK")
    print("=" * 25)
    
    try:
        # Prendre un échantillon pour analyser les types
        response = supabase.table('match_statistics').select('*').limit(1).execute()
        
        if not response.data:
            print("[ERROR] No data to analyze")
            return
            
        record = response.data[0]
        
        # Colonnes statistiques à analyser
        stat_columns = [
            'corner_kicks', 'yellow_cards', 'red_cards', 
            'total_shots', 'shots_on_goal', 'shots_off_goal',
            'expected_goals', 'ball_possession', 'fouls', 'offsides',
            'total_passes', 'passes_accurate', 'passes_percentage',
            'goalkeeper_saves', 'shots_insidebox', 'shots_outsidebox'
        ]
        
        print("CURRENT VALUES AND TYPES:")
        for col in stat_columns:
            if col in record:
                value = record[col]
                value_type = type(value).__name__
                print(f"  {col}: {value} ({value_type})")
            else:
                print(f"  {col}: MISSING")
        
        # Identifier lesquelles sont INTEGER vs REAL
        integer_columns = []
        float_columns = []
        
        for col in stat_columns:
            if col in record and record[col] is not None:
                value = record[col]
                if isinstance(value, int):
                    integer_columns.append(col)
                elif isinstance(value, float):
                    float_columns.append(col)
        
        print(f"\nCOLUMN TYPES ANALYSIS:")
        print(f"Integer columns ({len(integer_columns)}):")
        for col in integer_columns:
            print(f"  - {col}")
        
        print(f"\nFloat columns ({len(float_columns)}):")
        for col in float_columns:
            print(f"  - {col}")
        
        print(f"\nCONVERSION STRATEGY:")
        print("For integer columns: use int(float_value)")
        print("For float columns: use float(value)")
        
        return integer_columns, float_columns
        
    except Exception as e:
        print(f"[ERROR] Column type check failed: {e}")
        return None, None

def generate_type_aware_mapping():
    """Générer mapping avec conversion de types"""
    print(f"\nTYPE-AWARE MAPPING GENERATOR")
    print("=" * 30)
    
    # Hypothèse basée sur l'erreur: la plupart sont INTEGER
    integer_columns = [
        'corner_kicks', 'yellow_cards', 'red_cards', 
        'total_shots', 'shots_on_goal', 'shots_off_goal',
        'fouls', 'offsides', 'total_passes', 'passes_accurate', 
        'goalkeeper_saves', 'shots_insidebox', 'shots_outsidebox'
    ]
    
    float_columns = [
        'expected_goals', 'ball_possession', 'passes_percentage'
    ]
    
    print("TYPE-AWARE CONVERSION CODE:")
    print("# Integer columns - convert to int")
    for col in integer_columns:
        print(f"if '{col}' in update_data:")
        print(f"    update_data['{col}'] = int(update_data['{col}'])")
    
    print("\n# Float columns - keep as float")
    for col in float_columns:
        print(f"if '{col}' in update_data:")
        print(f"    update_data['{col}'] = float(update_data['{col}'])")

def main():
    """Main column type check"""
    print("MATCH STATISTICS COLUMN TYPES")
    print("=" * 35)
    
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Credentials manquantes")
        return
    
    try:
        supabase = create_client(url, key)
        print("[OK] Connected for type analysis")
        
        integer_cols, float_cols = check_column_data_types(supabase)
        
        generate_type_aware_mapping()
        
        print(f"\nRECOMMANDATION:")
        print("Update the extraction script to convert types correctly")
        print("- INTEGER columns: use int(value)")
        print("- REAL columns: use float(value)")
        
    except Exception as e:
        print(f"[ERROR] Type check failed: {e}")

if __name__ == "__main__":
    main()