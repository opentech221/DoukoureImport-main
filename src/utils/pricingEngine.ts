/**
 * @module pricingEngine
 * Moteur de calcul des prix pour la plateforme Doukoure Import.
 *
 * Règles métier :
 * - Acompte initial = 2/3 du prix total TTC (payé à la commande)
 * - Solde = 1/3 du prix total TTC (encaissé à la livraison par Paps, COD)
 * - Aérien Express : tarif au kilogramme, délai 5-7 jours
 * - Aérien Éco     : tarif au kilogramme, délai 10-15 jours
 * - Maritime       : tarif au mètre cube (CBM), délai ~35 jours
 * - En cas d'écart entre le poids estimé (commande) et le poids réel (pesée Chine),
 *   le coût de transport est recalculé et la différence est répercutée sur le solde 1/3.
 */

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

/** Mode d'expédition disponible sur la plateforme. */
export type ShippingOption = 'AIR_EXPRESS' | 'AIR_ECO' | 'MARITIME'

/**
 * Grille tarifaire globale gérée par l'administrateur.
 * Toute modification est répercutée en temps réel sur l'ensemble du catalogue.
 */
export interface SystemRates {
  /** Tarif aérien express en FCFA par kilogramme (défaut : 11 000). */
  rateAirExpressXOF: number
  /** Tarif aérien économique en FCFA par kilogramme (défaut : 7 500). */
  rateAirEcoXOF: number
  /** Tarif maritime en FCFA par mètre cube — CBM (défaut : 145 000). */
  rateMaritimeCbmXOF: number
  /** Marge commerciale appliquée au sous-total (base + fret), en % (défaut : 15). */
  marginPercentage: number
}

/** Dimensions physiques d'un colis, exprimées en centimètres. */
export interface Dimensions {
  lengthCm: number
  widthCm: number
  heightCm: number
}

/**
 * Décomposition tarifaire retournée lors du calcul initial.
 * Tous les montants sont en FCFA, arrondis à l'entier le plus proche.
 */
export interface PriceBreakdown {
  /** Coût de transport brut (avant marge). */
  shippingCost: number
  /** Prix total TTC = (basePriceXOF + shippingCost) × (1 + margin%). */
  totalPrice: number
  /** Acompte à régler à la commande = arrondi(totalPrice × 2 / 3). */
  depositAmount: number
  /** Solde estimé à la livraison = totalPrice − depositAmount. */
  estimatedBalance: number
  /** Volume en mètre cube, calculé à partir des dimensions (mode MARITIME uniquement). */
  cbmVolume?: number
  /** Détail du calcul (à des fins de transparence / audit). */
  breakdown: {
    basePriceXOF: number
    shippingCost: number
    subtotal: number
    marginXOF: number
    shippingOption: ShippingOption
    rateApplied: number
    unitLabel: string
  }
}

/**
 * Résultat du recalcul déclenché après la pesée réelle à l'entrepôt en Chine.
 * La différence de coût (positive ou négative) est intégralement répercutée sur le solde 1/3.
 */
export interface WeighingAdjustment {
  /** Nouveau prix total TTC calculé sur le poids / CBM réel. */
  newTotalPrice: number
  /**
   * Écart de poids entre pesée réelle et poids estimé à la commande.
   * Négatif si le colis est plus léger que prévu.
   */
  weightDifferenceKg: number
  /**
   * Variation tarifaire due à l'écart de poids.
   * Positive → surcoût à régler, négative → déduction sur le solde.
   */
  priceAdjustmentXOF: number
  /**
   * Solde définitif à encaisser à la livraison = newTotalPrice − initialDepositPaid.
   * Ne peut pas être négatif : si le remboursement est dû, il est traité séparément.
   */
  finalBalanceToPay: number
  /** true si le colis s'avère moins cher que prévu (remboursement partiel sur solde). */
  isCredit: boolean
  /** Détail du recalcul. */
  breakdown: {
    estimatedWeightKg: number
    actualWeightKg: number
    oldTotalPrice: number
    newTotalPrice: number
    adjustmentXOF: number
  }
}

// ---------------------------------------------------------------------------
// Constantes par défaut
// ---------------------------------------------------------------------------

/** Grille tarifaire officielle Doukoure Import au lancement. */
export const DEFAULT_RATES: SystemRates = {
  rateAirExpressXOF: 11_000,
  rateAirEcoXOF: 7_500,
  rateMaritimeCbmXOF: 145_000,
  marginPercentage: 15,
}

/** Ratio d'acompte appliqué à la commande (2/3 du total). */
export const DEPOSIT_RATIO = 2 / 3

/** Étiquettes UI pour chaque mode d'expédition. */
export const SHIPPING_LABELS: Record<ShippingOption, { label: string; duration: string; icon: string }> = {
  AIR_EXPRESS: { label: 'Aérien Express', duration: '5-7 jours', icon: '✈️' },
  AIR_ECO:     { label: 'Aérien Éco',     duration: '10-15 jours', icon: '🛫' },
  MARITIME:    { label: 'Fret Maritime',  duration: '~35 jours',  icon: '🚢' },
}

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

/**
 * Convertit des dimensions en centimètres vers un volume en mètre cube (CBM).
 * CBM = (L × l × h) / 1 000 000
 */
export function toCbm(dim: Dimensions): number {
  return (dim.lengthCm * dim.widthCm * dim.heightCm) / 1_000_000
}

/**
 * Formate un montant en FCFA selon la locale sénégalaise (fr-SN).
 * @example formatXOF(28750) → "28 750 FCFA"
 */
export function formatXOF(amount: number): string {
  return (
    new Intl.NumberFormat('fr-SN', { style: 'decimal', maximumFractionDigits: 0 }).format(
      Math.round(amount),
    ) + ' FCFA'
  )
}

/**
 * Valide les paramètres d'entrée et lève une erreur si une contrainte métier est violée.
 * Appelé en tête de chaque fonction publique du moteur.
 */
function validatePricingInput(
  basePriceXOF: number,
  weightKg: number,
  dimensions: Dimensions,
  rates: SystemRates,
): void {
  if (basePriceXOF < 0) throw new Error('basePriceXOF doit être ≥ 0')
  if (weightKg <= 0)    throw new Error('weightKg doit être > 0')
  if (dimensions.lengthCm <= 0 || dimensions.widthCm <= 0 || dimensions.heightCm <= 0)
    throw new Error('Les dimensions doivent être strictement positives')
  if (rates.marginPercentage < 0 || rates.marginPercentage > 200)
    throw new Error('marginPercentage doit être compris entre 0 et 200')
  if (rates.rateAirExpressXOF < 0 || rates.rateAirEcoXOF < 0 || rates.rateMaritimeCbmXOF < 0)
    throw new Error('Les tarifs ne peuvent pas être négatifs')
}

// ---------------------------------------------------------------------------
// Fonction principale : calcul du prix initial
// ---------------------------------------------------------------------------

/**
 * Calcule le prix total TTC, l'acompte (2/3) et le solde estimé (1/3)
 * pour une commande d'import depuis la Chine vers le Sénégal.
 *
 * Formule :
 *   shippingCost = weight × rate (aérien) ou CBM × rate (maritime)
 *   subtotal     = basePriceXOF + shippingCost
 *   totalPrice   = round(subtotal × (1 + margin / 100))
 *   deposit      = round(totalPrice × 2 / 3)
 *   balance      = totalPrice − deposit
 *
 * @param params.basePriceXOF      Prix d'achat du produit en Chine, en FCFA.
 * @param params.estimatedWeightKg Poids estimé par le client ou le catalogue, en kg.
 * @param params.dimensions        Dimensions du colis en cm (L × l × h).
 * @param params.shippingOption    Mode d'expédition choisi.
 * @param params.rates             Grille tarifaire (utilise DEFAULT_RATES si absente).
 * @returns PriceBreakdown         Décomposition tarifaire complète.
 *
 * @example
 * const result = calculateInitialImportPrice({
 *   basePriceXOF: 45_000,
 *   estimatedWeightKg: 1.2,
 *   dimensions: { lengthCm: 32, widthCm: 22, heightCm: 12 },
 *   shippingOption: 'AIR_EXPRESS',
 * })
 * // result.totalPrice    → 61 410
 * // result.depositAmount → 40 940
 * // result.estimatedBalance → 20 470
 */
export function calculateInitialImportPrice(params: {
  basePriceXOF: number
  estimatedWeightKg: number
  dimensions: Dimensions
  shippingOption: ShippingOption
  rates?: SystemRates
}): PriceBreakdown {
  const { basePriceXOF, estimatedWeightKg, dimensions, shippingOption } = params
  const rates = params.rates ?? DEFAULT_RATES

  validatePricingInput(basePriceXOF, estimatedWeightKg, dimensions, rates)

  let shippingCost: number
  let cbmVolume: number | undefined
  let rateApplied: number
  let unitLabel: string

  switch (shippingOption) {
    case 'AIR_EXPRESS':
      rateApplied = rates.rateAirExpressXOF
      unitLabel = 'FCFA/kg'
      shippingCost = estimatedWeightKg * rateApplied
      break
    case 'AIR_ECO':
      rateApplied = rates.rateAirEcoXOF
      unitLabel = 'FCFA/kg'
      shippingCost = estimatedWeightKg * rateApplied
      break
    case 'MARITIME':
      cbmVolume = toCbm(dimensions)
      rateApplied = rates.rateMaritimeCbmXOF
      unitLabel = 'FCFA/m³'
      shippingCost = cbmVolume * rateApplied
      break
  }

  const subtotal   = basePriceXOF + shippingCost
  const marginXOF  = subtotal * (rates.marginPercentage / 100)
  const totalPrice = Math.round(subtotal + marginXOF)
  const depositAmount   = Math.round(totalPrice * DEPOSIT_RATIO)
  const estimatedBalance = totalPrice - depositAmount

  return {
    shippingCost: Math.round(shippingCost),
    totalPrice,
    depositAmount,
    estimatedBalance,
    cbmVolume,
    breakdown: {
      basePriceXOF,
      shippingCost: Math.round(shippingCost),
      subtotal: Math.round(subtotal),
      marginXOF: Math.round(marginXOF),
      shippingOption,
      rateApplied,
      unitLabel,
    },
  }
}

// ---------------------------------------------------------------------------
// Fonction de recalcul après pesée réelle en Chine
// ---------------------------------------------------------------------------

/**
 * Recalcule le solde à payer à la livraison après la pesée réelle du colis
 * à l'entrepôt en Chine. Appelé lorsque le statut de commande passe à
 * `INSPECTION_WEIGHED_CHINA`.
 *
 * Si le poids réel est supérieur au poids estimé, le surcoût est ajouté au solde.
 * Si le poids réel est inférieur, la déduction est appliquée sur le solde.
 * Le solde final ne peut pas être négatif (tout crédit > solde est remboursé séparément).
 *
 * @param params.initialDepositPaid  Montant de l'acompte déjà encaissé, en FCFA.
 * @param params.estimatedWeightKg   Poids estimé utilisé lors du calcul initial, en kg.
 * @param params.basePriceXOF        Prix d'achat du produit en FCFA (inchangé).
 * @param params.actualWeightKg      Poids réel mesuré à l'entrepôt en Chine, en kg.
 * @param params.actualDimensions    Dimensions réelles mesurées en Chine, en cm.
 * @param params.shippingOption      Mode d'expédition (inchangé depuis la commande initiale).
 * @param params.rates               Grille tarifaire (utilise DEFAULT_RATES si absente).
 * @returns WeighingAdjustment       Ajustement complet avec solde final à encaisser.
 *
 * @example
 * // Commande initiale : 1.2 kg estimé → acompte 40 940 FCFA
 * // Pesée réelle : 1.4 kg → recalcul du solde
 * const adj = recalculateBalanceOnChinaWeighing({
 *   initialDepositPaid: 40940,
 *   estimatedWeightKg: 1.2,
 *   basePriceXOF: 45_000,
 *   actualWeightKg: 1.4,
 *   actualDimensions: { lengthCm: 32, widthCm: 22, heightCm: 12 },
 *   shippingOption: 'AIR_EXPRESS',
 * })
 * // adj.weightDifferenceKg → 0.2
 * // adj.priceAdjustmentXOF → 2530 (surcoût)
 * // adj.finalBalanceToPay  → 22 970
 */
export function recalculateBalanceOnChinaWeighing(params: {
  initialDepositPaid: number
  estimatedWeightKg: number
  basePriceXOF: number
  actualWeightKg: number
  actualDimensions: Dimensions
  shippingOption: ShippingOption
  rates?: SystemRates
}): WeighingAdjustment {
  const {
    initialDepositPaid,
    estimatedWeightKg,
    basePriceXOF,
    actualWeightKg,
    actualDimensions,
    shippingOption,
  } = params
  const rates = params.rates ?? DEFAULT_RATES

  if (initialDepositPaid < 0) throw new Error('initialDepositPaid doit être ≥ 0')
  if (actualWeightKg <= 0)    throw new Error('actualWeightKg doit être > 0')

  // Recalcul complet sur la base du poids / CBM réel
  const newBreakdown = calculateInitialImportPrice({
    basePriceXOF,
    estimatedWeightKg: actualWeightKg,
    dimensions: actualDimensions,
    shippingOption,
    rates,
  })

  // Calcul sur le poids estimé initial (pour déterminer l'écart)
  const oldBreakdown = calculateInitialImportPrice({
    basePriceXOF,
    estimatedWeightKg,
    dimensions: actualDimensions,
    shippingOption,
    rates,
  })

  const weightDifferenceKg  = Math.round((actualWeightKg - estimatedWeightKg) * 1000) / 1000
  const priceAdjustmentXOF  = newBreakdown.totalPrice - oldBreakdown.totalPrice
  const rawBalance          = newBreakdown.totalPrice - initialDepositPaid
  const finalBalanceToPay   = Math.max(0, rawBalance)
  const isCredit            = rawBalance < 0

  return {
    newTotalPrice: newBreakdown.totalPrice,
    weightDifferenceKg,
    priceAdjustmentXOF,
    finalBalanceToPay,
    isCredit,
    breakdown: {
      estimatedWeightKg,
      actualWeightKg,
      oldTotalPrice: oldBreakdown.totalPrice,
      newTotalPrice: newBreakdown.totalPrice,
      adjustmentXOF: priceAdjustmentXOF,
    },
  }
}

// ---------------------------------------------------------------------------
// Utilitaire : simulation d'impact pour l'admin back-office
// ---------------------------------------------------------------------------

/**
 * Compare les prix d'un produit entre deux grilles tarifaires.
 * Utilisé dans l'écran d'administration pour l'aperçu de simulation live.
 *
 * @param productParams  Paramètres du produit (poids, dimensions, base, mode).
 * @param oldRates       Ancienne grille tarifaire.
 * @param newRates       Nouvelle grille tarifaire à comparer.
 * @returns              Ancien prix, nouveau prix et variation absolue + %.
 */
export function simulateRateImpact(
  productParams: {
    basePriceXOF: number
    estimatedWeightKg: number
    dimensions: Dimensions
    shippingOption: ShippingOption
  },
  oldRates: SystemRates,
  newRates: SystemRates,
): { oldTotal: number; newTotal: number; delta: number; deltaPercent: number } {
  const old_ = calculateInitialImportPrice({ ...productParams, rates: oldRates })
  const new_ = calculateInitialImportPrice({ ...productParams, rates: newRates })
  const delta = new_.totalPrice - old_.totalPrice
  const deltaPercent = Math.round((delta / old_.totalPrice) * 10000) / 100
  return { oldTotal: old_.totalPrice, newTotal: new_.totalPrice, delta, deltaPercent }
}
