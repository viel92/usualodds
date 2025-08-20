#!/usr/bin/env python3
"""
AUDIT SCHEMA SUPABASE - Vérification complète
============================================
Vérifier toutes les tables existantes et leur structure
vs besoins du système TypeScript officiel
"""

import os
from supabase import create_client
from dotenv import load_dotenv

def audit_complete_schema():
    print("AUDIT COMPLET SCHEMA SUPABASE")
    print("="*50)
    
    load_dotenv()
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    try:
        supabase = create_client(supabase_url, service_role_key)
        
        # 1. LISTER TOUTES LES TABLES
        print("1. TABLES EXISTANTES:")
        print("-"*30)
        
        # Query pour lister toutes les tables du schema public
        query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
        """
        
        result = supabase.rpc('exec_sql', {'sql': query}).execute()
        
        if result.data:
            tables = [row['table_name'] for row in result.data]
            for i, table in enumerate(tables, 1):
                print(f"  {i:2d}. {table}")
        
        print(f"\n  TOTAL: {len(tables)} tables")
        
        # 2. VÉRIFIER TABLES CRITIQUES ATTENDUES PAR TYPESCRIPT
        print("\n2. VÉRIFICATION TABLES CRITIQUES:")
        print("-"*40)
        
        expected_tables = [
            'leagues', 'seasons', 'teams', 'players', 
            'matches', 'team_features', 'player_features',
            'match_statistics', 'match_odds'
        ]
        
        existing = set(tables) if result.data else set()
        
        for table in expected_tables:
            status = "✅ EXISTS" if table in existing else "❌ MISSING"
            print(f"  {table:20s} {status}")
        
        # 3. ANALYSER STRUCTURE DES TABLES EXISTANTES
        print("\n3. STRUCTURE TABLES PRINCIPALES:")
        print("-"*40)
        
        main_tables = ['matches', 'team_features', 'player_features']
        
        for table in main_tables:
            if table in existing:
                print(f"\n  📋 TABLE: {table.upper()}")
                
                # Get column info
                col_query = f"""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = '{table}' 
                AND table_schema = 'public'
                ORDER BY ordinal_position
                """
                
                col_result = supabase.rpc('exec_sql', {'sql': col_query}).execute()
                
                if col_result.data:
                    for col in col_result.data[:10]:  # First 10 columns
                        nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                        print(f"    - {col['column_name']:25s} {col['data_type']:15s} {nullable}")
                    
                    if len(col_result.data) > 10:
                        print(f"    ... et {len(col_result.data) - 10} autres colonnes")
                else:
                    print("    ❌ Impossible de lire structure")
            else:
                print(f"\n  ❌ TABLE MANQUANTE: {table.upper()}")
        
        # 4. COMPTER LES DONNÉES
        print("\n4. VOLUME DE DONNÉES:")
        print("-"*25)
        
        for table in ['matches', 'team_features', 'player_features', 'teams', 'leagues']:
            if table in existing:
                try:
                    count_result = supabase.table(table).select('id', count='exact').execute()
                    count = count_result.count if count_result.count is not None else 0
                    print(f"  {table:20s} {count:>8,d} rows")
                except Exception as e:
                    print(f"  {table:20s} {'ERROR':>8s} ({str(e)[:30]}...)")
            else:
                print(f"  {table:20s} {'MISSING':>8s}")
        
        # 5. RECOMMANDATIONS
        print("\n5. DIAGNOSTIC & RECOMMANDATIONS:")
        print("-"*40)
        
        missing_critical = [t for t in expected_tables if t not in existing]
        
        if missing_critical:
            print(f"  ❌ PROBLÈME: {len(missing_critical)} tables critiques manquantes")
            print("     Tables manquantes:", ", ".join(missing_critical))
            print("     → Appliquer migration SQL complète")
        else:
            print("  ✅ Toutes les tables critiques présentes")
        
        if 'matches' in existing and 'team_features' in existing:
            print("  ✅ Tables principales OK pour ML")
        else:
            print("  ❌ Tables ML incomplètes")
        
        return {
            'existing_tables': list(existing),
            'missing_critical': missing_critical,
            'ready_for_typescript': len(missing_critical) == 0
        }
        
    except Exception as e:
        print(f"❌ ERREUR: {e}")
        return None

if __name__ == "__main__":
    audit_complete_schema()