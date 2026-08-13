/**
 * papsDispatchService — Ticket 4.2
 *
 * Module de création d'ordres de livraison Paps avec collecte du solde
 * Cash-on-Delivery (COD = solde 1/3 Doukoure Import) et jeton QR de validation.
 *
 * En production : appeler l'endpoint réel Paps API avec la clé API configurée
 * dans PAPS_API_KEY. En développement / prototype : retourne un payload mocké.
 *
 * Règles de catégorisation colis Paps (Sénégal) :
 *   Catégorie D : < 0.5 kg  (petits colis légers)
 *   Catégorie S : < 3 kg    (standard)
 *   Catégorie M : < 15 kg   (moyen)
 *   Catégorie L : ≥ 15 kg   (lourd — requiert approbation)
 */

// ---------------------------------------------------------------------------
// Types & interfaces
// ---------------------------------------------------------------------------

export type PapsCategory = 'D' | 'S' | 'M' | 'L'

export interface Address {
  fullName: string
  phone: string
  /** Numéro de rue + rue */
  street: string
  /** Quartier / commune */
  district: string
  /** Ville (Dakar, Thiès, …) */
  city: string
  /** Notes supplémentaires pour le livreur */
  instructions?: string
  /** Coordonnées GPS optionnelles */
  coordinates?: { lat: number; lng: number }
}

export interface PackageInfo {
  description: string
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  /** Valeur marchande déclarée (FCFA) — pour l'assurance Paps */
  declaredValueXOF?: number
  isFragile?: boolean
}

export interface OrderData {
  orderId: string
  customerId: string
  customerPhone: string
  /** Adresse de collecte = entrepôt transitaire Doukoure Import à Dakar */
  pickupAddress: Address
  /** Adresse de livraison finale chez le client */
  deliveryAddress: Address
  packageInfo: PackageInfo
  /** Solde 1/3 à encaisser en COD (FCFA) */
  remainingBalanceAmount: number
  /** Token de validation QR généré par DeliveryValidationQRCode */
  validationToken: string
  /** Date de disponibilité du colis à l'entrepôt */
  availableFrom?: string
  /** Créneau de livraison souhaité (ex: "matin 08h-12h") */
  preferredSlot?: string
}

export interface PapsDeliveryPayload {
  /** Référence interne Paps */
  reference: string
  /** Référence externe (notre orderId) */
  externalReference: string
  pickup: {
    name: string
    phone: string
    address: string
    instructions: string
  }
  delivery: {
    name: string
    phone: string
    address: string
    instructions: string
    coordinates?: { lat: number; lng: number }
  }
  package: {
    category: PapsCategory
    description: string
    weightKg: number
    dimensions: string
    isFragile: boolean
    declaredValueXOF: number
  }
  cod: {
    enabled: true
    amountXOF: number
    currency: 'XOF'
    paymentMethods: ('CASH' | 'WAVE' | 'ORANGE_MONEY')[]
  }
  validation: {
    token: string
    instructions: string
  }
  scheduling: {
    availableFrom: string
    preferredSlot: string
  }
  status: 'PENDING'
  createdAt: string
}

export interface PapsDispatchResult {
  success: boolean
  payload: PapsDeliveryPayload
  /** ID assigné par Paps (ou mock en dev) */
  papsOrderId: string
  /** URL de suivi Paps */
  trackingUrl: string
  /** Erreur éventuelle */
  error?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sélectionne la catégorie Paps en fonction du poids réel du colis.
 * Basé sur la grille tarifaire Paps Sénégal (2024).
 */
export function selectPapsCategory(weightKg: number): PapsCategory {
  if (weightKg < 0.5)  return 'D'
  if (weightKg < 3)    return 'S'
  if (weightKg < 15)   return 'M'
  return 'L'
}

/** Formate une adresse complète en une seule ligne pour l'API Paps. */
function formatAddress(addr: Address): string {
  return [addr.street, addr.district, addr.city].filter(Boolean).join(', ')
}

/** Génère une référence Paps unique basée sur notre orderId. */
function generatePapsRef(orderId: string): string {
  const ts  = Date.now().toString(36).toUpperCase()
  const oid = orderId.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase()
  return `PAPS-DI-${oid}-${ts}`
}

/** Adresse par défaut de l'entrepôt transitaire Doukoure Import à Dakar. */
export const DOUKOURE_WAREHOUSE: Address = {
  fullName:     'Doukoure Import — Entrepôt Dakar',
  phone:        '+221 33 820 00 00',
  street:       'Zone Industrielle Petersen, Rue 10',
  district:     'Plateau',
  city:         'Dakar',
  instructions: 'Entrepôt transit import Chine. Demander M. Doukoure à l\'accueil.',
}

// ---------------------------------------------------------------------------
// Fonction principale
// ---------------------------------------------------------------------------

/**
 * Crée un ordre de livraison Paps COD pour la remise du solde 1/3
 * et valide la transaction via le jeton QR généré côté client.
 *
 * @param orderData - Données complètes de la commande client
 * @returns Payload formaté pour l'API Paps + résultat de l'envoi
 *
 * @example
 * ```typescript
 * const result = await createPapsDeliveryOrder({
 *   orderId:               'ORD-2024-0847',
 *   customerId:            'USR-001',
 *   customerPhone:         '+221771234567',
 *   pickupAddress:         DOUKOURE_WAREHOUSE,
 *   deliveryAddress: {
 *     fullName:   'Mamadou Diallo',
 *     phone:      '+221771234567',
 *     street:     'Villa 34',
 *     district:   'Sacré-Cœur 3',
 *     city:       'Dakar',
 *   },
 *   packageInfo: {
 *     description:     'Nike Air Max 2024 x1',
 *     weightKg:        1.4,
 *     lengthCm:        32, widthCm: 22, heightCm: 12,
 *     declaredValueXOF: 58_750,
 *     isFragile:       false,
 *   },
 *   remainingBalanceAmount: 28_750,
 *   validationToken:        'DI-A3F8B2C1',
 * })
 * ```
 */
export async function createPapsDeliveryOrder(
  orderData: OrderData,
): Promise<PapsDispatchResult> {
  const {
    orderId, packageInfo, pickupAddress, deliveryAddress,
    remainingBalanceAmount, validationToken,
    availableFrom, preferredSlot,
  } = orderData

  const category  = selectPapsCategory(packageInfo.weightKg)
  const papsRef   = generatePapsRef(orderId)
  const createdAt = new Date().toISOString()

  const validationInstructions = [
    `IMPORTANT — Validation COD Doukoure Import`,
    `Scannez le QR code affiché sur l'application du client (${orderData.customerPhone}).`,
    `Token de sécurité : ${validationToken}`,
    `Montant à encaisser : ${new Intl.NumberFormat('fr-SN').format(remainingBalanceAmount)} FCFA`,
    `Modes de paiement acceptés : Espèces, Wave, Orange Money.`,
    `NE PAS remettre le colis sans validation du paiement.`,
  ].join(' | ')

  const payload: PapsDeliveryPayload = {
    reference:         papsRef,
    externalReference: orderId,

    pickup: {
      name:         pickupAddress.fullName,
      phone:        pickupAddress.phone,
      address:      formatAddress(pickupAddress),
      instructions: pickupAddress.instructions ?? '',
    },

    delivery: {
      name:         deliveryAddress.fullName,
      phone:        deliveryAddress.phone,
      address:      formatAddress(deliveryAddress),
      instructions: [
        deliveryAddress.instructions,
        `Commande ${orderId} — Solde COD ${new Intl.NumberFormat('fr-SN').format(remainingBalanceAmount)} FCFA`,
      ].filter(Boolean).join(' | '),
      coordinates: deliveryAddress.coordinates,
    },

    package: {
      category,
      description:      packageInfo.description,
      weightKg:         packageInfo.weightKg,
      dimensions:       `${packageInfo.lengthCm}×${packageInfo.widthCm}×${packageInfo.heightCm} cm`,
      isFragile:        packageInfo.isFragile ?? false,
      declaredValueXOF: packageInfo.declaredValueXOF ?? remainingBalanceAmount * 3,
    },

    cod: {
      enabled:        true,
      amountXOF:      remainingBalanceAmount,
      currency:       'XOF',
      paymentMethods: ['CASH', 'WAVE', 'ORANGE_MONEY'],
    },

    validation: {
      token:        validationToken,
      instructions: validationInstructions,
    },

    scheduling: {
      availableFrom: availableFrom ?? createdAt,
      preferredSlot: preferredSlot ?? 'matin 08h-12h',
    },

    status:    'PENDING',
    createdAt,
  }

  // ── Envoi à l'API Paps ──────────────────────────────────────────────────
  const apiKey = typeof process !== 'undefined' ? process.env?.PAPS_API_KEY : undefined
  const apiUrl = typeof process !== 'undefined' ? process.env?.PAPS_API_URL : undefined

  if (!apiKey || !apiUrl) {
    // Mode développement / prototype — simulation
    console.info('[Paps Simulation] Payload généré :', JSON.stringify(payload, null, 2))

    return {
      success:     true,
      payload,
      papsOrderId: papsRef,
      trackingUrl: `https://paps.sn/track/${papsRef}`,
    }
  }

  // Mode production
  const response = await fetch(`${apiUrl}/packages`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return {
      success:     false,
      payload,
      papsOrderId: '',
      trackingUrl: '',
      error:       `Paps API ${response.status}: ${errorText}`,
    }
  }

  const data = await response.json() as { id: string; tracking_url: string }

  return {
    success:     true,
    payload,
    papsOrderId: data.id,
    trackingUrl: data.tracking_url,
  }
}

// ---------------------------------------------------------------------------
// Utilitaires exportés
// ---------------------------------------------------------------------------

/**
 * Calcule la catégorie Paps et le tarif estimé (FCFA) pour un colis donné.
 * Grille tarifaire indicative Paps Dakar 2024.
 */
export function estimatePapsFee(weightKg: number): { category: PapsCategory; estimatedFeeXOF: number } {
  const category = selectPapsCategory(weightKg)
  const fees: Record<PapsCategory, number> = {
    D: 1_500,
    S: 2_000,
    M: 3_500,
    L: 6_000,
  }
  return { category, estimatedFeeXOF: fees[category] }
}

/**
 * Vérifie si une adresse de livraison est dans la zone de couverture Paps.
 * En production : appeler GET /zones de l'API Paps.
 * Ici : validation basique sur les villes couvertes connues.
 */
export function isPapsCoverageArea(city: string): boolean {
  const covered = ['Dakar', 'Thiès', 'Rufisque', 'Guédiawaye', 'Pikine', 'Mbour', 'Saly', 'Ziguinchor']
  return covered.some(c => city.toLowerCase().includes(c.toLowerCase()))
}
