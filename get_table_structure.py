#!/usr/bin/env python3
"""
Obtenir la structure exacte de team_features
"""

from supabase import create_client, Client

def get_structure():
    url = 'https://agysfqhijfbnqzzooyeo.supabase.co'
    service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
    
    supabase: Client = create_client(url, service_key)
    
    # Récupérer un enregistrement pour voir les colonnes
    response = supabase.table('team_features').select('*').limit(1).execute()
    
    if response.data:
        print("Colonnes disponibles dans team_features:")
        print("-" * 40)
        for key in response.data[0].keys():
            value = response.data[0][key]
            print(f"{key}: {type(value).__name__} = {value}")

if __name__ == "__main__":
    get_structure()