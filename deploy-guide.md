# 🚀 GUIDE DÉPLOIEMENT VERCEL - USUALODDS

## 📋 **PRE-REQUIS**
- [x] Compte Vercel gratuit 
- [x] Application Next.js fonctionnelle
- [x] Variables environnement dans .env

## 🔧 **ÉTAPES DÉPLOIEMENT**

### **1. Installation Vercel CLI**
```bash
# Installer globalement
npm install -g vercel

# Ou utiliser npx (recommandé)
npx vercel --version
```

### **2. Connexion à Vercel**
```bash
# Se connecter à ton compte
npx vercel login
# Sélectionne: Continue with GitHub/Email selon ton compte
```

### **3. Configuration Variables Environnement**

**IMPORTANT:** Tu dois ajouter ces variables dans Vercel Dashboard :

```bash
# Variables PUBLIQUES (commencent par NEXT_PUBLIC_)
NEXT_PUBLIC_SUPABASE_URL=https://agysfqhijfbnqzzooyeo.supabase.co
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Rx4coDVlRm3wgXonqkV7zo5Vbx9ZJgeKNFY0F3YyJJC1XQPywhgUXz9K25gJye6gzB4N4sR4omTD5vdgDsgwalK00cJGj9Im9
NEXT_PUBLIC_SENTRY_DSN=https://5164dbc6107f5aef3baca435ebde9ab1@o4509859167600640.ingest.de.sentry.io/4509859170877520
NEXT_PUBLIC_POSTHOG_KEY=phc_AuNpbT2KJQSI7nYzyqe3JTd1U0Bp7S9dZefLV66H8q
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com
NEXT_PUBLIC_APP_URL=https://ton-app.vercel.app

# Variables PRIVÉES (serveur only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneXNmcWhpamZibnF6em9veWVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyODM5MSwiZXhwIjoyMDcxMTA0MzkxfQ.8YIs0qTIIJqHIKjFajj2FFl1PAR3b5rDcBi_ilVa45g
API_FOOTBALL_KEY=128b43ff5f9f6c117f8e0348092d1f4e
API_FOOTBALL_HOST=v3.football.api-sports.io
OPENAI_API_KEY=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
UPSTASH_REDIS_REST_URL=https://native-griffon-7594.upstash.io
UPSTASH_REDIS_REST_TOKEN=AR2qAAImcDExY2VmZDJiNTRiNzI0YmM5YTkzOTZlODdkZjk4OWFhMXAxNzU5NA
STRIPE_SECRET_KEY=sk_test_51Rx4coDVlRm3wgXoE4ejq4gpMtnvlYXDQTQV6kox0wNubfg1wx0qKI25Nonrmr6r4XVJpoXhUXV7MDygLqUuyHGK00N89xoLma
STRIPE_WEBHOOK_SECRET=whsec_VQjdvYQztA0IvIuiKVZoBgszWtDGXjzD
DATABASE_URL=postgresql://postgres.agysfqhijfbnqzzooyeo:LpvrjDOJB7e2QqP8@aws-1-eu-west-3.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres:LpvrjDOJB7e2QqP8@db.agysfqhijfbnqzzooyeo.supabase.co:5432/postgres
```

### **4. Premier Déploiement**
```bash
# Dans le répertoire du projet
cd /c/USUALODDS/usualodds

# Déployer
npx vercel

# Questions qui vont apparaître:
# ? Set up and deploy "~/usualodds"? [Y/n] Y
# ? Which scope do you want to deploy to? [Use arrows] → Ton username
# ? Link to existing project? [y/N] N
# ? What's your project's name? usualodds
# ? In which directory is your code located? ./
```

### **5. Configuration Variables via Web**

**Aller sur:** https://vercel.com/dashboard

1. **Sélectionne ton projet "usualodds"**
2. **Onglet "Settings"**
3. **Section "Environment Variables"**
4. **Ajouter toutes les variables une par une**

**Astuce:** Copie-colle directement depuis ton .env local

### **6. Redéploiement avec Variables**
```bash
# Forcer nouveau build avec variables
npx vercel --prod
```

## 🔍 **VÉRIFICATIONS**

### **Build Local** (avant déploiement)
```bash
# Tester build production
npm run build
npm run start

# Doit fonctionner sans erreur
```

### **URLs Importantes**
```
Preview URL: https://usualodds-xxxx.vercel.app (déploiements de test)
Production URL: https://usualodds.vercel.app (version finale)
```

## ⚠️ **LIMITES PLAN GRATUIT VERCEL**

- **100 déploiements/mois**
- **100 GB bandwidth/mois** 
- **10 GB functions execution/mois**
- **Functions timeout: 10 secondes**
- **1 concurrent build**

**Pour ton MVP:** Ces limites sont largement suffisantes !

## 🔧 **COMMANDES UTILES**

```bash
# Voir status déploiement
npx vercel list

# Logs de production
npx vercel logs

# Supprimer projet
npx vercel remove usualodds

# Forcer nouveau déploiement
npx vercel --force

# Déploiement production
npx vercel --prod
```

## 🌐 **DOMAINE PERSONNALISÉ (Optionnel)**

Si tu veux **usualodds.com** :

1. **Acheter domaine** (Namecheap, GoDaddy, etc.)
2. **Vercel Dashboard → Project → Domains**  
3. **Add Domain → usualodds.com**
4. **Configurer DNS** selon instructions Vercel

## ✅ **CHECKLIST FINAL**

- [ ] Application build sans erreur localement
- [ ] Toutes les variables env configurées sur Vercel
- [ ] Première URL de preview fonctionne
- [ ] Déploiement production effectué
- [ ] Supabase accessible depuis production
- [ ] API routes fonctionnelles

---

## 🚨 **EN CAS DE PROBLÈME**

**Build Errors:** Vérifier les imports et exports
**API Errors:** Vérifier variables environnement  
**Database Errors:** Vérifier connexion Supabase
**404 Errors:** Vérifier structure routes Next.js

**Logs complets:** `npx vercel logs --follow`