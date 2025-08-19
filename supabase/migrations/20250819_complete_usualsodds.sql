-- =============================================================================
-- USUALSODDS COMPLETE DATABASE SCHEMA
-- Implémentation complète Phases 1, 2 et 3 de la roadmap
-- Compatible PostgreSQL/Supabase
-- =============================================================================

-- Extensions nécessaires
create extension if not exists "uuid-ossp";

-- =============================================================================
-- CORE ENTITIES (Base données football)
-- =============================================================================

-- Ligues
create table if not exists leagues (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    type text check (type in ('EPL', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1')),
    country text not null,
    api_id integer unique not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Saisons
create table if not exists seasons (
    id uuid default uuid_generate_v4() primary key,
    league_id uuid references leagues(id) on delete cascade,
    year integer not null,
    start_date date not null,
    end_date date not null,
    api_id integer unique not null,
    created_at timestamp with time zone default now(),
    unique(league_id, year)
);

-- Équipes
create table if not exists teams (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    short_name text,
    logo_url text,
    founded integer,
    venue_name text,
    venue_capacity integer,
    api_id integer unique not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Joueurs
create table if not exists players (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    birth_date date,
    nationality text,
    height integer,
    weight integer,
    position text check (position in ('GK', 'DEF', 'MID', 'ATT')),
    api_id integer unique not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Matchs (table centrale)
create table if not exists matches (
    id uuid default uuid_generate_v4() primary key,
    season_id uuid references seasons(id) on delete cascade,
    home_team_id uuid references teams(id) on delete cascade,
    away_team_id uuid references teams(id) on delete cascade,
    match_date timestamp with time zone not null,
    status text check (status in ('scheduled', 'live', 'finished', 'cancelled', 'postponed')) default 'scheduled',
    home_score integer,
    away_score integer,
    referee text,
    venue text,
    weather_temp integer,
    weather_wind integer,
    weather_humidity integer,
    weather_condition text,
    api_id integer unique not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Statistiques joueurs par match
create table if not exists player_match_stats (
    id uuid default uuid_generate_v4() primary key,
    match_id uuid references matches(id) on delete cascade,
    player_id uuid references players(id) on delete cascade,
    team_id uuid references teams(id) on delete cascade,
    minutes_played integer default 0,
    goals integer default 0,
    assists integer default 0,
    shots integer default 0,
    shots_on_target integer default 0,
    shots_off_target integer default 0,
    key_passes integer default 0,
    passes integer default 0,
    passes_accuracy numeric(5,2),
    tackles integer default 0,
    interceptions integer default 0,
    fouls integer default 0,
    yellow_cards integer default 0,
    red_cards integer default 0,
    xg numeric(5,3) default 0,
    xa numeric(5,3) default 0,
    created_at timestamp with time zone default now(),
    unique(match_id, player_id)
);

-- Événements de match
create table if not exists match_events (
    id uuid default uuid_generate_v4() primary key,
    match_id uuid references matches(id) on delete cascade,
    team_id uuid references teams(id) on delete cascade,
    player_id uuid references players(id) on delete cascade,
    assist_player_id uuid references players(id) on delete set null,
    event_type text not null,
    event_time integer not null,
    event_detail text,
    created_at timestamp with time zone default now()
);

-- =============================================================================
-- FEATURES & ML PIPELINE (Phase 1 + 2)
-- =============================================================================

-- Features par équipe et match (avec fenêtres temporelles)
create table if not exists features_match_team (
    id uuid default uuid_generate_v4() primary key,
    match_id uuid references matches(id) on delete cascade,
    team_id uuid references teams(id) on delete cascade,
    time_window text check (time_window in ('T24', 'T6', 'T1', 'T30')),
    is_home boolean not null,
    
    -- Force intrinsic features
    elo_rating numeric(8,3),
    dixon_coles_attack numeric(5,3),
    dixon_coles_defense numeric(5,3),
    form_5_points integer,
    form_10_points integer,
    xg_diff_5 numeric(5,3),
    xg_diff_10 numeric(5,3),
    
    -- Tactical style features
    possession_style numeric(5,3),
    tempo_style numeric(5,3),
    pressing_style numeric(5,3),
    verticality_style numeric(5,3),
    width_style numeric(5,3),
    avg_shot_distance numeric(5,2),
    
    -- Set pieces
    corners_for_rate numeric(5,4),
    corners_against_rate numeric(5,4),
    penalties_for_rate numeric(5,4),
    penalties_against_rate numeric(5,4),
    
    -- Calendar/fatigue
    days_rest integer,
    travel_km integer,
    congestion_index numeric(5,3),
    ucl_within_3d boolean default false,
    
    -- Volatility
    volatility_index numeric(5,3),
    giant_killer_flag boolean default false,
    choker_flag boolean default false,
    
    created_at timestamp with time zone default now(),
    unique(match_id, team_id, time_window)
);

-- Features par joueur et match
create table if not exists features_player_match (
    id uuid default uuid_generate_v4() primary key,
    match_id uuid references matches(id) on delete cascade,
    player_id uuid references players(id) on delete cascade,
    team_id uuid references teams(id) on delete cascade,
    time_window text check (time_window in ('T24', 'T6', 'T1', 'T30')),
    
    -- Role & expected minutes
    position text check (position in ('GK', 'DEF', 'MID', 'ATT')),
    minutes_expected integer,
    starter_probability numeric(4,3),
    
    -- Contributions per 90
    xg_per_90 numeric(5,3),
    xa_per_90 numeric(5,3),
    shots_per_90 numeric(5,2),
    shots_on_target_per_90 numeric(5,2),
    key_passes_per_90 numeric(5,2),
    touches_box_per_90 numeric(5,2),
    
    -- Set piece roles
    penalty_taker boolean default false,
    corner_taker boolean default false,
    free_kick_taker boolean default false,
    
    -- Physical/form
    recent_matches_load integer,
    injury_return boolean default false,
    age integer,
    
    -- Synergies
    synergy_hash text,
    
    created_at timestamp with time zone default now(),
    unique(match_id, player_id, time_window)
);

-- Probabilités des marchés
create table if not exists market_probs (
    id uuid default uuid_generate_v4() primary key,
    match_id uuid references matches(id) on delete cascade,
    time_window text check (time_window in ('T24', 'T6', 'T1', 'T30')),
    
    -- 1X2 probabilities
    p_home numeric(5,4) not null,
    p_draw numeric(5,4) not null,
    p_away numeric(5,4) not null,
    
    -- Over/Under probabilities
    p_over_05 numeric(5,4),
    p_over_15 numeric(5,4),
    p_over_25 numeric(5,4),
    p_over_35 numeric(5,4),
    
    -- Both teams to score
    p_btts_yes numeric(5,4),
    
    -- First to score
    p_home_first numeric(5,4),
    p_away_first numeric(5,4),
    
    created_at timestamp with time zone default now(),
    unique(match_id, time_window)
);

-- Prédictions pour les props joueurs
create table if not exists prop_predictions (
    id uuid default uuid_generate_v4() primary key,
    match_id uuid references matches(id) on delete cascade,
    player_id uuid references players(id) on delete cascade,
    time_window text check (time_window in ('T24', 'T6', 'T1', 'T30')),
    
    -- Scorer probabilities
    p_anytime_scorer numeric(5,4),
    p_first_scorer numeric(5,4),
    p_last_scorer numeric(5,4),
    
    -- Other props
    p_assist numeric(5,4),
    p_decisive_player numeric(5,4),
    
    -- Goal type probabilities
    p_goal_type_open numeric(5,4),
    p_goal_type_header numeric(5,4),
    p_goal_type_penalty numeric(5,4),
    p_goal_type_free_kick numeric(5,4),
    
    created_at timestamp with time zone default now(),
    unique(match_id, player_id, time_window)
);

-- Probabilités par tranches temporelles
create table if not exists time_bins_probs (
    id uuid default uuid_generate_v4() primary key,
    match_id uuid references matches(id) on delete cascade,
    team_id uuid references teams(id) on delete cascade,
    time_window text check (time_window in ('T24', 'T6', 'T1', 'T30')),
    
    -- Goal time bins
    bin_0_15 numeric(5,4),
    bin_16_30 numeric(5,4),
    bin_31_45 numeric(5,4),
    bin_46_60 numeric(5,4),
    bin_61_75 numeric(5,4),
    bin_76_90 numeric(5,4),
    
    -- First to score probability
    first_to_score_prob numeric(5,4),
    
    created_at timestamp with time zone default now(),
    unique(match_id, team_id, time_window)
);

-- =============================================================================
-- SYSTÈME D'APPRENTISSAGE POST-MATCH (Phase 1)
-- =============================================================================

-- Analyses post-match (apprentissage des erreurs)
create table if not exists post_match_analysis (
    id uuid default uuid_generate_v4() primary key,
    match_id uuid references matches(id) on delete cascade,
    analysis_date timestamp with time zone default now(),
    
    -- Résultat réel vs prédictions
    actual_home_goals integer not null,
    actual_away_goals integer not null,
    actual_outcome text check (actual_outcome in ('1', 'X', '2')),
    
    -- Erreurs par fenêtre temporelle
    error_t24_1x2 numeric(6,4),
    error_t24_ou numeric(6,4),
    error_t24_btts numeric(6,4),
    error_t6_1x2 numeric(6,4),
    error_t6_ou numeric(6,4),
    error_t6_btts numeric(6,4),
    error_t1_1x2 numeric(6,4),
    error_t1_ou numeric(6,4),
    error_t1_btts numeric(6,4),
    
    -- Analyse des facteurs critiques
    critical_factors jsonb,
    missed_patterns jsonb,
    feature_importance_shifts jsonb,
    
    -- Recommandations d'amélioration
    improvement_suggestions text[],
    model_adjustment_priority integer check (model_adjustment_priority between 1 and 5),
    
    created_at timestamp with time zone default now()
);

-- Retours d'apprentissage contextuels
create table if not exists learning_feedback (
    id uuid default uuid_generate_v4() primary key,
    match_id uuid references matches(id) on delete cascade,
    feedback_type text check (feedback_type in ('weather_impact', 'fatigue_underestimated', 'form_streak_broken', 'tactical_surprise', 'injury_impact', 'referee_bias', 'crowd_factor')),
    
    -- Contexte de l'apprentissage
    context_description text not null,
    confidence_before numeric(4,3),
    confidence_after numeric(4,3),
    impact_magnitude numeric(5,3),
    
    -- Facteurs d'influence découverts
    discovered_correlations jsonb,
    weight_adjustments jsonb,
    
    -- Généralisation
    pattern_generalization text,
    similar_contexts_count integer default 0,
    
    created_at timestamp with time zone default now()
);

-- Contexte des matchs (pour apprentissage contextuel)
create table if not exists match_context (
    id uuid default uuid_generate_v4() primary key,
    fixture_id integer not null,
    
    -- Contexte derby/rivalité
    is_derby boolean default false,
    rivalry_intensity integer check (rivalry_intensity between 1 and 5),
    
    -- Contexte européen
    home_european_comp text,
    away_european_comp text,
    european_fatigue_home integer,
    european_fatigue_away integer,
    
    -- Contexte championnat
    home_position integer,
    away_position integer,
    points_gap integer,
    relegation_battle boolean default false,
    title_race boolean default false,
    
    -- Contexte météo
    weather_impact_score numeric(4,2),
    pitch_condition text,
    
    created_at timestamp with time zone default now(),
    unique(fixture_id)
);

-- =============================================================================
-- MODÈLES ADAPTATIFS (Phase 2)
-- =============================================================================

-- Exécutions de modèles ML
create table if not exists model_runs (
    id uuid default uuid_generate_v4() primary key,
    model_type text not null,
    version text not null,
    parameters jsonb,
    training_data_from timestamp with time zone,
    training_data_to timestamp with time zone,
    metrics jsonb,
    artifact_path text,
    git_sha text,
    created_at timestamp with time zone default now()
);

-- Explications des modèles
create table if not exists model_explanations (
    id uuid default uuid_generate_v4() primary key,
    match_id uuid references matches(id) on delete cascade,
    time_window text check (time_window in ('T24', 'T6', 'T1', 'T30')),
    market_type text not null,
    factors jsonb not null,
    confidence_score numeric(4,3),
    created_at timestamp with time zone default now()
);

-- Historique retraining des modèles
create table if not exists model_retraining_log (
    id uuid default uuid_generate_v4() primary key,
    model_name text not null,
    trigger_reason text check (trigger_reason in ('scheduled', 'performance_drop', 'data_drift', 'manual')),
    
    -- Métriques avant/après retraining
    accuracy_before numeric(6,4),
    accuracy_after numeric(6,4),
    log_loss_before numeric(8,6),
    log_loss_after numeric(8,6),
    calibration_before numeric(6,4),
    calibration_after numeric(6,4),
    
    -- Configuration retraining
    training_period_days integer,
    validation_matches integer,
    feature_selection_method text,
    hyperparameters jsonb,
    
    -- Résultats
    improvement_percentage numeric(6,3),
    deployment_approved boolean default false,
    notes text,
    
    created_at timestamp with time zone default now()
);

-- Métriques de drift des données
create table if not exists data_drift_metrics (
    id uuid default uuid_generate_v4() primary key,
    feature_name text not null,
    drift_method text check (drift_method in ('ks_test', 'psi', 'wasserstein', 'jensen_shannon')),
    
    -- Mesures de drift
    drift_score numeric(8,6),
    p_value numeric(10,8),
    threshold numeric(6,4),
    drift_detected boolean,
    
    -- Période de mesure
    reference_period_start timestamp with time zone,
    reference_period_end timestamp with time zone,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    
    -- Actions recommandées
    severity text check (severity in ('low', 'medium', 'high', 'critical')),
    recommended_action text,
    
    created_at timestamp with time zone default now()
);

-- =============================================================================
-- SIMULATION MONTE CARLO (Phase 3)
-- =============================================================================

-- Agrégats des simulations
create table if not exists sim_aggregates (
    id uuid default uuid_generate_v4() primary key,
    match_id uuid references matches(id) on delete cascade,
    time_window text check (time_window in ('T24', 'T6', 'T1', 'T30')),
    market jsonb not null,
    num_simulations integer not null,
    random_seed integer,
    created_at timestamp with time zone default now()
);

-- Calibrations Monte Carlo (apprentissage simulation)
create table if not exists monte_carlo_calibrations (
    id uuid default uuid_generate_v4() primary key,
    fixture_id integer not null,
    
    -- Résultat réel
    actual_home_goals integer not null,
    actual_away_goals integer not null,
    actual_outcome text check (actual_outcome in ('1', 'X', '2')),
    
    -- Distribution prédite (JSON des scénarios)
    predicted_distribution jsonb not null,
    
    -- Ajustements de calibration
    strength_adjustment numeric(6,4),
    variance_adjustment numeric(6,4),
    correlation_adjustment numeric(6,4),
    tail_risk_adjustment numeric(6,4),
    
    -- Insights d'apprentissage
    learning_insights text[],
    
    created_at timestamp with time zone default now()
);

-- Poids des scénarios Monte Carlo (apprentissage adaptatif)
create table if not exists monte_carlo_weights (
    id uuid default uuid_generate_v4() primary key,
    scenario text not null unique, -- Format "homeGoals-awayGoals" ex: "2-1"
    weight numeric(6,4) default 1.0,
    confidence numeric(4,3) default 0.5,
    sample_size integer default 0,
    last_observed_at timestamp with time zone,
    updated_at timestamp with time zone default now(),
    created_at timestamp with time zone default now()
);

-- Événements rares (tail events) pour Monte Carlo
create table if not exists monte_carlo_tail_events (
    id uuid default uuid_generate_v4() primary key,
    event_type text not null, -- ex: "home_high_scoring", "away_high_scoring", "very_low_scoring"
    probability numeric(8,6) default 0.01,
    threshold_value integer, -- ex: >4 goals pour high_scoring
    context_factors jsonb, -- conditions contextuelles
    updated_at timestamp with time zone default now(),
    created_at timestamp with time zone default now()
);

-- =============================================================================
-- SYSTÈME MONTANTE (Betting Management)
-- =============================================================================

-- Séries Montante
create table if not exists montante_series (
    id uuid default uuid_generate_v4() primary key,
    started_at timestamp with time zone default now(),
    ended_at timestamp with time zone,
    initial_bankroll numeric(12,2) not null,
    final_bankroll numeric(12,2),
    max_bankroll numeric(12,2) not null,
    status text check (status in ('active', 'completed', 'stopped', 'busted')),
    bet_count integer default 0,
    created_at timestamp with time zone default now()
);

-- Paris Montante
create table if not exists montante_bets (
    id uuid default uuid_generate_v4() primary key,
    series_id uuid references montante_series(id) on delete cascade,
    placed_at timestamp with time zone default now(),
    decision_window text check (decision_window in ('T24', 'T6', 'T1', 'T30')),
    
    -- État bankroll
    bankroll_before numeric(12,2) not null,
    stake numeric(12,2) not null,
    
    -- Détails du pari
    legs jsonb not null, -- Array des legs du pari combiné
    product_odds numeric(8,3) not null,
    model_probs jsonb not null,
    expected_value numeric(6,4),
    
    -- Suivi du résultat
    result text check (result in ('pending', 'won', 'lost', 'void')),
    bankroll_after numeric(12,2),
    settled_at timestamp with time zone,
    
    created_at timestamp with time zone default now()
);

-- =============================================================================
-- COTES ET MARCHÉS
-- =============================================================================

-- Snapshots des cotes
create table if not exists odds_snapshots (
    id uuid default uuid_generate_v4() primary key,
    match_id uuid references matches(id) on delete cascade,
    bookmaker text not null,
    time_window text check (time_window in ('T24', 'T6', 'T1', 'T30')),
    
    -- 1X2 odds
    home_win_odds numeric(6,3),
    draw_odds numeric(6,3),
    away_win_odds numeric(6,3),
    
    -- Over/Under odds
    over_25_odds numeric(6,3),
    under_25_odds numeric(6,3),
    
    -- Autres marchés
    market_odds jsonb,
    
    captured_at timestamp with time zone not null,
    created_at timestamp with time zone default now()
);

-- =============================================================================
-- QUALITÉ DES DONNÉES
-- =============================================================================

-- Contrôles qualité des données
create table if not exists data_quality_checks (
    id uuid default uuid_generate_v4() primary key,
    check_type text not null,
    table_name text not null,
    check_name text not null,
    status text check (status in ('passed', 'failed', 'warning')),
    details jsonb,
    checked_at timestamp with time zone default now()
);

-- =============================================================================
-- INDEX DE PERFORMANCE
-- =============================================================================

-- Index pour les requêtes fréquentes
create index if not exists idx_matches_date on matches(match_date);
create index if not exists idx_matches_status on matches(status);
create index if not exists idx_matches_teams on matches(home_team_id, away_team_id);
create index if not exists idx_features_match_team_window on features_match_team(match_id, time_window);
create index if not exists idx_market_probs_match_window on market_probs(match_id, time_window);
create index if not exists idx_post_match_analysis_date on post_match_analysis(analysis_date);
create index if not exists idx_monte_carlo_calibrations_fixture on monte_carlo_calibrations(fixture_id);
create index if not exists idx_montante_bets_series on montante_bets(series_id);
create index if not exists idx_player_match_stats_match on player_match_stats(match_id);

-- Index composites pour les jointures complexes
create index if not exists idx_features_player_match_composite on features_player_match(match_id, player_id, time_window);
create index if not exists idx_prop_predictions_composite on prop_predictions(match_id, player_id, time_window);

-- =============================================================================
-- TRIGGERS DE MISE À JOUR
-- =============================================================================

-- Fonction trigger pour updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Application des triggers
create trigger update_leagues_updated_at before update on leagues
    for each row execute procedure update_updated_at_column();

create trigger update_teams_updated_at before update on teams
    for each row execute procedure update_updated_at_column();

create trigger update_players_updated_at before update on players
    for each row execute procedure update_updated_at_column();

create trigger update_matches_updated_at before update on matches
    for each row execute procedure update_updated_at_column();

-- =============================================================================
-- CONTRAINTES D'INTÉGRITÉ SPÉCIFIQUES
-- =============================================================================

-- Vérification des probabilités (somme = 1 pour 1X2)
alter table market_probs add constraint check_1x2_probabilities 
check (abs((p_home + p_draw + p_away) - 1.0) < 0.001);

-- Vérification des scores (non négatifs)
alter table matches add constraint check_scores_non_negative 
check ((home_score is null or home_score >= 0) and (away_score is null or away_score >= 0));

-- Vérification des stakes (positifs)
alter table montante_bets add constraint check_positive_stake 
check (stake > 0 and bankroll_before > 0);

-- =============================================================================
-- VUES UTILES POUR LES REQUÊTES
-- =============================================================================

-- Vue pour les matchs avec équipes
create or replace view matches_with_teams as
select 
    m.*,
    ht.name as home_team_name,
    ht.short_name as home_team_short,
    at.name as away_team_name,
    at.short_name as away_team_short,
    s.year as season_year,
    l.name as league_name
from matches m
join teams ht on m.home_team_id = ht.id
join teams at on m.away_team_id = at.id
join seasons s on m.season_id = s.id
join leagues l on s.league_id = l.id;

-- Vue pour les dernières prédictions
create or replace view latest_predictions as
select distinct on (match_id)
    match_id,
    time_window,
    p_home,
    p_draw,
    p_away,
    p_over_25,
    p_btts_yes,
    created_at
from market_probs
order by match_id, created_at desc;

-- =============================================================================
-- POLITIQUE DE SÉCURITÉ (RLS SIMPLE)
-- =============================================================================

-- Activer RLS sur les tables sensibles
alter table montante_series enable row level security;
alter table montante_bets enable row level security;

-- Politique simple : accès complet pour service_role
create policy "Enable all access for service role" on montante_series for all using (true);
create policy "Enable all access for service role" on montante_bets for all using (true);

-- =============================================================================
-- COMMENTAIRES DE DOCUMENTATION
-- =============================================================================

comment on table matches is 'Table centrale des matchs avec métadonnées complètes';
comment on table features_match_team is 'Features ML par équipe avec fenêtres temporelles T24/T6/T1/T30';
comment on table post_match_analysis is 'Analyse post-match pour apprentissage continu (Phase 1)';
comment on table model_retraining_log is 'Log des retrainings automatiques (Phase 2)';
comment on table monte_carlo_calibrations is 'Calibrations adaptatives des simulations (Phase 3)';
comment on table montante_series is 'Séries de paris avec système Montante';

-- =============================================================================
-- FIN DE LA MIGRATION COMPLÈTE
-- =============================================================================