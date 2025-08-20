-- =============================================================================
-- MIGRATION: TABLES CORE MANQUANTES
-- Ajout des tables leagues, seasons, teams, players pour système TypeScript
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE LEAGUES
-- =============================================================================
CREATE TABLE leagues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(100),
    country_code VARCHAR(10),
    logo_url TEXT,
    flag_url TEXT,
    type VARCHAR(50) DEFAULT 'League',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- TABLE SEASONS  
-- =============================================================================
CREATE TABLE seasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    current BOOLEAN DEFAULT false,
    coverage JSONB, -- API coverage info
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(league_id, year)
);

-- =============================================================================
-- TABLE TEAMS
-- =============================================================================
CREATE TABLE teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10),
    country VARCHAR(100),
    founded INTEGER,
    logo_url TEXT,
    venue_id INTEGER,
    venue_name VARCHAR(100),
    venue_address TEXT,
    venue_city VARCHAR(100),
    venue_capacity INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- TABLE PLAYERS
-- =============================================================================
CREATE TABLE players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    firstname VARCHAR(100),
    lastname VARCHAR(100),
    age INTEGER,
    birth_date DATE,
    birth_place VARCHAR(100),
    birth_country VARCHAR(100),
    nationality VARCHAR(100),
    height VARCHAR(10),
    weight VARCHAR(10),
    injured BOOLEAN DEFAULT false,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- MISE À JOUR TABLE MATCHES pour références
-- =============================================================================

-- Ajouter colonnes de référence si elles n'existent pas
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id),
ADD COLUMN IF NOT EXISTS home_team_uuid UUID REFERENCES teams(id),
ADD COLUMN IF NOT EXISTS away_team_uuid UUID REFERENCES teams(id);

-- Ajouter colonnes pour garder compatibilité avec données existantes
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS league_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS competition VARCHAR(100);

-- =============================================================================
-- MISE À JOUR TEAM_FEATURES pour référence teams
-- =============================================================================
ALTER TABLE team_features 
ADD COLUMN IF NOT EXISTS team_uuid UUID REFERENCES teams(id),
ADD COLUMN IF NOT EXISTS league_uuid UUID REFERENCES leagues(id);

-- =============================================================================
-- MISE À JOUR PLAYER_FEATURES pour référence players  
-- =============================================================================
ALTER TABLE player_features 
ADD COLUMN IF NOT EXISTS player_uuid UUID REFERENCES players(id),
ADD COLUMN IF NOT EXISTS team_uuid UUID REFERENCES teams(id);

-- =============================================================================
-- INDEX POUR PERFORMANCES
-- =============================================================================

-- Leagues
CREATE INDEX idx_leagues_api_id ON leagues(api_id);
CREATE INDEX idx_leagues_country ON leagues(country);

-- Seasons  
CREATE INDEX idx_seasons_league_year ON seasons(league_id, year);
CREATE INDEX idx_seasons_current ON seasons(current) WHERE current = true;

-- Teams
CREATE INDEX idx_teams_api_id ON teams(api_id);
CREATE INDEX idx_teams_country ON teams(country);

-- Players
CREATE INDEX idx_players_api_id ON players(api_id);
CREATE INDEX idx_players_nationality ON players(nationality);

-- Matches avec nouvelles références
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season_id);
CREATE INDEX IF NOT EXISTS idx_matches_teams_uuid ON matches(home_team_uuid, away_team_uuid);

-- =============================================================================
-- RLS (Row Level Security) 
-- =============================================================================

-- Enable RLS
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;  
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Policies (read access pour tous)
CREATE POLICY "Allow read access" ON leagues FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON seasons FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON teams FOR SELECT USING (true);  
CREATE POLICY "Allow read access" ON players FOR SELECT USING (true);

-- =============================================================================
-- DONNÉES DE BASE POUR DÉMARRAGE
-- =============================================================================

-- Insérer Ligue 1 comme league de base
INSERT INTO leagues (api_id, name, country, country_code, type)
VALUES (61, 'Ligue 1', 'France', 'FR', 'League')
ON CONFLICT (api_id) DO NOTHING;

-- Insérer saisons de base
INSERT INTO seasons (league_id, year, current)
SELECT l.id, 2024, true
FROM leagues l WHERE l.api_id = 61
ON CONFLICT (league_id, year) DO NOTHING;

INSERT INTO seasons (league_id, year, current)  
SELECT l.id, 2023, false
FROM leagues l WHERE l.api_id = 61
ON CONFLICT (league_id, year) DO NOTHING;

INSERT INTO seasons (league_id, year, current)
SELECT l.id, 2022, false  
FROM leagues l WHERE l.api_id = 61
ON CONFLICT (league_id, year) DO NOTHING;

-- =============================================================================
-- COMMENTAIRES ET DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE leagues IS 'Table des ligues/championnats (API Football)';
COMMENT ON TABLE seasons IS 'Table des saisons par ligue';  
COMMENT ON TABLE teams IS 'Table des équipes (API Football)';
COMMENT ON TABLE players IS 'Table des joueurs (API Football)';

COMMENT ON COLUMN matches.season_id IS 'Référence UUID vers seasons';
COMMENT ON COLUMN matches.home_team_uuid IS 'Référence UUID vers teams (home)';
COMMENT ON COLUMN matches.away_team_uuid IS 'Référence UUID vers teams (away)';

-- =============================================================================
-- FIN MIGRATION
-- =============================================================================