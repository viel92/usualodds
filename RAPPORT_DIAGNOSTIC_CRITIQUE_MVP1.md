# RAPPORT DIAGNOSTIC CRITIQUE - USUALODDS MVP.1

## 🚨 EXECUTIVE SUMMARY

**Performance actuelle**: 45.8% accuracy (INSUFFISANT)
**Objectif MVP.1**: 55-60% accuracy  
**Écart à combler**: ~10-15 points de pourcentage
**Data leakage identifié**: 1.6% (47.4% vs 45.8%)

---

## 📊 ANALYSE DÉTAILLÉE DES PROBLÈMES

### 1. 🔍 DATA LEAKAGE IDENTIFIÉ (1.6%)

**Source**: Comparaison ml_real_data.py (47.4%) vs backtest-clean-methodology.py (45.8%)

#### Différences critiques détectées:

**SYSTÈME BIAISÉ (ml_real_data.py - 47.4%)**:
- Utilise données **SIMULÉES** avec correlations artificielles
- 25 features générées avec logique biaisée:
  - `home_goals_per_game` corrélé à ELO
  - `home_points` calculé depuis ELO  
  - `home_rank` inversement corrélé à ELO
  - Features d'attaque/défense calculées DEPUIS les goals/game
- **PROBLÈME**: Circuliarité dans generation des features

**SYSTÈME CLEAN (backtest-clean-methodology.py - 45.8%)**:
- Utilise vraies données Supabase (1000 matches)
- Seulement **18 features réelles** disponibles
- Données incomplètes:
  - `possession_avg`: 18% manquants
  - `elo_rating`: 1% manquants
- **AVANTAGE**: Pas de data leakage temporel

#### Conclusion Data Leakage:
**Le data leakage est MINEUR (1.6%)** mais révèle un problème plus grave: **les données réelles sont insuffisantes**.

---

### 2. 🏗️ PROBLÈMES D'ARCHITECTURE CRITIQUE

#### Architecture mixte chaotique:
- **Scripts Python**: `/scripts/ml/` (40+ scripts)
- **Système TypeScript**: `/src/lib/collectors/` (PROPRE)
- **API manquante**: `/api/collect` (404 dans les tests)

#### Collectors redondants:
```
❌ OBSOLÈTE (JS):
- /scripts/ingestion/ligue1-mvp-collector.js
- /scripts/ingestion/simple-ligue1-collector.js
- /scripts/run-ligue1-complete.js

✅ OFFICIEL (TS):
- /src/lib/collectors/index.ts (CollectionOrchestrator)
- /src/lib/collectors/fixtures-collector.ts
- /src/lib/collectors/teams-collector.ts
- /src/lib/collectors/players-collector.ts
```

#### Conséquences:
1. **Données corrompues**: Player names = NULL (audit confirmé)
2. **Features manquantes**: Possession 18% vides
3. **Maintenance chaos**: 53 scripts dans `/scripts/`

---

### 3. 📈 FEATURES ENGINEERING DÉFAILLANT

#### Disponibles vs Attendues:
- **Système clean**: 18 features
- **Système optimal**: 25+ features attendues
- **Taux de complétude**: ~72%

#### Features manquantes critiques:
1. **Goals per game actuels** (calculés depuis matches réels)
2. **Goal difference** (offensive/defensive balance)
3. **Recent form** (weight derniers 5/10 matches)
4. **Head-to-head history** (confrontations directes)
5. **Venue-specific performance** (domicile/extérieur par stade)
6. **Seasonal momentum** (progression dans saison)
7. **Lineup strength** (qualité composition probable)

#### Impact sur performance:
- **Estimation**: -5 à -10 points d'accuracy avec features manquantes
- **Variabilité saisonnière**: 35.3% (2021) à 54.5% (2020)

---

### 4. 💾 QUALITÉ DES DONNÉES

#### Audit base de données (confirmé):
- **Player_features**: Noms = NULL (ingestion défaillante)
- **Team_features**: 18% possession manquante
- **Matches**: 1000+ matches OK, mais features incomplètes
- **Saisons**: Distribution déséquilibrée

#### Problèmes identifiés:
1. **Ingestion players**: Scripts obsolètes utilisés
2. **Calcul features**: Pas de recalcul automatique
3. **API manquante**: Pas d'endpoint `/api/collect`

---

## 🎯 PLAN CORRECTIF MVP.1

### PHASE 1: NETTOYAGE ARCHITECTURE (1-2 jours)
1. **Créer `/api/collect` endpoint**
2. **Supprimer scripts obsolètes** (`/scripts/ingestion/`)
3. **Unifier sur système TypeScript**

### PHASE 2: INGESTION COMPLÈTE (2-3 jours)
1. **Réingérer players** avec noms corrects
2. **Recalculer team_features** (ELO, Form, Possession)
3. **Valider data quality** (>95% complétude)

### PHASE 3: FEATURES ENGINEERING (3-4 jours)
1. **Implémenter 7 features manquantes**
2. **Features temporellement safe**:
   - Goals/game (moyenne mobile 10 matches)
   - Form weighted (derniers matches avec decay)
   - Venue-specific ELO
   - H2H balance (5 dernières confrontations)
3. **Validation anti-leakage temporel**

### PHASE 4: ML OPTIMISATION (2-3 jours)
1. **Hyperparameter tuning** ciblé
2. **Ensemble models** optimisés
3. **Cross-validation temporelle**

---

## 📅 TIMELINE RÉALISTE

### Sprint 1 (8-10 jours):
- **Jour 1-2**: Architecture cleanup + API création
- **Jour 3-5**: Ingestion complète données
- **Jour 6-9**: Features engineering avancé
- **Jour 10**: Testing et validation

### Livrables Sprint 1:
- **Accuracy cible**: 55-58%
- **Architecture unifiée**: TypeScript uniquement
- **Data quality**: >95% complétude
- **Features count**: 25+ features valides

### Sprint 2 (Optionnel - si <55%):
- **Advanced features**: Weather, player fitness, etc.
- **Model ensemble** sophistiqué
- **Hyperparameter optimization** poussé

---

## 🎯 ESTIMATION PERFORMANCE POST-CORRECTIONS

### Optimiste (60-65%):
Si toutes corrections implémentées parfaitement

### Réaliste (55-60%):
Corrections majeures + quelques optimisations

### Conservative (50-55%):
Corrections de base uniquement

### Facteurs de risque:
- **Qualité données API Football**: Variable saison à saison
- **Stabilité features engineering**: Nouveaux bugs possibles
- **Overfitting**: Risk avec plus de features

---

## 🚀 ACTIONS IMMÉDIATES PRIORITÉ 1

1. **CRÉER** `/api/collect` endpoint (1 jour)
2. **TESTER** ingestion complète via TypeScript (0.5 jour)
3. **AUDITER** data quality post-ingestion (0.5 jour)
4. **CALCULER** features manquantes critiques (1 jour)
5. **VALIDER** performance avec nouvelles features (0.5 jour)

**Total estimation première itération**: 3-4 jours pour +5-8 points accuracy.

---

## ⚠️ RISQUES ET MITIGATION

### Risques identifiés:
1. **API limits**: Rate limiting API-Football
2. **Data corruption**: Réingestion peut casser l'existant
3. **Temporal leakage**: Nouvelles features mal implémentées
4. **Infrastructure**: Supabase limits

### Mitigation:
1. **Backup database** avant modifications
2. **Tests unitaires** pour chaque feature
3. **Validation pipeline** temporelle
4. **Rollback plan** si regression

---

*Rapport généré le 2025-08-20 par analyse approfondie du système UsualOdds*