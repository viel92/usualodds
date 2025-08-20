/**
 * EXTRACTION CRITIQUE: match_statistics.raw_data JSON
 * Mission: Extraire 614 records raw_data JSON avec structure API originale
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

// Fonction utilitaire pour extraire valeurs du tableau statistics
function getStatValue(statisticsArray, type) {
    if (!Array.isArray(statisticsArray)) return null;
    
    const stat = statisticsArray.find(s => 
        s.type && s.type.toLowerCase().includes(type.toLowerCase())
    );
    
    return stat ? stat.value : null;
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

async function extractMatchStatisticsRawData() {
    console.log('🔥 EXTRACTION CRITIQUE: match_statistics.raw_data JSON\n');
    
    try {
        // 1. AUDIT INITIAL
        console.log('📊 AUDIT INITIAL...');
        const { data: auditData, error: auditError } = await supabase
            .from('match_statistics')
            .select('id, raw_data, team_name')
            .limit(3);
            
        if (auditError) throw auditError;
        
        console.log(`📋 Échantillon de ${auditData.length} records raw_data:`);
        auditData.forEach((row, i) => {
            console.log(`\n--- Record ${i+1} ---`);
            if (row.raw_data && row.raw_data.team) {
                console.log('Team:', row.raw_data.team.name);
                console.log('Statistics count:', row.raw_data.statistics?.length || 0);
            }
        });
        
        // 2. PAGINATION ET EXTRACTION COMPLÈTE
        console.log('\n🚀 EXTRACTION RAW_DATA EN COURS...\n');
        
        let totalProcessed = 0;
        let totalUpdated = 0;
        let page = 0;
        const pageSize = 100;
        
        while (true) {
            const offset = page * pageSize;
            
            console.log(`📃 Page ${page + 1}: offset ${offset}...`);
            
            const { data: records, error } = await supabase
                .from('match_statistics')
                .select('id, raw_data, team_name')
                .range(offset, offset + pageSize - 1);
                
            if (error) throw error;
            if (!records || records.length === 0) break;
            
            console.log(`   📊 ${records.length} records récupérés`);
            
            // Traitement des records
            const updates = [];
            
            for (const record of records) {
                if (!record.raw_data || !record.raw_data.statistics) continue;
                
                const rawData = record.raw_data;
                const statsArray = rawData.statistics;
                
                const extractedData = {};
                
                // Extraction des nouvelles données manquées
                const blocked_shots = cleanValue(getStatValue(statsArray, 'Blocked Shots'));
                const goals_prevented = cleanValue(getStatValue(statsArray, 'goals_prevented'));
                
                // Mettre à jour team_name si disponible dans raw_data
                let teamNameUpdate = null;
                if (rawData.team && rawData.team.name && !record.team_name) {
                    teamNameUpdate = rawData.team.name;
                }
                
                // Vérifier si on a des données à mettre à jour
                const hasNewData = blocked_shots !== null || 
                                 goals_prevented !== null || 
                                 teamNameUpdate !== null;
                
                if (hasNewData) {
                    const updateData = { id: record.id };
                    
                    if (blocked_shots !== null) updateData.blocked_shots = blocked_shots;
                    if (goals_prevented !== null) updateData.goals_prevented = goals_prevented;
                    if (teamNameUpdate) updateData.team_name = teamNameUpdate;
                    
                    updates.push(updateData);
                }
            }
            
            // BATCH UPDATE
            if (updates.length > 0) {
                console.log(`   🔄 Mise à jour ${updates.length} records...`);
                
                for (const update of updates) {
                    const { id, ...updateFields } = update;
                    const { error: updateError } = await supabase
                        .from('match_statistics')
                        .update(updateFields)
                        .eq('id', id);
                        
                    if (updateError) {
                        console.error(`❌ Erreur update record ${id}:`, updateError);
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
            .select('team_name, blocked_shots, goals_prevented')
            .not('team_name', 'is', null)
            .limit(10);
            
        if (finalError) throw finalError;
        
        console.log('✅ EXTRACTION RAW_DATA TERMINÉE !');
        console.log(`📊 Total records traités: ${totalProcessed}`);
        console.log(`🔄 Total records mis à jour: ${totalUpdated}`);
        console.log(`✅ Sample team_names renseignés: ${finalCheck.length} records`);
        
        if (finalCheck.length > 0) {
            console.log('\n📋 Échantillon final:');
            finalCheck.forEach((record, i) => {
                console.log(`${i+1}. Team: ${record.team_name}, Blocked: ${record.blocked_shots}, Prevented: ${record.goals_prevented}`);
            });
        }
        
    } catch (error) {
        console.error('💥 Erreur extraction raw_data:', error);
        process.exit(1);
    }
}

// Exécution
extractMatchStatisticsRawData();