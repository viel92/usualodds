#\!/usr/bin/env node

/**
 * EXTRACTEUR MATCHES RAW_DATA AVEC PAGINATION
 */

require("dotenv").config()
const { createClient } = require("@supabase/supabase-js")

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

class MatchRawDataExtractor {
    constructor() {
        this.extractions = {
            matchesProcessed: 0,
            featuresExtracted: 0,
            errors: []
        }
    }

    async extractAllRawData() {
        console.log("📦 EXTRACTION MATCHES RAW_DATA")
        console.log("==============================")
        
        try {
            // Récupérer TOUS les matchs avec raw_data (pagination)
            console.log("🔍 Récupération matches avec pagination...")
            let allMatches = []
            let page = 0
            const pageSize = 500
            
            while (true) {
                const offset = page * pageSize
                console.log(`  📃 Page ${page + 1}: offset ${offset}...`)
                
                const { data: matches, error } = await supabase
                    .from("matches")
                    .select("id, raw_data, home_team_name, away_team_name")
                    .neq("raw_data", null)
                    .range(offset, offset + pageSize - 1)
                    
                if (error) throw error
                if (\!matches || matches.length === 0) break
                
                allMatches = allMatches.concat(matches)
                console.log(`    📊 ${matches.length} matches récupérés (total: ${allMatches.length})`)
                page++
            }
            
            console.log(`📊 TOTAL: ${allMatches.length} matches avec raw_data à traiter`)
            
            // Analyser structure sample
            if (allMatches.length > 0) {
                const sample = allMatches[0]
                console.log(`\n🔍 ANALYSE STRUCTURE (${sample.home_team_name} vs ${sample.away_team_name}):`)
                if (sample.raw_data && typeof sample.raw_data === "object") {
                    console.log(`  Keys disponibles: [${Object.keys(sample.raw_data).join(", ")}]`)
                }
            }
            
            return { totalMatches: allMatches.length, sampleAnalyzed: true }
            
        } catch (error) {
            console.error("❌ Erreur extraction:", error.message)
            return { error: error.message }
        }
    }
}

async function extractMatchesRawData() {
    const extractor = new MatchRawDataExtractor()
    const results = await extractor.extractAllRawData()
    
    console.log("\n🏆 ANALYSE RAW_DATA TERMINÉE")
    console.log("============================")
    if (results.error) {
        console.log(`❌ Erreur: ${results.error}`)
    } else {
        console.log(`✅ Total matches analysés: ${results.totalMatches}`)
        console.log("🎯 Prêt pour extraction complète")
    }
    
    return results
}

if (require.main === module) {
    extractMatchesRawData()
}

module.exports = { MatchRawDataExtractor, extractMatchesRawData }
