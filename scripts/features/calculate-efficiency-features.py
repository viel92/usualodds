#!/usr/bin/env python3
"""
Calculate efficiency and pressure features from match statistics
Objectif: Compenser manque XG avec features alternatives
"""

import os
import sys
import pandas as pd
import numpy as np
from supabase import create_client, Client
import json

def connect_supabase():
    """Connexion Supabase"""
    url = "https://bpyftqmkqwtmhqvuqctf.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweWZ0cW1rcXd0bWhxdnVxY3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQxNzA0MzIsImV4cCI6MjAzOTc0NjQzMn0.v-7pO7w5lZJrJAYcEAzN5ZRBrqOFFgpOxzFVWX5ZCSM"
    return create_client(url, key)

def calculate_efficiency_features():
    """Calcule features d'efficacite et pression"""
    print("CALCULATE EFFICIENCY & PRESSURE FEATURES")
    print("=" * 50)
    
    supabase = connect_supabase()
    print("[OK] Supabase connection established")
    
    # Load match statistics with JSON data
    print("\n[1] LOADING MATCH STATISTICS DATA")
    stats_response = supabase.table('match_statistics').select('*').execute()
    stats_df = pd.DataFrame(stats_response.data)
    print(f"  Match statistics: {len(stats_df)} records")
    
    # Process JSON statistics for efficiency metrics
    efficiency_features = []
    
    for idx, row in stats_df.iterrows():
        try:
            team_id = row['team_id']
            season = row['season']
            match_id = row['match_id']
            
            # Parse JSON statistics
            stats_json = json.loads(row['statistics']) if row['statistics'] else {}
            
            # Extract core metrics
            goals = stats_json.get('goals', 0)
            shots_total = stats_json.get('shots_total', 0)
            shots_on_target = stats_json.get('shots_on_target', 0)
            possession = stats_json.get('possession', 0)
            attacks = stats_json.get('attacks', 0)
            corners = stats_json.get('corners', 0)
            fouls = stats_json.get('fouls', 0)
            
            # Calculate efficiency features
            features = {
                'team_id': team_id,
                'season': season,
                'match_id': match_id,
                
                # Shooting efficiency
                'shooting_efficiency': goals / shots_total if shots_total > 0 else 0,
                'target_accuracy': shots_on_target / shots_total if shots_total > 0 else 0,
                'clinical_finishing': goals / shots_on_target if shots_on_target > 0 else 0,
                
                # Possession efficiency  
                'possession_efficiency': goals / (possession / 100) if possession > 0 else 0,
                'possession_quality': shots_total / (possession / 100) if possession > 0 else 0,
                
                # Attacking pressure
                'attacking_pressure': (shots_total + corners + attacks) / 3 if attacks > 0 else 0,
                'pressure_intensity': (corners + fouls) / 2,
                'attacking_frequency': attacks / 90 if attacks > 0 else 0,  # per minute
                
                # Composite metrics
                'overall_efficiency': (goals * 2 + shots_on_target + corners) / (shots_total + attacks + 1),
                'threat_creation': (shots_total + corners * 2 + attacks) / 3
            }
            
            efficiency_features.append(features)
            
        except Exception as e:
            print(f"  Error processing team {team_id}: {e}")
            continue
    
    print(f"  Calculated efficiency features: {len(efficiency_features)} records")
    
    # Convert to DataFrame and aggregate by team/season
    features_df = pd.DataFrame(efficiency_features)
    
    # Aggregate features by team and season
    print("\n[2] AGGREGATING TEAM EFFICIENCY FEATURES")
    team_features = features_df.groupby(['team_id', 'season']).agg({
        'shooting_efficiency': 'mean',
        'target_accuracy': 'mean', 
        'clinical_finishing': 'mean',
        'possession_efficiency': 'mean',
        'possession_quality': 'mean',
        'attacking_pressure': 'mean',
        'pressure_intensity': 'mean',
        'attacking_frequency': 'mean',
        'overall_efficiency': 'mean',
        'threat_creation': 'mean'
    }).reset_index()
    
    print(f"  Aggregated team features: {len(team_features)} records")
    
    # Add to team_features table
    print("\n[3] UPDATING TEAM_FEATURES TABLE")
    updates_count = 0
    
    for idx, row in team_features.iterrows():
        try:
            # Check if team/season exists
            existing = supabase.table('team_features').select('id').eq('team_id', row['team_id']).eq('season', row['season']).execute()
            
            update_data = {
                'shooting_efficiency': float(row['shooting_efficiency']),
                'target_accuracy': float(row['target_accuracy']),
                'clinical_finishing': float(row['clinical_finishing']),
                'possession_efficiency': float(row['possession_efficiency']),
                'possession_quality': float(row['possession_quality']),
                'attacking_pressure': float(row['attacking_pressure']),
                'pressure_intensity': float(row['pressure_intensity']),
                'attacking_frequency': float(row['attacking_frequency']),
                'overall_efficiency': float(row['overall_efficiency']),
                'threat_creation': float(row['threat_creation'])
            }
            
            if existing.data:
                # Update existing record
                result = supabase.table('team_features').update(update_data).eq('team_id', row['team_id']).eq('season', row['season']).execute()
                updates_count += 1
            else:
                # Create new record
                create_data = {
                    'team_id': int(row['team_id']),
                    'season': int(row['season']),
                    **update_data
                }
                result = supabase.table('team_features').insert(create_data).execute()
                updates_count += 1
                
        except Exception as e:
            print(f"  Error updating team {row['team_id']} season {row['season']}: {e}")
            continue
    
    print(f"  Updated {updates_count} team feature records")
    
    # Summary statistics
    print("\n[4] EFFICIENCY FEATURES SUMMARY")
    print("  Top efficiency metrics calculated:")
    for col in ['shooting_efficiency', 'possession_efficiency', 'attacking_pressure', 'overall_efficiency']:
        mean_val = team_features[col].mean()
        print(f"    {col}: {mean_val:.3f} average")
    
    print(f"\n[SUCCESS] Efficiency features calculated and stored")
    print(f"  Features added: 10 efficiency/pressure metrics")
    print(f"  Coverage: {len(team_features)} team/season combinations")
    
    return len(team_features)

def main():
    """Main execution"""
    try:
        features_count = calculate_efficiency_features()
        print(f"\nEFFICIENCY FEATURES CALCULATION COMPLETED")
        print(f"Total features: {features_count} team/season records")
        print(f"Ready for ML testing with enhanced feature stack")
        
    except Exception as e:
        print(f"[ERROR] Script failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()