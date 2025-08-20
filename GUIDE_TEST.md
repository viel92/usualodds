# 🧪 Guide de Test - Sistema UsualOdds

## 🎯 Objectif: Tester le système complet avec un minimum de requêtes API

### 📊 Statut Saisons (Journée 2 - 19 Août 2025)

**Saisons en cours:**
- **🇫🇷 Ligue 1** : J2 ✅ (saison 2024-25 active)  
- **🇬🇧 Premier League** : J2 ✅ (saison 2024-25 active)
- **🇪🇸 La Liga** : J2 ✅ (saison 2024-25 active)
- **🇮🇹 Serie A** : J1 ⚠️ (saison 2024-25 juste commencée)
- **🇩🇪 Bundesliga** : Pause ⚠️ (reprise fin août)

**Stratégie optimale:** Se concentrer sur **Ligue 1, Premier League, La Liga** qui ont déjà 1-2 matchs joués.

---

## 🚀 Phase 1: Setup et Vérification (0 requête API)

### 1. Démarrage du système
```bash
cd C:/USUALODDS/usualodds
npm run dev
```

### 2. Vérification DB
```bash
# Vérifier que les migrations ont été appliquées
supabase status
supabase db diff
```

### 3. Accès interfaces
- **Admin Panel:** http://localhost:3000/admin
- **Analytics:** http://localhost:3000/analytics  
- **Learning Dashboard:** http://localhost:3000/learning

---

## 📥 Phase 2: Ingestion Données Initiales (≤20 requêtes API)

### Stratégie API-Football Économique

**Plan Basic = 100 requêtes/jour**
- **Prioriser**: Ligue 1 (ID: 61), Premier League (ID: 39), La Liga (ID: 140)
- **Éviter**: Bundesliga (pas encore commencée), Serie A (seulement J1)

### 2.1 Collecte Ligues et Équipes (3 requêtes)
```bash
# Via Admin Panel → Section "Data Collection"
# OU via API directe:

# 1. Récupérer ligues (1 requête)
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"action": "collect_leagues", "season": 2024}'

# 2. Récupérer équipes Ligue 1 (1 requête)  
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"action": "collect_teams", "league_id": 61, "season": 2024}'

# 3. Récupérer équipes Premier League (1 requête)
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"action": "collect_teams", "league_id": 39, "season": 2024}'
```

### 2.2 Collecte Matchs Récents (6 requêtes max)
```bash
# Matchs Ligue 1 saison actuelle (1 requête)
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"action": "collect_fixtures", "league_id": 61, "season": 2024, "from": "2024-08-15", "to": "2024-08-25"}'

# Matchs Premier League J1-J2 (1 requête)  
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"action": "collect_fixtures", "league_id": 39, "season": 2024, "from": "2024-08-15", "to": "2024-08-25"}'

# Matchs La Liga J1-J2 (1 requête)
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"action": "collect_fixtures", "league_id": 140, "season": 2024, "from": "2024-08-15", "to": "2024-08-25"}'

# Optionnel: Quelques matchs historiques pour apprentissage (3 requêtes)
# Saison précédente pour patterns
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"action": "collect_fixtures", "league_id": 61, "season": 2023, "status": "FT", "last": 50}'
```

### 2.3 Collecte Odds (5-8 requêtes)
```bash
# Odds pour matchs récents Ligue 1 (2-3 requêtes selon nb matchs)
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"action": "collect_odds", "league_id": 61, "season": 2024}'

# Odds pour matchs récents Premier League (2-3 requêtes)  
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"action": "collect_odds", "league_id": 39, "season": 2024}'
```

**Total Phase 2: ~15 requêtes sur 100 quotidiennes**

---

## 🧠 Phase 3: Test Pipeline d'Apprentissage (0 requête API)

### 3.1 Test Analyse Post-Match
```bash
# Lancer analyse sur matchs terminés collectés
curl -X POST http://localhost:3000/api/learning \
  -H "Content-Type: application/json" \
  -d '{"action": "analyze_finished_matches"}'

# Vérifier insights générés  
curl -X POST http://localhost:3000/api/learning \
  -H "Content-Type: application/json" \
  -d '{"action": "get_learning_insights", "days": 30}'
```

### 3.2 Test Features Adaptatives
```bash
# Générer features pour un match récent
curl -X POST http://localhost:3000/api/features \
  -H "Content-Type: application/json" \
  -d '{"action": "build_adaptive_features", "match_id": "MATCH_ID_FROM_DB", "window": "T1"}'

# Valider contraintes temporelles
curl -X POST http://localhost:3000/api/features \
  -H "Content-Type: application/json" \
  -d '{"action": "validate_temporal", "match_id": "MATCH_ID_FROM_DB", "window": "T1"}'
```

### 3.3 Test Modèles Ensemble
```bash
# Test ensemble de modèles
curl -X POST http://localhost:3000/api/ensemble \
  -H "Content-Type: application/json" \
  -d '{"action": "predict_match", "match_id": "MATCH_ID_FROM_DB"}'

# Réentraînement nocturne
curl -X POST http://localhost:3000/api/ensemble \
  -H "Content-Type: application/json" \
  -d '{"action": "retrain_nightly"}'
```

---

## 🎲 Phase 4: Test Monte Carlo (0 requête API)

### 4.1 Simulation Monte Carlo
```bash
# Simulation pour un match
curl -X GET "http://localhost:3000/api/simulation?action=run_simulation&fixture_id=FIXTURE_ID"

# Calcul fair odds
curl -X GET "http://localhost:3000/api/simulation?action=calculate_fair_odds&fixture_id=FIXTURE_ID"

# Identification valeur
curl -X GET "http://localhost:3000/api/simulation?action=identify_value&fixture_id=FIXTURE_ID"
```

### 4.2 Analyse Efficacité Marchés
```bash
# Analyse globale marchés
curl -X GET "http://localhost:3000/api/simulation?action=market_efficiency"

# Métriques calibration
curl -X GET "http://localhost:3000/api/simulation?action=calibration_metrics"
```

### 4.3 Test via Admin Panel
1. Aller sur http://localhost:3000/admin
2. Section "Monte Carlo Simulation" 
3. Tester boutons:
   - "Run Simulation"
   - "Calculate Fair Odds"  
   - "Identify Value"
   - "Market Efficiency"

---

## 🔍 Phase 5: Validation Complète (0 requête API)

### 5.1 Test Pipeline Complet
```bash
# Pipeline enrichi pour fenêtre T-1h
curl -X POST http://localhost:3000/api/enhanced \
  -H "Content-Type: application/json" \
  -d '{"action": "execute_enhanced_pipeline", "window": "T1"}'

# Préparation décision montante
curl -X POST http://localhost:3000/api/enhanced \
  -H "Content-Type: application/json" \
  -d '{"action": "prepare_montante_decision", "match_id": "MATCH_ID_FROM_DB"}'
```

### 5.2 Backtesting
```bash
# Backtest sur données collectées
curl -X POST http://localhost:3000/api/backtest \
  -H "Content-Type: application/json" \
  -d '{"action": "run_backtest", "start_date": "2024-08-15", "end_date": "2024-08-20"}'
```

---

## 📈 Monitoring et Métriques

### Dashboards à Surveiller
1. **Admin Panel** (`/admin`) : Statut global, boutons de test
2. **Analytics** (`/analytics`) : Métriques de performance  
3. **Learning Dashboard** (`/learning`) : Insights apprentissage

### Métriques Clés à Vérifier
- ✅ **Build successful** : Compilation sans erreur
- ✅ **DB migrations** : Tables créées correctement
- ✅ **API responses** : Endpoints répondent sans erreur
- ✅ **Data ingestion** : Matchs, équipes, odds en DB
- ✅ **Learning pipeline** : Génération d'insights
- ✅ **Monte Carlo** : Simulations et fair odds
- ✅ **Features** : Génération features adaptatives

---

## 🎯 Optimisation API-Football Basic Plan

### Quotas Recommandés
- **Ingestion initiale** : 15-20 requêtes (1 fois)
- **Maintenance quotidienne** : 5-10 requêtes  
- **Buffer urgence** : 10-15 requêtes
- **Total quotidien** : 30-45/100 requêtes (confortable)

### Stratégie Long Terme
1. **Phase actuelle** : Focus 3 ligues principales
2. **Extension progressive** : Ajouter autres ligues selon besoins
3. **Cache intelligent** : Réutiliser données existantes
4. **Batch processing** : Grouper requêtes nocturnes

---

## ⚠️ Gestion Transitions Saisonnières

### Situation Actuelle (Août 2024)
- **Saisons 2023-24** : Terminées (données complètes pour apprentissage)
- **Saisons 2024-25** : Commencées (données temps réel)

### Stratégie Recommandée
1. **Historique** : Garder saison 2023-24 pour patterns
2. **Actuelle** : Focus saison 2024-25 pour prédictions
3. **Transition** : Ajustement progressif des modèles
4. **Archive** : Sauvegarde données anciennes si besoin

Cette stratégie optimise l'utilisation des 100 requêtes quotidiennes tout en testant l'ensemble du pipeline !