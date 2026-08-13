# 🚀 DOCUMENT D'ARCHITECTURE & ARCHIVES DE PROMPTS (PRD)
## Projet : Doukoure Import (Proxy-Buying & Social Commerce PWA Sénégal)

---

## 🎨 DESIGN SYSTEM & SPECIFICATIONS FIGMA (PWA & RESPONSIVE WEB)

### 🎨 1. UIKit & Tokens Visuels (Design System)
* **Palette de Couleurs :**
  * **Trust & Primary (Bleu Nuit / Indigo) :** `#1E1B4B` (Principal), `#312E81` (Survol/Accents)
  * **Finance & Success (Vert Émeraude - Acompte 2/3) :** `#059669` (Badges & Boutons principaux), `#10B981`
  * **FOMO & Urgence (Ambre / Orange - CBM Conteneur) :** `#D97706` (Barres de progression & Alertes)
  * **Surfaces & Fond :** `#FFFFFF` (Cartes), `#F8FAFC` (Fond d'écran global)
* **Typographie :** `Inter` ou `Plus Jakarta Sans` (Mobile-first & Desktop, lisibilité haute densité)
* **Composants d'icônes :** Lucide Icons (Cart, Warehouse, Ship, Plane, QrCode, ShieldCheck, Truck, PlayCircle, Settings, DownloadApp)

---

### 📱 2. Spécifications des Écrans Clés Figma (Progressive Web App)

#### Écran 1 : Fiche Produit, Dynamic Pricing & Banner PWA (Sprint 1)
* **Bandeau d'Installation PWA :** Invite discrète en bas de page pour installer l'application sur le téléphone sans passer par le Play Store / App Store ("Installer l'App Doukoure Import").
* **Carrousel Média Rich :** Prise en charge des **photos HD** ET des **vidéos courtes (10-30s)** de présentation du produit avec lecteur intégré.
* **Sélecteur de mode :** Toggle 3 options (Aérien Express 5-7j, Aérien Éco 10-15j, Fret Maritime ~35j).
* **Carte de Prix dynamique :** Gros badge vert émeraude pour l'**Acompte 2/3 à payer aujourd'hui** + affichage du **Solde 1/3 estimé à la livraison**.
* **Disclaimer :** Note informative explicative sur l'ajustement du solde après pesée réelle à l'entrepôt en Chine.

#### Écran 2 : Accueil & Widget Social Commerce "CBM Partagé" (Sprint 2)
* **Barre FOMO :** Progression animée du remplissage du conteneur en cours (ex: "Conteneur Dakar #104 : 65%").
* **Compte à rebours :** Décompte dynamique avant le départ du navire.
* **Call To Action (CTA) :** Bouton vert "Partager sur WhatsApp" (Génération de lien pré-rempli).
* **Recherche Visuelle :** Zone de dépôt d'image et bouton mobile "Prendre une photo" (Déclenchement caméra Web PWA).

#### Écran 3 : Dashboard Tracking 6 Étapes & Inspection Média (Sprint 2)
* **Timeline Multi-étapes :** 6 états (Paiement -> Achat Chine -> Inspection/Pesée -> En Transit -> Douane Dakar -> Livré).
* **Card Inspection Média :** Aperçu miniature de la **photo** ET de la **vidéo d'inspection 360°** prises à l'entrepôt en Chine avec modal d'agrandissement.
* **Affichage du Solde Réajusté :** Notification claire du montant exact du solde (1/3) mis à jour après pesée.

#### Écran 4 : Pass de Livraison & Validation QR Code (Sprint 3)
* **Carte Livreur Paps :** Détails de la livraison à domicile / point relais à Dakar.
* **QR Code Sécurisé :** Code QR généré contenant le jeton de validation du paiement du solde à scanner par le livreur Paps (disponible même hors-ligne via PWA cache).
* **Règlement Rapide :** Bouton d'action directe "Payer le solde maintenant via Wave / Orange Money".

#### Écran 5 : Back-Office Administration - Configuration Tarifs Global (Sprint 5)
* **Formulaire d'Ajustement des Taux :** Champs pour modifier le prix au KG (Express / Éco), le prix au CBM (Maritime) et le % de marge.
* **Live Catalog Recalculation :** Bouton "Mettre à jour le catalogue" qui répercute la baisse/hausse des taux du transitaire sur TOUS les prix du site en direct.

---

### 🔄 Workflow d'Intégration (Figma ↔️ GitHub ↔️ Supabase)
1. **Figma :** Conception des maquettes PWA basées sur les tokens visuels ci-dessus.
2. **GitHub Sync :** Exportation automatique de la structure UI et des classes Tailwind vers le repo GitHub.
3. **VS Code & Copilot :** Récupération via `git pull` et application de la logique métier (calculs 2/3, service workers PWA) à l'aide des prompts Copilot ci-dessous.

---

## 🛠️ Stack Technique Recommandée
 * **Architecture :** Progressive Web App (PWA) Installable & Web Responsive.
 * **Frontend :** Next.js 14+ (App Router), `@ducanh2912/next-pwa` (ou `next-pwa`), Tailwind CSS, Lucide Icons, Framer Motion, `qrcode.react`.
 * **Backend / DB :** Node.js (Express) ou Python (FastAPI/Flask) + PostgreSQL (Supabase/Docker) ou MongoDB.
 * **Mobile Money & Paiements :** API Wave Sénégal, Orange Money, Wizall (PayExpresse / TouchPay).
 * **WhatsApp API & Web Push :** Web Push Notifications API (pour la PWA) + Twilio API / Green API / Baileys pour WhatsApp.
 * **Storage (Images/Vidéos Inspection) :** Cloudinary, AWS S3 ou Supabase Storage.

---

## 📅 DÉCOUPAGE PAR SPRINTS ET TICKETS DE DÉVELOPPEMENT

---

### SPRINT 1 : PWA Setup, Moteur de Calcul Dynamique & UI

#### 🎯 Ticket 1.0 : Configuration Next.js PWA & Service Workers
 * **Description :** Configurer l'application Next.js 14 en Progressive Web App installable avec fichier Manifest JSON, icônes d'application et stratégie de mise en cache.

> 💬 PROMPT VS CODE COPILOT :
> Configure Progressive Web App (PWA) support in a Next.js 14 App Router project.
> 1. Create a `manifest.json` file in `/public` with app name "Doukoure Import", short name "DoukoureImport", theme_color "#1E1B4B", background_color "#F8FAFC", display "standalone", and start_url "/".
> 2. Include icon paths for 192x192 and 512x512 sizes.
> 3. Configure `@ducanh2912/next-pwa` in `next.config.mjs` to register service workers and cache dynamic assets.
> 4. Create an `InstallPWAPrompt.tsx` component that listens to `beforeinstallprompt` event and shows a discreet banner allowing users to install the app on Android/iOS/Desktop.

---

#### 🎯 Ticket 1.1 : Algorithme de Calcul du Prix Dynamique & Ajustement de Pesée (Core Engine)
 * **Description :** Logic backend qui calcule le prix final, l'acompte de 2/3, le solde de 1/3, et gère la re-tarification en cas de variation entre le poids estimé et le poids réel pesé à l'entrepôt en Chine.
 * **Règles Métier :**
   * Aérien Express (5-7j) : `rateAirExpressXOF` (Défaut : 11 000 FCFA / kg)
   * Aérien Éco (10-15j) : `rateAirEcoXOF` (Défaut : 7 500 FCFA / kg)
   * Maritime (30-45j) : `rateMaritimeCbmXOF` (Défaut : 145 000 FCFA / m³)
   * Paiement : Acompte initial = 2/3 (66.67%).
   * Ajustement de Pesée : Si le poids pesé en Chine est supérieur/inférieur au poids estimé lors de la commande, la différence de coût de transport est automatiquement ajoutée ou déduite du solde restant (1/3).

> 💬 PROMPT VS CODE COPILOT :
> Create a TypeScript module named `pricingEngine.ts` for an e-commerce platform called Doukoure Import.
> The module must export two functions:
> 
> 1. `calculateInitialImportPrice(params)`:
>    - Accepts: basePriceXOF, estimatedWeightKg, dimensionsCm ({length, width, height}), shippingOption ('AIR_EXPRESS' | 'AIR_ECO' | 'MARITIME'), marginPercentage (default 15%), systemRates ({ rateAirExpressXOF, rateAirEcoXOF, rateMaritimeCbmXOF }).
>    - Rates (dynamic): AIR_EXPRESS = rateAirExpressXOF/kg, AIR_ECO = rateAirEcoXOF/kg, MARITIME = (CBM) * rateMaritimeCbmXOF.
>    - Total Price = (basePriceXOF + shippingCost) * (1 + marginPercentage / 100).
>    - Returns: shippingCost, totalPrice, depositAmount (2/3), estimatedBalance (1/3).
> 
> 2. `recalculateBalanceOnChinaWeighing(params)`:
>    - Accepts: initialDepositPaid, basePriceXOF, actualWeightKg, actualDimensionsCm, shippingOption, marginPercentage, systemRates.
>    - Calculates the new shipping cost and new total price based on actual metrics.
>    - Returns updated object: newTotalPrice, weightDifferenceKg, priceAdjustmentXOF, finalBalanceToPay (newTotalPrice - initialDepositPaid).
> 
> Include full TypeScript interfaces, unit tests, and complete JSDoc comments.

---

#### 🎯 Ticket 1.2 : Composant UI "Shipping & Pricing Selector"
 * **Description :** Composant React (Tailwind) interactif permettant au client d'alterner entre les modes de livraison avec mise à jour en direct du prix, des acomptes et d'une note explicative sur la pesée.

> 💬 PROMPT VS CODE COPILOT :
> Create a React component using Next.js 14 App Router and Tailwind CSS named `ShippingOptionSelector.tsx`.
> Props: `estimatedWeight`, `dimensions`, `basePriceXOF`.
> Features:
> 1. Toggle buttons for 3 shipping modes: 'Aérien Express (5-7j)', 'Aérien Éco (10-15j)', 'Fret Maritime (~35j)'.
> 2. Use `pricingEngine.ts` to update calculations live when switching options.
> 3. Display big highlighted cards showing:
>    - Total Price (FCFA)
>    - Acompte à payer aujourd'hui (2/3) in Green bold badge
>    - Solde estimé à la livraison (1/3)
> 4. Display an informative tooltip/disclaimer: "Le solde (1/3) sera ajusté automatiquement en cas d'écart entre le poids estimé et la pesée réelle à notre entrepôt en Chine."
> 5. Responsive, mobile-first design styled like a modern fintech app (indigo/emerald green palette).

---

### SPRINT 2 : Social Commerce, CBM Partagé & Tracking Multi-Média

#### 🎯 Ticket 2.1 : Widget Social Shopping "Conteneur Maritime Partagé" (FOMO Bar)
 * **Description :** Composant affichant le taux de remplissage du conteneur maritime en cours avec bouton de partage direct vers WhatsApp pour inciter à la commande groupée.

> 💬 PROMPT VS CODE COPILOT :
> Create a Next.js component `SharedContainerProgress.tsx` with Tailwind CSS and Framer Motion.
> Props: `containerTargetCBM` (e.g. 68), `currentAllocatedCBM` (e.g. 44.2), `departureDeadline` (Date).
> Features:
> 1. Calculate progress percentage (e.g., 65%).
> 2. Animated progress bar shifting from amber to emerald green as it fills up.
> 3. Text headline: "Conteneur Maritime Dakar #104 : rempli à 65%".
> 4. Countdown timer showing remaining days/hours before ship departure.
> 5. Button "Partager sur WhatsApp" that generates a pre-filled WhatsApp share link: 
>    "Aide-nous à remplir le conteneur maritime pour Dakar et faire partir nos colis ! Regarde les offres ici : [URL]".

---

#### 🎯 Ticket 2.2 : Dashboard de Suivi de Commande & Inspection Photo + Vidéo
 * **Description :** Interface de suivi visuel à 6 étapes affichant l'avancement, la photo et la vidéo 360° d'inspection prises en Chine et l'ajustement du solde.

> 💬 PROMPT VS CODE COPILOT :
> Create a Next.js Client Component `OrderTrackingTimeline.tsx` using Tailwind CSS and Lucide React icons.
> Props: `orderStatus` ('PAYMENT_PENDING', 'PURCHASED_CHINA', 'INSPECTION_WEIGHED_CHINA', 'IN_TRANSIT_SN', 'CUSTOMS_DAKAR', 'OUT_FOR_DELIVERY', 'DELIVERED'), `inspectionData` ({ photoUrl, videoUrl, actualWeightKg, adjustedBalanceXOF }).
> Features:
> 1. Responsive multi-step progress bar with status icons.
> 2. When status is 'INSPECTION_WEIGHED_CHINA' or later, show an "Inspection & Pesée Chine" card with:
>    - Thumbnail image opening a modal preview.
>    - HTML5 Video player button "Regarder la vidéo 360°" playing the inspection clip from China warehouse.
>    - Display actual weight vs estimated weight.
>    - Display adjusted final balance to pay upon delivery in Dakar.
> 3. Display clear banner showing: "Solde final à régler à la livraison : X FCFA".

---

### SPRINT 3 : Recherche par Image & Validation Sécurisée des Livraisons (QR Code PWA)

#### 🎯 Ticket 3.1 : Composant de Recherche par Image & Vidéo (Caméra PWA)
 * **Description :** Interface de téléchargement ou prise de photo/vidéo directe avec déclenchement natif de l'appareil photo du smartphone via les API PWA.

> 💬 PROMPT VS CODE COPILOT :
> Create a React component `ImageSearchUploader.tsx` with Tailwind CSS and React Dropzone.
> Functionality:
> 1. Drag & drop or file upload area for image formats (JPG, PNG, WEBP) and video shorts (MP4).
> 2. Mobile camera trigger button using HTML capture attribute `accept="image/*,video/*" capture="environment"` to invoke device camera.
> 3. Image/Video preview player with option to crop/remove.
> 4. Form inputs: Budget estimé (FCFA), Taille/Couleur/Quantité, Numéro WhatsApp.
> 5. Action button: "Trouver ce produit au prix usine Chine" with loading state and toast feedback.

---

#### 🎯 Ticket 3.2 : Générateur de QR Code de Solde pour Validation Livreur (Offline-ready)
 * **Description :** Génération d'un QR code sécurisé côté client fonctionnant même hors-ligne grâce aux Service Workers PWA.

> 💬 PROMPT VS CODE COPILOT :
> Create a React component `DeliveryValidationQRCode.tsx` using `qrcode.react` and Tailwind CSS.
> Props: `orderId`, `remainingBalanceAmount`, `customerPhone`, `isBalancePaid` (boolean).
> Features:
> 1. If `isBalancePaid` is false:
>    - Generate a secure QR code containing a JSON payload: `{ orderId, balanceAmount, token, timestamp }`.
>    - Display instructions: "Présentez ce QR code au livreur Paps. Une fois votre paiement du solde (X FCFA) effectué en espèces ou Mobile Money, le livreur scannera ce code pour libérer le colis."
> 2. If `isBalancePaid` is true:
>    - Display a big green checkmark with text "Solde réglé - Colis prêt à être remis".
> 3. Include a "Pay balance via Wave/Orange Money now" quick-action button.

---

### SPRINT 4 : Notifications Push / WhatsApp Auto & Intégration Paps (COD + QR)

#### 🎯 Ticket 4.1 : Service de Notifications WhatsApp & Push PWA
 * **Description :** Envoi d'alertes automatisées sur WhatsApp et via les Push Notifications Web PWA.

> 💬 PROMPT VS CODE COPILOT :
> Create a Node.js utility module `whatsappNotificationService.ts`.
> Implement functions for sending automated WhatsApp alerts in Senegal format (+221):
> 1. `sendChinaInspectionAlert(phone, orderId, photoUrl, videoUrl, actualWeight, updatedBalance)`:
>    Notification stating the item arrived at the China warehouse, sending links to the inspection photo and 360° video clip, actual weighed metrics and updated balance.
> 2. `sendDakarArrivalAndQRNotice(phone, orderId, finalBalance, qrCodeLink)`:
>    Notification stating the ship/plane arrived in Dakar, reminding the customer of the 1/3 balance and sending the link to their delivery validation QR Code.
> 3. `sendContainerProgressAlert(phone, containerId, currentPercentage)`:
>    Alert informing users on a watchlist that their container is almost full.
> 
> Format all messages cleanly with emojis, line breaks, bold text, and secure direct links (`https://doucoureimport.sn/order/ORDER_ID`).

---

#### 🎯 Ticket 4.2 : Dispatcher Logistique & Remise Cash-on-Delivery (Paps API Integration)
 * **Description :** Préparation du payload de livraison pour Paps avec montant du solde restant (1/3) à collecter et enregistrement du jeton de déverrouillage QR.

> 💬 PROMPT VS CODE COPILOT :
> Create a backend service module `papsDispatchService.ts`.
> Implement function `createPapsDeliveryOrder(orderData)`:
> Input: Customer info, pickup address (Transitaire Warehouse Dakar), delivery address, package dimensions/weight, `remainingBalanceAmount` (1/3 balance).
> Logic:
> 1. Select Paps package category based on weight/dimensions:
>    - Category 'D' if weight < 0.5kg
>    - Category 'S' if weight < 3kg
>    - Category 'M' if weight < 15kg
> 2. Set COD (Cash on Delivery) collection amount = orderData.remainingBalanceAmount.
> 3. Attach validation Token/QR signature in the delivery instructions field for Paps agent verification.
> 4. Return formatted JSON payload ready for Paps API endpoint and mock success response.

---

### SPRINT 5 : Back-Office Administrateur & Configuration des Tarifs Fret Dynamiques

#### 🎯 Ticket 5.1 : Global Shipping Rates Settings (System Settings API)
 * **Description :** Interface admin et table Supabase `system_settings` permettant de modifier en un clic les tarifs au kilo et au CBM pour mettre à jour instantanément tout le catalogue.

> 💬 PROMPT VS CODE COPILOT :
> Create a Next.js Admin Component `GlobalShippingRateSettings.tsx` connected to a Supabase table `system_settings`.
> Form fields:
> - `rateAirExpressXOF` (Number input, e.g. 11000 FCFA)
> - `rateAirEcoXOF` (Number input, e.g. 7500 FCFA)
> - `rateMaritimeCbmXOF` (Number input, e.g. 145000 FCFA)
> - `marginPercentage` (Number input, e.g. 15%)
>
> Features:
> 1. Form allows admin to edit rates and save changes via API route `/api/admin/update-settings`.
> 2. Add a live simulation preview card below the inputs showing how a sample item (e.g., 2kg shoes or 0.05 CBM item) total price updates in real-time as the admin changes input values.
> 3. Action button: "Enregistrer et appliquer à tout le catalogue".
> 4. Toast notification on submit: "Tarifs mis à jour avec succès ! Tout le catalogue reflète désormais ces nouveaux tarifs."

---

#### 🎯 Ticket 5.2 : Support Média Vidéo Produit (Product Rich Media Carousel)
 * **Description :** Carrousel prenant en charge à la fois les images et les vidéos MP4 pour les fiches produits et la modale d'inspection.

> 💬 PROMPT VS CODE COPILOT :
> Create a React component `MediaRichCarousel.tsx` using Tailwind CSS and Lucide React icons.
> Props: `mediaList` (Array of objects `{ type: 'IMAGE' | 'VIDEO', url: string, thumbnail?: string }`).
> Features:
> 1. Render image viewer for type 'IMAGE'.
> 2. Render HTML5 `<video>` player with custom play/pause overlay, mute/unmute control, and fullscreen option for type 'VIDEO'.
> 3. Thumbnail navigation bar at the bottom with a 'Play' badge overlay on video items.
> 4. Responsive, touch-swipe enabled on mobile screens.

---

## 🔄 RAPPEL DESCRIPTION DU FLUX COMPLET (ÉCOSYSTÈME DOUKOURE IMPORT PWA)
```text
[CLIENT] ---> Accède au Web / Installe la PWA ---> Passe commande (Acompte 2/3) 
              │
              ├───> [CHINE] Réception & Pesée réelle à l'entrepôt
              │      ├── Photo + Vidéo d'inspection 360° envoyées sur App PWA / WhatsApp 🎥
              │      └── Solde (1/3) automatiquement ajusté si écart de poids ⚖️
              │
              ├───> [FRET] Transport Aérien/Maritime (Progression du conteneur) 🚢
              │
              └───> [DAKAR] Arrivée chez le transitaire & Transfert vers PAPS 📦
                     ├── PAPS livre au client & encaisse le solde (1/3) (Espèces / Mobile Money)
      └── Le livreur scanne le CODE QR sur la PWA du client pour valider la livraison 🟢
```

---

## ✅ BACKLOG EXÉCUTABLE POST-AUDIT (TPM + LEAD QA)

### Objectif
Convertir les écarts de couverture en tickets sprint-ready, avec exécution séquencée, critères d'acceptation testables, dépendances, risques et plan QA.

### Ordre d'exécution recommandé (critique vers support)
1. **6.4 Paiements Mobile Money E2E**
2. **6.6 Sécurité Admin, RBAC, RLS & Audit Trail**
3. **6.3 Offline-first QR & Pass Livraison**
4. **6.8 State Machine Logistique unifiée**
5. **6.5 Recalcul global catalogue transactionnel**
6. **6.9 Quality Gates non-fonctionnels + observabilité**
7. **6.7 Contrat média inspection sécurisé**
8. **6.1 Design System exécutable**
9. **6.10 Industrialisation Figma -> GitHub**
10. **6.2 ADR convergence architecture (Vite/Next.js)**

### Règle d'exécution
- Démarrer chaque ticket avec un mini plan de 5 points (analyse, implémentation, tests, validation, rollback).
- Ne pas bloquer tout le sprint sur un ticket: si bloqué, passer au ticket suivant non bloquant.
- Fermer chaque ticket avec preuves: tests, captures UI, logs, et impacts DB/API.

---

### 🎯 Ticket 6.1 : Design System exécutable (tokens + composants + conformité)
**Description**
Industrialiser la charte visuelle (palette, typo, états) en système testable pour éviter la dérive UI.

**Dépendances**
- Aucune dépendance forte.

**Estimation**
- 3 à 4 jours.

**Risques**
- Régression visuelle sur composants existants.
- Dette de styles hardcodés.

**Critères d'acceptation (Given/When/Then)**
- Given un composant UI, when il est rendu, then ses couleurs/typo proviennent des tokens officiels.
- Given un état disabled/loading/error, when affiché, then il suit les styles standards design system.
- Given le pipeline CI, when un style hardcodé interdit est commité, then le contrôle échoue.

**Plan QA**
- Tests unitaires composants de base.
- Tests visuels snapshots/storybook.
- Vérification accessibilité (contraste, focus, clavier).

**Prompt VS Code Copilot**
> Create a complete Design System foundation for Doukoure Import in a React + Tailwind project.
> 1. Define design tokens for colors, typography, spacing, radius, shadows, and semantic states.
> 2. Enforce PRD palette and typography through CSS variables and Tailwind theme extension.
> 3. Create reusable components: Button, Badge, Card, Input, Tooltip, Modal, ProgressBar.
> 4. Add visual regression stories and unit tests for all variants.
> 5. Add a check to prevent hardcoded colors outside tokens.

---

### 🎯 Ticket 6.2 : ADR de convergence architecture (Vite actuel vs cible Next.js)
**Description**
Documenter la décision d'architecture et, si nécessaire, le plan de convergence sans rupture produit.

**Dépendances**
- Peut s'exécuter en parallèle des tickets 6.4/6.6.

**Estimation**
- 1 à 2 jours.

**Risques**
- Dérive roadmap si la décision est tardive.
- Coût de migration sous-estimé.

**Critères d'acceptation (Given/When/Then)**
- Given les contraintes produit, when ADR finalisé, then un choix explicite est acté avec trade-offs.
- Given un besoin de migration, when le plan est validé, then il inclut risques, rollback, séquençage.

**Plan QA**
- Revue d'architecture croisée (tech + produit).
- Check-list impacts perf, SEO, PWA offline, delivery.

**Prompt VS Code Copilot**
> Generate an Architecture Decision Record package for Doukoure Import.
> 1. Compare Next.js App Router PWA vs current React Vite setup.
> 2. Produce ADR with chosen direction and migration plan.
> 3. If migration is required, scaffold tasks for routing, SW/PWA, API routes, env config.
> 4. Add acceptance checklist and rollback plan.

---

### 🎯 Ticket 6.3 : Offline-first complet du Pass de livraison et QR
**Description**
Garantir usage hors-ligne réel du pass et synchronisation fiable au retour réseau.

**Dépendances**
- Dépend de 6.8 pour cohérence des transitions d'état (faible dépendance).

**Estimation**
- 3 à 5 jours.

**Risques**
- Conflits de synchro et double validation.
- Comportement hétérogène selon navigateur mobile.

**Critères d'acceptation (Given/When/Then)**
- Given le téléphone hors-ligne, when l'utilisateur ouvre le pass récent, then QR et données essentielles restent visibles.
- Given une validation effectuée hors-ligne, when le réseau revient, then la synchro est rejouée une seule fois (idempotente).
- Given conflit serveur/client, when synchronisation, then la résolution suit la règle horodatage + idempotency key.

**Plan QA**
- E2E mode avion/reconnexion.
- Tests d'idempotence de la file offline.
- Tests de non-régression sur DeliveryPass.

**Prompt VS Code Copilot**
> Implement offline-first delivery pass and QR validation flow.
> 1. Cache delivery pass data and QR payload in IndexedDB.
> 2. Add service worker strategies for order/pass endpoints.
> 3. Queue offline validations and sync on reconnect.
> 4. Resolve conflicts with server timestamps and idempotency keys.
> 5. Add E2E tests for airplane mode and reconnection sync.

---

### 🎯 Ticket 6.4 : Paiement Wave / Orange Money E2E
**Description**
Implémenter la boucle transactionnelle complète (initiation -> webhook -> réconciliation -> libération colis).

**Dépendances**
- Dépend de 6.6 (sécurité) pour mise en production.

**Estimation**
- 4 à 6 jours.

**Risques**
- Double encaissement si idempotence absente.
- Callback provider non fiable.

**Critères d'acceptation (Given/When/Then)**
- Given un solde dû, when l'utilisateur initie un paiement, then une transaction traçable est créée.
- Given un webhook valide, when reçu, then le solde et le statut commande sont mis à jour exactement une fois.
- Given un webhook invalide/signature fausse, when reçu, then aucun changement métier n'est appliqué.

**Plan QA**
- Tests d'intégration webhook signé/non signé.
- Tests de replay webhook (idempotence).
- Tests E2E paiement confirmé et échec.

**Prompt VS Code Copilot**
> Build end-to-end mobile money payment integration for Senegal (Wave and Orange Money).
> 1. Add backend payment adapters with a common interface.
> 2. Implement payment initiation endpoint for remaining balance.
> 3. Implement webhook verification, signature validation, and idempotent updates.
> 4. Update order transitions and delivery release flag only on confirmed payment.
> 5. Add failure/retry flows, reconciliation logs, and sandbox test doubles.

---

### 🎯 Ticket 6.5 : Recalcul global catalogue transactionnel
**Description**
Transformer le bouton admin en pipeline de repricing robuste, monitoré et réversible.

**Dépendances**
- Recommandé après 6.8 (state machine) et 6.6 (audit trail).

**Estimation**
- 3 à 5 jours.

**Risques**
- Repricing partiel silencieux.
- Incohérence entre prix affiché et prix commandable.

**Critères d'acceptation (Given/When/Then)**
- Given un changement de taux, when l'admin lance la mise à jour, then un job batch est créé avec progression.
- Given une panne milieu de lot, when reprise, then le job reprend sans doubler les updates.
- Given besoin rollback, when exécuté, then le catalogue revient à la version précédente.

**Plan QA**
- Tests de charge sur catalogue volumineux.
- Tests de reprise après incident.
- Vérification historique des versions de prix.

**Prompt VS Code Copilot**
> Implement global catalog repricing pipeline triggered by system settings update.
> 1. Add a repricing job with batch processing and progress tracking.
> 2. Version price snapshots and keep history for rollback.
> 3. Ensure idempotency and concurrency safety.
> 4. Expose admin job status endpoint and UI progress indicator.
> 5. Add integration tests for large catalogs and recovery.

---

### 🎯 Ticket 6.6 : Sécurité admin, RBAC, RLS et audit trail
**Description**
Sécuriser les actions admin et assurer la traçabilité complète des changements sensibles.

**Dépendances**
- Aucune, prioritaire avant mise en prod de 6.4 et 6.5.

**Estimation**
- 3 à 4 jours.

**Risques**
- Élévation de privilèges.
- Modification de taux non attribuable.

**Critères d'acceptation (Given/When/Then)**
- Given un utilisateur non-admin, when il appelle l'endpoint admin, then l'accès est refusé.
- Given un admin modifie des taux, when sauvegarde, then un audit log immuable est écrit (avant/après, acteur, timestamp).
- Given une tentative abusive, when seuil dépassé, then le rate limiting bloque l'opération.

**Plan QA**
- Tests d'autorisation (positifs/négatifs).
- Tests RLS Supabase.
- Vérification intégrité audit trail.

**Prompt VS Code Copilot**
> Harden admin security for settings management.
> 1. Implement role-based access control for admin routes and actions.
> 2. Add Supabase RLS policies for system settings and audit tables.
> 3. Create immutable audit logs for all settings changes.
> 4. Add server-side validation and rate limiting.
> 5. Add security tests for unauthorized access attempts.

---

### 🎯 Ticket 6.7 : Contrat média inspection sécurisé
**Description**
Sécuriser l'accès photos/vidéos inspection et gérer la robustesse réseau.

**Dépendances**
- Peut être implémenté en parallèle de 6.9.

**Estimation**
- 2 à 3 jours.

**Risques**
- Fuite de médias par URL publique.
- Expérience dégradée sur réseau lent.

**Critères d'acceptation (Given/When/Then)**
- Given un média inspection, when consulté, then l'accès se fait via URL signée TTL court.
- Given un utilisateur non autorisé, when accès demandé, then la ressource est refusée.
- Given réseau faible, when lecture vidéo, then fallback UX et retry sont proposés.

**Plan QA**
- Tests autorisation et expiration URL signées.
- Tests UX en faible bande passante.

**Prompt VS Code Copilot**
> Implement secure inspection media delivery.
> 1. Use signed URLs with short TTL for photo/video access.
> 2. Add media metadata model (duration, size, codec, capture timestamp).
> 3. Add fallback UI for slow networks and broken media.
> 4. Add access control for order owner/admin only.
> 5. Add monitoring for media load failures and retries.

---

### 🎯 Ticket 6.8 : State machine logistique unifiée
**Description**
Unifier les statuts commande/livraison/paiement et verrouiller les transitions.

**Dépendances**
- Base commune pour 6.3, 6.4, 6.5.

**Estimation**
- 3 à 4 jours.

**Risques**
- Régression si mapping statuts legacy incomplet.

**Critères d'acceptation (Given/When/Then)**
- Given un statut courant, when transition demandée, then seules les transitions autorisées passent.
- Given prérequis manquant, when transition demandée, then erreur métier explicite est renvoyée.
- Given transition validée, when persistée, then un log immuable est écrit avec idempotency key.

**Plan QA**
- Tests unitaires des transitions.
- Tests d'intégration API de transition.
- Tests de migration statuts existants.

**Prompt VS Code Copilot**
> Create a typed order lifecycle state machine for Doukoure Import.
> 1. Define allowed states and transitions from payment pending to delivered.
> 2. Add guards for transition prerequisites.
> 3. Persist transition logs and enforce idempotency keys.
> 4. Expose transition API with validation errors.
> 5. Add unit and integration tests for valid/invalid transitions.

---

### 🎯 Ticket 6.9 : Quality gates non-fonctionnels + observabilité
**Description**
Mettre en place budgets perf, SLO critiques et alerting sur parcours métier sensibles.

**Dépendances**
- Aucune forte, recommandé en continu.

**Estimation**
- 2 à 3 jours.

**Risques**
- Détection tardive des régressions perf/fiabilité.

**Critères d'acceptation (Given/When/Then)**
- Given un build CI, when budgets LCP/INP/CLS dépassés, then le pipeline échoue.
- Given un parcours critique, when erreur backend/front survient, then un événement monitoré est émis.
- Given un run pipeline, when terminé, then un rapport QA synthétique est généré.

**Plan QA**
- Synthetic checks sur flux commande/suivi/pass/paiement.
- Tests de non-régression bundle et Web Vitals.

**Prompt VS Code Copilot**
> Add non-functional quality gates and observability.
> 1. Define performance budgets for LCP, INP, CLS and bundle size.
> 2. Instrument frontend/backend with error tracking and business events.
> 3. Add synthetic checks for create-order, tracking, delivery pass, payment callback.
> 4. Configure CI to fail on regressions.
> 5. Produce QA dashboard summary artifact after each run.

---

### 🎯 Ticket 6.10 : Industrialisation du workflow Figma -> GitHub
**Description**
Fiabiliser la chaîne design-to-code pour réduire les écarts de rendu.

**Dépendances**
- Recommandé après 6.1.

**Estimation**
- 2 à 3 jours.

**Risques**
- Drift UI après imports automatiques.

**Critères d'acceptation (Given/When/Then)**
- Given une synchro Figma, when PR ouverte, then les checks de conformité tokens passent.
- Given écrans clés, when diff visuel détecté, then alerte et validation manuelle requise.

**Plan QA**
- Visual diff sur écrans 1 à 5.
- Contrôles de conformité design tokens.

**Prompt VS Code Copilot**
> Implement design-to-code governance for Figma sync workflow.
> 1. Add a safe import process with review checkpoints.
> 2. Add automated checks for token compliance and style drift.
> 3. Add screenshot-based visual diff checks for key screens.
> 4. Generate release notes listing UI changes and impacted components.
> 5. Add rollback instructions for bad sync merges.

---

## 🧪 Plan QA transverse (définition de done de sprint)
- **Tests unitaires**: moteur de pricing, state machine, adaptateurs paiement.
- **Tests d'intégration**: webhooks, Supabase RLS, repricing batch, génération QR.
- **Tests E2E**: création commande -> suivi -> pass -> paiement -> libération.
- **Tests offline**: ouverture pass et validation différée sans réseau.
- **Tests sécurité**: permissions admin, endpoints sensibles, signature webhook.
- **Tests performance**: budget bundle, Web Vitals, lazy loading écrans critiques.

## 📌 Découpage sprint conseillé
- **Sprint A (Critique prod)**: 6.4 + 6.6 + 6.8
- **Sprint B (Résilience opérationnelle)**: 6.3 + 6.5 + 6.9
- **Sprint C (Qualité UX & gouvernance)**: 6.7 + 6.1 + 6.10 + 6.2