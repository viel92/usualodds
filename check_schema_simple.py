#!/usr/bin/env python3
"""
Script simple pour analyser le schema Supabase et lister toutes les tables avec leurs colonnes
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

def load_environment():
    """Charge les variables d'environnement"""
    if os.path.exists('.env.local'):
        load_dotenv('.env.local')
        print("OK Charge .env.local")
    else:
        print("WARNING .env.local non trouve")
    
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if not url or not key:
        print("ERREUR Variables manquantes:")
        print(f"   NEXT_PUBLIC_SUPABASE_URL: {'OK' if url else 'MANQUE'}")
        print(f"   NEXT_PUBLIC_SUPABASE_ANON_KEY: {'OK' if key else 'MANQUE'}")
        sys.exit(1)
    
    return url, key

def test_table_access(supabase: Client, table_name: str):
    """Test d'acces simple a une table"""
    try:
        response = supabase.table(table_name).select('*').limit(0).execute()
        return True, "OK"
    except Exception as e:
        return False, str(e)

def get_table_structure(supabase: Client, table_name: str):
    """Recupere la structure d'une table"""
    try:
        response = supabase.table(table_name).select('*').limit(1).execute()
        if response.data and len(response.data) > 0:
            return list(response.data[0].keys())
        else:
            return []
    except Exception as e:
        return None

def get_table_count(supabase: Client, table_name: str):
    """Compte les lignes d'une table"""
    try:
        response = supabase.table(table_name).select('*', count='exact').limit(0).execute()
        return response.count if response.count is not None else "?"
    except Exception as e:
        return "?"

def main():
    """Fonction principale"""
    print("ANALYSE SCHEMA SUPABASE")
    print("=" * 50)
    
    # Charger environnement
    url, key = load_environment()
    
    # Connexion Supabase
    try:
        supabase: Client = create_client(url, key)
        print("OK Connexion Supabase reussie")
    except Exception as e:
        print(f"ERREUR connexion Supabase: {e}")
        sys.exit(1)
    
    # Tables probables basees sur les migrations
    probable_tables = [
        'matches', 'team_features', 'player_features', 'coach_features',
        'match_statistics', 'match_events', 'match_formations', 'match_lineups',
        'match_players_stats', 'match_context', 'match_odds_timeline',
        'ai_match_insights', 'ai_predictions', 'ai_predictions_upcoming',
        'leagues', 'teams', 'players', 'venues'
    ]
    
    print("\nDECOUVERTE DES TABLES")
    print("-" * 30)
    
    existing_tables = []
    
    for table in probable_tables:
        accessible, info = test_table_access(supabase, table)
        if accessible:
            existing_tables.append(table)
            print(f"   OK {table}")
        else:
            print(f"   ERREUR {table}")
    
    if not existing_tables:
        print("ERREUR Aucune table trouvee")
        sys.exit(1)
    
    print(f"\nOK {len(existing_tables)} tables trouvees")
    
    # Analyser chaque table
    print("\nANALYSE DETAILLEE DES TABLES")
    print("=" * 50)
    
    total_columns = 0
    
    for i, table_name in enumerate(existing_tables, 1):
        print(f"\n{i:2d}. TABLE: {table_name.upper()}")
        print("-" * (len(table_name) + 12))
        
        # Structure
        columns = get_table_structure(supabase, table_name)
        if columns is None:
            print("   ERREUR analyse structure")
            continue
        elif len(columns) == 0:
            print("   Table vide")
            continue
        
        total_columns += len(columns)
        print(f"   {len(columns)} colonnes:")
        for j, col in enumerate(columns, 1):
            print(f"      {j:2d}. {col}")
        
        # Compter les lignes
        count = get_table_count(supabase, table_name)
        print(f"   Nombre de lignes: {count}")
    
    # Resume
    print("\n" + "=" * 50)
    print("RESUME")
    print("=" * 50)
    print(f"Tables trouvees: {len(existing_tables)}")
    print(f"Colonnes totales: {total_columns}")
    
    # Recommandations d'index
    print("\nIndex SQL recommandes:")
    print("-" * 25)
    
    if 'matches' in existing_tables:
        print("CREATE INDEX IF NOT EXISTS idx_matches_date ON matches (date);")
        print("CREATE INDEX IF NOT EXISTS idx_matches_status ON matches (status);")
        print("CREATE INDEX IF NOT EXISTS idx_matches_teams ON matches (home_team_id, away_team_id);")
    
    if 'team_features' in existing_tables:
        print("CREATE INDEX IF NOT EXISTS idx_team_features_team_id ON team_features (team_id);")
        print("CREATE INDEX IF NOT EXISTS idx_team_features_season ON team_features (season);")
    
    if 'ai_predictions' in existing_tables:
        print("CREATE INDEX IF NOT EXISTS idx_ai_predictions_date ON ai_predictions (match_date DESC);")
        print("CREATE INDEX IF NOT EXISTS idx_ai_predictions_teams ON ai_predictions (home_team_id, away_team_id);")
    
    if 'ai_predictions_upcoming' in existing_tables:
        print("CREATE INDEX IF NOT EXISTS idx_ai_predictions_upcoming_date ON ai_predictions_upcoming (match_date DESC);")
        print("CREATE INDEX IF NOT EXISTS idx_ai_predictions_upcoming_fixture ON ai_predictions_upcoming (fixture_id);")
    
    print(f"\nOK Analyse terminee - {len(existing_tables)} tables analysees")

if __name__ == "__main__":
    main()