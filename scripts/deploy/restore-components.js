#!/usr/bin/env node
/**
 * RESTORE COMPONENTS - USUALODDS 2025
 * ===================================
 * Restaure les composants depuis les backups
 */

const fs = require('fs');
const glob = require('glob');

console.log('🔄 RESTORATION DES COMPOSANTS');
console.log('==============================');

// Trouve tous les fichiers backup
const backupFiles = glob.sync('**/*.backup', { ignore: 'node_modules/**' });

backupFiles.forEach(backupPath => {
  const originalPath = backupPath.replace('.backup', '');
  
  if (fs.existsSync(backupPath)) {
    // Restaurer depuis backup
    fs.copyFileSync(backupPath, originalPath);
    
    // Supprimer backup
    fs.unlinkSync(backupPath);
    
    console.log(`✅ Restauré: ${originalPath}`);
  }
});

console.log(`\n✅ ${backupFiles.length} COMPOSANTS RESTAURÉS`);
console.log('💡 Développement local restauré');