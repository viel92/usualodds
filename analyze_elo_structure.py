#!/usr/bin/env python3
"""
Analyse détaillée structure ELO
"""

from supabase import create_client
import os
from dotenv import load_dotenv

def main():
    # Charger environnement
    load_dotenv('.env.local')
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    supabase = create_client(url, key)

    print('=== ANALYSE ELO DETAILLEE ===')
    print()

    # Analyser les données ELO team_features
    result = supabase.from('team_features').select('team_id, season, elo_rating, games_played, league_id').order('elo_rating', ascending=False).limit(10).execute()
    print('TOP 10 ELO TEAMS:')
    for i, team in enumerate(result.data, 1):
        print(f'{i:2d}. ELO: {team["elo_rating"]:4.0f} | Season: {team["season"]} | Games: {team["games_played"]:2d} | Team: {team["team_id"]}')

    print()

    # Vérifier répartition par saison
    seasons = supabase.from('team_features').select('season').execute()
    season_counts = {}
    for team in seasons.data:
        s = team['season']
        season_counts[s] = season_counts.get(s, 0) + 1

    print('REPARTITION PAR SAISON:')
    for season, count in sorted(season_counts.items()):
        print(f'  Season {season}: {count} teams')

    print()

    # Voir quelques exemples détaillés
    examples = supabase.from('team_features').select('team_id, season, elo_rating, games_played, wins, draws, losses, goals_for, goals_against').limit(5).execute()
    print('EXEMPLES DETAILLES:')
    print('Team_ID     | Season | ELO  | Games | W-D-L | Goals F-A')
    print('-' * 55)
    for team in examples.data:
        print(f'{team["team_id"]:11s} | {team["season"]:6d} | {team["elo_rating"]:4.0f} | {team["games_played"]:5d} | {team["wins"]}-{team["draws"]}-{team["losses"]} | {team["goals_for"]}-{team["goals_against"]}')

    print()

    # Vérifier équipes avec plusieurs saisons
    all_teams = supabase.from('team_features').select('team_id, season, elo_rating').execute()
    team_seasons = {}
    for team in all_teams.data:
        tid = team['team_id']
        if tid not in team_seasons:
            team_seasons[tid] = []
        team_seasons[tid].append({'season': team['season'], 'elo': team['elo_rating']})
    
    multi_teams = {k:v for k,v in team_seasons.items() if len(v) > 1}
    print('TEAMS AVEC PLUSIEURS SAISONS:')
    for team_id, seasons_data in list(multi_teams.items())[:5]:
        seasons_str = ', '.join([f"{s['season']}(ELO:{s['elo']:.0f})" for s in sorted(seasons_data, key=lambda x: x['season'])])
        print(f'  {team_id}: {seasons_str}')

    print()
    
    # Vérifier évolution ELO pour une équipe
    if multi_teams:
        sample_team = list(multi_teams.keys())[0]
        evo_data = supabase.from('team_features').select('season, elo_rating, games_played').eq('team_id', sample_team).order('season').execute()
        print(f'EVOLUTION ELO pour {sample_team}:')
        for data in evo_data.data:
            print(f'  Season {data["season"]}: ELO {data["elo_rating"]:4.0f} ({data["games_played"]} games)')

    print()
    
    # Analyser les ligues
    leagues = supabase.from('team_features').select('league_id, team_id, elo_rating').execute()
    league_elos = {}
    for team in leagues.data:
        lid = team['league_id']
        if lid not in league_elos:
            league_elos[lid] = []
        league_elos[lid].append(team['elo_rating'])
    
    print('ELO PAR LIGUE:')
    for league_id, elos in league_elos.items():
        avg_elo = sum(elos) / len(elos)
        min_elo = min(elos)
        max_elo = max(elos)
        print(f'  League {league_id}: {len(elos)} teams, ELO avg={avg_elo:.0f}, min={min_elo:.0f}, max={max_elo:.0f}')
    
    print()
    print('CONCLUSION:')
    print(f'- Total teams avec ELO: {len(all_teams.data)}')
    print(f'- Teams multi-saisons: {len(multi_teams)}')
    print(f'- Teams mono-saison: {len(team_seasons) - len(multi_teams)}')

if __name__ == "__main__":
    main()