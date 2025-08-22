# 📋 FICHIERS SYSTÈME PRÉDICTIONS - ANALYSE COMPLÈTE

Voici **TOUS** les fichiers utilisés dans le système de prédictions, classés par catégorie :

## 🔥 1. FICHIERS API PRINCIPAUX (Backend)

### **API Routes Next.js** ⭐️ *CRITIQUES*
- **`src/app/api/predictions/route.ts`** - Route principale, génère et retourne prédictions
- **`src/app/api/predictions/live/route.ts`** - Prédictions temps réel avec cache  
- **`src/app/api/predictions/upcoming/route.ts`** - Prédictions matches à venir

## 🧠 2. SCRIPTS PYTHON ML (Génération Prédictions)

### **Scripts ML Principaux** ⭐️ *CRITIQUES*
- **`ultra_sophisticated_ml_system.py`** - Système ML principal (modèles, features, pipeline)
- **`generate_sophisticated_predictions.py`** - Script de génération des prédictions
- **`retrain_ultra_sophisticated.py`** - Réentraînement des modèles
- **`test_odds_integration.py`** - Test intégration des cotes

## 🎯 3. HOOKS ET UTILITAIRES REACT

### **Hooks Custom** ⭐️ *CRITIQUES*  
- **`src/lib/hooks/use-predictions.ts`** - Hooks React Query pour charger/rafraîchir prédictions

### **Utilitaires**
- **`src/lib/supabase.ts`** - Configuration client Supabase
- **`src/lib/utils.ts`** - Utilitaires généraux

## 🎨 4. COMPOSANTS UI (Frontend)

### **Pages Principales** ⭐️ *CRITIQUES*
- **`src/app/dashboard/page.tsx`** - Dashboard principal avec stats
- **`src/app/predictions/page.tsx`** - Page liste complète des prédictions  
- **`src/app/page.tsx`** - Page d'accueil avec aperçu

### **Composants UI**
- **`src/components/ui/button-premium.tsx`** - Boutons interface
- **`src/components/ui/badge-premium.tsx`** - Badges confiance/statut
- **`src/components/ui/card-premium.tsx`** - Cards prédictions
- **`src/components/ui/loading-states.tsx`** - États de chargement
- **`src/components/Navigation.tsx`** - Navigation principale

### **Composants Dashboard**
- **`src/components/dashboard/lazy-stats.tsx`** - Stats lazy-loaded
- **`src/components/dashboard/stats-grid.tsx`** - Grille statistiques

### **Composants Prédictions** 
- **`src/components/predictions/MatchPredictionCard.tsx`** - Card individuelle match
- **`src/components/predictions/LivePredictionsStats.tsx`** - Stats temps réel

### **Providers**
- **`src/components/providers/query-provider.tsx`** - Provider React Query
- **`src/components/providers/theme-provider.tsx`** - Provider thèmes

## ⚙️ 5. COLLECTEURS DE DONNÉES

### **Collecteurs TypeScript** (Dépréciés mais présents)
- **`src/lib/collectors/base-collector.ts`** - Collecteur de base
- **`src/lib/collectors/fixtures-collector.ts`** - Collecte fixtures 
- **`src/lib/collectors/odds-collector.ts`** - Collecte cotes
- **`src/lib/collectors/teams-collector.ts`** - Données équipes
- **`src/lib/collectors/players-collector.ts`** - Données joueurs
- **`src/lib/collectors/weather-collector.ts`** - Données météo
- **`src/lib/collectors/injury-tracker-collector.ts`** - Blessures
- **`src/lib/collectors/lineups-collector.ts`** - Compositions
- **`src/lib/collectors/context-collector.ts`** - Contexte matches
- **`src/lib/collectors/historical-collector.ts`** - Données historiques
- **`src/lib/collectors/leagues-collector.ts`** - Données ligues
- **`src/lib/collectors/index.ts`** - Index collecteurs

## 🔧 6. SYSTÈME ML ET FEATURES

### **Feature Engineering** 
- **`src/lib/features/adaptive-features.ts`** - Features adaptatives
- **`src/lib/features/advanced-analytics-calculator.ts`** - Analytics avancées
- **`src/lib/features/base-feature-builder.ts`** - Constructeur features de base
- **`src/lib/features/enhanced-orchestrator.ts`** - Orchestrateur amélioré
- **`src/lib/features/missing-features-calculator.ts`** - Calcul features manquantes
- **`src/lib/features/player-features-builder.ts`** - Features joueurs
- **`src/lib/features/team-features-builder.ts`** - Features équipes
- **`src/lib/features/team-features-builder-enhanced.ts`** - Features équipes avancées
- **`src/lib/features/temporal-features-validator-strict.ts`** - Validation temporelle
- **`src/lib/features/temporal-orchestrator.ts`** - Orchestrateur temporel
- **`src/lib/features/temporal-validator.ts`** - Validation temporelle
- **`src/lib/features/index.ts`** - Index features

### **Modèles ML**
- **`src/lib/models/adaptive-ensemble.ts`** - Ensemble adaptatif
- **`src/lib/models/contextual-models/big-game-model.ts`** - Modèle gros matchs
- **`src/lib/models/contextual-models/fatigue-model.ts`** - Modèle fatigue
- **`src/lib/models/contextual-models/form-streak-model.ts`** - Modèle séries
- **`src/lib/models/contextual-models/injury-impact-model.ts`** - Impact blessures
- **`src/lib/models/contextual-models/new-signing-model.ts`** - Nouveaux joueurs
- **`src/lib/models/contextual-models/weather-impact-model.ts`** - Impact météo
- **`src/lib/models/contextual-models/index.ts`** - Index modèles

### **ML Processing**
- **`src/lib/ml/post-match-analyzer.ts`** - Analyse post-match
- **`src/lib/simulation/learning-monte-carlo.ts`** - Simulation Monte Carlo
- **`src/lib/simulation/odds-calibration.ts`** - Calibration cotes
- **`src/lib/validation/temporal-validation.ts`** - Validation temporelle

## 📊 7. CONFIGURATION ET DONNÉES

### **Configuration**
- **`src/lib/api-football.ts`** - Configuration API Football
- **`src/lib/design-tokens.ts`** - Tokens design
- **`src/types/database.ts`** - Types base de données
- **`.env.local`** - Variables d'environnement (local)

### **Configuration Supabase**
- **`supabase/config.toml`** - Config Supabase
- **`supabase/migrations/`** - Migrations BDD (plusieurs fichiers)

---

## 🎯 **FICHIERS LES PLUS CRITIQUES À ANALYSER** ⭐️

### **Top 5 Priorité Maximum :**
1. **`src/app/api/predictions/route.ts`** - Cœur de l'API
2. **`ultra_sophisticated_ml_system.py`** - Cerveau ML 
3. **`src/lib/hooks/use-predictions.ts`** - Interface React
4. **`src/app/dashboard/page.tsx`** - Interface utilisateur  
5. **`generate_sophisticated_predictions.py`** - Génération prédictions

### **Top 5 Priorité Haute :**
6. **`src/app/predictions/page.tsx`** - Page prédictions
7. **`src/lib/supabase.ts`** - Connexion BDD
8. **`src/app/api/predictions/live/route.ts`** - API temps réel
9. **`retrain_ultra_sophisticated.py`** - Réentraînement
10. **`src/components/predictions/MatchPredictionCard.tsx`** - Affichage match

---

## 📈 **FLUX DE DONNÉES PRÉDICTIONS**

### **1. Génération des Prédictions :**
```
Python ML Scripts → Supabase → API Routes → React Hooks → UI Components
```

### **2. Fichiers par Ordre d'Exécution :**
1. `ultra_sophisticated_ml_system.py` - Traitement ML
2. `generate_sophisticated_predictions.py` - Génération
3. `src/app/api/predictions/route.ts` - API Next.js
4. `src/lib/hooks/use-predictions.ts` - Hooks React
5. `src/app/dashboard/page.tsx` - Affichage utilisateur

### **3. Types de Fichiers :**
- **🐍 Python** : Logique ML et génération prédictions
- **⚛️ React/Next.js** : Interface utilisateur et API
- **🗄️ Supabase** : Stockage et configuration BDD
- **🎨 UI Components** : Affichage et interactions

---

## 🔍 **RECOMMANDATIONS D'ANALYSE**

### **Ordre d'Analyse Suggéré :**
1. **Backend API** (`src/app/api/predictions/route.ts`) - Comprendre le flux de données
2. **ML System** (`ultra_sophisticated_ml_system.py`) - Logique métier ML
3. **React Hooks** (`src/lib/hooks/use-predictions.ts`) - Interface données
4. **UI Components** (`src/app/dashboard/page.tsx`) - Présentation utilisateur
5. **Configuration** (`src/lib/supabase.ts`, `.env.local`) - Connexions et paramètres

### **Questions Clés par Fichier :**
- **API Routes** : Comment les données sont-elles formatées et retournées ?
- **ML Scripts** : Quels algorithmes et features sont utilisés ?
- **React Hooks** : Comment le cache et les actualisations fonctionnent-ils ?
- **UI Components** : L'UX est-elle optimale pour les utilisateurs ?
- **Configuration** : Les paramètres sont-ils sécurisés et optimaux ?