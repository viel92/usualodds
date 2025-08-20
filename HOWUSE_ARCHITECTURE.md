# 📋 **ARCHITECTURE USUALODDS - GUIDE COMPLET**

## 🎯 **VISION GLOBALE : SaaS de Prédictions Football**

**Objectif :** Prédire les résultats des matchs de football avec une précision supérieure aux bookmakers via IA + ML + données temps réel.

---

## 🏗️ **ARCHITECTURE SYSTÈME ACTUEL**

### **1. 📊 COUCHE DONNÉES (Foundation)**
```
API Football → Collectors TypeScript → Supabase PostgreSQL
```

**Rôle :** Ingestion massive données football historiques + temps réel
- **Sources :** API-Football (matches, équipes, joueurs, cotes)
- **Storage :** Supabase (11 tables relationnelles)
- **Timeline :** Historique 2020-2024 + données quotidiennes

### **2. 🤖 COUCHE IA/ML (Brain)**
```
Données Supabase → Features Engineering → Modèles ML → Prédictions
```

**Rôle :** Transformation données brutes en prédictions intelligentes
- **Features :** ELO, form, possession, contexte, météo
- **Modèles :** Ensemble Learning (XGBoost + RandomForest + Neural)
- **Output :** Probabilités 1X2, O/U, BTTS + confiance

### **3. 🌐 COUCHE WEB (Interface)**
```
Next.js Frontend ← API Routes ← Dashboard Temps Réel
```

**Rôle :** Interface utilisateur + API pour externes
- **Dashboard :** Prédictions live + historique performances  
- **API :** Endpoints REST pour intégrations tierces
- **Temps réel :** WebSocket updates + notifications

---

## 🔄 **FLOW COMPLET : DE LA DONNÉE À LA PRÉDICTION**

### **Phase 1 : Ingestion Données (Daily 6h00)**
```
1. API Football → Nouveau matches détectés
2. Collectors → Enrichissement (météo, lineups, blessures)
3. Supabase → Sauvegarde données enrichies
4. Features → Calcul ELO, form, patterns
```

### **Phase 2 : Génération Prédictions (T-24h → T-1h)**
```
1. T-24h : Première analyse (données de base)
2. T-6h : Enrichissement (lineups probables, contexte)
3. T-1h : Prédiction finale (IA + ML + GPT)
4. T-30min : Publication (verrouillage modifications)
```

### **Phase 3 : Interface Utilisateur**
```
1. Dashboard → Affichage prédictions temps réel
2. API → Accès programmatique pour clients
3. Notifications → Push alerts haute confiance
4. Analytics → Performance historique + ROI
```

### **Phase 4 : Apprentissage (Post-Match)**
```
1. Résultats réels → Comparaison vs prédictions
2. Analyse erreurs → Classification types erreurs
3. Modèles → Réentraînement nocturne adaptatif
4. Amélioration → Optimisation continue algorithmes
```

---

## 🗂️ **STRUCTURE FICHIERS ACTUELLE**

### **📁 Core System (Production)**
```
/src/
├── lib/
│   ├── collectors/          # Ingestion données
│   │   ├── base-collector.ts
│   │   ├── fixtures-collector.ts
│   │   └── CollectionOrchestrator
│   ├── features/            # Features engineering  
│   └── models/              # Modèles ML
├── app/
│   ├── api/collect/         # API ingestion
│   ├── dashboard/           # Interface web
│   └── api/predict/         # API prédictions
```

### **📁 Scripts Utilitaires**
```
/scripts/
├── audit/                   # Vérifications qualité données
├── features/                # Calculs features avancées
├── ml/                      # Modèles ML + backtesting
└── ingestion/              # Orchestrateur master
```

---

## ⚡ **POURQUOI Next.js + API Architecture ?**

### **✅ Avantages SaaS**
1. **Dashboard Temps Réel** → Interface utilisateur moderne
2. **API REST** → Vente données à partenaires/bookmakers
3. **Monitoring** → Surveillance système 24/7
4. **Scalabilité** → Gestion trafic utilisateurs
5. **Authentification** → Système abonnements payants

### **❌ Complexité Actuelle**
- Scripts simples collecte → API web (overkill phase développement)
- Mais **nécessaire** pour SaaS commercial final

---

## 🎯 **OÙ VOUS EN ÊTES MAINTENANT**

### **✅ Construit (90%)**
- ✅ Infrastructure Supabase + API Football
- ✅ Collectors TypeScript fonctionnels  
- ✅ Modèles ML opérationnels (47% accuracy)
- ✅ Interface Next.js basique

### **🚨 Problème Actuel**
- ⚠️ Données 2020-2024 incomplètes (1000/~2000 matches)
- ❌ Features avancées partielles (ELO, form manquants)
- ❌ Pipeline bout-en-bout pas testé

### **📋 Phase Actuelle**
**"CONSOLIDATION DONNÉES 2020-2024"** avant prédictions 2025

---

## 🚀 **ROADMAP LOGIQUE POUR FINIR**

### **🔧 Semaine 1-2 : Consolidation Données**
1. **Démarrer Next.js** (pour utiliser collectors via API)
2. **Réingérer 2020-2024** complet via `/api/collect`
3. **Calculer features** avancées (ELO, form, possession)
4. **Valider qualité** données pour ML

### **🤖 Semaine 3-4 : ML Production**
1. **Entraîner modèles** sur vraies données complètes
2. **Atteindre 60%+ accuracy** (vs 47% actuel)
3. **Pipeline prédictions** T-24h → T-1h automatisé
4. **Backtesting** validation historique

### **🌐 Semaine 5-6 : SaaS Finalisation**
1. **Dashboard temps réel** prédictions live
2. **API commerciale** pour externes
3. **Système abonnements** + monétisation
4. **Lancement commercial** saison 2025

---

## 💡 **RÉSUMÉ SIMPLE**

**Votre SaaS = 3 couches :**
1. **Données** → API Football → Supabase (historique + temps réel)
2. **IA** → ML models → Prédictions intelligentes  
3. **Interface** → Next.js → Dashboard + API commerciale

**Next.js est nécessaire** pour le dashboard temps réel et l'API commerciale.

**Position actuelle :** Architecture complète mais données incomplètes.
**Prochaine étape :** Consolider données 2020-2024 via système existant.

---

## 🔧 **COMMANDES UTILES QUOTIDIENNES**

### **Démarrage Système**
```bash
# Lancer le serveur de développement
npm run dev

# Tester la connexion aux APIs
node scripts/tests/test-official-system.js
```

### **Ingestion Données**
```bash
# Via API (serveur Next.js requis)
node scripts/ingestion/clean-master-ingestion.js --action=initialize
node scripts/ingestion/clean-master-ingestion.js --action=historical --seasons=2020,2021,2022,2023,2024

# Via scripts directs (si disponibles)
node scripts/features/calculate-advanced-features.js
```

### **Audit & Monitoring**
```bash
# Audit qualité données
python scripts/audit/critical_data_audit.py
node scripts/audit/comprehensive-data-audit.js

# Tests ML
python scripts/ml/ml_predictor_simple.py
```

### **Développement**
```bash
# Tests unitaires
npm test

# Build production
npm run build

# Déploiement
npm run deploy
```

---

*Dernière mise à jour : 20 Août 2025 - Architecture UsualOdds v2.0*