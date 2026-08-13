# Backlog Jira prêt à exécution — Doukoure Import

Date de référence: 2026-08-12
Source de vérité utilisée: état réel du code + plans + README actuel.

## Objectif

Transformer l’état actuel du prototype en produit fiable, data-driven et validable en CI, sans régression UX.

## Convention de priorisation

- P0: Bloquant prod / risque élevé de comportement incohérent
- P1: Haute valeur métier, requis pour la V1 stabilisée
- P2: Amélioration importante mais non bloquante

## Epic E1 — Fiabilisation des flux commandes (P0)

### Story E1-S1 — Navigation data-driven produit et commande (P0)

Description:
Remplacer les enchaînements statiques par une navigation pilotée par selectedProductId et selectedOrderId.

Sous-tâches:
1. Ajouter l’état global selectedProductId dans le shell application.
2. Ajouter l’état global selectedOrderId dans le shell application.
3. Propager selectedProductId depuis la grille Home vers Product.
4. Propager selectedOrderId depuis les CTA de suivi vers Tracking et Pass.
5. Définir fallback explicite si aucun ID n’est sélectionné.

Critères d’acceptation:
1. Depuis Home, cliquer un produit ouvre Product avec ce produit réel.
2. Depuis Home/Profil, ouvrir Suivi/Pass utilise la commande sélectionnée.
3. Aucun comportement cassé si selectedProductId ou selectedOrderId est null.
4. Les écrans ne dépendent plus d’un order_ref fixe en navigation normale.

Definition of Done:
1. Code mergé avec typage strict TypeScript.
2. Aucun warning ESLint/TypeScript additionnel.
3. Test manuel documenté mobile + desktop.

Estimation:
- 3 points

Dépendances:
- Aucune

---

### Story E1-S2 — Suppression des order_ref hardcodés dans Tracking/Pass (P0)

Description:
Retirer la dépendance à ORD-2024-0847 dans la lecture Supabase.

Sous-tâches:
1. Refactor requête Tracking pour accepter orderRef/orderId en props.
2. Refactor requête Pass pour accepter orderRef/orderId en props.
3. Ajouter garde UX si l’ordre n’est pas trouvé.
4. Harmoniser fallback technique et message utilisateur.

Critères d’acceptation:
1. Tracking charge la commande demandée dynamiquement.
2. Pass charge la commande demandée dynamiquement.
3. En cas d’ordre introuvable: état vide clair + CTA de retour.
4. Plus aucune occurrence de ORD-2024-0847 en logique métier.

Definition of Done:
1. Recherche code confirmant suppression des hardcodes métier.
2. Scénarios testés: commande existante, absente, erreur réseau.

Estimation:
- 2 points

Dépendances:
- E1-S1 recommandé avant

---

### Story E1-S3 — Cohérence d’état paiement Pass (UI vs DB) (P0)

Description:
Supprimer la simulation locale paid dans le composant QR et basculer sur l’état persistant Supabase.

Sous-tâches:
1. Retirer la bascule locale paid après timeout.
2. Rendre DeliveryValidationQRCode purement piloté par props DB.
3. Rafraîchir l’état commande après paiement confirmé.
4. Ajouter état intermédiaire paiement en cours/confirmé.

Critères d’acceptation:
1. Aucune transition paid sans update DB.
2. Après paiement réussi, la vue se met à jour via données persistées.
3. En échec update DB, la vue reste unpaid avec message d’erreur.

Definition of Done:
1. Cas succès/échec paiement validés.
2. Plus de setTimeout de simulation pour paid.

Estimation:
- 2 points

Dépendances:
- E1-S2

## Epic E2 — Robustesse Supabase et sécurité fonctionnelle (P1)

### Story E2-S1 — Gestion d’erreurs uniforme sur tous les appels Supabase (P1)

Description:
Normaliser loading, success, error et retry sur les écrans connectés.

Sous-tâches:
1. Introduire un pattern de gestion d’erreur commun.
2. Couvrir Home, ProductStickyActions, Tracking, Pass, Admin.
3. Ajouter messages utilisateur localisés FR.
4. Prévoir retry manuel pour erreurs réseau.

Critères d’acceptation:
1. Chaque écran connecté affiche un état de chargement.
2. Chaque erreur DB/Storage affiche un feedback clair.
3. Les erreurs silencieuses sont supprimées.

Definition of Done:
1. Revue croisée UX des états d’erreur.
2. Cas erreur simulés manuellement.

Estimation:
- 5 points

Dépendances:
- E1-S1

---

### Story E2-S2 — Contrat de schéma Supabase et RLS baseline (P1)

Description:
Aligner schéma attendu avec les colonnes réellement utilisées et établir une base de policies RLS.

Sous-tâches:
1. Inventorier colonnes lues/écrites par table.
2. Produire script SQL de migration aligné code.
3. Définir policies RLS minimales (read/write client).
4. Vérifier bucket search-uploads (policy upload + lecture URL).

Critères d’acceptation:
1. Aucune colonne manquante au runtime sur flux principaux.
2. Insert/update critiques passent avec RLS activé.
3. Document SQL versionné dans le repo.

Definition of Done:
1. Script SQL relu et validé.
2. Test bout-en-bout sur projet Supabase de staging.

Estimation:
- 5 points

Dépendances:
- E2-S1 parallèle possible

## Epic E3 — Qualité, validation et delivery (P1)

### Story E3-S1 — Stabiliser environnement local et pipeline test/build (P1)

Description:
Lever le blocage de validation locale et rendre test/build reproductibles.

Sous-tâches:
1. Documenter stratégie d’installation pnpm via corepack.
2. Ajouter procédure de reprise en cas d’erreurs réseau npm registry.
3. Exécuter test/build sur environnement stable.
4. Ajouter check CI minimal test + build.

Critères d’acceptation:
1. Installation dépendances réussie sans interaction manuelle.
2. Commandes test et build passent sur branche principale.
3. CI exécute au minimum test + build.

Definition of Done:
1. Log d’exécution archivé.
2. README mis à jour avec statut validé.

Estimation:
- 3 points

Dépendances:
- Aucune

---

### Story E3-S2 — Couverture de tests ciblée flux métier connectés (P1)

Description:
Compléter les tests autour des flux Supabase et paiements.

Sous-tâches:
1. Ajouter tests unitaires logique de mapping order -> timeline.
2. Ajouter tests composants sur états paid/unpaid Pass.
3. Ajouter tests ProductStickyActions sur payload insert orders.
4. Ajouter tests d’erreurs API mockées.

Critères d’acceptation:
1. Les chemins critiques ont des tests automatisés.
2. Les régressions connues (hardcoded/simulation) sont couvertes.

Definition of Done:
1. Tests verts localement et en CI.
2. Rapport de couverture publié.

Estimation:
- 5 points

Dépendances:
- E1-S3

## Epic E4 — Finalisation V1 expérience produit (P2)

### Story E4-S1 — Données produit dynamiques complètes (P2)

Description:
Remplacer la fiche produit statique par chargement réel depuis products.

Sous-tâches:
1. Charger produit par selectedProductId.
2. Mapper médias/images/videos depuis données.
3. Aligner prix de base et dimensions depuis DB.

Critères d’acceptation:
1. La fiche produit reflète les données réelles du produit choisi.
2. Les CTA commande utilisent ces mêmes données.

Estimation:
- 3 points

Dépendances:
- E1-S1

---

### Story E4-S2 — Nettoyage des mocks non essentiels en production mode (P2)

Description:
Conserver les mocks pour dev seulement, pas en comportement par défaut.

Sous-tâches:
1. Isoler les mocks derrière feature flags dev.
2. Clarifier fallback UX quand DB vide.

Critères d’acceptation:
1. En mode normal, la donnée vient de Supabase.
2. Les fallbacks ne masquent pas les erreurs critiques.

Estimation:
- 2 points

Dépendances:
- E2-S1

## Plan de release proposé

### Sprint 1 (stabilisation critique)
- E1-S1
- E1-S2
- E1-S3
- E3-S1

Objectif sprint:
- Plus de hardcodes métier bloquants
- Paiement Pass cohérent DB
- Environnement test/build stabilisé

### Sprint 2 (fiabilité backend + qualité)
- E2-S1
- E2-S2
- E3-S2

Objectif sprint:
- Gestion d’erreurs homogène
- Schéma + RLS sécurisés
- Couverture tests flux connectés

### Sprint 3 (polish V1)
- E4-S1
- E4-S2

Objectif sprint:
- Fiche produit pleinement data-driven
- Mocks maîtrisés et comportement de prod propre

## Matrice des risques tickets

- Risque élevé: incohérence paiement (E1-S3)
- Risque élevé: hardcodes commande (E1-S2)
- Risque moyen: erreurs Supabase silencieuses (E2-S1)
- Risque moyen: incapacité à valider build/test (E3-S1)

## Template Jira prêt à copier

- Titre: [EPIC/STORY] Nom court orienté résultat
- Contexte: Pourquoi ce ticket existe
- Scope: Ce qui est inclus / exclu
- AC: liste numérotée testable
- Tâches techniques: liste numérotée
- Risques: points de vigilance
- Dépendances: tickets bloquants
- Estimation: story points
