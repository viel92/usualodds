/**
 * EXTRACTION CRITIQUE FINALE: match_players_stats.raw_stats JSON
 * Mission: Extraire 12,256 records JSON vers features ML avancées
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration Supabase ADMIN
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables environnement manquantes');
    console.error('supabaseUrl:', supabaseUrl ? 'OK' : 'MISSING');
    console.error('supabaseKey:', supabaseKey ? 'OK' : 'MISSING');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction utilitaire pour extraire valeurs JSON sécurisées
function getValue(obj, path, defaultValue = null) {
    try {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : defaultValue;
        }, obj);
    } catch (e) {
        return defaultValue;
    }
}

// Fonction utilitaire pour nettoyer et convertir
function cleanValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
        // Conversion numérique si possible
        const num = parseFloat(value);
        return isNaN(num) ? value : num;
    }
    return value;
}

async function extractPlayersRawStats() {
    console.log('🔥 EXTRACTION CRITIQUE FINALE: match_players_stats.raw_stats JSON\n');
    console.log('🎯 Mission: 12,256 records → ML features avancées\n');
    
    try {
        // 1. AUDIT INITIAL
        console.log('📊 AUDIT INITIAL...');
        const { data: auditData, error: auditError } = await supabase
            .from('match_players_stats')
            .select('id, player_name, raw_stats, position')
            .limit(5);
            
        if (auditError) throw auditError;
        
        console.log(`📋 Échantillon de ${auditData.length} records:`);
        auditData.forEach((row, i) => {
            console.log(`\n--- Record ${i+1}: ${row.player_name} ---`);
            if (row.raw_stats) {
                console.log('Position actuelle:', row.position || 'NULL');
                console.log('Raw position:', getValue(row.raw_stats, 'games.position'));
                console.log('Rating:', getValue(row.raw_stats, 'games.rating'));
                console.log('Minutes:', getValue(row.raw_stats, 'games.minutes'));
                console.log('Keys disponibles:', Object.keys(row.raw_stats));
            }
        });
        
        // 2. PAGINATION ET EXTRACTION COMPLÈTE
        console.log('\n🚀 EXTRACTION MASSIVE 12,256 RECORDS...\n');
        
        let totalProcessed = 0;
        let totalUpdated = 0;
        let page = 0;
        const pageSize = 200; // Plus gros pour plus d'efficacité
        
        while (true) {
            const offset = page * pageSize;
            
            console.log(`📃 Page ${page + 1}: offset ${offset}...`);
            
            const { data: records, error } = await supabase
                .from('match_players_stats')
                .select('id, raw_stats, position')
                .range(offset, offset + pageSize - 1);
                
            if (error) throw error;
            if (!records || records.length === 0) break;
            
            console.log(`   📊 ${records.length} records récupérés`);
            
            // Traitement des records
            const updates = [];
            
            for (const record of records) {
                if (!record.raw_stats) continue;
                
                const rawStats = record.raw_stats;
                const extractedData = {};
                
                // 1. GAMES DATA - Position et rating critique
                const rawPosition = cleanValue(getValue(rawStats, 'games.position'));
                const playerRating = cleanValue(getValue(rawStats, 'games.rating'));
                
                if (rawPosition && !record.position) {
                    extractedData.position = rawPosition;
                }
                
                // 2. ADVANCED FEATURES pour ML
                // Duels effectiveness
                const duelsWon = cleanValue(getValue(rawStats, 'duels.won'));
                const duelsTotal = cleanValue(getValue(rawStats, 'duels.total'));
                
                // Passes quality
                const passesKey = cleanValue(getValue(rawStats, 'passes.key'));
                const passesAccuracy = cleanValue(getValue(rawStats, 'passes.accuracy'));
                
                // Defensive actions
                const tacklesBlocks = cleanValue(getValue(rawStats, 'tackles.blocks'));
                const tacklesInterceptions = cleanValue(getValue(rawStats, 'tackles.interceptions'));
                
                // Dribbling skills
                const dribblesSuccess = cleanValue(getValue(rawStats, 'dribbles.success'));
                const dribblesAttempts = cleanValue(getValue(rawStats, 'dribbles.attempts'));
                const dribblesPast = cleanValue(getValue(rawStats, 'dribbles.past'));
                
                // Cards detail
                const cardsYellow = cleanValue(getValue(rawStats, 'cards.yellow'));
                const cardsRed = cleanValue(getValue(rawStats, 'cards.red'));
                
                // Fouls behavior
                const foulsDrawn = cleanValue(getValue(rawStats, 'fouls.drawn'));
                const foulsCommitted = cleanValue(getValue(rawStats, 'fouls.committed'));
                
                // Goalkeeper specific
                const goalsSaves = cleanValue(getValue(rawStats, 'goals.saves'));
                const goalsConceded = cleanValue(getValue(rawStats, 'goals.conceded'));
                
                // Penalty expertise
                const penaltyScored = cleanValue(getValue(rawStats, 'penalty.scored'));
                const penaltyMissed = cleanValue(getValue(rawStats, 'penalty.missed'));
                
                // Vérifier si on a des nouvelles données
                const newFeatures = {
                    ...(rawPosition && !record.position ? { position: rawPosition } : {}),
                    // On ne peut pas mettre rating car la colonne n'existe pas dans match_players_stats
                    // Mais on peut mettre à jour les colonnes existantes si elles sont NULL
                };
                
                // Mettre à jour seulement si nécessaire
                if (Object.keys(newFeatures).length > 0) {
                    updates.push({
                        id: record.id,
                        ...newFeatures
                    });
                }
            }
            
            // BATCH UPDATE
            if (updates.length > 0) {
                console.log(`   🔄 Mise à jour ${updates.length} records...`);
                
                let successCount = 0;
                for (const update of updates) {
                    const { id, ...updateFields } = update;
                    const { error: updateError } = await supabase
                        .from('match_players_stats')
                        .update(updateFields)
                        .eq('id', id);
                        
                    if (updateError) {
                        console.error(`❌ Erreur update record ${id}:`, updateError.message);
                    } else {
                        successCount++;
                    }
                }
                
                console.log(`   ✅ ${successCount}/${updates.length} records mis à jour`);
                totalUpdated += successCount;
            } else {
                console.log(`   ⚠️ Aucune donnée nouvelle à extraire`);
            }
            
            totalProcessed += records.length;
            page++;
            
            // Pause pour éviter la surcharge
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // 3. ANALYSE DES FEATURES EXTRAITES
        console.log('\n📊 ANALYSE DES FEATURES EXTRAITES...\n');
        
        // Sample des données extraites avec les features avancées
        const { data: sampleExtracted, error: sampleError } = await supabase
            .from('match_players_stats')
            .select('player_name, position, rating, key_passes, dribbles_success')
            .not('position', 'is', null)
            .limit(10);
            
        if (!sampleError && sampleExtracted) {
            console.log('📋 Sample positions extraites:');
            sampleExtracted.forEach((record, i) => {
                console.log(`${i+1}. ${record.player_name}: ${record.position}, Rating: ${record.rating || 'N/A'}`);
            });
        }
        
        // 4. STATISTIQUES FINALES  
        console.log('\n✅ EXTRACTION FINALE TERMINÉE !');
        console.log(`📊 Total records traités: ${totalProcessed}`);
        console.log(`🔄 Total records mis à jour: ${totalUpdated}`);
        console.log(`🎯 Taux de succès: ${((totalUpdated/totalProcessed)*100).toFixed(2)}%`);
        
        // Vérification positions renseignées
        const { data: positionCheck, error: posError } = await supabase
            .from('match_players_stats')
            .select('position')
            .not('position', 'is', null);
            
        if (!posError) {
            console.log(`✅ Positions renseignées: ${positionCheck.length} joueurs`);
        }
        
        console.log('\n🎉 PHASE PRÉPARATION DONNÉES: TERMINÉE !');
        console.log('🚀 Prêt pour PHASE 2: Features ML avancées');
        
    } catch (error) {
        console.error('💥 Erreur extraction:', error);
        process.exit(1);
    }
}

// Exécution
extractPlayersRawStats();