-- Initial schema for Usual Odds prediction platform
-- Based on context.md specifications

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- Enums for various types
create type league_type as enum ('EPL', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1');
create type match_status as enum ('scheduled', 'live', 'finished', 'cancelled', 'postponed');
create type window_type as enum ('T24', 'T6', 'T1', 'T30');
create type goal_type as enum ('open', 'header', 'corner', 'free_kick', 'penalty', 'counter_attack', 'own_goal');
create type position_type as enum ('GK', 'DEF', 'MID', 'ATT');
create type bet_result as enum ('pending', 'won', 'lost', 'void');

-- Core entities
create table leagues (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    type league_type not null,
    country text not null,
    api_id integer unique not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table seasons (
    id uuid primary key default uuid_generate_v4(),
    league_id uuid references leagues(id),
    year integer not null,
    start_date date not null,
    end_date date not null,
    api_id integer unique not null,
    created_at timestamptz default now(),
    unique(league_id, year)
);

create table teams (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    short_name text,
    logo_url text,
    founded integer,
    venue_name text,
    venue_capacity integer,
    api_id integer unique not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table players (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    birth_date date,
    nationality text,
    height integer, -- cm
    weight integer, -- kg
    position position_type,
    api_id integer unique not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table matches (
    id uuid primary key default uuid_generate_v4(),
    season_id uuid references seasons(id),
    home_team_id uuid references teams(id),
    away_team_id uuid references teams(id),
    match_date timestamptz not null,
    status match_status default 'scheduled',
    home_score integer,
    away_score integer,
    referee text,
    venue text,
    weather_temp numeric,
    weather_wind numeric,
    weather_humidity numeric,
    weather_condition text,
    api_id integer unique not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Player statistics per match
create table player_match_stats (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id),
    player_id uuid references players(id),
    team_id uuid references teams(id),
    minutes_played integer default 0,
    goals integer default 0,
    assists integer default 0,
    shots integer default 0,
    shots_on_target integer default 0,
    shots_off_target integer default 0,
    key_passes integer default 0,
    passes integer default 0,
    passes_accuracy numeric,
    tackles integer default 0,
    interceptions integer default 0,
    fouls integer default 0,
    yellow_cards integer default 0,
    red_cards integer default 0,
    xg numeric default 0,
    xa numeric default 0,
    created_at timestamptz default now()
);

-- Match events (goals, cards, substitutions)
create table match_events (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id),
    team_id uuid references teams(id),
    player_id uuid references players(id) null,
    assist_player_id uuid references players(id) null,
    event_type text not null, -- 'goal', 'card', 'substitution', etc.
    event_time integer not null, -- minute
    event_detail text, -- goal type, card color, etc.
    created_at timestamptz default now()
);

-- Features tables for ML models
create table features_match_team (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id),
    team_id uuid references teams(id),
    window window_type not null,
    is_home boolean not null,
    
    -- Force intrinsic features
    elo_rating numeric,
    dixon_coles_attack numeric,
    dixon_coles_defense numeric,
    form_5_points numeric,
    form_10_points numeric,
    xg_diff_5 numeric,
    xg_diff_10 numeric,
    
    -- Tactical style features (normalized scores)
    possession_style numeric,
    tempo_style numeric,
    pressing_style numeric, -- PPDA
    verticality_style numeric,
    width_style numeric,
    avg_shot_distance numeric,
    
    -- Set pieces
    corners_for_rate numeric,
    corners_against_rate numeric,
    penalties_for_rate numeric,
    penalties_against_rate numeric,
    
    -- Calendar/fatigue
    days_rest integer,
    travel_km numeric,
    congestion_index numeric,
    ucl_within_3d boolean default false,
    
    -- Volatility
    volatility_index numeric,
    giant_killer_flag boolean default false,
    choker_flag boolean default false,
    
    created_at timestamptz default now(),
    unique(match_id, team_id, window)
);

create table features_player_match (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id),
    player_id uuid references players(id),
    team_id uuid references teams(id),
    window window_type not null,
    
    -- Role & expected minutes
    position position_type,
    minutes_expected numeric,
    starter_probability numeric,
    
    -- Contributions per 90
    xg_per_90 numeric default 0,
    xa_per_90 numeric default 0,
    shots_per_90 numeric default 0,
    shots_on_target_per_90 numeric default 0,
    key_passes_per_90 numeric default 0,
    touches_box_per_90 numeric default 0,
    
    -- Set piece roles
    penalty_taker boolean default false,
    corner_taker boolean default false,
    free_kick_taker boolean default false,
    
    -- Physical/form
    recent_matches_load numeric,
    injury_return boolean default false,
    age integer,
    
    -- Synergies (simplified hash for now)
    synergy_hash text,
    
    created_at timestamptz default now(),
    unique(match_id, player_id, window)
);

-- Market probabilities for each window
create table market_probs (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id),
    window window_type not null,
    
    -- 1X2 probabilities
    p_home numeric not null check (p_home >= 0 and p_home <= 1),
    p_draw numeric not null check (p_draw >= 0 and p_draw <= 1),
    p_away numeric not null check (p_away >= 0 and p_away <= 1),
    
    -- Over/Under probabilities
    p_over_05 numeric,
    p_over_15 numeric,
    p_over_25 numeric,
    p_over_35 numeric,
    
    -- Both teams to score
    p_btts_yes numeric,
    
    -- First to score
    p_home_first numeric,
    p_away_first numeric,
    
    created_at timestamptz default now(),
    unique(match_id, window),
    constraint valid_1x2_sum check (abs((p_home + p_draw + p_away) - 1.0) < 0.01)
);

-- Player propositions predictions
create table prop_predictions (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id),
    player_id uuid references players(id),
    window window_type not null,
    
    -- Scorer probabilities
    p_anytime_scorer numeric,
    p_first_scorer numeric,
    p_last_scorer numeric,
    
    -- Other props
    p_assist numeric,
    p_decisive_player numeric, -- scores or assists winning goal
    
    -- Goal type probabilities
    p_goal_type_open numeric,
    p_goal_type_header numeric,
    p_goal_type_penalty numeric,
    p_goal_type_free_kick numeric,
    
    created_at timestamptz default now(),
    unique(match_id, player_id, window)
);

-- Time bins probabilities
create table time_bins_probs (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id),
    team_id uuid references teams(id),
    window window_type not null,
    
    -- Goal time bins (0-15, 16-30, 31-45, 46-60, 61-75, 76-90+)
    bin_0_15 numeric,
    bin_16_30 numeric,
    bin_31_45 numeric,
    bin_46_60 numeric,
    bin_61_75 numeric,
    bin_76_90 numeric,
    
    -- First to score probability
    first_to_score_prob numeric,
    
    created_at timestamptz default now(),
    unique(match_id, team_id, window)
);

-- Model tracking and versioning
create table model_runs (
    id uuid primary key default uuid_generate_v4(),
    model_type text not null, -- 'dixon_coles', 'elo', 'gbm_team', 'player_props', etc.
    version text not null,
    parameters jsonb,
    training_data_from timestamptz,
    training_data_to timestamptz,
    metrics jsonb, -- validation metrics
    artifact_path text, -- path in Supabase storage
    git_sha text,
    created_at timestamptz default now()
);

-- Prediction explanations
create table model_explanations (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id),
    window window_type not null,
    market_type text not null, -- '1x2', 'over_under', 'anytime_scorer', etc.
    
    -- Top factors with their impact
    factors jsonb not null, -- [{"factor": "home_elo", "impact": 0.15, "description": "Home team Elo advantage"}, ...]
    
    -- Model confidence
    confidence_score numeric check (confidence_score >= 0 and confidence_score <= 1),
    
    created_at timestamptz default now()
);

-- Simulation aggregates from Monte Carlo
create table sim_aggregates (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id),
    window window_type not null,
    
    -- Market probabilities from simulation
    market jsonb not null, -- all market probabilities in structured format
    
    -- Simulation metadata
    num_simulations integer not null,
    random_seed bigint,
    
    created_at timestamptz default now(),
    unique(match_id, window)
);

-- Montante betting system
create table montante_series (
    id uuid primary key default uuid_generate_v4(),
    started_at timestamptz default now(),
    ended_at timestamptz null,
    initial_bankroll numeric not null default 5.00,
    final_bankroll numeric null,
    max_bankroll numeric not null default 5.00,
    status text default 'active', -- 'active', 'won', 'lost'
    bet_count integer default 0
);

create table montante_bets (
    id uuid primary key default uuid_generate_v4(),
    series_id uuid references montante_series(id),
    placed_at timestamptz default now(),
    decision_window window_type not null,
    
    -- Bankroll state
    bankroll_before numeric not null,
    stake numeric not null, -- should equal bankroll_before for montante
    
    -- Bet details
    legs jsonb not null, -- array of bet legs with match_id, market, selection, odds
    product_odds numeric not null, -- combined odds of all legs
    model_probs jsonb not null, -- model probabilities for each leg
    expected_value numeric not null, -- calculated EV
    
    -- Result tracking
    result bet_result default 'pending',
    bankroll_after numeric null,
    settled_at timestamptz null,
    
    created_at timestamptz default now()
);

-- Odds tracking from bookmakers
create table odds_snapshots (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id),
    bookmaker text not null,
    window window_type not null,
    
    -- 1X2 odds
    home_win_odds numeric,
    draw_odds numeric,
    away_win_odds numeric,
    
    -- Over/Under odds
    over_25_odds numeric,
    under_25_odds numeric,
    
    -- Other markets (can be extended)
    market_odds jsonb, -- flexible structure for additional markets
    
    captured_at timestamptz default now(),
    created_at timestamptz default now()
);

-- Data quality and monitoring
create table data_quality_checks (
    id uuid primary key default uuid_generate_v4(),
    check_type text not null,
    table_name text not null,
    check_name text not null,
    status text not null, -- 'passed', 'failed', 'warning'
    details jsonb,
    checked_at timestamptz default now()
);

-- Indexes for performance
create index idx_matches_date on matches(match_date);
create index idx_matches_teams on matches(home_team_id, away_team_id);
create index idx_player_match_stats_match on player_match_stats(match_id);
create index idx_player_match_stats_player on player_match_stats(player_id);
create index idx_features_match_team_window on features_match_team(match_id, window);
create index idx_features_player_match_window on features_player_match(match_id, window);
create index idx_market_probs_window on market_probs(match_id, window);
create index idx_odds_snapshots_window on odds_snapshots(match_id, window);
create index idx_montante_series_status on montante_series(status);
create index idx_montante_bets_series on montante_bets(series_id);

-- Row Level Security (RLS) - basic setup
alter table leagues enable row level security;
alter table seasons enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table matches enable row level security;

-- Create policies for internal use only during development
create policy "Internal access only" on leagues for all using (true);
create policy "Internal access only" on seasons for all using (true);
create policy "Internal access only" on teams for all using (true);
create policy "Internal access only" on players for all using (true);
create policy "Internal access only" on matches for all using (true);

-- Functions for automated updates
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_leagues_updated_at before update on leagues
    for each row execute function update_updated_at_column();

create trigger update_teams_updated_at before update on teams
    for each row execute function update_updated_at_column();

create trigger update_players_updated_at before update on players
    for each row execute function update_updated_at_column();

create trigger update_matches_updated_at before update on matches
    for each row execute function update_updated_at_column();