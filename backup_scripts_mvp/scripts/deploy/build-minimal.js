#!/usr/bin/env node
/**
 * BUILD MINIMAL - USUALODDS 2025
 * ==============================
 * Crée une version déployable en commentant les composants problématiques
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 BUILD MINIMAL POUR DÉPLOIEMENT');
console.log('=================================');

// Fichiers à modifier temporairement
const problematicFiles = [
  'src/components/predictions/LivePredictionsStats.tsx',
  'src/components/predictions/MatchPredictionCard.tsx',
  'src/components/admin/DatabaseMonitor.tsx',
  'src/components/dashboard/PredictionsTable.tsx'
];

// Sauvegarde et commentage
problematicFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`📝 Traitement ${filePath}...`);
    
    // Backup
    const backupPath = filePath + '.backup';
    fs.copyFileSync(filePath, backupPath);
    
    // Lecture contenu
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Création version minimaliste
    const minimalContent = `// TEMPORARILY DISABLED FOR DEPLOYMENT
export default function DisabledComponent() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Component Temporarily Disabled</h3>
      <p className="text-gray-600">This component is being rebuilt for production deployment.</p>
    </div>
  );
}`;
    
    // Écriture version minimale
    fs.writeFileSync(filePath, minimalContent);
    console.log(`   ✅ ${filePath} simplifié`);
  } else {
    console.log(`   ⚠️ ${filePath} introuvable`);
  }
});

console.log('\n✅ VERSION MINIMALE CRÉÉE');
console.log('💡 Pour restaurer: node scripts/deploy/restore-components.js');
console.log('🚀 Prêt pour: npm run build && npx vercel');