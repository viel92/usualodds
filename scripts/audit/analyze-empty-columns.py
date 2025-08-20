#!/usr/bin/env python3
"""
Analyse des colonnes vides dans Supabase
Objectif: Identifier pourquoi on a beaucoup de colonnes à 0/null
"""

import os
import sys
import pandas as pd
import numpy as np
from supabase import create_client, Client

def load_env_credentials():
    """Load Supabase credentials"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value.strip('"')
    
    return os.environ.get('NEXT_PUBLIC_SUPABASE_URL'), os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

def analyze_table_completeness(supabase, table_name, limit=500):
    """Analyser la completude d'une table"""
    print(f"\nANALYSE TABLE: {table_name.upper()}")
    print("=" * 40)
    
    try:
        # Load data
        response = supabase.table(table_name).select('*').limit(limit).execute()
        
        if not response.data:
            print(f"[ERROR] Pas de donnees dans {table_name}")
            return None
            
        df = pd.DataFrame(response.data)
        print(f"[INFO] {len(df)} lignes analysees")
        
        # Analyze completeness
        completeness_stats = {}
        
        for column in df.columns:
            total_rows = len(df)
            
            # Count different types of "empty"
            null_count = df[column].isnull().sum()
            
            # For numeric columns, count zeros
            zero_count = 0
            if df[column].dtype in ['int64', 'float64']:
                zero_count = (df[column] == 0).sum()
            
            # For string columns, count empty strings
            empty_string_count = 0
            if df[column].dtype == 'object':
                empty_string_count = (df[column] == '').sum()
            
            # Calculate percentages
            null_pct = (null_count / total_rows) * 100
            zero_pct = (zero_count / total_rows) * 100
            empty_str_pct = (empty_string_count / total_rows) * 100
            
            # Non-empty values
            non_empty = total_rows - null_count - empty_string_count
            if df[column].dtype in ['int64', 'float64']:
                non_zero = total_rows - null_count - zero_count
                completeness_pct = (non_zero / total_rows) * 100
            else:
                completeness_pct = (non_empty / total_rows) * 100
            
            completeness_stats[column] = {
                'null_count': null_count,
                'null_pct': null_pct,
                'zero_count': zero_count,
                'zero_pct': zero_pct,
                'empty_string_count': empty_string_count,
                'empty_str_pct': empty_str_pct,
                'completeness_pct': completeness_pct,
                'dtype': str(df[column].dtype)
            }
        
        # Sort by completeness (worst first)
        sorted_stats = sorted(completeness_stats.items(), key=lambda x: x[1]['completeness_pct'])
        
        print(f"\n[RESULTATS] Completude par colonne (pire en premier):")
        print("-" * 80)
        print(f"{'Colonne':<25} {'Type':<10} {'Complete':<8} {'Nulls':<8} {'Zeros':<8} {'Vides':<8}")
        print("-" * 80)
        
        problematic_columns = []
        
        for col_name, stats in sorted_stats:
            completeness = stats['completeness_pct']
            
            status_icon = ""
            if completeness < 10:
                status_icon = " [CRITIQUE]"
                problematic_columns.append((col_name, completeness, "critique"))
            elif completeness < 50:
                status_icon = " [PROBLEME]"
                problematic_columns.append((col_name, completeness, "probleme"))
            elif completeness < 80:
                status_icon = " [ATTENTION]"
                problematic_columns.append((col_name, completeness, "attention"))
            
            print(f"{col_name:<25} {stats['dtype']:<10} {completeness:>6.1f}% {stats['null_pct']:>6.1f}% {stats['zero_pct']:>6.1f}% {stats['empty_str_pct']:>6.1f}%{status_icon}")
        
        # Summary
        print(f"\n[RESUME] {table_name.upper()}:")
        print(f"  Colonnes totales: {len(df.columns)}")
        print(f"  Colonnes critiques (<10%): {len([x for x in problematic_columns if x[2] == 'critique'])}")
        print(f"  Colonnes probleme (<50%): {len([x for x in problematic_columns if x[2] == 'probleme'])}")
        print(f"  Colonnes attention (<80%): {len([x for x in problematic_columns if x[2] == 'attention'])}")
        
        return df, completeness_stats, problematic_columns
        
    except Exception as e:
        print(f"[ERROR] Analyse {table_name} echouee: {e}")
        return None, None, None

def analyze_specific_issues(df, table_name):
    """Analyser des problemes specifiques selon la table"""
    print(f"\n[ANALYSE SPECIFIQUE] {table_name.upper()}")
    print("-" * 40)
    
    if table_name == 'team_features':
        # Team features specific analysis
        
        # Check ELO ratings
        if 'elo_rating' in df.columns:
            elo_null = df['elo_rating'].isnull().sum()
            elo_zero = (df['elo_rating'] == 0).sum()
            print(f"  ELO Rating: {elo_null} nulls, {elo_zero} zeros sur {len(df)}")
        
        # Check XG data
        xg_columns = ['xg_for_avg', 'xg_against_avg', 'xg_diff_avg']
        for col in xg_columns:
            if col in df.columns:
                null_count = df[col].isnull().sum()
                zero_count = (df[col] == 0).sum()
                non_zero_count = len(df) - null_count - zero_count
                print(f"  {col}: {non_zero_count} valeurs non-zero sur {len(df)} ({non_zero_count/len(df)*100:.1f}%)")
        
        # Check form data
        form_columns = ['form_5_points', 'form_10_points']
        for col in form_columns:
            if col in df.columns:
                null_count = df[col].isnull().sum()
                zero_count = (df[col] == 0).sum()
                non_zero_count = len(df) - null_count - zero_count
                print(f"  {col}: {non_zero_count} valeurs non-zero sur {len(df)} ({non_zero_count/len(df)*100:.1f}%)")
    
    elif table_name == 'matches':
        # Matches specific analysis
        
        # Check scores
        if 'home_score' in df.columns and 'away_score' in df.columns:
            matches_with_scores = df.dropna(subset=['home_score', 'away_score'])
            print(f"  Matches avec scores: {len(matches_with_scores)} sur {len(df)} ({len(matches_with_scores)/len(df)*100:.1f}%)")
        
        # Check raw_data
        if 'raw_data' in df.columns:
            has_raw_data = df['raw_data'].notna().sum()
            print(f"  Matches avec raw_data: {has_raw_data} sur {len(df)} ({has_raw_data/len(df)*100:.1f}%)")
    
    elif table_name == 'match_statistics':
        # Match statistics analysis
        
        if 'statistics' in df.columns:
            has_stats = df['statistics'].notna().sum()
            print(f"  Matches avec statistics JSON: {has_stats} sur {len(df)} ({has_stats/len(df)*100:.1f}%)")
        
        # Check XG in statistics
        xg_count = 0
        if 'statistics' in df.columns:
            for idx, row in df.iterrows():
                if pd.notna(row['statistics']):
                    try:
                        import json
                        stats = json.loads(row['statistics'])
                        if 'expected_goals' in stats or 'xg' in stats:
                            xg_count += 1
                    except:
                        continue
            print(f"  Matches avec XG dans statistics: {xg_count} sur {len(df)} ({xg_count/len(df)*100:.1f}%)")

def investigate_data_sources(supabase):
    """Investiguer les sources de donnees"""
    print(f"\nINVESTIGATION SOURCES DE DONNEES")
    print("=" * 40)
    
    try:
        # Check leagues
        leagues_response = supabase.table('leagues').select('*').limit(10).execute()
        if leagues_response.data:
            print(f"[INFO] Leagues: {len(leagues_response.data)} leagues trouvees")
        
        # Check seasons distribution
        matches_seasons = supabase.table('matches').select('season').execute()
        if matches_seasons.data:
            seasons_df = pd.DataFrame(matches_seasons.data)
            seasons_count = seasons_df['season'].value_counts()
            print(f"[INFO] Distribution par saison:")
            for season, count in seasons_count.items():
                print(f"  Saison {season}: {count} matches")
        
        # Check team distribution
        teams_response = supabase.table('teams').select('id,name').limit(20).execute()
        if teams_response.data:
            print(f"[INFO] Teams: {len(teams_response.data)} equipes trouvees")
            
    except Exception as e:
        print(f"[ERROR] Investigation sources echouee: {e}")

def main():
    """Main analysis"""
    print("ANALYSE COLONNES VIDES SUPABASE")
    print("=" * 50)
    print("Objectif: Comprendre pourquoi beaucoup de colonnes sont vides")
    
    # Connect
    url, key = load_env_credentials()
    
    if not url or not key:
        print("[ERROR] Credentials manquantes")
        return False
    
    try:
        supabase = create_client(url, key)
        print(f"[OK] Connecte a Supabase")
        
        # Tables to analyze
        tables_to_analyze = [
            'team_features',
            'matches', 
            'match_statistics'
        ]
        
        all_results = {}
        
        # Analyze each table
        for table_name in tables_to_analyze:
            df, completeness_stats, problematic_columns = analyze_table_completeness(supabase, table_name)
            
            if df is not None:
                all_results[table_name] = {
                    'df': df,
                    'stats': completeness_stats,
                    'problems': problematic_columns
                }
                
                # Specific analysis
                analyze_specific_issues(df, table_name)
        
        # Overall investigation
        investigate_data_sources(supabase)
        
        # Summary report
        print(f"\nRAPPORT GLOBAL")
        print("=" * 20)
        
        total_critical = 0
        total_problems = 0
        
        for table_name, results in all_results.items():
            problems = results['problems']
            critical = len([x for x in problems if x[2] == 'critique'])
            problem = len([x for x in problems if x[2] == 'probleme'])
            
            total_critical += critical
            total_problems += problem
            
            print(f"{table_name}: {critical} colonnes critiques, {problem} colonnes probleme")
        
        print(f"\nTOTAL: {total_critical} colonnes critiques, {total_problems} colonnes probleme")
        
        if total_critical > 10:
            print("\n[ALERT] BEAUCOUP DE COLONNES CRITIQUES!")
            print("Actions recommandees:")
            print("1. Verifier ingestion API Football")
            print("2. Auditer scripts de calcul features")
            print("3. Valider pipeline collecte donnees")
        elif total_problems > 5:
            print("\n[WARNING] Plusieurs colonnes avec problemes")
            print("Action: Optimiser qualite donnees")
        else:
            print("\n[OK] Qualite donnees acceptable")
        
        return all_results
        
    except Exception as e:
        print(f"[ERROR] Analyse echouee: {e}")
        return None

if __name__ == "__main__":
    results = main()
    
    if results:
        print("\nAnalyse terminee - Resultats disponibles")
    else:
        print("\nAnalyse echouee - Verifier connexion")