// @vitest-environment node

import { describe, it, expect } from 'vitest'
import {
  calculateInitialImportPrice,
  recalculateBalanceOnChinaWeighing,
  simulateRateImpact,
  toCbm,
  formatXOF,
  DEFAULT_RATES,
  DEPOSIT_RATIO,
  type Dimensions,
  type SystemRates,
} from './pricingEngine'

// ---------------------------------------------------------------------------
// Fixtures partagées
// ---------------------------------------------------------------------------

const SNEAKERS_DIMS: Dimensions = { lengthCm: 32, widthCm: 22, heightCm: 12 }
const TV_DIMS: Dimensions       = { lengthCm: 140, widthCm: 12, heightCm: 85 }
const BAG_DIMS: Dimensions      = { lengthCm: 35, widthCm: 28, heightCm: 14 }

// ---------------------------------------------------------------------------
// toCbm
// ---------------------------------------------------------------------------

describe('toCbm', () => {
  it('convertit 100×100×100 cm en 1 m³', () => {
    expect(toCbm({ lengthCm: 100, widthCm: 100, heightCm: 100 })).toBe(1)
  })

  it('calcule correctement les sneakers 32×22×12 cm', () => {
    expect(toCbm(SNEAKERS_DIMS)).toBeCloseTo(0.008448, 5)
  })

  it('calcule correctement la TV 140×12×85 cm', () => {
    expect(toCbm(TV_DIMS)).toBeCloseTo(0.1428, 3)
  })
})

// ---------------------------------------------------------------------------
// formatXOF
// ---------------------------------------------------------------------------

describe('formatXOF', () => {
  // fr-SN utilise l'espace fine insécable   comme séparateur de milliers
  it('formate un montant entier et se termine par " FCFA"', () => {
    const result = formatXOF(28750)
    expect(result).toMatch(/28.?750 FCFA/)
    expect(result.endsWith(' FCFA')).toBe(true)
    expect(result).toContain('28')
    expect(result).toContain('750')
  })

  it('arrondit les décimales', () => {
    const result = formatXOF(28750.9)
    expect(result).toContain('751')
    expect(result.endsWith(' FCFA')).toBe(true)
  })

  it('formate zéro', () => {
    expect(formatXOF(0)).toBe('0 FCFA')
  })
})

// ---------------------------------------------------------------------------
// calculateInitialImportPrice — Aérien Express
// ---------------------------------------------------------------------------

describe('calculateInitialImportPrice — AIR_EXPRESS', () => {
  const BASE = {
    basePriceXOF: 45_000,
    estimatedWeightKg: 1.2,
    dimensions: SNEAKERS_DIMS,
    shippingOption: 'AIR_EXPRESS' as const,
  }

  it('calcule le coût de fret = poids × taux express', () => {
    const { shippingCost } = calculateInitialImportPrice(BASE)
    // 1.2 kg × 11 000 = 13 200
    expect(shippingCost).toBe(13_200)
  })

  it('calcule le prix total TTC avec marge de 15%', () => {
    const { totalPrice } = calculateInitialImportPrice(BASE)
    // (45000 + 13200) × 1.15 = 58200 × 1.15 = 66930
    expect(totalPrice).toBe(66_930)
  })

  it("l'acompte représente exactement les 2/3 arrondis du total", () => {
    const { totalPrice, depositAmount } = calculateInitialImportPrice(BASE)
    expect(depositAmount).toBe(Math.round(totalPrice * DEPOSIT_RATIO))
  })

  it('le solde = totalPrice − acompte', () => {
    const { totalPrice, depositAmount, estimatedBalance } = calculateInitialImportPrice(BASE)
    expect(estimatedBalance).toBe(totalPrice - depositAmount)
  })

  it('totalPrice = acompte + solde (sans perte de centime)', () => {
    const { totalPrice, depositAmount, estimatedBalance } = calculateInitialImportPrice(BASE)
    expect(depositAmount + estimatedBalance).toBe(totalPrice)
  })

  it('retourne le détail de calcul complet', () => {
    const { breakdown } = calculateInitialImportPrice(BASE)
    expect(breakdown.shippingOption).toBe('AIR_EXPRESS')
    expect(breakdown.rateApplied).toBe(DEFAULT_RATES.rateAirExpressXOF)
    expect(breakdown.unitLabel).toBe('FCFA/kg')
    expect(breakdown.basePriceXOF).toBe(45_000)
  })

  it("n'expose pas cbmVolume en mode aérien", () => {
    const { cbmVolume } = calculateInitialImportPrice(BASE)
    expect(cbmVolume).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// calculateInitialImportPrice — Aérien Éco
// ---------------------------------------------------------------------------

describe('calculateInitialImportPrice — AIR_ECO', () => {
  const BASE = {
    basePriceXOF: 45_000,
    estimatedWeightKg: 1.2,
    dimensions: SNEAKERS_DIMS,
    shippingOption: 'AIR_ECO' as const,
  }

  it('utilise le taux éco au kg', () => {
    const { shippingCost } = calculateInitialImportPrice(BASE)
    // 1.2 × 7500 = 9000
    expect(shippingCost).toBe(9_000)
  })

  it('le prix éco est inférieur au prix express', () => {
    const express = calculateInitialImportPrice({ ...BASE, shippingOption: 'AIR_EXPRESS' })
    const eco     = calculateInitialImportPrice({ ...BASE, shippingOption: 'AIR_ECO' })
    expect(eco.totalPrice).toBeLessThan(express.totalPrice)
  })
})

// ---------------------------------------------------------------------------
// calculateInitialImportPrice — Maritime
// ---------------------------------------------------------------------------

describe('calculateInitialImportPrice — MARITIME', () => {
  const BASE = {
    basePriceXOF: 185_000,
    estimatedWeightKg: 18,
    dimensions: TV_DIMS,
    shippingOption: 'MARITIME' as const,
  }

  it('calcule le CBM et le coût maritime', () => {
    const { cbmVolume, shippingCost } = calculateInitialImportPrice(BASE)
    const expectedCbm = toCbm(TV_DIMS)
    expect(cbmVolume).toBeCloseTo(expectedCbm, 5)
    expect(shippingCost).toBe(Math.round(expectedCbm * DEFAULT_RATES.rateMaritimeCbmXOF))
  })

  it('expose cbmVolume', () => {
    const { cbmVolume } = calculateInitialImportPrice(BASE)
    expect(cbmVolume).toBeDefined()
    expect(cbmVolume!).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// calculateInitialImportPrice — Taux personnalisés
// ---------------------------------------------------------------------------

describe('calculateInitialImportPrice — taux personnalisés', () => {
  const CUSTOM_RATES: SystemRates = {
    rateAirExpressXOF: 9_500,
    rateAirEcoXOF: 6_000,
    rateMaritimeCbmXOF: 130_000,
    marginPercentage: 10,
  }

  it('applique les taux personnalisés correctement', () => {
    const { shippingCost, totalPrice } = calculateInitialImportPrice({
      basePriceXOF: 45_000,
      estimatedWeightKg: 1.2,
      dimensions: SNEAKERS_DIMS,
      shippingOption: 'AIR_EXPRESS',
      rates: CUSTOM_RATES,
    })
    // 1.2 × 9500 = 11400 → subtotal = 56400 → × 1.10 = 62040
    expect(shippingCost).toBe(11_400)
    expect(totalPrice).toBe(62_040)
  })

  it('une marge à 0% retourne le sous-total sans majoration', () => {
    const { totalPrice, shippingCost } = calculateInitialImportPrice({
      basePriceXOF: 50_000,
      estimatedWeightKg: 1,
      dimensions: SNEAKERS_DIMS,
      shippingOption: 'AIR_ECO',
      rates: { ...DEFAULT_RATES, marginPercentage: 0 },
    })
    expect(totalPrice).toBe(50_000 + shippingCost)
  })
})

// ---------------------------------------------------------------------------
// calculateInitialImportPrice — Validation des entrées
// ---------------------------------------------------------------------------

describe('calculateInitialImportPrice — validation', () => {
  const VALID = {
    basePriceXOF: 45_000,
    estimatedWeightKg: 1.2,
    dimensions: SNEAKERS_DIMS,
    shippingOption: 'AIR_EXPRESS' as const,
  }

  it('lève une erreur si basePriceXOF est négatif', () => {
    expect(() => calculateInitialImportPrice({ ...VALID, basePriceXOF: -1 }))
      .toThrow('basePriceXOF doit être ≥ 0')
  })

  it('lève une erreur si weightKg ≤ 0', () => {
    expect(() => calculateInitialImportPrice({ ...VALID, estimatedWeightKg: 0 }))
      .toThrow('weightKg doit être > 0')
  })

  it('lève une erreur si une dimension est nulle', () => {
    expect(() => calculateInitialImportPrice({
      ...VALID,
      dimensions: { lengthCm: 0, widthCm: 22, heightCm: 12 },
    })).toThrow('dimensions')
  })

  it('lève une erreur si la marge dépasse 200%', () => {
    expect(() => calculateInitialImportPrice({
      ...VALID,
      rates: { ...DEFAULT_RATES, marginPercentage: 201 },
    })).toThrow('marginPercentage')
  })

  it('accepte un basePriceXOF à 0 (produit offert)', () => {
    expect(() => calculateInitialImportPrice({ ...VALID, basePriceXOF: 0 })).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// recalculateBalanceOnChinaWeighing — Surpoids
// ---------------------------------------------------------------------------

describe('recalculateBalanceOnChinaWeighing — surpoids', () => {
  // Commande initiale : sneakers 1.2 kg → total 66 930 → acompte 44 620
  const INITIAL = calculateInitialImportPrice({
    basePriceXOF: 45_000,
    estimatedWeightKg: 1.2,
    dimensions: SNEAKERS_DIMS,
    shippingOption: 'AIR_EXPRESS',
  })

  const ADJ = recalculateBalanceOnChinaWeighing({
    initialDepositPaid: INITIAL.depositAmount,
    estimatedWeightKg: 1.2,
    basePriceXOF: 45_000,
    actualWeightKg: 1.4,
    actualDimensions: SNEAKERS_DIMS,
    shippingOption: 'AIR_EXPRESS',
  })

  it('détecte un écart de poids positif de 0.2 kg', () => {
    expect(ADJ.weightDifferenceKg).toBeCloseTo(0.2, 3)
  })

  it('le nouveau total est supérieur à l\'ancien', () => {
    expect(ADJ.newTotalPrice).toBeGreaterThan(INITIAL.totalPrice)
  })

  it('l\'ajustement de prix est positif (surcoût)', () => {
    expect(ADJ.priceAdjustmentXOF).toBeGreaterThan(0)
  })

  it('le solde final = nouveau total − acompte déjà payé', () => {
    expect(ADJ.finalBalanceToPay).toBe(ADJ.newTotalPrice - INITIAL.depositAmount)
  })

  it("n'est pas un crédit", () => {
    expect(ADJ.isCredit).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// recalculateBalanceOnChinaWeighing — Sous-poids (crédit)
// ---------------------------------------------------------------------------

describe('recalculateBalanceOnChinaWeighing — sous-poids (crédit)', () => {
  // Cas : colis plus léger → client sur-payé en acompte
  const INITIAL = calculateInitialImportPrice({
    basePriceXOF: 45_000,
    estimatedWeightKg: 3.0,
    dimensions: BAG_DIMS,
    shippingOption: 'AIR_EXPRESS',
  })

  const ADJ = recalculateBalanceOnChinaWeighing({
    initialDepositPaid: INITIAL.depositAmount,
    estimatedWeightKg: 3.0,
    basePriceXOF: 45_000,
    actualWeightKg: 0.1,       // très léger → prix réel < acompte déjà payé → crédit
    actualDimensions: BAG_DIMS,
    shippingOption: 'AIR_EXPRESS',
  })

  it('détecte un écart de poids négatif', () => {
    expect(ADJ.weightDifferenceKg).toBeLessThan(0)
  })

  it('l\'ajustement de prix est négatif (déduction)', () => {
    expect(ADJ.priceAdjustmentXOF).toBeLessThan(0)
  })

  it('le solde final ne peut pas être négatif', () => {
    expect(ADJ.finalBalanceToPay).toBeGreaterThanOrEqual(0)
  })

  it('est marqué comme un crédit', () => {
    expect(ADJ.isCredit).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// recalculateBalanceOnChinaWeighing — Poids identique (aucun ajustement)
// ---------------------------------------------------------------------------

describe('recalculateBalanceOnChinaWeighing — poids inchangé', () => {
  const INITIAL = calculateInitialImportPrice({
    basePriceXOF: 45_000,
    estimatedWeightKg: 1.2,
    dimensions: SNEAKERS_DIMS,
    shippingOption: 'AIR_EXPRESS',
  })

  const ADJ = recalculateBalanceOnChinaWeighing({
    initialDepositPaid: INITIAL.depositAmount,
    estimatedWeightKg: 1.2,
    basePriceXOF: 45_000,
    actualWeightKg: 1.2,
    actualDimensions: SNEAKERS_DIMS,
    shippingOption: 'AIR_EXPRESS',
  })

  it('écart de poids nul', () => {
    expect(ADJ.weightDifferenceKg).toBe(0)
  })

  it('aucun ajustement de prix', () => {
    expect(ADJ.priceAdjustmentXOF).toBe(0)
  })

  it('le solde final = solde estimé initial', () => {
    expect(ADJ.finalBalanceToPay).toBe(INITIAL.estimatedBalance)
  })

  it("n'est pas un crédit", () => {
    expect(ADJ.isCredit).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// simulateRateImpact
// ---------------------------------------------------------------------------

describe('simulateRateImpact', () => {
  const PRODUCT = {
    basePriceXOF: 45_000,
    estimatedWeightKg: 1.2,
    dimensions: SNEAKERS_DIMS,
    shippingOption: 'AIR_EXPRESS' as const,
  }

  it('retourne delta nul si les taux sont identiques', () => {
    const { delta } = simulateRateImpact(PRODUCT, DEFAULT_RATES, DEFAULT_RATES)
    expect(delta).toBe(0)
  })

  it('delta positif quand le taux augmente', () => {
    const higherRates = { ...DEFAULT_RATES, rateAirExpressXOF: 13_000 }
    const { delta } = simulateRateImpact(PRODUCT, DEFAULT_RATES, higherRates)
    expect(delta).toBeGreaterThan(0)
  })

  it('delta négatif quand le taux baisse', () => {
    const lowerRates = { ...DEFAULT_RATES, rateAirExpressXOF: 9_000 }
    const { delta } = simulateRateImpact(PRODUCT, DEFAULT_RATES, lowerRates)
    expect(delta).toBeLessThan(0)
  })

  it('calcule le pourcentage de variation', () => {
    const lowerRates = { ...DEFAULT_RATES, rateAirExpressXOF: 9_000 }
    const { deltaPercent } = simulateRateImpact(PRODUCT, DEFAULT_RATES, lowerRates)
    expect(deltaPercent).toBeLessThan(0)
  })
})

// ---------------------------------------------------------------------------
// Cas d'usage réel — scénario complet bout en bout
// ---------------------------------------------------------------------------

describe('Scénario complet — ORD-2024-0847', () => {
  // Commande réelle : Nike Air Max, 1.2 kg estimé, Express
  const order = {
    basePriceXOF: 45_000,
    estimatedWeightKg: 1.2,
    dimensions: SNEAKERS_DIMS,
    shippingOption: 'AIR_EXPRESS' as const,
  }

  const initial = calculateInitialImportPrice(order)

  it('le fret express 1.2 kg coûte 13 200 FCFA', () => {
    expect(initial.shippingCost).toBe(13_200)
  })

  it('le prix total TTC est 66 930 FCFA', () => {
    expect(initial.totalPrice).toBe(66_930)
  })

  it('l\'acompte 2/3 est 44 620 FCFA', () => {
    expect(initial.depositAmount).toBe(44_620)
  })

  it('le solde estimé 1/3 est 22 310 FCFA', () => {
    expect(initial.estimatedBalance).toBe(22_310)
  })

  // Pesée réelle en Chine : 1.4 kg
  const adjustment = recalculateBalanceOnChinaWeighing({
    initialDepositPaid: initial.depositAmount,
    estimatedWeightKg: 1.2,
    basePriceXOF: 45_000,
    actualWeightKg: 1.4,
    actualDimensions: SNEAKERS_DIMS,
    shippingOption: 'AIR_EXPRESS',
  })

  it('le poids réel génère un surcoût positif', () => {
    expect(adjustment.priceAdjustmentXOF).toBeGreaterThan(0)
  })

  it('le solde final à la livraison est supérieur au solde estimé', () => {
    expect(adjustment.finalBalanceToPay).toBeGreaterThan(initial.estimatedBalance)
  })

  it('acompte + solde final = nouveau total TTC', () => {
    expect(initial.depositAmount + adjustment.finalBalanceToPay).toBe(adjustment.newTotalPrice)
  })
})
