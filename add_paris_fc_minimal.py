#!/usr/bin/env python3
"""
Ajouter Paris FC avec des valeurs minimales de base
L'ELO sera mis à jour naturellement au fil de la saison
"""

from supabase import create_client, Client

def add_paris_fc_minimal():
    print("AJOUT DE PARIS FC - Données minimales")
    print("="*60)
    
    # Configuration Supabase
    url = 'https://agysfqhijfbnqzzooyeo.supabase.co'
    service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    
    supabase: Client = create_client(url, service_key)
    
    # Vérifier que Paris FC n'existe pas déjà
    print("\n1. Vérification existence Paris FC (ID 114)...")
    response = supabase.table('team_features') \
        .select('team_id, season, elo_rating') \
        .eq('team_id', 114) \
        .execute()
    
    if response.data:
        print("   [!] Paris FC existe déjà dans team_features:")
        for record in response.data:
            print(f"       - Saison {record['season']}: ELO {record.get('elo_rating', 'N/A')}")
        return
    
    print("   [OK] Paris FC n'existe pas, création...")
    
    # Données MINIMALES pour Paris FC
    # ELO de base faible pour un promu, sera ajusté naturellement
    paris_fc_data = {
        'team_id': 114,
        'season': 2024,
        'league_id': 61,  # Ligue 1
        'elo_rating': 1350.0,  # ELO de base faible pour promu
        'form_5_points': 5,  # Forme neutre de départ
        'goals_per_game': 1.0,
        'goals_conceded_per_game': 1.2,
        'xg_for_avg': 1.0,
        'xg_against_avg': 1.2,
        'possession_avg': 48.0,
        'shots_per_game': 11.0,
        'shots_against_per_game': 12.0,
        'shots_on_target_avg': 3.5,
        'pressing_intensity': 0.5,
        'tempo_score': 50.0
    }
    
    print("\n2. Création de l'entrée minimale pour Paris FC...")
    print("   - ELO: 1350 (base faible pour promu)")
    print("   - Forme: 5/15 (neutre)")
    print("   - Autres valeurs: neutres/moyennes")
    print("\n   Note: L'ELO s'ajustera naturellement au fil des matchs")
    
    try:
        response = supabase.table('team_features').insert(paris_fc_data).execute()
        print("\n[OK] Paris FC ajouté avec succès!")
        
        # Vérifier l'insertion
        print("\n3. Vérification de l'insertion...")
        response = supabase.table('team_features') \
            .select('team_id, elo_rating, form_5_points, season') \
            .eq('team_id', 114) \
            .execute()
        
        if response.data:
            data = response.data[0]
            print(f"   [OK] Données confirmées:")
            print(f"       - Team ID: {data['team_id']}")
            print(f"       - ELO: {data['elo_rating']}")
            print(f"       - Forme: {data['form_5_points']}")
            print(f"       - Saison: {data['season']}")
        
    except Exception as e:
        print(f"\n[X] Erreur lors de l'insertion: {e}")
        return
    
    print("\n" + "="*60)
    print("TERMINÉ - Paris FC ajouté avec ELO de base")
    print("L'ELO sera mis à jour automatiquement au fil de la saison")

if __name__ == "__main__":
    add_paris_fc_minimal()