export type LeagueType = 'EPL' | 'LaLiga' | 'Serie A' | 'Bundesliga' | 'Ligue 1';
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled' | 'postponed';
export type WindowType = 'T24' | 'T6' | 'T1' | 'T30';
export type GoalType = 'open' | 'header' | 'corner' | 'free_kick' | 'penalty' | 'counter_attack' | 'own_goal';
export type PositionType = 'GK' | 'DEF' | 'MID' | 'ATT';
export type BetResult = 'pending' | 'won' | 'lost' | 'void';

export interface League {
  id: string;
  name: string;
  type: LeagueType;
  country: string;
  api_id: number;
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  league_id: string;
  year: number;
  start_date: string;
  end_date: string;
  api_id: number;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  short_name?: string;
  logo_url?: string;
  founded?: number;
  venue_name?: string;
  venue_capacity?: number;
  api_id: number;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  name: string;
  birth_date?: string;
  nationality?: string;
  height?: number;
  weight?: number;
  position?: PositionType;
  api_id: number;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  season_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  status: MatchStatus;
  home_score?: number;
  away_score?: number;
  referee?: string;
  venue?: string;
  weather_temp?: number;
  weather_wind?: number;
  weather_humidity?: number;
  weather_condition?: string;
  api_id: number;
  created_at: string;
  updated_at: string;
  
  // Relations
  home_team?: Team;
  away_team?: Team;
  season?: Season;
}

export interface PlayerMatchStats {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  minutes_played: number;
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  shots_off_target: number;
  key_passes: number;
  passes: number;
  passes_accuracy?: number;
  tackles: number;
  interceptions: number;
  fouls: number;
  yellow_cards: number;
  red_cards: number;
  xg: number;
  xa: number;
  created_at: string;
  
  // Relations
  player?: Player;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  team_id: string;
  player_id?: string;
  assist_player_id?: string;
  event_type: string;
  event_time: number;
  event_detail?: string;
  created_at: string;
}

export interface FeaturesMatchTeam {
  id: string;
  match_id: string;
  team_id: string;
  window: WindowType;
  is_home: boolean;
  
  // Force intrinsic features
  elo_rating?: number;
  dixon_coles_attack?: number;
  dixon_coles_defense?: number;
  form_5_points?: number;
  form_10_points?: number;
  xg_diff_5?: number;
  xg_diff_10?: number;
  
  // Tactical style features
  possession_style?: number;
  tempo_style?: number;
  pressing_style?: number;
  verticality_style?: number;
  width_style?: number;
  avg_shot_distance?: number;
  
  // Set pieces
  corners_for_rate?: number;
  corners_against_rate?: number;
  penalties_for_rate?: number;
  penalties_against_rate?: number;
  
  // Calendar/fatigue
  days_rest?: number;
  travel_km?: number;
  congestion_index?: number;
  ucl_within_3d?: boolean;
  
  // Volatility
  volatility_index?: number;
  giant_killer_flag?: boolean;
  choker_flag?: boolean;
  
  created_at: string;
}

export interface FeaturesPlayerMatch {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  window: WindowType;
  
  // Role & expected minutes
  position?: PositionType;
  minutes_expected?: number;
  starter_probability?: number;
  
  // Contributions per 90
  xg_per_90?: number;
  xa_per_90?: number;
  shots_per_90?: number;
  shots_on_target_per_90?: number;
  key_passes_per_90?: number;
  touches_box_per_90?: number;
  
  // Set piece roles
  penalty_taker?: boolean;
  corner_taker?: boolean;
  free_kick_taker?: boolean;
  
  // Physical/form
  recent_matches_load?: number;
  injury_return?: boolean;
  age?: number;
  
  // Synergies
  synergy_hash?: string;
  
  created_at: string;
  
  // Relations
  player?: Player;
}

export interface MarketProbs {
  id: string;
  match_id: string;
  window: WindowType;
  
  // 1X2 probabilities
  p_home: number;
  p_draw: number;
  p_away: number;
  
  // Over/Under probabilities
  p_over_05?: number;
  p_over_15?: number;
  p_over_25?: number;
  p_over_35?: number;
  
  // Both teams to score
  p_btts_yes?: number;
  
  // First to score
  p_home_first?: number;
  p_away_first?: number;
  
  created_at: string;
}

export interface PropPredictions {
  id: string;
  match_id: string;
  player_id: string;
  window: WindowType;
  
  // Scorer probabilities
  p_anytime_scorer?: number;
  p_first_scorer?: number;
  p_last_scorer?: number;
  
  // Other props
  p_assist?: number;
  p_decisive_player?: number;
  
  // Goal type probabilities
  p_goal_type_open?: number;
  p_goal_type_header?: number;
  p_goal_type_penalty?: number;
  p_goal_type_free_kick?: number;
  
  created_at: string;
  
  // Relations
  player?: Player;
}

export interface TimeBinsProbs {
  id: string;
  match_id: string;
  team_id: string;
  window: WindowType;
  
  // Goal time bins
  bin_0_15?: number;
  bin_16_30?: number;
  bin_31_45?: number;
  bin_46_60?: number;
  bin_61_75?: number;
  bin_76_90?: number;
  
  // First to score probability
  first_to_score_prob?: number;
  
  created_at: string;
  
  // Relations
  team?: Team;
}

export interface ModelRun {
  id: string;
  model_type: string;
  version: string;
  parameters?: Record<string, any>;
  training_data_from?: string;
  training_data_to?: string;
  metrics?: Record<string, any>;
  artifact_path?: string;
  git_sha?: string;
  created_at: string;
}

export interface ModelExplanation {
  id: string;
  match_id: string;
  window: WindowType;
  market_type: string;
  factors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  confidence_score?: number;
  created_at: string;
}

export interface SimAggregates {
  id: string;
  match_id: string;
  window: WindowType;
  market: Record<string, any>;
  num_simulations: number;
  random_seed?: number;
  created_at: string;
}

export interface MontanteSeries {
  id: string;
  started_at: string;
  ended_at?: string;
  initial_bankroll: number;
  final_bankroll?: number;
  max_bankroll: number;
  status: string;
  bet_count: number;
}

export interface MontanteBet {
  id: string;
  series_id: string;
  placed_at: string;
  decision_window: WindowType;
  
  // Bankroll state
  bankroll_before: number;
  stake: number;
  
  // Bet details
  legs: Array<{
    match_id: string;
    market: string;
    selection: string;
    odds: number;
  }>;
  product_odds: number;
  model_probs: Record<string, number>;
  expected_value: number;
  
  // Result tracking
  result: BetResult;
  bankroll_after?: number;
  settled_at?: string;
  
  created_at: string;
  
  // Relations
  series?: MontanteSeries;
}

export interface OddsSnapshot {
  id: string;
  match_id: string;
  bookmaker: string;
  window: WindowType;
  
  // 1X2 odds
  home_win_odds?: number;
  draw_odds?: number;
  away_win_odds?: number;
  
  // Over/Under odds
  over_25_odds?: number;
  under_25_odds?: number;
  
  // Other markets
  market_odds?: Record<string, any>;
  
  captured_at: string;
  created_at: string;
}

export interface DataQualityCheck {
  id: string;
  check_type: string;
  table_name: string;
  check_name: string;
  status: string;
  details?: Record<string, any>;
  checked_at: string;
}