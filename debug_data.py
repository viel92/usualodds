#!/usr/bin/env python3
"""
DEBUG DATA AVAILABILITY - USUALODDS 2025
========================================
Diagnostic approfondi des données pour comprendre l'échec du backtest
"""

from supabase import create_client
import os
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

print("=== DIAGNOSTIC DONNEES ===")

# 1. Matches avec résultats
print("\n1. MATCHES WITH RESULTS:")
matches_response = supabase.table('matches').select('season').not_.is_('home_score', None).not_.is_('away_score', None).execute()
matches_df = pd.DataFrame(matches_response.data)
print(f"Total: {len(matches_df)}")

# Par saison
season_counts = matches_df['season'].value_counts().sort_index()
print("By season:")
for season, count in season_counts.items():
    print(f"  {season}: {count} matches")

# 2. Team features
print("\n2. TEAM FEATURES:")
features_response = supabase.table('team_features').select('team_id, season').execute()
features_df = pd.DataFrame(features_response.data)
print(f"Total: {len(features_df)}")

# Par saison
if len(features_df) > 0:
    feature_counts = features_df['season'].value_counts().sort_index()
    print("By season:")
    for season, count in feature_counts.items():
        print(f"  {season}: {count} team features")

# 3. Jointure matches <-> features
print("\n3. MATCHES WITH FEATURES:")
matches_with_results = supabase.table('matches').select(
    'id, season, home_team_id, away_team_id'
).not_.is_('home_score', None).not_.is_('away_score', None).execute()

matches_df_full = pd.DataFrame(matches_with_results.data)
print(f"Matches with results: {len(matches_df_full)}")

# Check combien ont des features
if len(features_df) > 0:
    matched_count = 0
    for _, match in matches_df_full.iterrows():
        home_has_features = len(features_df[
            (features_df['team_id'] == match['home_team_id']) & 
            (features_df['season'] == match['season'])
        ]) > 0
        away_has_features = len(features_df[
            (features_df['team_id'] == match['away_team_id']) & 
            (features_df['season'] == match['season'])
        ]) > 0
        
        if home_has_features and away_has_features:
            matched_count += 1
    
    print(f"Matches with both team features: {matched_count}")
    print(f"Match rate: {matched_count/len(matches_df_full)*100:.1f}%")
else:
    print("No team features found!")

# 4. Sample quelques team_features
print("\n4. SAMPLE FEATURES:")
if len(features_df) > 0:
    sample_features = supabase.table('team_features').select('*').limit(3).execute()
    for i, feature in enumerate(sample_features.data):
        print(f"Team {i+1}: {list(feature.keys())}")