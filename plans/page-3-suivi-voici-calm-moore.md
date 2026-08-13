# Plan — Page 4 Pass : Interactivité complète

## Context

La page Pass (`DeliveryPass` + `DeliveryValidationQRCode`) est déjà substantiellement construite. Ce plan corrige 4 lacunes fonctionnelles identifiées en comparant la spec à l'implémentation existante :

1. **Badge Paps dynamique** : "En attente" → "En cours de livraison" selon `orderStatus` — actuellement hard-codé.
2. **Double CTA dupliqué** : `DeliveryPass.tsx` a sa propre section "actions paiement" (bouton + copy + badges) **ET** `DeliveryValidationQRCode` en a une autre. L'utilisateur voit deux boutons "Payer" et deux boutons "Copier". À unifier.
3. **`onPaymentInitiated` non câblé** : `DeliveryValidationQRCode` est monté sans le prop `onPaymentInitiated`, donc son bouton interne déclenche une simulation (paid après 2s) au lieu d'ouvrir le modal de paiement de `DeliveryPass`.
4. **OfflineBadge statique** : le composant lit `navigator.onLine` une seule fois au montage sans écouter les événements `online`/`offline` — la spec exige une réactivité temps réel.

---

## Fichiers critiques

| Fichier | Rôle |
|---|---|
| `src/screens/DeliveryPass.tsx` | Fetch Supabase + modal paiement + orchestration |
| `src/components/DeliveryValidationQRCode.tsx` | QR code + instructions + CTA (source de vérité UI) |

---

## Implémentation détaillée

### 1. `DeliveryPass.tsx` — Supprimer la section dupliquée + câbler `onPaymentInitiated`

**Supprimer les lignes 186–220** (la section `{!ORDER.isBalancePaid && ...}` avec bouton Payer, CopyOrderId, et badges) — tout cela est déjà dans `DeliveryValidationQRCode`.

**Câbler le prop manquant** sur le composant QR :
```tsx
<DeliveryValidationQRCode
  orderId={ORDER.orderId}
  remainingBalanceAmount={ORDER.balanceAmount}
  customerPhone={ORDER.customerPhone}
  isBalancePaid={ORDER.isBalancePaid}
  onPaymentInitiated={() => setPayModal(true)}   // ← câblé ici
/>
```

**Rendre le badge Paps dynamique** : ajouter `orderStatus` au state (récupéré depuis `data.status`), puis calculer le label du badge :
```tsx
const papsStatus = orderStatus === 'OUT_FOR_DELIVERY'
  ? 'En cours de livraison'
  : orderStatus === 'DELIVERED'
    ? 'Livré ✓'
    : 'En attente'

const papsStatusStyle =
  orderStatus === 'DELIVERED'       ? { background: '#F0FDF4', color: '#059669' }
  : orderStatus === 'OUT_FOR_DELIVERY' ? { background: '#EEF2FF', color: '#4338CA' }
  : { background: '#FFF7ED', color: '#D97706' }
```

### 2. `DeliveryValidationQRCode.tsx` — OfflineBadge réactif

Remplacer le `useState` statique par des event listeners :
```tsx
function OfflineBadge() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return ( /* badge inchangé */ )
}
```

Ajouter `useEffect` aux imports (déjà importé dans le fichier via `useMemo` — vérifier).

---

## Ce qui n'est PAS à modifier

- La logique du QR Code SVG (finder patterns, timing, payload JSON signé) — déjà conforme à la spec
- Le compte à rebours d'expiration (48h) — déjà implémenté
- Le modal Mobile Money dans `DeliveryPass` (champ nom, téléphone, Wave/Orange) — déjà complet
- La `PaidView` (confirmation verte) — déjà complète
- La `CopyOrderId` et les 3 instructions dans `DeliveryValidationQRCode` — déjà conformes

---

## Vérification

1. Naviguer vers l'onglet **Pass**.
2. Vérifier que le badge Paps affiche "En attente" (status DB = INSPECTION_WEIGHED_CHINA).
3. Cliquer "Payer le solde via Wave / Orange Money" → le modal de paiement s'ouvre (pas de simulation 2s).
4. Vérifier qu'il n'y a **qu'un seul** bouton Payer et **qu'un seul** bouton Copier visibles à l'écran.
5. Désactiver le réseau dans DevTools → badge passe à rouge "Hors-ligne — QR disponible".
6. Rétablir le réseau → badge repasse au vert "En ligne" sans rechargement.
7. Simuler `orderStatus = 'OUT_FOR_DELIVERY'` dans les fallbacks → badge Paps devient "En cours de livraison" bleu-indigo.
