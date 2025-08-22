#!/usr/bin/env python3
"""
Vérifier les logos d'équipes disponibles dans la base de données
"""

from supabase import create_client, Client

def check_team_logos():
    print("VÉRIFICATION: Logos d'équipes disponibles")
    print("="*60)
    
    url = 'https://agysfqhijfbnqzzooyeo.supabase.co'
    service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    
    supabase: Client = create_client(url, service_key)
    
    # 1. Vérifier la structure de team_features pour les logos
    print("\n1. Structure team_features (colonnes logos)...")
    response = supabase.table('team_features') \
        .select('*') \
        .limit(1) \
        .execute()
    
    if response.data:
        columns = list(response.data[0].keys())
        logo_columns = [col for col in columns if 'logo' in col.lower()]
        if logo_columns:
            print(f"   Colonnes logos trouvées: {logo_columns}")
        else:
            print("   Aucune colonne logo trouvée dans team_features")
    
    # 2. Vérifier s'il y a une table teams
    try:
        response = supabase.table('teams') \
            .select('*') \
            .limit(5) \
            .execute()
        
        if response.data:
            print(f"\n2. Table teams trouvée ({len(response.data)} exemples):")
            for team in response.data:
                print(f"   - ID: {team.get('id')}, Nom: {team.get('name')}")
                # Chercher colonnes logo
                logo_fields = [key for key in team.keys() if 'logo' in key.lower()]
                if logo_fields:
                    for field in logo_fields:
                        print(f"     Logo ({field}): {team.get(field)}")
        else:
            print("\n2. Table teams vide")
            
    except Exception as e:
        print(f"\n2. Table teams non trouvée: {e}")
    
    # 3. Vérifier dans matches si les noms d'équipes ont des infos
    print("\n3. Échantillon matches avec noms d'équipes...")
    response = supabase.table('matches') \
        .select('home_team_id, away_team_id, home_team_name, away_team_name') \
        .limit(5) \
        .execute()
    
    if response.data:
        for match in response.data:
            print(f"   - {match['home_team_name']} (ID: {match['home_team_id']}) vs {match['away_team_name']} (ID: {match['away_team_id']})")
    
    # 4. Rechercher toutes les tables qui pourraient contenir des logos
    print("\n4. Recherche de logos dans d'autres tables...")
    
    # Essayer plusieurs tables possibles
    possible_tables = ['leagues', 'competitions', 'standings']
    
    for table_name in possible_tables:
        try:
            response = supabase.table(table_name) \
                .select('*') \
                .limit(1) \
                .execute()
            
            if response.data and response.data[0]:
                columns = list(response.data[0].keys())
                logo_columns = [col for col in columns if 'logo' in col.lower()]
                if logo_columns:
                    print(f"   Table {table_name}: {logo_columns}")
                else:
                    print(f"   Table {table_name}: pas de colonne logo")
        except:
            print(f"   Table {table_name}: non trouvée")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    check_team_logos()