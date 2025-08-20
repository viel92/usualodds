#!/usr/bin/env python3
"""
APPLY CORE TABLES MIGRATION
============================
Applique la migration pour créer leagues, seasons, teams, players
"""

import os
from supabase import create_client
from dotenv import load_dotenv

def apply_core_migration():
    print("APPLICATION MIGRATION CORE TABLES")
    print("=" * 45)
    
    load_dotenv()
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not service_role_key:
        print("ERREUR: SUPABASE_SERVICE_ROLE_KEY manquante")
        return False
    
    try:
        supabase = create_client(supabase_url, service_role_key)
        
        # Lire le fichier de migration
        migration_path = "supabase/migrations/20250820_add_missing_core_tables.sql"
        
        print(f"Lecture migration: {migration_path}")
        
        with open(migration_path, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        print(f"Migration lue: {len(migration_sql)} caracteres")
        
        # Diviser le SQL en statements (par ';')
        statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
        statements = [stmt for stmt in statements if not stmt.startswith('--') and stmt]
        
        print(f"Execution {len(statements)} statements SQL...")
        
        success_count = 0
        errors = []
        
        for i, statement in enumerate(statements, 1):
            try:
                # Skip comments and empty statements
                if statement.startswith('--') or len(statement) < 10:
                    continue
                
                print(f"  {i:2d}. Execution statement ({len(statement)} chars)...")
                
                # Execute statement
                result = supabase.rpc('exec_sql', {'sql': statement}).execute()
                success_count += 1
                
            except Exception as e:
                error_msg = str(e)
                if "already exists" in error_msg or "duplicate" in error_msg.lower():
                    print(f"      SKIP - Deja existant")
                    success_count += 1
                else:
                    print(f"      ERREUR: {error_msg[:100]}...")
                    errors.append(f"Statement {i}: {error_msg}")
        
        print(f"\nRESULTAT:")
        print(f"  Reussis: {success_count}")
        print(f"  Erreurs: {len(errors)}")
        
        if errors:
            print(f"\nERREURS DETECTEES:")
            for error in errors[:3]:  # Only first 3 errors
                print(f"  - {error}")
        
        # Vérification finale
        print(f"\nVERIFICATION POST-MIGRATION:")
        
        tables_to_check = ['leagues', 'seasons', 'teams', 'players']
        created_tables = []
        
        for table in tables_to_check:
            try:
                result = supabase.table(table).select('*').limit(1).execute()
                print(f"  {table:15s} CREE")
                created_tables.append(table)
            except:
                print(f"  {table:15s} ECHEC")
        
        success = len(created_tables) == len(tables_to_check)
        
        print(f"\nSTATUS FINAL: {'SUCCESS' if success else 'PARTIEL'}")
        print(f"Tables creees: {len(created_tables)}/{len(tables_to_check)}")
        
        return success
        
    except Exception as e:
        print(f"ERREUR FATALE: {e}")
        return False

if __name__ == "__main__":
    apply_core_migration()