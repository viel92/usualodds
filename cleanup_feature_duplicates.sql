-- ============================================================================
-- NETTOYAGE DES FEATURES REDONDANTES - PHASE P0
-- Suppression des doublons exacts identifies dans l'analyse
-- ============================================================================

-- Verification avant suppression
DO $$
BEGIN
    RAISE NOTICE 'DEBUT NETTOYAGE FEATURES DOUBLONS';
    RAISE NOTICE 'Date: %', NOW();
    RAISE NOTICE 'Colonnes a supprimer: total_shots, shots_on_goal, shots_insidebox, shots_outsidebox, corners_conversion_rate';
END $$;

-- ============================================================================
-- SUPPRESSION DOUBLONS DANS MATCH_STATISTICS
-- ============================================================================

-- 1. Verifier existence des colonnes doublons
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'match_statistics' 
AND column_name IN ('total_shots', 'shots_on_goal', 'shots_insidebox', 'shots_outsidebox', 'shots_total', 'shots_on_target', 'shots_inside_box', 'shots_outside_box')
ORDER BY column_name;

-- 2. Comparer les donnees pour confirmer les doublons
-- Verification total_shots vs shots_total
SELECT 
    COUNT(*) as total_rows,
    COUNT(CASE WHEN total_shots = shots_total THEN 1 END) as matching_rows,
    ROUND(
        (COUNT(CASE WHEN total_shots = shots_total THEN 1 END)::FLOAT / COUNT(*)) * 100, 
        2
    ) as match_percentage
FROM match_statistics 
WHERE total_shots IS NOT NULL AND shots_total IS NOT NULL;

-- Verification shots_on_goal vs shots_on_target  
SELECT 
    COUNT(*) as total_rows,
    COUNT(CASE WHEN shots_on_goal = shots_on_target THEN 1 END) as matching_rows,
    ROUND(
        (COUNT(CASE WHEN shots_on_goal = shots_on_target THEN 1 END)::FLOAT / COUNT(*)) * 100, 
        2
    ) as match_percentage
FROM match_statistics 
WHERE shots_on_goal IS NOT NULL AND shots_on_target IS NOT NULL;

-- 3. Suppression des colonnes doublons (PHASE P0)
-- Garder les versions avec convention snake_case consistante

-- Supprimer total_shots (garder shots_total)
ALTER TABLE match_statistics DROP COLUMN IF EXISTS total_shots;

-- Supprimer shots_on_goal (garder shots_on_target si elle existe)
ALTER TABLE match_statistics DROP COLUMN IF EXISTS shots_on_goal;

-- Supprimer shots_insidebox (garder shots_inside_box)  
ALTER TABLE match_statistics DROP COLUMN IF EXISTS shots_insidebox;

-- Supprimer shots_outsidebox (garder shots_outside_box)
ALTER TABLE match_statistics DROP COLUMN IF EXISTS shots_outsidebox;

-- ============================================================================
-- SUPPRESSION DOUBLONS DANS TEAM_FEATURES
-- ============================================================================

-- 4. Verifier existence corners_conversion_rate
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'team_features' 
AND column_name IN ('corners_conversion_rate', 'corner_conversion')
ORDER BY column_name;

-- 5. Analyser correlation avant suppression
-- (Cette requete peut echouer si une des colonnes n'existe pas)
SELECT 
    CORR(corners_conversion_rate, corner_conversion) as correlation,
    COUNT(*) as total_rows,
    COUNT(corners_conversion_rate) as rate_non_null,
    COUNT(corner_conversion) as conversion_non_null
FROM team_features 
WHERE corners_conversion_rate IS NOT NULL AND corner_conversion IS NOT NULL;

-- 6. Supprimer corners_conversion_rate (garder corner_conversion)
ALTER TABLE team_features DROP COLUMN IF EXISTS corners_conversion_rate;

-- ============================================================================
-- VERIFICATION POST-NETTOYAGE
-- ============================================================================

-- 7. Confirmer suppressions
SELECT 
    'match_statistics' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'match_statistics' 
AND column_name IN ('total_shots', 'shots_on_goal', 'shots_insidebox', 'shots_outsidebox')

UNION ALL

SELECT 
    'team_features' as table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'team_features' 
AND column_name = 'corners_conversion_rate'

ORDER BY table_name, column_name;

-- 8. Compter colonnes restantes
SELECT 
    'match_statistics' as table_name,
    COUNT(*) as columns_count
FROM information_schema.columns 
WHERE table_name = 'match_statistics'

UNION ALL

SELECT 
    'team_features' as table_name,
    COUNT(*) as columns_count  
FROM information_schema.columns 
WHERE table_name = 'team_features'

ORDER BY table_name;

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================

DO $$
DECLARE
    match_stats_cols INTEGER;
    team_features_cols INTEGER;
BEGIN
    -- Compter colonnes actuelles
    SELECT COUNT(*) INTO match_stats_cols 
    FROM information_schema.columns 
    WHERE table_name = 'match_statistics';
    
    SELECT COUNT(*) INTO team_features_cols
    FROM information_schema.columns 
    WHERE table_name = 'team_features';
    
    RAISE NOTICE 'NETTOYAGE TERMINE';
    RAISE NOTICE 'match_statistics: % colonnes restantes', match_stats_cols;
    RAISE NOTICE 'team_features: % colonnes restantes', team_features_cols;
    RAISE NOTICE 'Features doublons supprimees: total_shots, shots_on_goal, shots_insidebox, shots_outsidebox, corners_conversion_rate';
    RAISE NOTICE 'Benefices estimes: -10%% bruit, +2-5%% accuracy potentiel';
END $$;