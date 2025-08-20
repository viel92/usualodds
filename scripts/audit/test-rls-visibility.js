#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

// Test avec les deux clés
const adminClient = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g'
)

const anonClient = createClient(
    'https://agysfqhijfbnqzzooyeo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjgzOTEsImV4cCI6MjA3MTEwNDM5MX0.2xl4TKmDPf4F_0635cvJTUijcO2HH1F46nq1nyQnwPE'
)

async function testRLSVisibility() {
    console.log('\n=== TEST VISIBILITÉ RLS ===\n')
    
    try {
        // 1. Count avec SERVICE_ROLE
        console.log('1. AVEC SERVICE_ROLE (admin):')
        const { count: adminCount } = await adminClient
            .from('matches')
            .select('*', { count: 'exact', head: true })
        console.log(`   Count: ${adminCount}`)
        
        const { data: adminSelect } = await adminClient
            .from('matches')
            .select('id, season, league_id')
        console.log(`   Select: ${adminSelect.length} rows`)
        
        // 2. Count avec ANON
        console.log('\n2. AVEC ANON (public):')
        const { count: anonCount, error: anonError } = await anonClient
            .from('matches')
            .select('*', { count: 'exact', head: true })
        
        if (anonError) {
            console.log(`   Erreur: ${anonError.message}`)
        } else {
            console.log(`   Count: ${anonCount}`)
        }
        
        const { data: anonSelect, error: anonSelectError } = await anonClient
            .from('matches')
            .select('id, season, league_id')
        
        if (anonSelectError) {
            console.log(`   Select erreur: ${anonSelectError.message}`)
        } else {
            console.log(`   Select: ${anonSelect.length} rows`)
        }
        
        // 3. Test direct SQL si possible
        console.log('\n3. TEST REQUÊTE BRUTE:')
        const { data: rawCount, error: rawError } = await adminClient
            .rpc('exec_raw_sql', { 
                query: 'SELECT COUNT(*) FROM matches' 
            })
        
        if (rawError) {
            console.log(`   SQL raw non disponible: ${rawError.message}`)
        } else {
            console.log(`   SQL Count: ${rawCount}`)
        }
        
        // 4. Vérifier les limites de pagination
        console.log('\n4. TEST PAGINATION:')
        let totalPaginated = 0
        let page = 0
        const pageSize = 1000
        
        while (true) {
            const { data: pageData } = await adminClient
                .from('matches')
                .select('id')
                .range(page * pageSize, (page + 1) * pageSize - 1)
            
            if (!pageData || pageData.length === 0) break
            
            totalPaginated += pageData.length
            console.log(`   Page ${page + 1}: ${pageData.length} rows (total: ${totalPaginated})`)
            
            if (pageData.length < pageSize) break
            page++
            
            if (page > 5) { // Limite sécurité
                console.log('   ... arrêt après 5 pages')
                break
            }
        }
        
        console.log(`\n📊 RÉSUMÉ VISIBILITÉ:`)
        console.log(`   Admin count: ${adminCount}`)
        console.log(`   Admin select: ${adminSelect.length}`)
        console.log(`   Anon access: ${anonError ? 'BLOQUÉ' : 'OK'}`)
        console.log(`   Pagination total: ${totalPaginated}`)
        console.log(`   Rows manquantes: ${adminCount - adminSelect.length}`)
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

testRLSVisibility()