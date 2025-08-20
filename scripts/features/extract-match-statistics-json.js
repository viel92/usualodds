/**
 * EXTRACTION CRITIQUE: match_statistics.statistics + raw_data JSON
 * Mission: Extraire 614 records JSON vers colonnes ML-ready
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

// Fonction utilitaire pour extraire valeurs JSON
function getValue(obj, path, defaultValue = null) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
}

// Fonction utilitaire pour nettoyer et convertir
function cleanValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
        // Nettoyer les pourcentages
        if (value.includes('%')) {
            return parseFloat(value.replace('%', ''));
        }
        // Conversion numérique si possible
        const num = parseFloat(value);
        return isNaN(num) ? value : num;
    }
    return value;
}

async function extractMatchStatisticsJSON() {
    console.log('🔥 EXTRACTION CRITIQUE: match_statistics JSON\n');
    
    try {
        // 1. AUDIT INITIAL
        console.log('📊 AUDIT INITIAL...');
        const { data: auditData, error: auditError } = await supabase
            .from('match_statistics')
            .select('id, statistics, raw_data')
            .limit(5);
            
        if (auditError) throw auditError;
        
        console.log(`📋 Échantillon de ${auditData.length} records:`);
        auditData.forEach((row, i) => {
            console.log(`\n--- Record ${i+1} ---`);
            if (row.statistics) {
                console.log('STATISTICS keys:', Object.keys(row.statistics));
                console.log('STATISTICS sample:', JSON.stringify(row.statistics, null, 2));
            }
            if (row.raw_data) {
                console.log('RAW_DATA keys:', Object.keys(row.raw_data));
                console.log('RAW_DATA sample:', JSON.stringify(row.raw_data, null, 2));
            }
        });
        
        // 2. PAGINATION ET EXTRACTION COMPLÈTE
        console.log('\n🚀 EXTRACTION MASSIVE EN COURS...\n');
        
        let totalProcessed = 0;
        let totalUpdated = 0;
        let page = 0;
        const pageSize = 100;
        
        while (true) {
            const offset = page * pageSize;
            
            console.log(`📃 Page ${page + 1}: offset ${offset}...`);
            
            const { data: records, error } = await supabase
                .from('match_statistics')
                .select('id, statistics, raw_data, ball_possession, total_shots, shots_on_goal')
                .range(offset, offset + pageSize - 1);
                
            if (error) throw error;
            if (!records || records.length === 0) break;
            
            console.log(`   📊 ${records.length} records récupérés`);
            
            // Traitement des records
            const updates = [];
            
            for (const record of records) {
                if (!record.statistics && !record.raw_data) continue;
                
                const extractedData = {};
                
                // Extraction STATISTICS JSON
                if (record.statistics) {
                    const stats = record.statistics;
                    
                    extractedData.ball_possession = cleanValue(getValue(stats, 'ball_possession'));
                    extractedData.total_shots = cleanValue(getValue(stats, 'total_shots'));
                    extractedData.shots_on_goal = cleanValue(getValue(stats, 'shots_on_goal'));
                    extractedData.shots_off_goal = cleanValue(getValue(stats, 'shots_off_goal'));
                    extractedData.shots_insidebox = cleanValue(getValue(stats, 'shots_insidebox'));
                    extractedData.shots_outsidebox = cleanValue(getValue(stats, 'shots_outsidebox'));
                    extractedData.fouls = cleanValue(getValue(stats, 'fouls'));
                    extractedData.corner_kicks = cleanValue(getValue(stats, 'corner_kicks'));
                    extractedData.offsides = cleanValue(getValue(stats, 'offsides'));
                    extractedData.yellow_cards = cleanValue(getValue(stats, 'yellow_cards'));
                    extractedData.red_cards = cleanValue(getValue(stats, 'red_cards'));
                    extractedData.goalkeeper_saves = cleanValue(getValue(stats, 'goalkeeper_saves'));
                    extractedData.total_passes = cleanValue(getValue(stats, 'total_passes'));
                    extractedData.passes_accurate = cleanValue(getValue(stats, 'passes_accurate'));
                    extractedData.passes_percentage = cleanValue(getValue(stats, 'passes_%') || getValue(stats, 'passes_percentage'));
                    extractedData.expected_goals = cleanValue(getValue(stats, 'expected_goals'));
                }
                
                // Extraction RAW_DATA JSON si différent
                if (record.raw_data && JSON.stringify(record.raw_data) !== JSON.stringify(record.statistics)) {
                    const rawData = record.raw_data;
                    
                    // Compléter avec raw_data si statistics manque des champs
                    if (!extractedData.ball_possession) {
                        extractedData.ball_possession = cleanValue(getValue(rawData, 'ball_possession'));
                    }
                    // ... autres champs si nécessaire
                }
                
                // Vérifier si on a des données à mettre à jour
                const hasNewData = Object.values(extractedData).some(v => v !== null && v !== undefined);
                
                if (hasNewData) {
                    updates.push({
                        id: record.id,
                        ...extractedData
                    });
                }
            }
            
            // BATCH UPDATE
            if (updates.length > 0) {
                console.log(`   🔄 Mise à jour ${updates.length} records...`);
                
                for (const update of updates) {
                    const { error: updateError } = await supabase
                        .from('match_statistics')
                        .update(update)
                        .eq('id', update.id);
                        
                    if (updateError) {
                        console.error(`❌ Erreur update record ${update.id}:`, updateError);
                    } else {
                        totalUpdated++;
                    }
                }
                
                console.log(`   ✅ ${updates.length} records mis à jour`);
            } else {
                console.log(`   ⚠️ Aucune donnée nouvelle à extraire`);
            }
            
            totalProcessed += records.length;
            page++;
            
            // Pause pour éviter la surcharge
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 3. VÉRIFICATION FINALE
        console.log('\n🔍 VÉRIFICATION FINALE...\n');
        
        const { data: finalCheck, error: finalError } = await supabase
            .from('match_statistics')
            .select('ball_possession, total_shots, shots_on_goal, expected_goals')
            .not('ball_possession', 'is', null)
            .limit(10);
            
        if (finalError) throw finalError;
        
        console.log('✅ EXTRACTION TERMINÉE !');
        console.log(`📊 Total records traités: ${totalProcessed}`);
        console.log(`🔄 Total records mis à jour: ${totalUpdated}`);
        console.log(`✅ Sample données extraites: ${finalCheck.length} records avec ball_possession non-null`);
        
        if (finalCheck.length > 0) {
            console.log('\n📋 Échantillon final:');
            finalCheck.forEach((record, i) => {
                console.log(`${i+1}. Possession: ${record.ball_possession}%, Shots: ${record.total_shots}, Expected Goals: ${record.expected_goals}`);
            });
        }
        
    } catch (error) {
        console.error('💥 Erreur extraction:', error);
        process.exit(1);
    }
}

// Exécution
extractMatchStatisticsJSON();