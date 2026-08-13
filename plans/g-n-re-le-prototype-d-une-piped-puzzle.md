# Plan : Prototype Doukoure Import PWA

## Context

Doukoure Import est une plateforme de proxy-buying Chine→Sénégal avec social commerce. L'objectif est de prototyper 5 écrans clés en React + Tailwind CSS v4 dans le projet Vite existant, avec une approche mobile-first et un design system fintech moderne (Indigo #1E1B4B, Émeraude #059669, Ambre #D97706).

L'App.tsx actuel ne contient qu'un squelette vide. On va le remplacer compètement par la PWA Doukoure Import.

## Stance & Typographie

- **Stance** : data-dense fintech — densité informationnelle maximale, hiérarchie claire, codage couleur fonctionnel
- **Fonts** : Plus Jakarta Sans (body/UI mobile-first) + JetBrains Mono (prix/chiffres/codes)
- **Ground** : Fond #F8FAFC clair avec cartes blanches, header Indigo profond, accents émeraude/ambre

## Architecture des fichiers

```
src/
├── index.css                        # @import fonts + CSS variables
├── App.tsx                          # Navigation 5 écrans + PWA banner
├── utils/
│   └── pricingEngine.ts             # Calcul acompte 2/3, solde 1/3, ajustement pesée
└── screens/
    ├── ProductPage.tsx              # Écran 1 : Fiche produit + tarification dynamique
    ├── HomePage.tsx                 # Écran 2 : Accueil + widget FOMO conteneur
    ├── TrackingDashboard.tsx        # Écran 3 : Timeline 6 étapes + inspection média
    ├── DeliveryPass.tsx             # Écran 4 : Pass livraison + QR code
    └── AdminPanel.tsx               # Écran 5 : Back-office tarifs (desktop)
```

## Détail des modifications

### `src/index.css`
- Ajouter `@import` Google Fonts (Plus Jakarta Sans + JetBrains Mono) **avant** `@import 'tailwindcss'`
- Définir variables CSS `--color-primary: #1E1B4B`, `--color-success: #059669`, `--color-amber: #D97706`
- `font-family` par défaut sur `body`

### `src/utils/pricingEngine.ts` (nouveau)
- `calculateInitialImportPrice()` : basePriceXOF + weight/CBM → shippingCost, totalPrice, deposit (2/3), balance (1/3)
- `recalculateBalance()` : ajustement après pesée réelle
- Taux par défaut : Air Express 11 000 FCFA/kg, Air Éco 7 500 FCFA/kg, Maritime 145 000 FCFA/m³

### `src/App.tsx`
- État `currentScreen` pour naviguer entre les 5 écrans
- Barre de navigation mobile bottom (icons + labels)
- Bandeau PWA install (simulated `beforeinstallprompt`)
- Bouton "Admin" pour accéder au back-office desktop

### Écran 1 — `ProductPage.tsx`
- Carrousel média : photos HD + badge vidéo (mock HTML5 video)
- Toggle 3 modes : Aérien Express / Aérien Éco / Fret Maritime
- Carte prix dynamique : badge émeraude Acompte 2/3 + Solde 1/3 (calculé live avec pricingEngine)
- Disclaimer pesée réelle en Chine
- Boutons : "Commander maintenant" + "Partager sur WhatsApp"

### Écran 2 — `HomePage.tsx`
- Header avec logo + zone de recherche
- Widget FOMO : barre de progression animée conteneur (CSS animation) + compte à rebours
- Bouton "Partager sur WhatsApp" (lien pré-rempli)
- Zone recherche visuelle : drag & drop + bouton caméra (`accept="image/*,video/*" capture="environment"`)
- Grille produits populaires (mock)

### Écran 3 — `TrackingDashboard.tsx`
- Timeline visuelle 6 étapes avec icônes Lucide (statut actif = indigo, complété = émeraude)
- Étapes : Paiement → Achat Chine → Inspection/Pesée → En Transit → Douane Dakar → Livré
- Card inspection (état INSPECTION_WEIGHED) : miniature photo + bouton "Regarder vidéo 360°" (modal)
- Bandeau "Solde ajusté : X FCFA à régler à la livraison"
- Affichage poids estimé vs poids réel

### Écran 4 — `DeliveryPass.tsx`
- Card livreur Paps avec détails commande
- QR code SVG généré côté client (SVG manuel ou mock visuel réaliste)
- Instructions : "Présentez ce QR code au livreur Paps"
- Bouton "Payer via Wave / Orange Money" (CTA émeraude)
- État `isBalancePaid` : affichage checkmark vert si réglé

### Écran 5 — `AdminPanel.tsx`
- Layout desktop 2 colonnes (formulaire | simulation)
- Formulaire : inputs numériques pour rateAirExpress, rateAirEco, rateMaritime, marginPercentage
- Panneau simulation live : recalcul en temps réel d'un exemple (chaussures 2kg, boîte 0.05 CBM)
- Bouton "Enregistrer et appliquer à tout le catalogue" + toast de confirmation
- Tableau récapitulatif des anciens vs nouveaux tarifs

## Données mock réalistes

- Produit : "Sneakers Nike Air Max 2024" — 45 000 FCFA base, 1.2 kg, Dakar #104 conteneur 65%
- Commande : ORD-2024-0847, client Mamadou Diallo, téléphone +221 77 123 4567
- Départ conteneur : dans 3 jours 14h 22min
- Statut tracking : `INSPECTION_WEIGHED_CHINA` (étape 3/6)
- Solde ajusté : 28 750 FCFA (poids réel 1.4 kg vs estimé 1.2 kg)

## Vérification

1. Le dev server Vite tourne déjà — hot reload confirme les changements visuellement
2. Tester la navigation entre tous les 5 écrans
3. Vérifier le calcul dynamique des prix en changeant le mode de livraison (Écran 1)
4. Vérifier la simulation live côté admin (Écran 5)
5. Vérifier le responsive mobile (375px) et desktop (1280px+)
