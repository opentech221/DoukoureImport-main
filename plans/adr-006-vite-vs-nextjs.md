# ADR-006: Conserver Vite comme runtime frontend

- Statut: accepte
- Date: 2026-08-13
- Portee: frontend PWA Doukoure Import

## Decision

Conserver React + Vite comme runtime frontend pour la prochaine phase produit. Ne pas lancer de migration Next.js tant qu'un besoin mesurable de rendu serveur, SEO public ou backend-for-frontend n'est pas confirme.

## Context

Le produit dispose deja de:

- un shell React/Vite fonctionnel;
- un service worker et des strategies offline;
- des routes Supabase Edge independantes du runtime frontend;
- un pipeline QA avec build, snapshots, budgets et artefacts CI;
- une experience principalement applicative et authentifiee, plutot qu'un site editorial public.

## Options

### Option A: React + Vite, retenue

Avantages:

- aucune migration de routing ou de service worker;
- compatibilite immediate avec l'offline-first et le cache applicatif;
- build et CI deja stabilises;
- faible risque de regression sur paiement, pass et suivi;
- deploiement statique simple.

Couts:

- SEO et rendu initial moins adaptes aux pages publiques;
- les fonctions backend restent dans Supabase Edge;
- eventual besoin d'une couche BFF a traiter explicitement.

### Option B: Next.js App Router, differee

Avantages:

- SSR/SSG et metadata natives;
- conventions integrees pour routes serveur et layouts;
- meilleure base si un catalogue public indexable devient prioritaire.

Risques:

- migration du routing et des imports;
- adaptation du service worker et des strategies offline;
- duplication ou deplacement des routes Supabase Edge;
- risque sur les flux livraison/paiement;
- cout de validation visuelle et mobile important.

## Consequences

- Le backlog continue sur Vite.
- Les composants gouvernes restent independants d'un framework de routing.
- Les appels backend conservent des contrats HTTP explicites.
- Une future migration devra commencer par un spike isole, pas par une conversion globale.

## Declencheurs de reouverture

Reexaminer cet ADR si au moins un de ces besoins devient prioritaire:

- pages catalogue publiques indexables avec objectif SEO;
- besoin de SSR pour performance mesuree sur appareils lents;
- besoin d'un BFF Next.js specifique et durable;
- contraintes de plateforme imposant Next.js.

## Plan de migration conditionnel

1. Mesurer le besoin avec Lighthouse, analytics et objectifs SEO.
2. Creer un spike Next.js hors production avec une page catalogue et le service worker.
3. Comparer bundle, LCP, offline, routing et appels Supabase.
4. Migrer une route non critique en parallele.
5. Valider rollback par conservation du build Vite.
6. Etendre uniquement si les mesures justifient le cout.

## Rollback

Le rollback consiste a conserver le build Vite et a retirer le spike Next.js. Aucun endpoint Supabase ni schema DB ne doit dependre du runtime frontend.
