#!/usr/bin/env node
/**
 * PRE-DEPLOY CHECK - USUALODDS 2025
 * =================================
 * Vérifie que l'application est prête pour déploiement Vercel
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 PRE-DEPLOY CHECK - USUALODDS');
console.log('================================');

let errors = [];
let warnings = [];

// 1. Vérifier structure projet
console.log('\n1. 📁 Structure projet...');

const requiredFiles = [
  'package.json',
  'next.config.ts',
  'tsconfig.json',
  'tailwind.config.js',
  '.gitignore'
];

requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    errors.push(`❌ Fichier manquant: ${file}`);
  } else {
    console.log(`   ✅ ${file}`);
  }
});

// 2. Vérifier variables environnement
console.log('\n2. 🔐 Variables environnement...');

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'API_FOOTBALL_KEY'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    errors.push(`❌ Variable manquante: ${envVar}`);
  } else {
    console.log(`   ✅ ${envVar}`);
  }
});

// 3. Vérifier package.json
console.log('\n3. 📦 Package.json...');

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (!packageJson.scripts.build) {
    errors.push('❌ Script "build" manquant dans package.json');
  } else {
    console.log('   ✅ Script build présent');
  }
  
  if (!packageJson.scripts.start) {
    errors.push('❌ Script "start" manquant dans package.json');
  } else {
    console.log('   ✅ Script start présent');
  }
  
  if (!packageJson.dependencies.next) {
    errors.push('❌ Next.js non installé');
  } else {
    console.log(`   ✅ Next.js ${packageJson.dependencies.next}`);
  }
  
} catch (error) {
  errors.push('❌ Erreur lecture package.json');
}

// 4. Vérifier build local
console.log('\n4. 🔨 Test build local...');

try {
  console.log('   Tentative build...');
  execSync('npm run build', { stdio: 'pipe', timeout: 120000 });
  console.log('   ✅ Build réussi');
} catch (error) {
  errors.push('❌ Build échoué - vérifier les erreurs TypeScript/ESLint');
  console.log(`   Erreur: ${error.message.slice(0, 200)}...`);
}

// 5. Vérifier routes API
console.log('\n5. 🔌 Routes API...');

const apiDir = path.join('src', 'app', 'api');
if (fs.existsSync(apiDir)) {
  const apiRoutes = fs.readdirSync(apiDir, { recursive: true })
    .filter(file => file.endsWith('.ts') || file.endsWith('.js'));
  
  console.log(`   ✅ ${apiRoutes.length} routes API détectées`);
  apiRoutes.forEach(route => {
    console.log(`      - ${route}`);
  });
} else {
  warnings.push('⚠️ Pas de routes API détectées');
}

// 6. Vérifier taille bundle
console.log('\n6. 📊 Analyse bundle...');

if (fs.existsSync('.next')) {
  try {
    const stats = fs.statSync('.next');
    const sizeInMB = (getDirectorySize('.next') / 1024 / 1024).toFixed(2);
    console.log(`   ✅ Taille build: ${sizeInMB} MB`);
    
    if (sizeInMB > 50) {
      warnings.push(`⚠️ Bundle volumineux: ${sizeInMB}MB (>50MB peut ralentir le déploiement)`);
    }
  } catch (error) {
    console.log('   ⚠️ Impossible de calculer la taille');
  }
} else {
  console.log('   ⚠️ Pas de build détecté');
}

// Fonction utilitaire pour calculer taille dossier
function getDirectorySize(dirPath) {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        size += getDirectorySize(filePath);
      } else {
        size += stat.size;
      }
    });
  } catch (error) {
    // Ignore errors
  }
  return size;
}

// 7. Recommandations Vercel
console.log('\n7. 🌐 Recommandations Vercel...');

const vercelJson = 'vercel.json';
if (fs.existsSync(vercelJson)) {
  console.log('   ✅ Configuration Vercel détectée');
} else {
  console.log('   ⚠️ Pas de vercel.json (optionnel)');
}

// Résumé final
console.log('\n' + '='.repeat(50));
console.log('📋 RÉSUMÉ PRE-DEPLOY');
console.log('='.repeat(50));

if (errors.length === 0) {
  console.log('🎉 APPLICATION PRÊTE POUR DÉPLOIEMENT!');
  console.log('\nProchaines étapes:');
  console.log('1. npx vercel login');
  console.log('2. npx vercel');
  console.log('3. Configurer variables environnement sur Vercel');
  console.log('4. npx vercel --prod');
} else {
  console.log('❌ ERREURS À CORRIGER:');
  errors.forEach(error => console.log(error));
}

if (warnings.length > 0) {
  console.log('\n⚠️ AVERTISSEMENTS:');
  warnings.forEach(warning => console.log(warning));
}

console.log('\n📖 Guide complet: deploy-guide.md');

// Exit avec code erreur si problèmes critiques
process.exit(errors.length > 0 ? 1 : 0);