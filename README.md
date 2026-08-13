# Doukoure Import PWA

README de cadrage projet, rédigé pour refléter l’état réel du code au 2026-08-12.

## 1) Résumé exécutif

Doukoure Import est une PWA React/Vite orientée mobile-first pour un parcours proxy-buying Chine -> Sénégal.

Le projet contient:
- Un prototype UX avancé (5 écrans métier + 1 écran démo moteur de pricing)
- Une base de design system cohérente (indigo/émeraude/ambre, typographies configurées)
- Une intégration Supabase partielle mais déjà opérationnelle sur plusieurs flux critiques
- Des tests unitaires sur le moteur de pricing

Le projet n’est pas encore en état “production-ready” car certains flux restent câblés avec des IDs fixes/mock, et la validation locale build/test a été bloquée par l’installation des dépendances (erreurs réseau npm registry).

## 2) Stack technique

- Frontend: React 19 + TypeScript + Vite 8
- Styling: Tailwind CSS v4
- Backend BaaS: Supabase (DB + Storage)
- Icônes: lucide-react
- Tests: Vitest
- Package manager prévu: pnpm (lockfile présent)

Dépendances importantes détectées:
- @supabase/supabase-js
- react / react-dom
- tailwindcss / @tailwindcss/vite
- vitest

## 3) Ce qui est implémenté

### 3.1 Shell applicatif et navigation

- Navigation mobile bottom avec écrans:
  - Accueil
  - Produit
  - Suivi
  - Pass
  - Moteur (démo)
- Accès Admin dédié
- Bannière d’installation PWA simulée (avec support beforeinstallprompt)

### 3.2 Design system et fondations UI

- Fonts Plus Jakarta Sans + JetBrains Mono chargées
- Variables de thème configurées (indigo/émeraude/ambre + surfaces)
- Fond global clair et composants cartes cohérents
- Animations utilitaires (progress, pulse, slide-up)

### 3.3 Moteur de pricing (fort niveau de maturité)

- Fonctions métier implémentées:
  - calculateInitialImportPrice
  - recalculateBalanceOnChinaWeighing
  - simulateRateImpact
  - toCbm
  - formatXOF
- Règle acompte 2/3, solde 1/3 implémentée
- Modes de transport couverts:
  - AIR_EXPRESS
  - AIR_ECO
  - MARITIME
- Écran de démonstration interactif disponible
- Suite de tests unitaires présente sur le moteur

### 3.4 Intégrations Supabase déjà actives

- Client Supabase initialisé
- Home:
  - Récupération du conteneur (table containers)
  - Récupération produits (table products)
- Recherche visuelle:
  - Upload storage bucket search-uploads
  - Insert table visual_search_requests
- Tracking:
  - Récupération commande depuis orders
- Admin:
  - Lecture/écriture des paramètres globaux dans system_settings
- Product sticky actions:
  - Insert d’une commande dans orders
- Pass livraison:
  - Lecture commande + update statut PAID

## 4) État par écran (livré / partiel / restant)

### 4.1 Accueil (HomePage)

Statut: Partiellement livré (UI riche + data branchée)

Livré:
- Header, recherche, notifications mock, panneau profil
- Widget conteneur branché Supabase
- Grille produits branchée Supabase
- Recherche visuelle branchée Supabase (upload + insert)

Reste/écarts:
- Navigation produit depuis la grille sans passage d’identifiant produit réel
- Certaines données restent mock (notifications/profil)

### 4.2 Produit (ProductPage)

Statut: Partiellement livré

Livré:
- Carrousel média, sélection mode de livraison
- Affichage prix/acompte/solde via moteur de pricing
- Barre sticky de commande + modal paiement
- Insert commande Supabase

Reste/écarts:
- Produit encore statique (pas de chargement dynamique par selectedProductId)
- Intégration de navigation contextuelle produit incomplète

### 4.3 Suivi (TrackingDashboard)

Statut: Partiellement livré

Livré:
- Timeline visuelle avancée
- Mapping DB -> données d’inspection
- Fallback mock robuste

Reste/écarts:
- Requête basée sur order_ref fixé en dur (ORD-2024-0847)
- Pas encore de sélection d’ordre injectée depuis la navigation globale

### 4.4 Pass Livraison (DeliveryPass + DeliveryValidationQRCode)

Statut: Partiellement livré

Livré:
- Carte livraison Paps
- QR code côté client
- Modal paiement et update statut PAID
- Badge Paps dynamique selon orderStatus
- Offline badge réactif online/offline

Reste/écarts importants:
- Le composant QR conserve une simulation locale paid après 2s dans son flux interne, ce qui peut diverger du vrai état DB si utilisé tel quel
- Requête commande toujours sur order_ref fixe

### 4.5 Admin Panel

Statut: Livré (MVP solide)

Livré:
- Lecture settings depuis system_settings
- Sauvegarde via upsert
- Simulation visuelle live des impacts tarifaires

Reste/écarts:
- Durcissement à prévoir (gestion d’erreurs, permissions, RLS)

## 5) État des plans du dossier plans

### Plan prototype PWA

Niveau d’avancement: Majoritairement implémenté
- Les 5 écrans cibles existent
- Design system en place
- Moteur pricing et logique 2/3 – 1/3 en place
- Écran moteur additionnel présent (bonus de démo)

### Plan connexion Supabase

Niveau d’avancement: En grande partie implémenté, mais incomplet
- Client créé et plusieurs tickets branchés
- Flux critiques déjà connectés (produits, conteneur, visual search, settings, orders)
- Reste à finaliser la navigation par IDs réels et la suppression des points durs codés en dur

### Plan page Pass interactivité complète

Niveau d’avancement: Largement implémenté
- Badge Paps dynamique: OK
- Offline badge réactif: OK
- onPaymentInitiated câblé: OK
- Point de vigilance: simulation locale paid encore active dans le composant QR

## 6) Données et schéma attendu Supabase

Tables utilisées dans le code:
- system_settings
- products
- containers
- orders
- visual_search_requests

Storage bucket utilisé:
- search-uploads

Note sécurité:
- Le projet inclut une clé anon publique Supabase (normal côté client)
- Vérifier les policies RLS sur toutes les tables avant tout usage réel

## 7) Exécution locale et qualité

## Prérequis
- Node.js 22+
- Corepack actif

## Commandes recommandées
- Installation: corepack pnpm install
- Dev: corepack pnpm dev
- Tests: corepack pnpm test
- Build: corepack pnpm build

## Statut observé pendant l’audit
- Node/npm/corepack disponibles
- pnpm accessible via corepack
- Installation dépendances interrompue par erreurs réseau registre npm (multiples retries + ECONNRESET)
- En conséquence, test et build n’ont pas pu être validés sur cette session

## 8) Risques actuels

- Dépendance à des order_ref/produits hardcodés dans certains flux
- Mélange état local UI vs état persistant DB sur le flux Pass
- Validation CI/CD non confirmée dans cette session (blocage installation)
- Probable besoin d’aligner schéma SQL exact avec tous les champs utilisés par les écrans

## 9) Backlog prioritaire recommandé

1. Finaliser la navigation data-driven (selectedOrderId/selectedProductId) dans le shell applicatif.
2. Retirer les références codées en dur ORD-2024-0847 côté Suivi/Pass.
3. Supprimer la simulation paid locale dans le composant QR et basculer 100% sur état Supabase.
4. Ajouter gestion d’erreurs UX homogène sur tous les appels Supabase.
5. Vérifier/renforcer RLS + validations côté backend.
6. Rétablir installation dépendances puis exécuter test/build en continu.

## 10) Conclusion

Le projet est déjà un prototype avancé, visuellement abouti et partiellement connecté au backend réel. Le cœur métier pricing est bien structuré et testé. Le chantier restant porte surtout sur la fiabilisation des flux de données (IDs dynamiques, suppression des fallbacks hardcodés, cohérence d’état) et la validation d’exécution complète dans un environnement réseau stable.
