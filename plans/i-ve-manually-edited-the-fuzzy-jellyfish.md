# Plan : Connexion Supabase — Comportements Interactifs Complets

## Context

L'application Doukoure Import (React 19 + Vite + Tailwind CSS v4) possède tous ses composants UI, mais toutes les données sont actuellement hardcodées. Le fichier `utils/supabase/info.tsx` contient les credentials du projet Supabase (projectId + publicAnonKey), mais aucun client n'est initialisé et aucune table n'est requêtée. Ce plan connecte chaque écran à son backend Supabase selon la feuille de route fournie.

---

## Étape 0 — Installation & Client Supabase

**Installer** : `pnpm add @supabase/supabase-js`

**Créer** `src/lib/supabaseClient.ts` :
```ts
import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../../utils/supabase/info'

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
)
```

---

## Étape 1 — Tables Supabase attendues

À créer dans le dashboard Supabase (ou via SQL) :

| Table | Colonnes clés |
|---|---|
| `system_settings` | `id`, `rate_air_express_xof`, `rate_air_eco_xof`, `rate_maritime_cbm_xof`, `margin_percentage`, `updated_at` |
| `products` | `id`, `name`, `price_xof`, `rating`, `badge`, `image_url`, `category` |
| `containers` | `id`, `container_id`, `target_cbm`, `allocated_cbm`, `client_count`, `departure_date` |
| `orders` | `id`, `order_ref`, `customer_name`, `customer_phone`, `product_id`, `product_name`, `shipping_option`, `base_price_xof`, `deposit_paid_xof`, `balance_xof`, `estimated_weight`, `actual_weight`, `status`, `inspection_photo_url`, `inspection_video_url`, `created_at` |
| `visual_search_requests` | `id`, `file_url`, `budget_xof`, `size_color_qty`, `whatsapp_phone`, `status`, `created_at` |

---

## Étape 2 — GlobalShippingRateSettings (Ticket 5.1)

**Fichier** : `src/components/GlobalShippingRateSettings.tsx`

- Au montage : `supabase.from('system_settings').select('*').single()` → pré-remplir les 4 champs.
- `onSave` : `supabase.from('system_settings').upsert({...rates, id: 1})` → toast de confirmation.
- `AdminPanel.tsx` : passer `onSave` réel à `GlobalShippingRateSettings`, supprimer le mock.

---

## Étape 3 — HomePage : Données réelles (Tickets 2.1, 2.3)

**Fichier** : `src/screens/HomePage.tsx`

### SharedContainerProgress
- Fetch : `supabase.from('containers').select('*').order('departure_date').limit(1).single()`
- Passer les vraies props (containerId, targetCBM, allocatedCBM, clientCount, departureDate) au composant.

### PopularProductsGrid (grille existante dans HomePage)
- Fetch : `supabase.from('products').select('*').order('rating', { ascending: false }).limit(8)`
- Remplacer le tableau `MOCK_PRODUCTS` par les données Supabase.
- Afficher un skeleton loader pendant le chargement.

---

## Étape 4 — ImageSearchUploader (Ticket 2.2)

**Fichier** : `src/components/ImageSearchUploader.tsx`

Au submit :
1. Upload du fichier via `supabase.storage.from('search-uploads').upload(path, file)` → récupérer l'URL publique.
2. Insert dans `visual_search_requests` : `supabase.from('visual_search_requests').insert({file_url, budget_xof, size_color_qty, whatsapp_phone})`.
3. Toast "Demande envoyée avec succès !" (déjà présent dans le composant, juste brancher sur le succès réel).

---

## Étape 5 — TrackingDashboard : Données réelles (Tickets 3.1, 3.2)

**Fichier** : `src/screens/TrackingDashboard.tsx`

- Fetch : `supabase.from('orders').select('*').eq('order_ref', 'ORD-2024-0847').single()`
- Mapper les colonnes snake_case vers les props camelCase attendues par `OrderTrackingTimeline`.
- Afficher un état de chargement.

---

## Étape 6 — ProductStickyActions (Ticket 1.2.C) — Nouveau composant

**Créer** `src/components/ProductStickyActions.tsx`

Props : `productName`, `productRef`, `depositAmountXOF`, `selectedShippingOption`

- Barre sticky `fixed bottom-0` avec `backdrop-blur`.
- Bouton principal vert : "Commander — Payer l'acompte X FCFA" → ouvre un `<dialog>` Modal Mobile Money.
- Modal : formulaire avec nom, téléphone (Wave/Orange Money), montant pré-rempli. Au submit : `supabase.from('orders').insert({...})` → toast de confirmation + fermer le modal.
- Bouton secondaire : lien WhatsApp pré-rempli (déjà implémenté dans ProductPage, à déplacer ici).

**Intégrer dans** `src/screens/ProductPage.tsx` : remplacer les boutons CTA existants par `<ProductStickyActions />`.

---

## Étape 7 — DeliveryPass : Mise à jour statut paiement (Ticket 4.2)

**Fichier** : `src/screens/DeliveryPass.tsx` et `src/components/DeliveryValidationQRCode.tsx`

- Fetch initial : `supabase.from('orders').select('*').eq('id', orderId).single()`.
- Bouton "Payer via Wave / Orange Money" → même modal que Étape 6.
- Après paiement confirmé : `supabase.from('orders').update({ status: 'PAID', balance_xof: 0 }).eq('id', orderId)` → badge vert "Solde entièrement réglé ✓".

---

## Étape 8 — Navigation (App.tsx)

Ajouter un état `selectedOrderId` et `selectedProductId` pour permettre la navigation vers un order/produit précis depuis la grille ou le tracking. Pour l'instant, les IDs hardcodés (`ORD-2024-0847`) restent les valeurs par défaut si aucun ID n'est sélectionné.

---

## Composants déjà en place (pas de changement UI)

- `InstallPWABanner.tsx` — Complet, aucune connexion Supabase requise.
- `MediaRichCarousel.tsx` — Complet, données passées en props.
- `ShippingOptionSelector.tsx` — Complet, logique locale via pricingEngine.
- `OrderTrackingTimeline.tsx` — Complet, reçoit les données en props.
- `GlobalShippingRateSettings.tsx` — UI complète, seule la connexion Supabase manque.

---

## Ordre d'implémentation

1. Installer `@supabase/supabase-js` + créer `src/lib/supabaseClient.ts`
2. GlobalShippingRateSettings → Supabase read/write
3. HomePage → containers + products depuis Supabase
4. ImageSearchUploader → upload + insert
5. TrackingDashboard → fetch order réel
6. ProductStickyActions → nouveau composant + modal + insert order
7. DeliveryPass → fetch + update paiement

---

## Vérification

- **Admin** : Modifier un taux dans AdminPanel → vérifier en DB Supabase que `system_settings` est mis à jour.
- **HomePage** : Les produits et le conteneur s'affichent depuis Supabase (pas les mocks).
- **Recherche visuelle** : Uploader une image → vérifier dans Supabase Storage + table `visual_search_requests`.
- **Commande** : Cliquer "Commander" sur ProductPage → vérifier l'insert dans `orders`.
- **Tracking** : L'écran affiche bien les données de l'ordre Supabase.
- **Delivery Pass** : Simuler paiement → statut mis à jour en DB.
