#!/usr/bin/env python3
"""
Ajouter Paris FC (promu de Ligue 2) dans team_features
"""

from supabase import create_client, Client

def add_paris_fc():
    print("AJOUT DE PARIS FC (Promu de Ligue 2)")
    print("="*60)
    
    # Configuration Supabase
    url = 'https://agysfqhijfbnqzzooyeo.supabase.co'
    service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    
    supabase: Client = create_client(url, service_key)
    
    # Vérifier que Paris FC n'existe pas déjà
    print("\n1. Vérification existence Paris FC (ID 114)...")
    response = supabase.table('team_features') \
        .select('team_id, season') \
        .eq('team_id', 114) \
        .execute()
    
    if response.data:
        print("   [!] Paris FC existe déjà dans team_features:")
        for record in response.data:
            print(f"       - Saison {record['season']}")
        return
    
    print("   [OK] Paris FC n'existe pas, création...")
    
    # Créer les données pour Paris FC
    # Valeurs réalistes pour une équipe promue de Ligue 2
    paris_fc_data = {
        'team_id': 114,
        'season': 2024,
        'league_id': 61,  # Ligue 1
        'elo_rating': 1420,  # ELO typique équipe promue (entre 1400-1450)
        'form_5_points': 5,  # Forme moyenne-faible pour un promu
        'current_rank': 18,  # Position typique d'un promu
        'points': 0,
        'goals_per_game': 0.9,  # Moins de buts qu'une équipe établie
        'goals_conceded_per_game': 1.5,  # Plus de buts encaissés
        'xg_for_avg': 0.95,
        'xg_against_avg': 1.4,
        'possession_avg': 45,  # Moins de possession
        'shots_per_game': 10,
        'shots_against_per_game': 14,
        'shots_on_target_avg': 3.2,
        'corners_for': 4,
        'corners_against': 6,
        'corners_conversion_rate': 0.08,
        'yellow_cards': 2.1,
        'red_cards': 0.1,
        'discipline_index': 0.55,  # Un peu moins discipliné
        'pressing_intensity': 45,  # Pressing modéré
        'tempo_score': 45,  # Tempo modéré
        'wins': 0,
        'draws': 0,
        'losses': 0,
        'matches_played': 0,
        'clean_sheets': 0,
        'btts_percentage': 45,
        'over_15_percentage': 65,
        'over_25_percentage': 42,
        'over_35_percentage': 25,
        'avg_goals_per_match': 2.4,
        'home_strength': 0.95,
        'away_strength': 0.85,
        'offensive_strength': 0.85,
        'defensive_strength': 0.80
    }
    
    print("\n2. Création de l'entrée pour Paris FC...")
    print("   - ELO: 1420 (typique pour un promu)")
    print("   - Forme: 5/15 (forme moyenne-faible)")
    print("   - Goals/game: 0.9")
    print("   - Conceded/game: 1.5")
    
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
    print("TERMINÉ - Paris FC est maintenant dans la base de données")

if __name__ == "__main__":
    add_paris_fc()