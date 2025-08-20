-- =============================================================================
-- MIGRATION: FIX SCHEMA POUR COLLECTORS TYPESCRIPT
-- Ajout colonnes manquantes pour compatibilité collectors
-- =============================================================================

-- Ajouter api_id manquant à seasons
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS api_id INTEGER;

-- Ajouter short_name manquant à teams  
ALTER TABLE teams ADD COLUMN IF NOT EXISTS short_name VARCHAR(10);

-- Créer index pour performance
CREATE INDEX IF NOT EXISTS idx_seasons_api_id ON seasons(api_id);
CREATE INDEX IF NOT EXISTS idx_teams_short_name ON teams(short_name);

-- Commentaires pour documentation
COMMENT ON COLUMN seasons.api_id IS 'API Football composite ID (league_id + year)';
COMMENT ON COLUMN teams.short_name IS 'Short team name/code for display';

-- Mise à jour des colonnes existantes si nécessaire
UPDATE seasons SET api_id = (
    CAST(COALESCE((SELECT api_id FROM leagues WHERE leagues.id = seasons.league_id), 61) AS TEXT) || 
    CAST(year AS TEXT)
)::INTEGER 
WHERE api_id IS NULL;

UPDATE teams SET short_name = LEFT(UPPER(name), 3) WHERE short_name IS NULL;