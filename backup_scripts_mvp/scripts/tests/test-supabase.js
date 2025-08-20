// Test connexion Supabase simple
const { createClient } = require('@supabase/supabase-js');

// Variables d'environnement directes
const SUPABASE_URL = 'https://umjrolxwjdbviuhbvwua.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtanJvbHh3amRidml1aGJ2d3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0Mjc3MDMsImV4cCI6MjA3MTAwMzcwM30.pkj6plu7j4jC4vN2KGuCkD_MuVFfcszCVOJPvXtcCg8';

async function testSupabaseConnection() {
    console.log('🔍 Test connexion Supabase...');
    console.log('URL:', SUPABASE_URL);
    console.log('Key:', SUPABASE_KEY.substring(0, 30) + '...');
    
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        // Test simple: récupérer le schéma public
        const { data, error } = await supabase
            .from('leagues')
            .select('count(*)')
            .limit(1);

        if (error) {
            console.error('❌ Erreur requête:', error.message);
            console.error('Détails:', error);
        } else {
            console.log('✅ Connexion réussie!');
            console.log('Test data:', data);
        }
    } catch (err) {
        console.error('❌ Erreur connexion:', err.message);
        console.error('Stack:', err.stack);
    }
}

testSupabaseConnection();