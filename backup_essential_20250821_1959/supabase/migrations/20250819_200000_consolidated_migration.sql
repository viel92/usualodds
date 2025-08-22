-- =============================================================================
-- MIGRATION CONSOLIDÉE USUALODDS
-- Résolution des conflits et consolidation de toutes les migrations
-- =============================================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- DROP ET RECRÉATION COMPLÈTE POUR ÉVITER CONFLITS
-- =============================================================================

-- Supprimer les vues qui dépendent des tables
DROP VIEW IF EXISTS ml_match_features CASCADE;

-- Supprimer les tables dans l'ordre des dépendances
DROP TABLE IF EXISTS ai_match_insights CASCADE;
DROP TABLE IF EXISTS match_odds_timeline CASCADE;
DROP TABLE IF EXISTS match_context CASCADE;
DROP TABLE IF EXISTS match_players_stats CASCADE;
DROP TABLE IF EXISTS match_lineups CASCADE;
DROP TABLE IF EXISTS match_formations CASCADE;
DROP TABLE IF EXISTS match_statistics CASCADE;
DROP TABLE IF EXISTS match_events CASCADE;
DROP TABLE IF EXISTS coach_features CASCADE;
DROP TABLE IF EXISTS player_features CASCADE;
DROP TABLE IF EXISTS team_features CASCADE;
DROP TABLE IF EXISTS matches CASCADE;

-- =============================================================================
-- TABLE MATCHES (format MVP compatible)
-- =============================================================================
CREATE TABLE matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_id INTEGER UNIQUE NOT NULL,
    season INTEGER NOT NULL,
    league_id INTEGER NOT NULL,
    round VARCHAR(50),
    date TIMESTAMP NOT NULL,
    timestamp BIGINT,
    timezone VARCHAR(50),
    status VARCHAR(50),
    status_short VARCHAR(10),
    elapsed INTEGER,
    venue_id INTEGER,
    venue_name VARCHAR(100),
    venue_city VARCHAR(100),
    home_team_id INTEGER NOT NULL,
    home_team_name VARCHAR(100),
    away_team_id INTEGER NOT NULL,
    away_team_name VARCHAR(100),
    home_score INTEGER,
    away_score INTEGER,
    referee VARCHAR(100),
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- TEAM FEATURES (VERSION CONSOLIDÉE)
-- =============================================================================
CREATE TABLE team_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id INTEGER NOT NULL,
    season INTEGER NOT NULL,
    league_id INTEGER NOT NULL,
    
    -- Classement et contexte
    current_rank INTEGER,
    points INTEGER DEFAULT 0,
    points_difference INTEGER DEFAULT 0,
    
    -- Zones & Motivation (CRUCIAL)
    motivation_zone VARCHAR(20),
    motivation_score DECIMAL(6,3),
    pressure_score DECIMAL(6,3),
    expectation_score DECIMAL(6,3),
    
    -- Distances aux enjeux
    distance_from_cl INTEGER DEFAULT 0,
    distance_from_europa INTEGER DEFAULT 0,
    distance_from_conference INTEGER DEFAULT 0,
    distance_from_relegation INTEGER DEFAULT 0,
    
    -- Classifications binaires
    is_title_contender BOOLEAN DEFAULT false,
    is_european_contender BOOLEAN DEFAULT false,
    is_mid_table BOOLEAN DEFAULT false,
    is_relegation_candidate BOOLEAN DEFAULT false,
    
    -- Statistiques de base
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    goal_difference INTEGER,
    
    -- Efficacité calculée (LARGEUR AUGMENTÉE)
    goals_per_game DECIMAL(6,2),
    goals_conceded_per_game DECIMAL(6,2),
    
    -- NOUVELLES COLONNES MANQUANTES
    shots_per_game DECIMAL(6,2),
    shots_against_per_game DECIMAL(6,2),
    shots_on_target_avg DECIMAL(6,2),
    
    -- Elo dynamique
    elo_rating DECIMAL(8,2),
    elo_home DECIMAL(8,2),
    elo_away DECIMAL(8,2),
    
    -- Forme récente
    form_5_points INTEGER DEFAULT 0,
    form_10_points INTEGER DEFAULT 0,
    xg_for_avg DECIMAL(4,2),
    xg_against_avg DECIMAL(4,2),
    xg_diff_avg DECIMAL(4,2),
    
    -- Styles tactiques
    possession_avg DECIMAL(5,2),
    tempo_score DECIMAL(4,2),
    pressing_intensity DECIMAL(4,2),
    transition_speed DECIMAL(4,2),
    verticality_index DECIMAL(4,2),
    width_usage DECIMAL(4,2),
    
    -- Performance domicile/extérieur (LARGEUR AUGMENTÉE)
    home_wins INTEGER DEFAULT 0,
    home_draws INTEGER DEFAULT 0,
    home_losses INTEGER DEFAULT 0,
    home_goals_for INTEGER DEFAULT 0,
    home_goals_against INTEGER DEFAULT 0,
    home_advantage DECIMAL(6,3),
    
    away_wins INTEGER DEFAULT 0,
    away_draws INTEGER DEFAULT 0,
    away_losses INTEGER DEFAULT 0,
    away_goals_for INTEGER DEFAULT 0,
    away_goals_against INTEGER DEFAULT 0,
    away_performance DECIMAL(6,3),
    
    -- Set-pieces
    corners_for INTEGER DEFAULT 0,
    corners_against INTEGER DEFAULT 0,
    corners_conversion_rate DECIMAL(4,3),
    corner_conversion DECIMAL(6,3),
    free_kicks_scored INTEGER DEFAULT 0,
    penalties_scored INTEGER DEFAULT 0,
    penalties_conceded INTEGER DEFAULT 0,
    
    -- Défense de surface
    xga_box_avg DECIMAL(4,2),
    pressing_final_third DECIMAL(4,2),
    defensive_errors INTEGER DEFAULT 0,
    
    -- Calendrier & Fatigue
    avg_rest_days DECIMAL(3,1),
    travel_km_total INTEGER DEFAULT 0,
    congestion_index DECIMAL(4,2),
    ucl_matches INTEGER DEFAULT 0,
    
    -- Volatilité & Patterns psychologiques
    volatility_index DECIMAL(4,2),
    big_game_performance DECIMAL(4,2),
    
    -- Discipline
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    discipline_index DECIMAL(4,2),
    discipline_score DECIMAL(6,3),
    
    -- Patterns psychologiques (LARGEUR AUGMENTÉE)
    underdog_performance DECIMAL(6,3),
    big_game_mentality DECIMAL(6,3),
    giant_killer_flag BOOLEAN DEFAULT false,
    choker_flag BOOLEAN DEFAULT false,
    
    -- Métadonnées ML
    raw_stats JSONB,
    ai_features JSONB,
    style_cluster TEXT DEFAULT 'balanced', -- CORRIGÉ: TEXT au lieu d'INTEGER
    
    -- NOUVELLES COLONNES DE L'AUDIT
    context_analysis JSONB,
    standing_data JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, season, league_id)
);

-- =============================================================================
-- PLAYER FEATURES (compatibles avec scripts MVP)  
-- =============================================================================
CREATE TABLE player_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    season INTEGER NOT NULL,
    league_id INTEGER NOT NULL,
    
    -- Rôle & minutes
    position VARCHAR(10),
    detailed_position VARCHAR(20),
    appearences INTEGER DEFAULT 0,
    lineups INTEGER DEFAULT 0,
    minutes_total INTEGER DEFAULT 0,
    minutes_per_game DECIMAL(4,1),
    starter_probability DECIMAL(4,3),
    
    -- Contributions offensives
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    xg_total DECIMAL(6,3),
    xa_total DECIMAL(6,3),
    shots_total INTEGER DEFAULT 0,
    shots_on_target INTEGER DEFAULT 0,
    key_passes INTEGER DEFAULT 0,
    big_chances_created INTEGER DEFAULT 0,
    
    -- Metrics par 90min
    goals_per90 DECIMAL(5,3),
    assists_per90 DECIMAL(5,3),
    xg_per90 DECIMAL(5,3),
    xa_per90 DECIMAL(5,3),
    shots_per90 DECIMAL(5,2),
    keypasses_per90 DECIMAL(5,2),
    touches_box_per90 DECIMAL(5,2),
    
    -- Shot map features
    shot_map_features JSONB,
    preferred_foot VARCHAR(10),
    header_ability DECIMAL(4,3),
    finishing_ability DECIMAL(4,3),
    
    -- Set-pieces
    penalty_taker BOOLEAN DEFAULT false,
    free_kick_taker BOOLEAN DEFAULT false,
    corner_taker BOOLEAN DEFAULT false,
    penalties_scored INTEGER DEFAULT 0,
    penalties_missed INTEGER DEFAULT 0,
    
    -- Profil physique
    age INTEGER,
    height INTEGER,
    weight INTEGER,
    fitness_index DECIMAL(4,2),
    injury_history JSONB,
    fatigue_resistance DECIMAL(4,2),
    fatigue_level DECIMAL(4,2), -- AJOUTÉ
    
    -- Synergies
    key_partnerships JSONB,
    passing_network_centrality DECIMAL(6,4),
    triangle_motifs INTEGER DEFAULT 0,
    chemistry_score DECIMAL(4,2),
    
    -- Discipline
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    early_substitutions INTEGER DEFAULT 0,
    disciplinary_risk DECIMAL(4,3),
    
    -- Métadonnées IA
    raw_stats JSONB,
    ai_player_type VARCHAR(50),
    performance_clusters JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(player_id, team_id, season, league_id)
);

-- =============================================================================
-- MATCH EVENTS
-- =============================================================================
CREATE TABLE match_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id INTEGER NOT NULL,
    time_elapsed INTEGER,
    time_extra INTEGER,
    team_id INTEGER NOT NULL,
    team_name VARCHAR(100),
    player_id INTEGER,
    player_name VARCHAR(100),
    assist_player_id INTEGER,
    assist_player_name VARCHAR(100),
    type VARCHAR(50),
    detail VARCHAR(100),
    comments TEXT,
    
    -- Classifications IA
    goal_type_classified VARCHAR(50),
    goal_context JSONB,
    
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- MATCH STATISTICS (AVEC COLONNE statistics AJOUTÉE)
-- =============================================================================
CREATE TABLE match_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    team_name VARCHAR(100),
    
    -- Stats converties
    ball_possession INTEGER,
    total_shots INTEGER,
    shots_on_goal INTEGER,
    shots_off_goal INTEGER,
    shots_insidebox INTEGER,
    shots_outsidebox INTEGER,
    fouls INTEGER,
    corner_kicks INTEGER,
    offsides INTEGER,
    yellow_cards INTEGER,
    red_cards INTEGER,
    goalkeeper_saves INTEGER,
    total_passes INTEGER,
    passes_accurate INTEGER,
    passes_percentage INTEGER,
    expected_goals DECIMAL(4,2),
    
    -- Features tactiques IA
    pressing_intensity DECIMAL(4,2),
    possession_quality DECIMAL(4,2),
    transition_efficiency DECIMAL(4,2),
    final_third_entries INTEGER,
    
    -- COLONNE AJOUTÉE POUR COMPATIBILITÉ CODE
    statistics JSONB,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, team_id)
);

-- =============================================================================
-- MATCH FORMATIONS
-- =============================================================================
CREATE TABLE match_formations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    team_name VARCHAR(100),
    formation VARCHAR(20),
    coach_name VARCHAR(100),
    
    -- Analyse formation IA
    formation_defensive_line DECIMAL(4,2),
    formation_compactness DECIMAL(4,2),
    formation_width DECIMAL(4,2),
    
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, team_id)
);

-- =============================================================================  
-- MATCH LINEUPS
-- =============================================================================
CREATE TABLE match_lineups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    player_name VARCHAR(100),
    position VARCHAR(20),
    shirt_number INTEGER,
    starter BOOLEAN DEFAULT true,
    
    -- Prédictions IA
    predicted_minutes INTEGER,
    predicted_rating DECIMAL(3,1),
    risk_early_sub DECIMAL(4,3),
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, player_id)
);

-- =============================================================================
-- MATCH PLAYERS STATS
-- =============================================================================
CREATE TABLE match_players_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    player_name VARCHAR(100),
    
    -- Performance
    minutes_played INTEGER DEFAULT 0,
    rating DECIMAL(3,1),
    position VARCHAR(20),
    captain BOOLEAN DEFAULT false,
    substitute BOOLEAN DEFAULT false,
    
    -- Stats offensives
    shots_total INTEGER DEFAULT 0,
    shots_on_target INTEGER DEFAULT 0,
    shots_off_target INTEGER DEFAULT 0,
    shots_blocked INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    xg_match DECIMAL(5,3),
    xa_match DECIMAL(5,3),
    
    -- Stats passes
    passes_total INTEGER DEFAULT 0,
    passes_accurate INTEGER DEFAULT 0,
    passes_accuracy DECIMAL(5,2),
    key_passes INTEGER DEFAULT 0,
    crosses_total INTEGER DEFAULT 0,
    crosses_accurate INTEGER DEFAULT 0,
    long_balls INTEGER DEFAULT 0,
    
    -- Stats duels
    dribbles_attempts INTEGER DEFAULT 0,
    dribbles_success INTEGER DEFAULT 0,
    dribbles_past INTEGER DEFAULT 0,
    duels_total INTEGER DEFAULT 0,
    duels_won INTEGER DEFAULT 0,
    aerial_won INTEGER DEFAULT 0,
    aerial_lost INTEGER DEFAULT 0,
    
    -- Stats défensives
    tackles_total INTEGER DEFAULT 0,
    tackles_won INTEGER DEFAULT 0,
    blocks INTEGER DEFAULT 0,
    interceptions INTEGER DEFAULT 0,
    clearances INTEGER DEFAULT 0,
    
    -- Discipline
    fouls_drawn INTEGER DEFAULT 0,
    fouls_committed INTEGER DEFAULT 0,
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    
    -- Features IA
    performance_index DECIMAL(5,2),
    impact_score DECIMAL(5,2),
    fatigue_level DECIMAL(4,2),
    
    raw_stats JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, player_id)
);

-- =============================================================================
-- MATCH CONTEXT (VERSION ÉTENDUE)
-- =============================================================================
CREATE TABLE match_context (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id INTEGER NOT NULL UNIQUE,
    
    -- Contexte derby/rivalité
    is_derby BOOLEAN DEFAULT false,
    rivalry_intensity DECIMAL(4,2),
    historical_h2h JSONB,
    h2h_trend VARCHAR(20),
    
    -- Enjeux
    match_importance DECIMAL(4,2),
    title_contention BOOLEAN DEFAULT false,
    relegation_battle BOOLEAN DEFAULT false,
    european_spots BOOLEAN DEFAULT false,
    
    -- Météo
    weather_condition VARCHAR(50),
    temperature DECIMAL(4,1),
    wind_speed DECIMAL(4,1),
    precipitation DECIMAL(4,1),
    humidity INTEGER,
    weather_impact_score DECIMAL(4,2),
    
    -- Arbitre
    referee_name VARCHAR(100),
    referee_cards_per_game DECIMAL(4,2),
    referee_penalties_per_game DECIMAL(5,3),
    referee_strictness DECIMAL(4,2),
    
    -- Calendrier & Fatigue
    home_rest_days INTEGER,
    away_rest_days INTEGER,
    home_travel_km INTEGER DEFAULT 0,
    away_travel_km INTEGER DEFAULT 0,
    home_european_fixture BOOLEAN DEFAULT false,
    away_european_fixture BOOLEAN DEFAULT false,
    
    -- Médias & Pression
    media_attention_score DECIMAL(4,2),
    crowd_expected INTEGER,
    tv_audience_category VARCHAR(20),
    
    -- Features IA
    ai_context_score DECIMAL(5,2),
    key_context_factors JSONB,
    
    -- NOUVELLES COLONNES
    rivalry_score DECIMAL(4,2),
    importance_factor DECIMAL(4,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- MATCH ODDS TIMELINE
-- =============================================================================
CREATE TABLE match_odds_timeline (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id INTEGER NOT NULL,
    bookmaker VARCHAR(50),
    timestamp TIMESTAMP NOT NULL,
    window_type VARCHAR(10),
    
    -- Marché 1X2
    odds_home DECIMAL(6,3),
    odds_draw DECIMAL(6,3),
    odds_away DECIMAL(6,3),
    
    -- Over/Under
    odds_over_25 DECIMAL(6,3),
    odds_under_25 DECIMAL(6,3),
    odds_over_15 DECIMAL(6,3),
    odds_under_15 DECIMAL(6,3),
    odds_over_35 DECIMAL(6,3),
    odds_under_35 DECIMAL(6,3),
    
    -- BTTS
    odds_btts_yes DECIMAL(6,3),
    odds_btts_no DECIMAL(6,3),
    
    -- Marchés joueurs
    player_odds JSONB,
    
    -- Probabilités implicites
    implied_prob_home DECIMAL(6,4),
    implied_prob_draw DECIMAL(6,4),
    implied_prob_away DECIMAL(6,4),
    market_margin DECIMAL(5,3),
    
    raw_odds JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- COACH FEATURES
-- =============================================================================
CREATE TABLE coach_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_name VARCHAR(100) NOT NULL,
    team_id INTEGER NOT NULL,
    season INTEGER NOT NULL,
    league_id INTEGER NOT NULL,
    
    -- Style coach
    tactical_style VARCHAR(50),
    formation_preference VARCHAR(20),
    avg_possession DECIMAL(5,2),
    avg_goals_scored DECIMAL(4,2),
    avg_goals_conceded DECIMAL(4,2),
    
    -- Performance
    big_game_win_rate DECIMAL(5,3),
    underdog_win_rate DECIMAL(5,3),
    home_performance DECIMAL(4,2),
    away_performance DECIMAL(4,2),
    
    -- Gestion
    in_game_changes INTEGER DEFAULT 0,
    rotation_frequency DECIMAL(4,2),
    youth_integration BOOLEAN DEFAULT false,
    
    -- Spécialités IA
    set_piece_specialist BOOLEAN DEFAULT false,
    defensive_specialist BOOLEAN DEFAULT false,
    attacking_specialist BOOLEAN DEFAULT false,
    man_management_score DECIMAL(4,2),
    
    -- Stabilité
    tenure_months INTEGER DEFAULT 0,
    stability_index DECIMAL(4,2),
    pressure_resistance DECIMAL(4,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(coach_name, team_id, season)
);

-- =============================================================================
-- AI MATCH INSIGHTS
-- =============================================================================
CREATE TABLE ai_match_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id INTEGER,
    
    -- Prédictions IA
    predicted_outcome VARCHAR(10),
    confidence_score DECIMAL(4,3),
    expected_goals_home DECIMAL(4,2),
    expected_goals_away DECIMAL(4,2),
    
    -- Key factors
    key_factors JSONB,
    tactical_matchup JSONB,
    player_impact_predictions JSONB,
    
    -- Post-match learning
    prediction_accuracy DECIMAL(4,3),
    error_analysis JSONB,
    learned_patterns JSONB,
    
    -- Modèle
    model_version VARCHAR(50),
    features_importance JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- INDEX PERFORMANCE
-- =============================================================================

-- Index matches
CREATE INDEX idx_matches_api_id ON matches(api_id);
CREATE INDEX idx_matches_season ON matches(season);
CREATE INDEX idx_matches_teams ON matches(home_team_id, away_team_id);
CREATE INDEX idx_matches_date ON matches(date);
CREATE INDEX idx_matches_status ON matches(status);

-- Index team_features
CREATE INDEX idx_team_features_team_season ON team_features(team_id, season);
CREATE INDEX idx_team_features_league_season ON team_features(league_id, season);
CREATE INDEX idx_team_features_rank ON team_features(current_rank) WHERE current_rank IS NOT NULL;

-- Index player_features
CREATE INDEX idx_player_features_player_season ON player_features(player_id, season);
CREATE INDEX idx_player_features_team_season ON player_features(team_id, season);

-- Index événements & stats
CREATE INDEX idx_match_events_match ON match_events(match_id);
CREATE INDEX idx_match_statistics_match ON match_statistics(match_id);
CREATE INDEX idx_match_context_match ON match_context(match_id);
CREATE INDEX idx_match_players_stats_match ON match_players_stats(match_id);

-- Index IA
CREATE INDEX idx_ai_insights_match ON ai_match_insights(match_id);
CREATE INDEX idx_ai_insights_confidence ON ai_match_insights(confidence_score DESC);

-- Index cotes
CREATE INDEX idx_odds_timeline_match_window ON match_odds_timeline(match_id, window_type);

-- =============================================================================
-- VUE ML FEATURES (compatible scripts)
-- =============================================================================
CREATE OR REPLACE VIEW ml_match_features AS
SELECT 
    m.id as match_id,
    m.api_id,
    m.date,
    m.home_team_id,
    m.away_team_id,
    m.home_score,
    m.away_score,
    
    -- Features équipe domicile
    tf_home.current_rank as home_rank,
    tf_home.motivation_zone as home_motivation_zone,
    tf_home.motivation_score as home_motivation_score,
    tf_home.pressure_score as home_pressure_score,
    tf_home.goals_per_game as home_goals_avg,
    tf_home.possession_avg as home_possession,
    tf_home.volatility_index as home_volatility,
    
    -- Features équipe extérieur
    tf_away.current_rank as away_rank,
    tf_away.motivation_zone as away_motivation_zone,
    tf_away.motivation_score as away_motivation_score,
    tf_away.pressure_score as away_pressure_score,
    tf_away.goals_per_game as away_goals_avg,
    tf_away.possession_avg as away_possession,
    tf_away.volatility_index as away_volatility,
    
    -- Contexte
    mc.match_importance,
    mc.is_derby,
    mc.weather_impact_score,
    mc.referee_strictness
    
FROM matches m
LEFT JOIN team_features tf_home ON m.home_team_id = tf_home.team_id AND m.season = tf_home.season
LEFT JOIN team_features tf_away ON m.away_team_id = tf_away.team_id AND m.season = tf_away.season
LEFT JOIN match_context mc ON m.api_id = mc.match_id
WHERE m.status = 'Match Finished';

-- =============================================================================
-- ACTIVATION RLS (SÉCURITÉ)
-- =============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_odds_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_match_insights ENABLE ROW LEVEL SECURITY;

-- Politiques RLS permissives pour l'anon key (lecture seule)
CREATE POLICY "Allow read access" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON team_features FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON player_features FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON match_events FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON match_statistics FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON match_formations FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON match_lineups FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON match_players_stats FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON match_context FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON match_odds_timeline FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON coach_features FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON ai_match_insights FOR SELECT USING (true);

-- =============================================================================
-- COMMENTAIRES & VALIDATION
-- =============================================================================
COMMENT ON TABLE matches IS 'MIGRATION CONSOLIDÉE - Table centrale matchs';
COMMENT ON TABLE team_features IS 'MIGRATION CONSOLIDÉE - Features équipe avec toutes corrections';
COMMENT ON TABLE player_features IS 'MIGRATION CONSOLIDÉE - Features joueur complètes';
COMMENT ON TABLE match_statistics IS 'MIGRATION CONSOLIDÉE - Stats avec colonne statistics ajoutée';

-- =============================================================================
-- TABLES IA AVANCÉES
-- =============================================================================

-- Table analyses IA par équipe
CREATE TABLE IF NOT EXISTS ai_team_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id INTEGER NOT NULL,
    season INTEGER DEFAULT 2024,
    analysis JSONB NOT NULL,
    confidence INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table prédictions IA
CREATE TABLE IF NOT EXISTS ai_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    match_date TIMESTAMP,
    prediction JSONB NOT NULL,
    confidence INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table prédictions matchs à venir
CREATE TABLE IF NOT EXISTS ai_predictions_upcoming (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fixture_id INTEGER UNIQUE NOT NULL,
    match_date TIMESTAMP NOT NULL,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    prediction_data JSONB NOT NULL,
    update_window VARCHAR(10),
    confidence INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table apprentissage IA
CREATE TABLE IF NOT EXISTS ai_learning_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id INTEGER,
    learning_data JSONB NOT NULL,
    error_analysis JSONB,
    improvements_made TEXT[],
    confidence_gained DECIMAL(4,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance IA
CREATE INDEX IF NOT EXISTS idx_ai_team_analysis_team ON ai_team_analysis(team_id, season);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_teams ON ai_predictions(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_ai_upcoming_fixture ON ai_predictions_upcoming(fixture_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_match ON ai_learning_log(match_id);

-- RLS pour tables IA
ALTER TABLE ai_team_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions_upcoming ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_log ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour IA
CREATE POLICY "Allow read access" ON ai_team_analysis FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON ai_predictions FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON ai_predictions_upcoming FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON ai_learning_log FOR SELECT USING (true);

-- Validation finale
SELECT 
    'Migration consolidée créée avec succès' as status,
    'RLS activé, tous conflits résolus' as security_status;