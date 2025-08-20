-- Migration: Création table match_odds pour stocker les cotes
-- Date: 20 Août 2025
-- Objectif: Système de cotes intelligent avec Unibet + autres bookmakers

-- Créer la table match_odds
CREATE TABLE IF NOT EXISTS match_odds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Référence au match
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    match_api_id INTEGER NOT NULL,
    
    -- Informations bookmaker
    bookmaker_id INTEGER NOT NULL,
    bookmaker_name TEXT NOT NULL,
    
    -- Cotes principales 1X2
    home_win DECIMAL(5,2),
    draw DECIMAL(5,2), 
    away_win DECIMAL(5,2),
    
    -- Cotes Over/Under
    over_2_5 DECIMAL(5,2),
    under_2_5 DECIMAL(5,2),
    over_1_5 DECIMAL(5,2),
    under_1_5 DECIMAL(5,2),
    over_3_5 DECIMAL(5,2),
    under_3_5 DECIMAL(5,2),
    
    -- Both Teams Score
    both_teams_score_yes DECIMAL(5,2),
    both_teams_score_no DECIMAL(5,2),
    
    -- Handicap asiatique (optionnel)
    asian_handicap_home DECIMAL(5,2),
    asian_handicap_away DECIMAL(5,2),
    asian_handicap_line DECIMAL(3,2), -- ex: -1.5, +0.5
    
    -- Double chance
    home_draw DECIMAL(5,2),  -- 1X
    home_away DECIMAL(5,2),  -- 12  
    draw_away DECIMAL(5,2),  -- X2
    
    -- Métadonnées
    raw_data JSONB NOT NULL, -- Toutes les données brutes de l'API
    api_update TIMESTAMP WITH TIME ZONE, -- Quand l'API a mis à jour les cotes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte unicité par match et bookmaker
    CONSTRAINT match_odds_unique UNIQUE(match_id, bookmaker_id)
);

-- Créer les index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_match_odds_match_id ON match_odds(match_id);
CREATE INDEX IF NOT EXISTS idx_match_odds_bookmaker ON match_odds(bookmaker_id);
CREATE INDEX IF NOT EXISTS idx_match_odds_api_update ON match_odds(api_update DESC);
CREATE INDEX IF NOT EXISTS idx_match_odds_updated_at ON match_odds(updated_at DESC);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_match_odds_match_bookmaker ON match_odds(match_id, bookmaker_id);

-- Contraintes de validité
ALTER TABLE match_odds ADD CONSTRAINT check_positive_odds 
    CHECK (
        (home_win IS NULL OR home_win > 0) AND
        (draw IS NULL OR draw > 0) AND  
        (away_win IS NULL OR away_win > 0) AND
        (over_2_5 IS NULL OR over_2_5 > 0) AND
        (under_2_5 IS NULL OR under_2_5 > 0)
    );

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_match_odds_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_match_odds_timestamp
    BEFORE UPDATE ON match_odds
    FOR EACH ROW
    EXECUTE FUNCTION update_match_odds_timestamp();

-- Commentaires pour documentation
COMMENT ON TABLE match_odds IS 'Stockage des cotes de paris pour chaque match par bookmaker';
COMMENT ON COLUMN match_odds.match_id IS 'Référence au match dans la table matches';
COMMENT ON COLUMN match_odds.bookmaker_id IS 'ID du bookmaker selon API Football (Unibet=16, Bet365=8)';
COMMENT ON COLUMN match_odds.home_win IS 'Cote victoire équipe domicile';
COMMENT ON COLUMN match_odds.draw IS 'Cote match nul';
COMMENT ON COLUMN match_odds.away_win IS 'Cote victoire équipe extérieur';
COMMENT ON COLUMN match_odds.raw_data IS 'Données brutes complètes de l\'API Football';
COMMENT ON COLUMN match_odds.api_update IS 'Timestamp de dernière mise à jour côté bookmaker';

-- Politique RLS (Row Level Security) - pour l'instant publique en lecture
ALTER TABLE match_odds ENABLE ROW LEVEL SECURITY;

-- Politique : lecture publique (pour le dashboard)
CREATE POLICY "Public read access" ON match_odds
    FOR SELECT USING (true);

-- Politique : écriture uniquement via service_role (collectors)
CREATE POLICY "Service role write access" ON match_odds
    FOR ALL USING (auth.role() = 'service_role');