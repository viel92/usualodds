#!/usr/bin/env node
/**
 * Script temporaire pour enlever les badges qui causent des erreurs de build
 * Utilisé avant déploiement Vercel pour héberger rapidement
 */

const fs = require('fs');
const path = require('path');

const componentsToFix = [
  'src/components/predictions/LivePredictionsStats.tsx',
  'src/components/predictions/MatchPredictionCard.tsx'
];

function removeImportBadge(filePath) {
  const fullPath = path.join(__dirname, '../../', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Enlever l'import Badge
  content = content.replace(/import.*Badge.*from.*['"].*badge['"];?\n?/g, '');
  content = content.replace(/,\s*Badge\s*/g, '');
  content = content.replace(/Badge\s*,\s*/g, '');
  content = content.replace(/{\s*Badge\s*}/g, '{}');
  
  // Remplacer les utilisations de Badge par des spans avec classes équivalentes
  content = content.replace(/<Badge([^>]*)>/g, '<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"$1>');
  content = content.replace(/<\/Badge>/g, '</span>');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Badge retiré de: ${filePath}`);
}

console.log('🔧 Suppression temporaire des badges pour déploiement...\n');

componentsToFix.forEach(removeImportBadge);

console.log('\n✅ Badges temporairement supprimés!');
console.log('⚡ Prêt pour déploiement Vercel rapide');