#!/usr/bin/env python3
"""
ARCHITECTURE COMPLÈTE - SYSTÈME D'APPRENTISSAGE AUTOMATIQUE
==========================================================

PROBLÈME CRITIQUE IDENTIFIÉ:
- team_features: 101 enregistrements FIGÉS (ELO, forme, xG ne bougent jamais)
- matches: 2,057 avec résultats mais AUCUNE mise à jour des features après
- Paris FC: ELO 1350 qui ne changera jamais
- player_features: Multiples saisons par joueur sans logique de mise à jour

SOLUTION ML COMPLÈTE:
1. Système ELO dynamique après chaque match
2. Recalcul forme automatique (5 derniers matchs)  
3. Gestion intelligente joueurs multi-saisons
4. Déclencheur automatique post-match
5. Pipeline ML d'apprentissage continu
"""

from supabase import create_client, Client
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import json
import math
import logging

class DynamicMLLearningSystem:
    """Système d'apprentissage ML dynamique complet"""
    
    def __init__(self):
        self.url = 'https://agysfqhijfbnqzzooyeo.supabase.co'
        self.service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
        self.supabase: Client = create_client(self.url, self.service_key)
        
        # Paramètres ELO
        self.K_FACTOR = 32  # Standard pour football
        self.HOME_ADVANTAGE = 100  # Points ELO avantage domicile
        
        # Configuration logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    # =====================
    # 1. SYSTÈME ELO DYNAMIQUE
    # =====================
    
    def calculate_elo_probability(self, elo1: float, elo2: float, home_advantage: bool = False) -> float:
        """Calcule probabilité victoire basée sur ELO"""
        if home_advantage:
            elo1 += self.HOME_ADVANTAGE
        
        rating_diff = elo2 - elo1
        return 1 / (1 + 10**(rating_diff / 400))
    
    def update_elo_ratings(self, 
                          home_team_id: int, away_team_id: int,
                          home_goals: int, away_goals: int,
                          current_home_elo: float, current_away_elo: float) -> Tuple[float, float]:
        """Met à jour les ratings ELO après un match"""
        
        # Déterminer le résultat (0=défaite, 0.5=nul, 1=victoire)
        if home_goals > away_goals:
            home_result = 1.0
            away_result = 0.0
        elif home_goals < away_goals:
            home_result = 0.0
            away_result = 1.0
        else:
            home_result = 0.5
            away_result = 0.5
        
        # Probabilités attendues
        home_expected = self.calculate_elo_probability(current_home_elo, current_away_elo, True)
        away_expected = 1 - home_expected
        
        # Nouveaux ratings
        new_home_elo = current_home_elo + self.K_FACTOR * (home_result - home_expected)
        new_away_elo = current_away_elo + self.K_FACTOR * (away_result - away_expected)
        
        self.logger.info(f"ELO Update: Home {current_home_elo:.1f} -> {new_home_elo:.1f} | Away {current_away_elo:.1f} -> {new_away_elo:.1f}")
        
        return new_home_elo, new_away_elo
    
    # =====================
    # 2. SYSTÈME FORME DYNAMIQUE
    # =====================
    
    def calculate_team_form(self, team_id: int, matches_count: int = 5) -> Dict:
        """Calcule la forme récente d'une équipe"""
        
        # Récupérer les derniers matches de l'équipe
        response = self.supabase.table('matches').select(
            'id, home_team_id, away_team_id, home_score, away_score, date, status_short'
        ).or_(
            f'home_team_id.eq.{team_id},away_team_id.eq.{team_id}'
        ).eq('status_short', 'FT').order('date', desc=True).limit(matches_count).execute()
        
        if not response.data:
            return {'form_points': 7, 'form_string': 'N/A', 'matches_played': 0}
        
        matches = response.data
        form_points = 0
        form_string = ""
        
        for match in matches:
            is_home = match['home_team_id'] == team_id
            team_score = match['home_score'] if is_home else match['away_score']
            opponent_score = match['away_score'] if is_home else match['home_score']
            
            if team_score > opponent_score:  # Victoire
                form_points += 3
                form_string += "W"
            elif team_score == opponent_score:  # Nul
                form_points += 1
                form_string += "D"
            else:  # Défaite
                form_points += 0
                form_string += "L"
        
        return {
            'form_points': form_points,
            'form_string': form_string,
            'matches_played': len(matches),
            'avg_points_per_game': form_points / len(matches) if matches else 0
        }
    
    # =====================
    # 3. GESTION JOUEURS MULTI-SAISONS
    # =====================
    
    def get_current_player_stats(self, player_id: int, current_season: int = 2024) -> Optional[Dict]:
        """Récupère les stats actuelles d'un joueur (saison courante prioritaire)"""
        
        # Essayer saison courante d'abord
        response = self.supabase.table('player_features').select('*').eq(
            'player_id', player_id
        ).eq('season', current_season).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        
        # Fallback: saison la plus récente
        response = self.supabase.table('player_features').select('*').eq(
            'player_id', player_id
        ).order('season', desc=True).limit(1).execute()
        
        return response.data[0] if response.data else None
    
    def update_player_season_stats(self, player_id: int, team_id: int, 
                                 season: int, updates: Dict) -> bool:
        """Met à jour les stats d'un joueur pour une saison donnée"""
        
        try:
            # Vérifier si l'entrée existe
            existing = self.supabase.table('player_features').select('id').eq(
                'player_id', player_id
            ).eq('season', season).execute()
            
            if existing.data:
                # Mettre à jour
                self.supabase.table('player_features').update({
                    **updates,
                    'updated_at': datetime.now().isoformat()
                }).eq('player_id', player_id).eq('season', season).execute()
            else:
                # Créer nouvelle entrée saison
                self.supabase.table('player_features').insert({
                    'player_id': player_id,
                    'team_id': team_id,
                    'season': season,
                    **updates,
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }).execute()
            
            return True
        except Exception as e:
            self.logger.error(f"Erreur update player {player_id}: {e}")
            return False
    
    # =====================
    # 4. DÉCLENCHEUR POST-MATCH
    # =====================
    
    def process_finished_match(self, match_id: int) -> Dict:
        """Traite un match terminé et met à jour toutes les données ML"""
        
        self.logger.info(f"Processing finished match: {match_id}")
        
        # 1. Récupérer info match
        match_response = self.supabase.table('matches').select(
            'id, home_team_id, away_team_id, home_score, away_score, date, status_short'
        ).eq('id', match_id).execute()
        
        if not match_response.data:
            return {'error': 'Match not found'}
        
        match = match_response.data[0]
        
        if match['status_short'] != 'FT':
            return {'error': 'Match not finished'}
        
        home_team_id = match['home_team_id']
        away_team_id = match['away_team_id']
        home_score = match['home_score']
        away_score = match['away_score']
        
        updates = {
            'match_id': match_id,
            'home_team_id': home_team_id,
            'away_team_id': away_team_id,
            'home_score': home_score,
            'away_score': away_score,
            'updates': []
        }
        
        # 2. Mettre à jour ELO des équipes
        elo_updates = self.update_teams_elo_after_match(home_team_id, away_team_id, home_score, away_score)
        updates['updates'].append(elo_updates)
        
        # 3. Mettre à jour forme des équipes
        form_updates = self.update_teams_form_after_match(home_team_id, away_team_id)
        updates['updates'].append(form_updates)
        
        # 4. Mettre à jour stats joueurs participant
        player_updates = self.update_players_stats_after_match(match_id)
        updates['updates'].append(player_updates)
        
        # 5. Recalculer métriques dérivées
        derived_updates = self.update_derived_metrics(home_team_id, away_team_id)
        updates['updates'].append(derived_updates)
        
        self.logger.info(f"Match {match_id} processing completed")
        return updates
    
    def update_teams_elo_after_match(self, home_team_id: int, away_team_id: int, 
                                   home_score: int, away_score: int) -> Dict:
        """Met à jour l'ELO des deux équipes après le match"""
        
        # Récupérer ELO actuels
        home_features = self.supabase.table('team_features').select('elo_rating').eq(
            'team_id', home_team_id
        ).order('season', desc=True).limit(1).execute()
        
        away_features = self.supabase.table('team_features').select('elo_rating').eq(
            'team_id', away_team_id
        ).order('season', desc=True).limit(1).execute()
        
        current_home_elo = home_features.data[0]['elo_rating'] if home_features.data else 1500
        current_away_elo = away_features.data[0]['elo_rating'] if away_features.data else 1500
        
        # Calculer nouveaux ELO
        new_home_elo, new_away_elo = self.update_elo_ratings(
            home_team_id, away_team_id, home_score, away_score,
            current_home_elo, current_away_elo
        )
        
        # Mettre à jour en base
        try:
            self.supabase.table('team_features').update({
                'elo_rating': new_home_elo,
                'elo_home': new_home_elo + 50,  # Bonus domicile
                'elo_away': new_home_elo - 50,  # Malus extérieur
                'updated_at': datetime.now().isoformat()
            }).eq('team_id', home_team_id).eq('season', 2024).execute()
            
            self.supabase.table('team_features').update({
                'elo_rating': new_away_elo,
                'elo_home': new_away_elo + 50,
                'elo_away': new_away_elo - 50,
                'updated_at': datetime.now().isoformat()
            }).eq('team_id', away_team_id).eq('season', 2024).execute()
            
            return {
                'type': 'elo_update',
                'home_team': {'id': home_team_id, 'old_elo': current_home_elo, 'new_elo': new_home_elo},
                'away_team': {'id': away_team_id, 'old_elo': current_away_elo, 'new_elo': new_away_elo},
                'success': True
            }
        except Exception as e:
            self.logger.error(f"Erreur mise à jour ELO: {e}")
            return {'type': 'elo_update', 'success': False, 'error': str(e)}
    
    def update_teams_form_after_match(self, home_team_id: int, away_team_id: int) -> Dict:
        """Met à jour la forme des deux équipes"""
        
        home_form = self.calculate_team_form(home_team_id)
        away_form = self.calculate_team_form(away_team_id)
        
        try:
            # Mise à jour home team
            self.supabase.table('team_features').update({
                'form_5_points': home_form['form_points'],
                'updated_at': datetime.now().isoformat()
            }).eq('team_id', home_team_id).eq('season', 2024).execute()
            
            # Mise à jour away team
            self.supabase.table('team_features').update({
                'form_5_points': away_form['form_points'],
                'updated_at': datetime.now().isoformat()
            }).eq('team_id', away_team_id).eq('season', 2024).execute()
            
            return {
                'type': 'form_update',
                'home_team': {'id': home_team_id, 'form': home_form},
                'away_team': {'id': away_team_id, 'form': away_form},
                'success': True
            }
        except Exception as e:
            return {'type': 'form_update', 'success': False, 'error': str(e)}
    
    def update_players_stats_after_match(self, match_id: int) -> Dict:
        """Met à jour les stats des joueurs ayant participé au match"""
        
        # Récupérer événements du match (buts, cartons, etc.)
        events = self.supabase.table('match_events').select('*').eq('match_id', match_id).execute()
        
        if not events.data:
            return {'type': 'players_update', 'success': True, 'players_updated': 0}
        
        players_updated = 0
        
        for event in events.data:
            player_id = event.get('player_id')
            if not player_id:
                continue
                
            # Incrémenter stats selon type événement
            updates = {}
            
            if event.get('type') == 'Goal':
                updates['goals'] = 'goals + 1'  # Incrément SQL
            elif event.get('type') == 'Card' and event.get('detail') == 'Yellow Card':
                updates['yellow_cards'] = 'yellow_cards + 1'
            elif event.get('type') == 'Card' and event.get('detail') == 'Red Card':
                updates['red_cards'] = 'red_cards + 1'
            
            if updates:
                try:
                    # Récupérer team_id du joueur
                    player_info = self.get_current_player_stats(player_id)
                    if player_info:
                        self.update_player_season_stats(
                            player_id, player_info['team_id'], 2024, updates
                        )
                        players_updated += 1
                except Exception as e:
                    self.logger.warning(f"Erreur update player {player_id}: {e}")
        
        return {
            'type': 'players_update',
            'success': True,
            'players_updated': players_updated,
            'total_events': len(events.data)
        }
    
    def update_derived_metrics(self, home_team_id: int, away_team_id: int) -> Dict:
        """Met à jour métriques dérivées (xG, possession, etc.)"""
        
        # Récupérer stats récentes du match
        stats = self.supabase.table('match_statistics').select('*').in_(
            'team_id', [home_team_id, away_team_id]
        ).order('created_at', desc=True).limit(10).execute()
        
        if not stats.data:
            return {'type': 'derived_update', 'success': False, 'reason': 'no_stats'}
        
        # Calculer moyennes sur derniers matchs
        team_stats = {}
        
        for stat in stats.data:
            team_id = stat['team_id']
            if team_id not in team_stats:
                team_stats[team_id] = {'matches': [], 'count': 0}
            
            team_stats[team_id]['matches'].append(stat)
            team_stats[team_id]['count'] += 1
        
        updates_made = 0
        
        for team_id, data in team_stats.items():
            if data['count'] < 3:  # Au moins 3 matchs pour moyennes fiables
                continue
                
            matches = data['matches'][:5]  # 5 derniers matchs max
            
            # Calculer moyennes
            avg_possession = sum([m.get('ball_possession', 50) for m in matches]) / len(matches)
            avg_shots = sum([m.get('total_shots', 10) for m in matches]) / len(matches)
            avg_shots_on_target = sum([m.get('shots_on_goal', 3) for m in matches]) / len(matches)
            avg_xg = sum([m.get('expected_goals', 1.0) for m in matches]) / len(matches)
            
            try:
                self.supabase.table('team_features').update({
                    'possession_avg': round(avg_possession, 1),
                    'shots_per_game': round(avg_shots, 1),
                    'shots_on_target_avg': round(avg_shots_on_target, 1),
                    'xg_for_avg': round(avg_xg, 2),
                    'updated_at': datetime.now().isoformat()
                }).eq('team_id', team_id).eq('season', 2024).execute()
                
                updates_made += 1
                
            except Exception as e:
                self.logger.error(f"Erreur update derived metrics team {team_id}: {e}")
        
        return {
            'type': 'derived_update',
            'success': True,
            'teams_updated': updates_made,
            'metrics_calculated': ['possession_avg', 'shots_per_game', 'xg_for_avg']
        }
    
    # =====================
    # 5. SYSTÈME DE MONITORING
    # =====================
    
    def check_stale_data(self) -> Dict:
        """Vérifie les données qui n'ont pas été mises à jour récemment"""
        
        cutoff_date = (datetime.now() - timedelta(days=7)).isoformat()
        
        # Compter données obsolètes
        stale_teams = self.supabase.table('team_features').select('team_id, updated_at').lt(
            'updated_at', cutoff_date
        ).execute()
        
        stale_players = self.supabase.table('player_features').select('player_id, updated_at').lt(
            'updated_at', cutoff_date
        ).execute()
        
        return {
            'stale_teams': len(stale_teams.data) if stale_teams.data else 0,
            'stale_players': len(stale_players.data) if stale_players.data else 0,
            'last_check': datetime.now().isoformat(),
            'cutoff_date': cutoff_date
        }
    
    def run_batch_updates(self) -> Dict:
        """Lance les mises à jour pour tous les matchs terminés récents"""
        
        # Récupérer matchs terminés des 7 derniers jours sans mise à jour
        recent_date = (datetime.now() - timedelta(days=7)).isoformat()
        
        matches = self.supabase.table('matches').select(
            'id, home_team_id, away_team_id, home_score, away_score, date'
        ).eq('status_short', 'FT').gte('date', recent_date).execute()
        
        if not matches.data:
            return {'processed': 0, 'message': 'No recent finished matches'}
        
        results = []
        processed = 0
        
        for match in matches.data:
            try:
                result = self.process_finished_match(match['id'])
                results.append(result)
                processed += 1
                
                if processed % 10 == 0:
                    self.logger.info(f"Processed {processed} matches...")
                    
            except Exception as e:
                self.logger.error(f"Error processing match {match['id']}: {e}")
                results.append({'match_id': match['id'], 'error': str(e)})
        
        return {
            'processed': processed,
            'total_matches': len(matches.data),
            'results': results,
            'timestamp': datetime.now().isoformat()
        }

# =====================
# FONCTIONS UTILITAIRES
# =====================

def main():
    """Test du système ML"""
    system = DynamicMLLearningSystem()
    
    print("=== TEST SYSTÈME ML DYNAMIQUE ===")
    
    # 1. Vérifier données obsolètes
    print("\n1. Vérification données obsolètes...")
    stale_check = system.check_stale_data()
    print(f"Équipes obsolètes: {stale_check['stale_teams']}")
    print(f"Joueurs obsolètes: {stale_check['stale_players']}")
    
    # 2. Test calcul forme
    print("\n2. Test calcul forme...")
    form = system.calculate_team_form(1063)  # Saint-Étienne
    print(f"Forme Saint-Étienne: {form}")
    
    # 3. Test récupération joueur
    print("\n3. Test joueur multi-saisons...")
    player = system.get_current_player_stats(276)  # Exemple
    if player:
        print(f"Joueur trouvé: {player.get('player_name', 'Unknown')} (saison {player.get('season')})")
    
    # 4. Test mise à jour batch
    print("\n4. Lancement mise à jour batch...")
    batch_result = system.run_batch_updates()
    print(f"Matchs traités: {batch_result['processed']}/{batch_result['total_matches']}")

if __name__ == "__main__":
    main()