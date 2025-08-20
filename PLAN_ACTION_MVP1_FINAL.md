# PLAN D'ACTION MVP.1 - USUALODDS CORRECTIONS CRITIQUES

## 🎯 OBJECTIF FINAL
**Passer de 45.8% à 55-60% accuracy** avec corrections data leakage et architecture

---

## 📋 RÉSUMÉ EXÉCUTIF DES PROBLÈMES

### ✅ DIAGNOSTICS TERMINÉS
1. **Data leakage identifié**: 1.6% (47.4% vs 45.8%) - **MINEUR**
2. **Architecture chaos**: Scripts Python + TypeScript mélangés - **MAJEUR**
3. **Features manquantes**: 18 au lieu de 25+ attendues - **CRITIQUE**
4. **Données corrompues**: Player names NULL, 18% possession manquante - **BLOQUANT**
5. **API manquante**: `/api/collect` créée - **RÉSOLU**

### 🚨 CAUSE RACINE IDENTIFIÉE
**Le problème principal N'EST PAS le data leakage (1.6% seulement) mais la QUALITÉ DES DONNÉES ET FEATURES MANQUANTES.**

---

## 🗂️ ACTIONS PRIORITAIRES (8-10 JOURS)

### PHASE 1: INFRASTRUCTURE & NETTOYAGE (2-3 jours)

#### ✅ TERMINÉ:
- [x] Diagnostic complet système
- [x] Identification sources data leakage
- [x] Création `/api/collect` endpoint
- [x] Architecture features analysée

#### 🚀 À FAIRE IMMÉDIAT:

##### Jour 1: Test et validation API
```bash
# Tester l'API collect créée
curl -X POST http://localhost:3000/api/collect -H "Content-Type: application/json" -d '{"action": "status"}'

# Initialiser système propre
curl -X POST http://localhost:3000/api/collect -H "Content-Type: application/json" -d '{"action": "initialize"}'
```

##### Jour 2: Suppression scripts obsolètes
```bash
# Déplacer scripts obsolètes
mkdir scripts/archive_obsolete_2025
mv scripts/ingestion/ligue1-mvp-collector.js scripts/archive_obsolete_2025/
mv scripts/ingestion/simple-ligue1-collector.js scripts/archive_obsolete_2025/
# Garder seulement système TypeScript
```

##### Jour 3: Réingestion complète données
```bash
# Via API TypeScript uniquement
curl -X POST http://localhost:3000/api/collect -d '{"action": "historical", "seasons": ["2020","2021","2022","2023","2024"]}'
```

### PHASE 2: FEATURES ENGINEERING CRITIQUE (4-5 jours)

#### Features manquantes à implémenter:

##### 1. **Goals & Attack Features** (Jour 4)
```typescript
// Dans team-features-builder.ts
- goals_per_game_recent: Moyenne mobile 10 derniers matchs
- goals_against_per_game_recent: Moyenne mobile défensive
- goal_difference_recent: Balance offensive/défensive
- attack_strength: Relative au championnat
- defense_strength: Relative au championnat
```

##### 2. **Form & Momentum Features** (Jour 5)
```typescript
- form_weighted_5: Form avec decay temporel
- form_weighted_10: Form étendue
- momentum_index: Progression sur 5 matchs
- home_form_specific: Performance domicile uniquement
- away_form_specific: Performance extérieur uniquement
```

##### 3. **Head-to-Head & Context Features** (Jour 6)
```typescript
- h2h_balance_5: 5 derniers face-à-face
- h2h_goals_avg: Moyenne buts confrontations
- venue_specific_performance: Stade par stade
- seasonal_trend: Progression dans saison
```

##### 4. **Advanced Analytics Features** (Jour 7)
```typescript
- possession_style_index: Style calculé depuis JSON stats
- pressing_intensity: Depuis événements match
- set_pieces_threat: Corners/penalties efficacité
- big_chances_conversion: Finishing quality
```

### PHASE 3: ML OPTIMISATION & VALIDATION (2-3 jours)

##### Jour 8: Modèles optimisés
```python
# Nouveau ml_optimized_system.py
- Features: 25+ au lieu de 18
- Cross-validation temporelle stricte
- Hyperparameter tuning ciblé football
- Ensemble models calibrés
```

##### Jour 9: Validation anti-leakage
```python
# Tests validation temporelle
- Walk-forward validation par saison
- Feature importance analysis
- Backtesting 2020-2024 complet
```

##### Jour 10: Tests et déploiement
- Tests accuracy cible 55-60%
- Validation stabilité cross-saisons
- Documentation MVP.1 final

---

## 📊 ESTIMATIONS PERFORMANCE POST-CORRECTIONS

### 🎯 Contribution estimée par correction:

1. **Données complètes** (Player names, possession): **+3-5 points**
2. **Features manquantes** (Goals, Form, H2H): **+5-8 points**
3. **Architecture unifiée** (Cohérence données): **+1-3 points**
4. **ML optimisation** (Hyperparams, ensemble): **+2-4 points**

### 📈 Scénarios réalistes:

- **Conservative (52-55%)**: Corrections de base réussies
- **Réaliste (55-60%)**: Corrections + features principales
- **Optimiste (60-65%)**: Tout parfait + optimisations ML

---

## ⚠️ RISQUES ET MITIGATION

### Risques identifiés:
1. **API limits**: Rate limiting API-Football pendant réingestion
2. **Data corruption**: Réingestion peut corrompre données existantes
3. **Temporal leakage**: Nouvelles features mal calculées
4. **Performance regression**: Nouveaux bugs dans features

### Mitigation:
1. **Backup complet** avant modifications
2. **Tests unitaires** chaque nouvelle feature
3. **Validation pipeline** temporelle automatique
4. **Rollback plan** si accuracy diminue

---

## 🚀 ACTIONS IMMÉDIATES (AUJOURD'HUI)

### Priorité 1 (1h):
```bash
# Tester API collect créée
cd /USUALODDS/usualodds
npm run dev
# Tester: curl -X POST http://localhost:3000/api/collect -d '{"action": "status"}'
```

### Priorité 2 (2h):
```bash
# Backup données actuelles
# Exporter team_features, player_features, matches actuels
```

### Priorité 3 (1h):
```bash
# Initialiser ingestion propre
# POST /api/collect {"action": "initialize"}
```

### Validation (0.5h):
```bash
# Vérifier data quality post-initialisation
python scripts/audit/simple_data_audit.py
```

---

## 📅 PLANNING DÉTAILLÉ

### Semaine 1 (Jours 1-3): Infrastructure
- **Lundi**: Test API + backup données
- **Mardi**: Nettoyage architecture + suppression obsolète
- **Mercredi**: Réingestion complète TypeScript

### Semaine 2 (Jours 4-7): Features Engineering  
- **Jeudi**: Goals & Attack features
- **Vendredi**: Form & Momentum features
- **Lundi**: H2H & Context features
- **Mardi**: Advanced Analytics features

### Semaine 3 (Jours 8-10): ML & Validation
- **Mercredi**: ML optimisation
- **Jeudi**: Validation anti-leakage
- **Vendredi**: Tests finaux + déploiement

---

## 🎯 CRITÈRES DE SUCCÈS MVP.1

### Techniques:
- **Accuracy**: ≥55% (cible: 57-60%)
- **Stabilité**: Écart-type <5% entre saisons
- **Features**: ≥25 features temporellement valides
- **Data quality**: ≥95% complétude

### Fonctionnels:
- **Architecture unifiée**: TypeScript uniquement
- **API collect**: Opérationnelle et documentée
- **Pipeline automatique**: Ingestion + features + ML
- **Monitoring**: Validation temporelle active

### Livrables:
- **Code**: Système ML optimisé fonctionnel
- **Documentation**: HOWTO MVP.1 complet
- **Tests**: Suite validation anti-leakage
- **Rapport**: Performance détaillée par saison

---

*Plan d'action établi le 2025-08-20 suite analyse critique complète du système UsualOdds*