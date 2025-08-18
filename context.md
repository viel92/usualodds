# Dossier Technique — Usual Odds V.0 — Prédiction de matchs

**Objectif (phase interne, 1 saison complète)**  
Construire et valider une plateforme prédictive pré‑match only, couvrant plusieurs marchés : 1N2, Over/Under, buteur (anytime/first/last), passeur, joueur décisif (but/assist gagnant), type de but (tête, CPA, pénalty…), minute/intervalle du but.  

## 0) Principes & Règles Produit
- **Pré‑match only** ; aucune donnée en live pour éviter la saturation de la base de donnée et des API.  
- **Actualisations** : **T‑24h**, **T‑6h**, **T‑1h** (fenêtre **décision bets/Montante**), **T‑30min** (dernière publication), puis **gel** à T=0.  
- **Sélection bets/Montante à T‑1h** (compos probables connues, météo affine → suffisant pour décider).  
- **Explicabilité obligatoire** : facteurs chiffrés (équipe, joueurs, **styles & match‑ups**, coach, contexte, marché).  
- **Pas de promesse de gains** ; évaluation scientifique (scores de probas, calibration)

---
## 1) Données & Labellisation

### 1.1 Périmètre et granularités
- **Ligues** : Big‑5 (EPL, LaLiga, Serie A, Bundesliga, Ligue 1).  
- **Granularités** : match, équipe‑match, **joueur‑match**, **événements** (tirs, passes clés, CPA, pénaltys).  
- **Fenêtre historique** : **5 saisons** (apprentissage), pondération de récence exponentielle ; focus 2 saisons pour signaux court terme.

### 1.2 Sources & entités principales
- **API‑Football** : fixtures, résultats, xG (si dispo), tirs (position/type), joueurs, blessures/suspensions, arbitres, cotes, météo prévue.  
- **Enrichissements optionnels** : valeurs/transferts (proxy importance joueur), alt‑météo si nécessaire.

### 1.3 Labels par marché
- **1N2** : {Home/Nul/Away}.  
- **Over/Under** : seuils (2.5 par défaut) + multi‑seuils (1.5, 3.5).  
- **Buteur** : `anytime`, `first`, `last`. Label joueur‑match binaire par cas ; gestion multi‑buts.  
- **Passeur** : joueur‑match binaire (≥1 assist).  
- **Joueur décisif** : joueur qui **marque ou assiste** l’action gagnante (écart +1 final).  
- **Type de but** (multi‑classe) : ouvert, tête, CPA (corner/CF), pénalty, contre‑attaque, CSC (option).  
- **Minute/intervalle** : binnings (0‑15, 16‑30, …, 76‑90+), **hazard/survie** pour l’instant du **1er but** (par équipe et global).  
- **Qualité** : exclure data douteuse, normaliser extensions temps additionnel (90+).  

### 1.4 Anti‑fuite d’information (T‑1h)
- Aucune feature postérieure à T‑1h dans les modèles de décision bets.  
- `lineups_probables` avec confidence ; `lineups_official` **non** utilisées pour la **sélection** (serviront à T‑30 pour publication finale seulement).  
- Odds : snapshots aux fenêtres ; pas d’utilisation de mouvements après T‑1h pour la décision.

---

## 2) Feature Store — **Équipe / Joueur / Match‑up / Contexte / Marché**

### 2.1 Équipe (team‑match, côté home/away)
- **Forces intrinsèques** : Elo dynamique (home/away), Dixon‑Coles/Poisson paramètres attaque/défense, forme (WDL & xG diff) 5/10 derniers, conversion xG→buts.  
- **Styles tactiques (clusters)** : possession/tempo, transitions, pressing (PPDA), verticalité, largeur, distance moyenne des tirs concédés, set‑pieces offensifs/défensifs.  
- **Match‑up style** : score d’interaction style vs style (ex. dominants vs bloc bas/contre), appris sur 5 saisons.  
- **Set‑pieces** : taux xG CPA pour/contre, réussite têtes, pénaltys obtenus/subis.  
- **Défense de surface** : xGA dans zone <12m, pressing final tier, erreurs individuelles menant à tirs.  
- **Calendrier/Fatigue** : jours de repos, voyages (km), `congestion_index`, `ucl_within_3d_flag`.  
- **Volatilité** : `volatility_index` (écart type surperformance vs attendu), `giant_killer_flag`, `choker_flag`.  

### 2.2 Joueur (player‑match)
- **Rôle & minutes attendues** : poste, probabilité titularisation, changements fréquents; minutes prévues (distribution).  
- **Contributions** : xG/90, xA/90, touches surface, tirs cadrés/90, shot map features (angles, pied, tête), deep completions, clés CPA (tireur pénalty/CF/corner).  
- **Profil physique/forme** : charge matchs récents, retours de blessure, âge (déclin), historique enchaînement 3j.  
- **Synergies** : paires passeur‑buteur (co‑implication), triangles récurrents; **graph features** (centralité, motifs passes).  
- **Discipline/risque** : probabilité temps réduit (remplacements précoces), cartons/expulsions impactant minutes.

### 2.3 Entraîneur
- **Style coach** (clusters) aligné sur équipe actuelle;  
- **Big‑game perf** vs top‑5 ; **surprise rate** (upsets) ;  
- **Gestion rotations** (post‑Europe) ; **tenure** (stabilité).

### 2.4 Contexte & Arbitre
- Derby/rivalité, match de survie/titre, météo (vent/pluie/temp) → mapping vers xG/variance; arbitre (rouges, pénaltys) → modulateur de CPA et variance buts.

### 2.5 Marché (référence externe)
- Probabilités implicites (vig removed), pente mouvements **jusqu’à T‑1h**, dispersion inter‑books (incertitude marché).

---

## 3) Architecture Modélisation — **Multi‑couches & Multi‑marchés**

### 3.1 Socle génératif du match
- **Bivarié Poisson / Dixon‑Coles** ajusté : paramètres attaque/défense, effet domicile, corrélation tardive; calibré par ligue et saison (modèle hiérarchique).  
- **Hazard (survie)** pour 1er but par équipe : intensité λ(t | features T‑1h), **piecewise‑constant** par tranches (0‑15, …), version avancée **DeepHit** optionnelle.

### 3.2 Couches « force/forme »
- **Elo dynamique** (home/away) avec pénalité absences clés/rotation;  
- **GBM tabulaire** (LightGBM/XGBoost) ingérant l’ensemble des features équipe/match‑up/contexte/marché pour produire P(1N2), P(Over/Under), P(team‑scores‑k).

### 3.3 Couches « joueurs & évènements »
- **Partage de xG d’équipe → joueurs** : modèle d’allocation (multinomial‑Dirichlet hiérarchique) selon minutes attendues, rôle, shot map, set‑pieces.  
- **Buteur anytime** : P(joueur marque ≥1) = 1 − Π(1 − p_tir_i × p_conversion_i). Approximé via allocation xG joueur et taux conversion contextuel.  
- **Buteur first/last** : via **simulation Monte Carlo** de la séquence de buts à partir des hazards + attribution joueur conditionnelle (allocation).  
- **Passeur** : modèle sur **assist rate** (xA/90, profil centre/passe finale, CPA servis) + synergies paires; logistic calibrée par minutes.  
- **Joueur décisif** : simulation Monte Carlo du scoreline + attribution but/assist gagnant; probas marginales par joueur.  
- **Type de but** : classif multi‑classe (logistic/GBM) conditionnée sur équipe/joueur/style/adversaire/arbitre/météo; sorties par joueur et agrégées équipe.  
- **Minute du but (bins)** : issues des hazards; renvoi de probas par tranche pour marchés « but dans 0‑15 », « équipe marque 1er », etc.

### 3.4 Métamodèle & Calibration
- **Stacking** : combiner sorties Poisson/DC, Elo transformé, GBM équipe, modèles joueurs, hazards → **logistic bayésienne** ou GBM méta.  
- **Calibration** : isotonic/Platt par marché; **CRPS/IBS** pour temps‑évènement; **Brier/Logloss** pour binaires; **Top‑k AP** pour rares (passeur).  
- **Incertitude** : ensembles (bagging/GBM), MC‑Dropout (si réseaux), intervalle de confiance; score de confiance affiché.

---

## 4) Simulation & Tarification des marchés (« Fair Odds »)
- **Moteur Monte Carlo** (≥50k runs/match) : 
  1) Tirage des buts (Poisson/DC + hazards).  
  2) Attribution par joueur (allocation xG + set‑pieces + synergies).  
  3) Classification type de but par évènement.  
- **Probas de marché** = fréquences simulées; **Fair odds** = 1/p calibrées; exposition corrélations connue (éviter double‑compte).  
- **Stress tests** : scénarios alternatifs (pluie forte, rotation accrue) pour sensibilité.

---

## 5) Apprentissage & Validation
- **Split temporel** (rolling) par saison; jamais mélanger futur/passé.  
- **Hiérarchique par ligue** (effets aléatoires) ; régularisation des joueurs à faible données via **partial pooling**.  
- **Métriques par marché** :
  - 1N2/OU : Logloss, Brier, **ECE** (<0.03), reliabilité.  
  - Buteur/passeur/décisif : Logloss, **AUPRC**, taux capture top‑k.  
  - Type/minute : multi‑classe F1 macro, **CRPS/IBS** (survie).  
- **Backtests** : comparaison vs marché (probas implicites) ; ablation (retirer styles, coach, synergies) pour mesure du gain.

---

## 6) Orchestration & Stockage (Supabase)

### 6.1 Jobs (pg_cron / Edge Functions)
- **Collectors** : fixtures, odds snapshots (T‑24/T‑6/T‑1/T‑30), players, injuries, lineups probables, météo, arbitre, tirs/xG.  
- **Build Features** : par fenêtre (T24/T6/T1/T30) → tables `features_match_team`, `features_player_match`.  
- **Train (nightly)** : modèles socle + joueurs ; artefacts en **Supabase Storage** (versionnés).  
- **Predict** : aux 4 fenêtres ; T‑1h = source **Sélection bets/Montante** ; T‑30 = publication finale.  
- **Simulate** : Monte Carlo par match → `sim_aggregates` (probas marchés).  

### 6.2 Schéma (ajouts principaux)
- `features_player_match(match_id, player_id, window, minutes_exp, role, xg90, xa90, shot_map_vec, set_piece_roles, synergy_hash, …)`  
- `market_probs(match_id, window, p_home, p_draw, p_away, p_ou25_over, …)`  
- `prop_predictions(match_id, player_id, window, p_scorer_any, p_first, p_last, p_assist, p_decisive, p_goal_type_open, p_goal_type_header, p_pen, …)`  
- `time_bins_probs(match_id, window, team_id, bin_0_15, bin_16_30, …, first_team_score_prob)`  
- `model_runs`, `model_predictions`, `model_explanations` (déjà défini v2) étendus aux marchés joueurs/temps/type.  
- `sim_aggregates(match_id, window, market JSONB)` : résumé MC (moyennes/quantiles).  
- `montante_bets(id, placed_at, bankroll_before, stake, legs JSONB, product_odds, model_probs, ev, decision_window='T1', result, bankroll_after)`.

### 6.3 Qualité & Observabilité
- Great‑Expectations‑like : checks ranges, non‑null, clés, leakage guards.  
- Logs : latence ETL, taux d’échec, coût API, drifts features (PSI), calibration drift.

---

## 7) Explicabilité (UI interne)
- **Match** : barre proba 1N2, fair vs book, **top‑5 facteurs** (styles, coach, absences, météo, marché) avec **impact ±0.xx**.  
- **Joueur** : carte joueur avec P(any), P(first), P(assist), P(décisif), type de but le plus probable; justifications : minutes prévues, rôle CPA, synergies.  
- **Temps & type** : histogrammes 0‑15/… ; distribution type (tête/CPA/pen).  
- Narratif auto T‑30 (publication) généré des facteurs.

---

## 8) Stratégie **Montante** (interne, décision à **T‑1h**)
- **Critères de sélection « match sûr »** :
  - Pari **cote ≥ 1.50** (individuelle).  
  - Proba modèle `p` calibrée → **EV = p×(odds−1) − (1−p) > 0** ; 
  - **Confiance** ≥ seuil (incertitude basse, Kelly recommandé).  
  - Filtres : volatilité trop haute → exclu ; styles « kryptonite » contre favori → prudence.  
- **Combinaisons** : autorisées (max 2–3 legs) si **faiblement corrélées** (heuristiques : ligues différentes, facteurs indépendants).  
- **Stake Montante** : **100% de la bankroll courante** (définition de la montante).  
  - **Initial** : 5€.  
  - **Après gain** : réinvestissement total du solde.  
  - **Après perte** : **reset** à 5€ (et nouvelle série).  
- **Journalisation** : `montante_bets` (legs, cote produit, p produit, EV, résultat, bankroll_before/after).  
- **KPI Montante** : longueur max chaîne, rendement cumulé, drawdown, taux de picks gagnants, EV moyen.

> Remarque : on peut proposer en parallèle un **Kelly fractionné** (≦25%) pour reporting comparatif, mais la **montante officielle** reste « all‑in bankroll ».

---

## 9) Évaluation & Rapports (interne)
- **Hebdo** : performance par marché (logloss, ECE, AUPRC), top gains/pertes vs marché, erreurs récurrentes par style/coach.  
- **Mensuel** : ablation (impact styles/coach/synergies), drift ligue, recalibration.  
- **Saison** : ROI Montante, ROI par marché, fairness (écarts book vs fair), stabilité explicabilité.

---

## 10) Sécurité, RGPD, Ops
- Supabase RLS strict (utilisateurs internes seulement pendant la saison).  
- Artefacts modèles versionnés (Storage), reproductibilité (git SHA, `model_runs`).  
- CI/CD : tests unitaires features, intégration ETL→features→prédiction, end‑to‑end UI interne; tests charge lecture.  
- Sentry + alertes jobs (échecs collectors, dépassement quotas API, drift calibration).

---

## 11) Endpoints internes (extraits)
- `GET /api/matches?date=YYYY‑MM‑DD&league=...` → synthèse 1N2 + badges + horodatage.  
- `GET /api/matches/{id}` → détail multi‑marchés + explain.  
- `GET /api/players/{match_id}` → props joueurs (any/first/assist/décisif/type).  
- `GET /api/timebins/{match_id}` → proba 0‑15/… & first‑to‑score.  
- `POST /api/montante/select?window=T1` → retourne legs éligibles (≥1.50, EV>0, confiance OK).  
- `POST /api/montante/commit` → enregistre ticket interne (journalisation).

---

## 12) Annexes (guides de calcul)

### 12.1 Probabilité buteur anytime (approx.)
- Allocation xG joueur `xg_j` à T‑1h (minutes prévues, rôle, CPA).  
- Conversion contextuelle `c_j` (profil joueur + défense adverse).  
- P(any) ≈ `1 − exp(−xg_j × c_j)` (Poisson approximation, calibrée).  

### 12.2 Passeur
- Basée sur `xa90`, passes clés, centres, CPA servis; logistic binaire avec minutes prévues; correction synergie (paires).  

### 12.3 Joueur décisif
- Simuler scores; identifier évènement gagnant; agréger probas par joueur (but **ou** assist).  

### 12.4 Type de but
- Classif multi‑classe (GBM) avec features joueur/équipe/adversaire/météo/arbitre; sortie par joueur et agrégation équipe.  

### 12.5 Minute du but / Survie
- Hazard piecewise par tranches ; intensité dépend styles, fatigue, météo; produire P(0‑15), …, first‑to‑score.

---

### Décisions clés récap
- **Décision bets/Montante à T‑1h** (pas d’infos postérieures).  
- **Publication finale à T‑30** (affinage + gel à T=0).  
- **Modélisation multi‑couches** (Poisson/DC + Elo + GBM + joueurs + hazards + stacking).  
- **Simulation Monte Carlo** pour tarifier tous les marchés et dériver les fair odds.  
- **Montante** : all‑in bankroll, cote min **≥1.50**, combinaison limitée et décorrélée; reset après échec.  
- **Saison interne uniquement** : mesurer, itérer, prouver.  

— Fin v3.0 — Prêt pour implémentation Data/ML avancée.

