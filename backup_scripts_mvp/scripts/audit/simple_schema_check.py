#!/usr/bin/env python3
"""
SIMPLE SCHEMA CHECK - Vérification basique sans emojis
======================================================
"""

import os
from supabase import create_client
from dotenv import load_dotenv

def simple_schema_check():
    print("SIMPLE SCHEMA CHECK SUPABASE")
    print("=" * 40)
    
    load_dotenv()
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    try:
        supabase = create_client(supabase_url, service_role_key)
        
        # Tables à vérifier (attendues par TypeScript)
        expected_tables = [
            'leagues', 'seasons', 'teams', 'players', 
            'matches', 'team_features', 'player_features'
        ]
        
        print("VERIFICATION TABLES CRITIQUES:")
        print("-" * 35)
        
        existing = []
        missing = []
        
        for table in expected_tables:
            try:
                # Test simple : essayer de faire un select
                result = supabase.table(table).select('*').limit(1).execute()
                print(f"  {table:20s} EXISTS")
                existing.append(table)
            except Exception as e:
                print(f"  {table:20s} MISSING ({str(e)[:30]}...)")
                missing.append(table)
        
        print(f"\nRESUME:")
        print(f"  Tables existantes: {len(existing)}")
        print(f"  Tables manquantes: {len(missing)}")
        
        if missing:
            print(f"\nTables manquantes:")
            for table in missing:
                print(f"  - {table}")
        
        # Compter données dans tables existantes
        if existing:
            print(f"\nVOLUME DONNEES (tables existantes):")
            for table in existing:
                try:
                    result = supabase.table(table).select('*', count='exact').execute()
                    count = result.count if result.count else 0
                    print(f"  {table:20s} {count:>8,d} rows")
                except:
                    print(f"  {table:20s} ERROR count")
        
        # Diagnostic final
        print(f"\nDIAGNOSTIC:")
        if len(missing) == 0:
            print("  SCHEMA OK - Prêt pour système TypeScript")
        else:
            print(f"  SCHEMA INCOMPLET - {len(missing)} tables manquantes")
            print("  ACTION: Appliquer migration SQL")
        
        return {
            'existing': existing,
            'missing': missing,
            'ready': len(missing) == 0
        }
        
    except Exception as e:
        print(f"ERREUR: {e}")
        return None

if __name__ == "__main__":
    simple_schema_check()