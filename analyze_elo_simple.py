#!/usr/bin/env python3

from supabase import create_client
import os
from dotenv import load_dotenv

def main():
    load_dotenv('.env.local')
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    supabase = create_client(url, key)

    print('=== ANALYSE ELO STRUCTURE ===')
    print()

    # Top ELO teams
    result = supabase.from('team_features').select('*').order('elo_rating', {'ascending': False}).limit(5).execute()
    print('TOP 5 ELO TEAMS:')
    for i, team in enumerate(result.data, 1):
        print(f'{i}. ELO: {team["elo_rating"]} | Season: {team["season"]} | Games: {team["games_played"]} | Team: {team["team_id"]}')

    print()

    # Seasons
    seasons = supabase.from('team_features').select('season').execute()
    season_counts = {}
    for team in seasons.data:
        s = team['season']
        season_counts[s] = season_counts.get(s, 0) + 1

    print('SAISONS:')
    for season, count in sorted(season_counts.items()):
        print(f'  Season {season}: {count} teams')

    print()

    # Exemples par équipe
    all_teams = supabase.from('team_features').select('team_id, season, elo_rating').execute()
    team_seasons = {}
    for team in all_teams.data:
        tid = team['team_id']
        if tid not in team_seasons:
            team_seasons[tid] = []
        team_seasons[tid].append({'season': team['season'], 'elo': team['elo_rating']})
    
    multi_teams = {k:v for k,v in team_seasons.items() if len(v) > 1}
    single_teams = {k:v for k,v in team_seasons.items() if len(v) == 1}
    
    print(f'EQUIPES AVEC PLUSIEURS SAISONS: {len(multi_teams)}')
    for team_id, seasons_data in list(multi_teams.items())[:3]:
        seasons_str = ', '.join([f"S{s['season']}({s['elo']:.0f})" for s in sorted(seasons_data, key=lambda x: x['season'])])
        print(f'  {team_id}: {seasons_str}')

    print()
    print(f'EQUIPES AVEC UNE SEULE SAISON: {len(single_teams)}')
    for team_id, seasons_data in list(single_teams.items())[:3]:
        s = seasons_data[0]
        print(f'  {team_id}: S{s["season"]} (ELO: {s["elo"]:.0f})')

    print()

    # Ligues
    leagues = supabase.from('team_features').select('league_id, elo_rating').execute()
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
        print(f'  League {league_id}: {len(elos)} teams, avg={avg_elo:.0f}, min={min_elo:.0f}, max={max_elo:.0f}')

    print()
    print('RESUME:')
    print(f'- Total teams: {len(all_teams.data)}')
    print(f'- Multi-saisons: {len(multi_teams)} teams')
    print(f'- Mono-saison: {len(single_teams)} teams')
    print(f'- Ligues: {len(league_elos)}')

if __name__ == "__main__":
    main()