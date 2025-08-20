# ANALYSE SCRIPTS - CATEGORISATION POUR RANGEMENT

## 📊 ÉTAT ACTUEL
- **53 fichiers** dans `/scripts/`  
- **40+ scripts JS/Python** à ranger
- **Chaos total** - aucune organisation

## 🗂️ CATÉGORISATION PAR FONCTION

### 📡 **INGESTION/COLLECTION** (→ `/scripts/ingestion/`)
- ✅ `archive_obsolete/ligue1-mvp-collector.js` - ARCHIVÉ
- ✅ `archive_obsolete/simple-ligue1-collector.js` - ARCHIVÉ  
- ✅ `archive_obsolete/run-ligue1-complete.js` - ARCHIVÉ

### 🧠 **MACHINE LEARNING** (→ `/scripts/ml/`)
- `advanced-ai-prediction-engine.js`
- `advanced-prediction-engine-v2.js` 
- `advanced_features_engineering.py`
- `ai-learning-engine.js`
- `backtesting-engine.js`
- `enhanced-prediction-pipeline.js`
- `hyperparameter_optimization.py`
- `ml-system-enterprise.js`
- `ml_predictor.py`
- `ml_predictor_simple.py`
- `ml_real_data.py`
- `predict-upcoming-matches.js`
- `predict-upcoming-simple.js`
- `quick_optimization.py`
- `real_data_integration.py`
- `simple-ai-prediction-engine.js`
- `supabase_real_connection.py`
- `supabase_real_data_ml.py`

### 📊 **AUDIT/DIAGNOSTIC** (→ `/scripts/audit/`)
- `analyze-data.js`
- `analyze-missing-features.js`
- `audit-predictions-v2.js`
- `audit-predictions.js` 
- `check-database-duplicates.js`
- `check-db-constraints.js`
- `check-features-status.js`
- `check-seasons-detail.js`
- `comprehensive-data-audit.js`
- `critical_data_audit.py`
- `database-audit.js`
- `database-quality-audit.js`
- `fix_player_names.py`
- `relationship-diagnostic.js`
- `simple_data_audit.py`
- `systemic-data-architecture-audit.js`
- `verify_matches_count.py`
- `verify-schema.js`

### ⚙️ **FEATURES/CALCULS** (→ `/scripts/features/`)
- `calculate-advanced-features.js`
- `calculate-historical-team-features.js`
- `create-2023-features.js`

### 🗃️ **DATABASE/MIGRATIONS** (→ `/scripts/database/`)
- `apply-migration.js`
- `create-ai-tables-direct.js`
- `create-ai-tables.js`

### 🧪 **TESTS** (→ `/scripts/tests/`)
- `test-advanced-ai.js`
- `test-expectation-fix.js`
- `test-overflow-fix.js`
- `test-simple-ai.js`
- `test_python.py`

### 🤖 **GPT/AI ANALYSIS** (→ `/scripts/analysis/`)
- `gpt-advanced-analyzer.js`

### 📄 **FICHIERS CONFIG/JSON** (→ `/scripts/data/`)
- `ligue1-progress.json`

## 🎯 STRUCTURE CIBLE PROPOSÉE
```
scripts/
├── ingestion/          # Collecte données (vide - système TS officiel)
├── ml/                 # Machine Learning & Prédictions  
├── audit/              # Diagnostic & Vérifications
├── features/           # Calculs features avancées
├── database/           # Migrations & Setup DB
├── tests/              # Scripts de test
├── analysis/           # Analyses GPT & rapports
├── data/               # Fichiers JSON/config
├── archive_obsolete/   # Scripts obsolètes (déjà fait)
└── utils/              # Utilitaires divers
```

## 🚨 DOUBLONS DÉTECTÉS (À NETTOYER)
- `ml_predictor.py` vs `ml_predictor_simple.py`
- `audit-predictions.js` vs `audit-predictions-v2.js`
- `advanced-ai-prediction-engine.js` vs `advanced-prediction-engine-v2.js`
- `database-audit.js` vs `database-quality-audit.js`

## 📋 PROCHAINES ÉTAPES
1. Créer structure dossiers
2. Déplacer scripts par catégorie
3. Identifier et supprimer vrais doublons
4. Créer index de référence
5. Commit final organisé