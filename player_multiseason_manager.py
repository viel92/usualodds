#!/usr/bin/env python3
"""
GESTIONNAIRE INTELLIGENT JOUEURS MULTI-SAISONS
==============================================

PROBLÈME IDENTIFIÉ:
- player_features: 2415 enregistrements avec multiples entrées par joueur
- Dembélé a des entrées 2020, 2021, 2022... Laquelle utiliser?
- Pas de logique pour déterminer la saison "active" d'un joueur
- Stats figées qui ne se mettent pas à jour

SOLUTION INTELLIGENTE:
1. Système de priorité par saison (2024 = priorité max)
2. Fusion intelligente des stats multi-saisons
3. Gestion des transferts entre équipes
4. Mise à jour automatique saison courante
5. Archivage des saisons anciennes
"""

from supabase import create_client, Client
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import json
import logging

logger = logging.getLogger(__name__)

class PlayerMultiSeasonManager:
    """Gestionnaire intelligent des joueurs multi-saisons"""
    
    def __init__(self):
        self.url = 'https://agysfqhijfbnqzzooyeo.supabase.co'
        self.service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
        self.supabase: Client = create_client(self.url, self.service_key)
        
        # Configuration saisons
        self.current_season = 2024
        self.season_priorities = {
            2024: 10,  # Priorité maximale
            2023: 8,
            2022: 6,
            2021: 4,
            2020: 2,
            # Saisons plus anciennes = priorité 1
        }
    
    def get_player_all_seasons(self, player_id: int) -> List[Dict]:
        """Récupère toutes les entrées d'un joueur (toutes saisons)"""
        
        response = self.supabase.table('player_features').select('*').eq(
            'player_id', player_id
        ).order('season', desc=True).execute()
        
        return response.data if response.data else []
    
    def get_player_current_stats(self, player_id: int, 
                               prefer_current_team: bool = True) -> Optional[Dict]:
        """
        Récupère les stats actuelles d'un joueur avec logique intelligente:
        1. Priorité saison courante (2024)
        2. Si pas 2024, prendre saison la plus récente  
        3. Si transfert récent, prendre équipe actuelle
        """
        
        all_seasons = self.get_player_all_seasons(player_id)
        if not all_seasons:
            return None
        
        # 1. Essayer saison courante d'abord
        current_season_stats = [s for s in all_seasons if s['season'] == self.current_season]
        if current_season_stats:
            # Si plusieurs équipes en 2024 (transfert), prendre la plus récente
            if len(current_season_stats) > 1:
                return max(current_season_stats, key=lambda x: x.get('updated_at', ''))
            return current_season_stats[0]
        
        # 2. Fallback: saison la plus récente
        most_recent = all_seasons[0]  # Déjà trié par saison desc
        
        logger.info(f"Player {player_id}: Utilise saison {most_recent['season']} (pas de données {self.current_season})")
        return most_recent
    
    def analyze_player_career(self, player_id: int) -> Dict:
        """Analyse complète de la carrière d'un joueur"""
        
        all_seasons = self.get_player_all_seasons(player_id)
        if not all_seasons:
            return {'error': 'Player not found'}
        
        # Calculer statistiques carrière
        career_stats = {
            'player_id': player_id,
            'player_name': all_seasons[0].get('player_name', 'Unknown'),
            'total_seasons': len(all_seasons),
            'seasons_played': [s['season'] for s in all_seasons],
            'teams_played': list(set([s['team_id'] for s in all_seasons])),
            'positions': list(set([s.get('position', 'Unknown') for s in all_seasons])),
            'career_summary': {},
            'season_progression': [],
            'current_status': {},
            'transfer_history': []
        }
        
        # Calculer totaux carrière
        total_appearances = sum([s.get('appearences', 0) for s in all_seasons])
        total_goals = sum([s.get('goals', 0) for s in all_seasons])
        total_assists = sum([s.get('assists', 0) for s in all_seasons])
        total_minutes = sum([s.get('minutes_total', 0) for s in all_seasons])
        
        career_stats['career_summary'] = {
            'total_appearances': total_appearances,
            'total_goals': total_goals,
            'total_assists': total_assists,
            'total_minutes': total_minutes,
            'goals_per_game': round(total_goals / total_appearances, 2) if total_appearances > 0 else 0,
            'minutes_per_game': round(total_minutes / total_appearances, 1) if total_appearances > 0 else 0
        }
        
        # Analyser progression par saison
        for season_data in all_seasons:
            season_summary = {
                'season': season_data['season'],
                'team_id': season_data['team_id'],
                'appearances': season_data.get('appearences', 0),
                'goals': season_data.get('goals', 0),
                'assists': season_data.get('assists', 0),
                'rating': season_data.get('rating', 0),
                'position': season_data.get('position', 'Unknown')
            }
            career_stats['season_progression'].append(season_summary)
        
        # Déterminer statut actuel
        current_stats = self.get_player_current_stats(player_id)
        if current_stats:
            career_stats['current_status'] = {
                'season': current_stats['season'],
                'team_id': current_stats['team_id'],
                'position': current_stats.get('position', 'Unknown'),
                'is_current_season': current_stats['season'] == self.current_season,
                'last_updated': current_stats.get('updated_at', 'Never')
            }
        
        # Détecter transferts (changements d'équipe)
        team_changes = []
        for i in range(1, len(all_seasons)):
            prev_season = all_seasons[i]
            curr_season = all_seasons[i-1]
            
            if prev_season['team_id'] != curr_season['team_id']:
                team_changes.append({
                    'from_team': prev_season['team_id'],
                    'to_team': curr_season['team_id'],
                    'season': curr_season['season'],
                    'type': 'transfer'
                })
        
        career_stats['transfer_history'] = team_changes
        
        return career_stats
    
    def create_current_season_entry(self, player_id: int, team_id: int, 
                                  base_stats: Dict = None) -> Dict:
        """Crée une nouvelle entrée pour la saison courante"""
        
        # Stats de base ou calculées depuis saisons précédentes
        if base_stats is None:
            previous_stats = self.get_player_current_stats(player_id)
            base_stats = {
                'appearences': 0,
                'lineups': 0,
                'minutes_total': 0,
                'goals': 0,
                'assists': 0,
                'yellow_cards': 0,
                'red_cards': 0,
                'rating': previous_stats.get('rating', 6.5) if previous_stats else 6.5,
                'position': previous_stats.get('position', 'Unknown') if previous_stats else 'Unknown'
            }
        
        new_entry = {
            'player_id': player_id,
            'team_id': team_id,
            'season': self.current_season,
            'league_id': 61,  # Ligue 1 par défaut
            **base_stats,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        try:
            response = self.supabase.table('player_features').insert(new_entry).execute()
            
            if response.data:
                logger.info(f"Nouvelle entrée créée joueur {player_id} saison {self.current_season}")
                return {'success': True, 'data': response.data[0]}
            else:
                return {'success': False, 'error': 'Insert failed'}
                
        except Exception as e:
            logger.error(f"Erreur création entrée joueur {player_id}: {e}")
            return {'success': False, 'error': str(e)}
    
    def update_current_season_stats(self, player_id: int, updates: Dict) -> Dict:
        """Met à jour les stats de la saison courante"""
        
        try:
            # Vérifier si entrée saison courante existe
            current = self.supabase.table('player_features').select('id').eq(
                'player_id', player_id
            ).eq('season', self.current_season).execute()
            
            if not current.data:
                # Créer entrée si inexistante
                logger.info(f"Création entrée manquante joueur {player_id} saison {self.current_season}")
                
                # Récupérer team_id depuis match_events récent
                recent_event = self.supabase.table('match_events').select(
                    'team_id'
                ).eq('player_id', player_id).order('time_elapsed', desc=True).limit(1).execute()
                
                team_id = recent_event.data[0]['team_id'] if recent_event.data else 1
                
                create_result = self.create_current_season_entry(player_id, team_id)
                if not create_result['success']:
                    return create_result
            
            # Mise à jour
            response = self.supabase.table('player_features').update({
                **updates,
                'updated_at': datetime.now().isoformat()
            }).eq('player_id', player_id).eq('season', self.current_season).execute()
            
            return {'success': True, 'updated': len(response.data) if response.data else 0}
            
        except Exception as e:
            logger.error(f"Erreur update joueur {player_id}: {e}")
            return {'success': False, 'error': str(e)}
    
    def merge_multi_season_features(self, player_id: int, 
                                  weights: Dict = None) -> Dict:
        """
        Fusionne intelligemment les features multi-saisons d'un joueur
        pour créer des métriques enrichies
        """
        
        if weights is None:
            weights = {
                2024: 0.5,  # 50% poids saison courante
                2023: 0.3,  # 30% saison précédente  
                2022: 0.15, # 15% il y a 2 ans
                2021: 0.05  # 5% il y a 3 ans
            }
        
        all_seasons = self.get_player_all_seasons(player_id)
        if not all_seasons:
            return {'error': 'No data found'}
        
        # Calculer moyennes pondérées
        weighted_stats = {}
        total_weight = 0
        
        for season_data in all_seasons:
            season = season_data['season']
            weight = weights.get(season, 0.01)  # Poids minimal pour saisons anciennes
            
            if weight > 0:
                total_weight += weight
                
                # Accumuler stats numériques
                numeric_fields = ['rating', 'goals', 'assists', 'appearences', 'minutes_total']
                
                for field in numeric_fields:
                    value = season_data.get(field, 0)
                    if isinstance(value, (int, float)):
                        if field not in weighted_stats:
                            weighted_stats[field] = 0
                        weighted_stats[field] += value * weight
        
        # Normaliser par poids total
        if total_weight > 0:
            for field in weighted_stats:
                weighted_stats[field] = round(weighted_stats[field] / total_weight, 2)
        
        # Calculer métriques dérivées
        merged_features = {
            'player_id': player_id,
            'weighted_rating': weighted_stats.get('rating', 6.0),
            'weighted_goals_per_game': weighted_stats.get('goals', 0) / max(weighted_stats.get('appearences', 1), 1),
            'weighted_assists_per_game': weighted_stats.get('assists', 0) / max(weighted_stats.get('appearences', 1), 1),
            'weighted_minutes_per_game': weighted_stats.get('minutes_total', 0) / max(weighted_stats.get('appearences', 1), 1),
            'form_trend': self.calculate_form_trend(all_seasons),
            'consistency_score': self.calculate_consistency_score(all_seasons),
            'experience_factor': len(all_seasons) * 0.1,  # Plus de saisons = plus d'expérience
            'seasons_active': len(all_seasons),
            'total_weight_used': total_weight
        }
        
        return merged_features
    
    def calculate_form_trend(self, seasons_data: List[Dict]) -> float:
        """Calcule la tendance de forme du joueur (progression/régression)"""
        
        if len(seasons_data) < 2:
            return 0.0
        
        # Comparer 2 dernières saisons disponibles
        recent = seasons_data[0]
        previous = seasons_data[1]
        
        recent_rating = recent.get('rating', 6.0)
        previous_rating = previous.get('rating', 6.0)
        
        # Tendance entre -1 (régression) et +1 (progression)
        if previous_rating > 0:
            trend = (recent_rating - previous_rating) / previous_rating
            return max(-1.0, min(1.0, trend))
        
        return 0.0
    
    def calculate_consistency_score(self, seasons_data: List[Dict]) -> float:
        """Calcule un score de régularité du joueur"""
        
        if len(seasons_data) < 2:
            return 0.5
        
        ratings = [s.get('rating', 6.0) for s in seasons_data if s.get('rating', 0) > 0]
        
        if len(ratings) < 2:
            return 0.5
        
        # Écart-type des ratings (inverse de la consistance)
        mean_rating = sum(ratings) / len(ratings)
        variance = sum([(r - mean_rating) ** 2 for r in ratings]) / len(ratings)
        std_dev = variance ** 0.5
        
        # Score entre 0 (inconstant) et 1 (très constant)
        # Rating stdev normale ~0.5, donc score = 1 - (std_dev / 2)
        consistency = max(0.0, min(1.0, 1 - (std_dev / 2.0)))
        
        return round(consistency, 2)
    
    def find_players_needing_current_season(self) -> List[Dict]:
        """Trouve les joueurs actifs sans entrée saison courante"""
        
        # Joueurs ayant joué récemment (events derniers 30 jours)
        recent_date = (datetime.now() - timedelta(days=30)).isoformat()
        
        # Récupérer joueurs récemment actifs
        active_players = self.supabase.table('match_events').select(
            'player_id, player_name, team_id'
        ).gte('created_at', recent_date).execute()
        
        if not active_players.data:
            return []
        
        # Dédoublonner
        unique_players = {}
        for event in active_players.data:
            player_id = event['player_id']
            if player_id not in unique_players:
                unique_players[player_id] = {
                    'player_id': player_id,
                    'player_name': event.get('player_name', 'Unknown'),
                    'team_id': event['team_id']
                }
        
        # Vérifier lesquels n'ont pas d'entrée saison courante
        missing_current_season = []
        
        for player_data in unique_players.values():
            player_id = player_data['player_id']
            
            # Vérifier existence saison courante
            current_entry = self.supabase.table('player_features').select('id').eq(
                'player_id', player_id
            ).eq('season', self.current_season).execute()
            
            if not current_entry.data:
                missing_current_season.append(player_data)
        
        logger.info(f"Trouvé {len(missing_current_season)} joueurs sans entrée saison {self.current_season}")
        
        return missing_current_season
    
    def batch_create_missing_entries(self) -> Dict:
        """Crée en batch les entrées manquantes pour la saison courante"""
        
        missing_players = self.find_players_needing_current_season()
        
        if not missing_players:
            return {'created': 0, 'message': 'All players up to date'}
        
        created = 0
        errors = 0
        results = []
        
        for player in missing_players:
            try:
                result = self.create_current_season_entry(
                    player['player_id'], 
                    player['team_id']
                )
                
                if result['success']:
                    created += 1
                    logger.info(f"Créé entrée {player['player_name']} (ID: {player['player_id']})")
                else:
                    errors += 1
                    logger.warning(f"Échec création {player['player_name']}: {result.get('error')}")
                
                results.append({
                    'player_id': player['player_id'],
                    'player_name': player['player_name'],
                    'success': result['success'],
                    'error': result.get('error')
                })
                
            except Exception as e:
                errors += 1
                logger.error(f"Erreur création joueur {player['player_id']}: {e}")
                results.append({
                    'player_id': player['player_id'],
                    'success': False,
                    'error': str(e)
                })
        
        summary = {
            'total_missing': len(missing_players),
            'created': created,
            'errors': errors,
            'success_rate': round(created / len(missing_players), 2) if missing_players else 0,
            'results': results,
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info(f"Batch création terminée: {created}/{len(missing_players)} créées")
        
        return summary

def main():
    """Test du gestionnaire multi-saisons"""
    
    manager = PlayerMultiSeasonManager()
    
    print("=== TEST GESTIONNAIRE JOUEURS MULTI-SAISONS ===")
    
    # 1. Analyser un joueur avec plusieurs saisons
    print("\n1. Analyse carrière Dembélé (ID approximatif)...")
    try:
        # Récupérer un joueur exemple
        sample_player = manager.supabase.table('player_features').select(
            'player_id, player_name'
        ).limit(1).execute()
        
        if sample_player.data:
            player_id = sample_player.data[0]['player_id']
            career = manager.analyze_player_career(player_id)
            print(f"Joueur: {career.get('player_name', 'Unknown')}")
            print(f"Saisons: {career.get('total_seasons', 0)}")
            print(f"Équipes: {len(career.get('teams_played', []))}")
            print(f"Stats actuelles: {career.get('current_status', {})}")
    
    except Exception as e:
        print(f"Erreur test 1: {e}")
    
    # 2. Trouver joueurs sans entrée saison courante
    print("\n2. Recherche joueurs sans entrée 2024...")
    try:
        missing = manager.find_players_needing_current_season()
        print(f"Joueurs sans entrée 2024: {len(missing)}")
        
        if missing:
            print("Premiers exemples:")
            for player in missing[:3]:
                print(f"  - {player['player_name']} (ID: {player['player_id']})")
    
    except Exception as e:
        print(f"Erreur test 2: {e}")
    
    # 3. Test fusion multi-saisons
    print("\n3. Test fusion features multi-saisons...")
    try:
        if sample_player.data:
            player_id = sample_player.data[0]['player_id']
            merged = manager.merge_multi_season_features(player_id)
            
            if 'error' not in merged:
                print(f"Rating pondéré: {merged.get('weighted_rating', 0)}")
                print(f"Tendance forme: {merged.get('form_trend', 0)}")
                print(f"Score régularité: {merged.get('consistency_score', 0)}")
                print(f"Facteur expérience: {merged.get('experience_factor', 0)}")
    
    except Exception as e:
        print(f"Erreur test 3: {e}")

if __name__ == "__main__":
    main()