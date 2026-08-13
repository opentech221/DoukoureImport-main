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