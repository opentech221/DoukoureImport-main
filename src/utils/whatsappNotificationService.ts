/**
 * whatsappNotificationService — Ticket 4.1
 *
 * Module utilitaire d'envoi de notifications WhatsApp automatisées
 * pour la plateforme Doukoure Import (Chine → Sénégal).
 *
 * En production : brancher sur Twilio / Green API / Baileys via l'URL d'API
 * configurée dans la variable d'environnement WHATSAPP_API_URL.
 * En développement / prototype : les messages sont loggés en console et
 * retournés dans le résultat pour pouvoir être affichés dans l'UI.
 *
 * Format des numéros : E.164 sénégalais (+221 XX XXX XX XX).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WhatsAppResult {
  /** true si l'envoi (ou la simulation) a réussi */
  success: boolean
  /** Corps du message tel qu'il sera envoyé */
  messageBody: string
  /** Numéro destinataire normalisé E.164 */
  to: string
  /** Horodatage de l'envoi */
  sentAt: string
  /** En dev : lien wa.me pré-rempli simulant l'envoi */
  previewUrl?: string
}

export interface InspectionAlertParams {
  phone: string
  orderId: string
  photoUrl: string
  videoUrl: string
  actualWeightKg: number
  estimatedWeightKg: number
  updatedBalanceXOF: number
}

export interface ArrivalAlertParams {
  phone: string
  orderId: string
  finalBalanceXOF: number
  qrCodeLink: string
  shippingMode: 'AIR_EXPRESS' | 'AIR_ECO' | 'MARITIME'
}

export interface ContainerProgressParams {
  phone: string
  containerId: string
  currentPercentage: number
  remainingCBM: number
  departureDate: string
  shareUrl?: string
}

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

/** Normalise un numéro sénégalais au format E.164 (+221XXXXXXXXX). */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('221')) return `+${digits}`
  if (digits.startsWith('0')) return `+221${digits.slice(1)}`
  return `+221${digits}`
}

/** Formate un montant FCFA avec séparateur de milliers. */
function fmt(amount: number): string {
  return new Intl.NumberFormat('fr-SN').format(Math.round(amount)) + ' FCFA'
}

/** Signe le lien de commande public. */
function orderLink(orderId: string): string {
  return `https://doukoure-import.sn/order/${orderId}`
}

/**
 * Expédie le message via l'API WhatsApp configurée.
 * Si WHATSAPP_API_URL n'est pas défini, simule l'envoi et retourne un lien wa.me.
 */
async function dispatch(to: string, body: string): Promise<WhatsAppResult> {
  const sentAt = new Date().toISOString()
  const previewUrl = `https://wa.me/${to.replace('+', '')}?text=${encodeURIComponent(body)}`

  // En développement / prototype : log + retour simulé
  const apiUrl = typeof process !== 'undefined' ? process.env?.WHATSAPP_API_URL : undefined
  if (!apiUrl) {
    console.info('[WhatsApp Simulation]', { to, body })
    return { success: true, messageBody: body, to, sentAt, previewUrl }
  }

  // En production : appel API réel
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, message: body }),
  })

  if (!response.ok) {
    throw new Error(`WhatsApp API error ${response.status}: ${await response.text()}`)
  }

  return { success: true, messageBody: body, to, sentAt }
}

// ---------------------------------------------------------------------------
// 1. Alerte inspection & pesée (envoyée depuis l'entrepôt Chine)
// ---------------------------------------------------------------------------

/**
 * Envoie une notification WhatsApp au client lorsque son colis arrive à
 * l'entrepôt en Chine et est inspecté / pesé.
 *
 * @param params - Données d'inspection (numéro, commande, médias, poids, solde)
 * @returns Résultat de l'envoi avec corps du message et lien de prévisualisation
 */
export async function sendChinaInspectionAlert(
  params: InspectionAlertParams,
): Promise<WhatsAppResult> {
  const { phone, orderId, photoUrl, videoUrl, actualWeightKg, estimatedWeightKg, updatedBalanceXOF } = params

  const weightDiff   = Math.round((actualWeightKg - estimatedWeightKg) * 1000) / 1000
  const weightEmoji  = weightDiff > 0 ? '⬆️' : weightDiff < 0 ? '⬇️' : '✅'
  const weightNote   = weightDiff !== 0
    ? `${weightEmoji} Écart de poids : ${weightDiff > 0 ? '+' : ''}${weightDiff} kg\n   → Solde ajusté automatiquement`
    : '✅ Poids identique à l\'estimation — aucun ajustement'

  const body = [
    `🎉 *Bonne nouvelle, votre colis est arrivé en Chine !*`,
    ``,
    `📦 *Commande :* ${orderId}`,
    `🏭 *Entrepôt :* Guangzhou, Chine`,
    ``,
    `⚖️ *Résultat de la pesée :*`,
    `   Poids estimé : ${estimatedWeightKg} kg`,
    `   Poids réel   : ${actualWeightKg} kg`,
    `   ${weightNote}`,
    ``,
    `💰 *Solde final à régler à la livraison :*`,
    `   *${fmt(updatedBalanceXOF)}* (encaissé par Paps COD)`,
    ``,
    `📷 Photo d'inspection :`,
    `   ${photoUrl}`,
    ``,
    `🎥 Vidéo 360° de l'entrepôt :`,
    `   ${videoUrl}`,
    ``,
    `🔗 Suivez votre commande en temps réel :`,
    `   ${orderLink(orderId)}`,
    ``,
    `Merci de faire confiance à *Doukoure Import* 🇨🇳🚀🇸🇳`,
  ].join('\n')

  return dispatch(normalizePhone(phone), body)
}

// ---------------------------------------------------------------------------
// 2. Alerte arrivée Dakar + lien QR code
// ---------------------------------------------------------------------------

/**
 * Notifie le client que son colis est arrivé à Dakar (après vol ou transit
 * maritime) et lui envoie le lien vers son QR code de validation livraison.
 *
 * @param params - Informations de livraison finale (solde, mode, lien QR)
 * @returns Résultat de l'envoi
 */
export async function sendDakarArrivalAndQRNotice(
  params: ArrivalAlertParams,
): Promise<WhatsAppResult> {
  const { phone, orderId, finalBalanceXOF, qrCodeLink, shippingMode } = params

  const modeLabel: Record<ArrivalAlertParams['shippingMode'], string> = {
    AIR_EXPRESS: 'Aérien Express ✈️',
    AIR_ECO:     'Aérien Économique ✈️',
    MARITIME:    'Fret Maritime 🚢',
  }

  const body = [
    `🇸🇳 *Votre colis est arrivé à Dakar !*`,
    ``,
    `📦 *Commande :* ${orderId}`,
    `🚚 *Mode :* ${modeLabel[shippingMode]}`,
    `📍 *Transit :* Transitaire Doukoure Import — Dakar`,
    ``,
    `💰 *Solde restant à régler à la livraison :*`,
    `   *${fmt(finalBalanceXOF)}* — payable en espèces ou Mobile Money (Wave / Orange Money)`,
    ``,
    `📱 *Votre QR Code de validation livraison :*`,
    `   ${qrCodeLink}`,
    ``,
    `ℹ️ *Comment ça marche ?*`,
    `   1️⃣ Le livreur Paps vous contacte pour convenir d'un rendez-vous`,
    `   2️⃣ À la livraison, payez le solde de ${fmt(finalBalanceXOF)}`,
    `   3️⃣ Le livreur scanne votre QR code pour libérer le colis`,
    ``,
    `🔗 Suivez votre livraison :`,
    `   ${orderLink(orderId)}`,
    ``,
    `Merci de faire confiance à *Doukoure Import* 🇸🇳`,
  ].join('\n')

  return dispatch(normalizePhone(phone), body)
}

// ---------------------------------------------------------------------------
// 3. Alerte remplissage conteneur (watchlist sociale)
// ---------------------------------------------------------------------------

/**
 * Alerte les clients inscrits sur la watchlist d'un conteneur lorsque celui-ci
 * est presque complet, créant un effet FOMO pour déclencher de nouvelles commandes.
 *
 * @param params - Identifiant conteneur, pourcentage, CBM restant, date de départ
 * @returns Résultat de l'envoi
 */
export async function sendContainerProgressAlert(
  params: ContainerProgressParams,
): Promise<WhatsAppResult> {
  const { phone, containerId, currentPercentage, remainingCBM, departureDate, shareUrl } = params

  const urgencyEmojis = currentPercentage >= 90 ? '🔥🔥🔥'
                      : currentPercentage >= 75  ? '🔥🔥'
                      : '🔥'

  const urgencyLabel  = currentPercentage >= 90 ? 'PRESQUE COMPLET — Dernière chance !'
                      : currentPercentage >= 75  ? 'Se remplit très vite'
                      : 'Plus de la moitié rempli'

  const shareSection = shareUrl
    ? [`🔗 Commander maintenant :`, `   ${shareUrl}`, ``]
    : []

  const body = [
    `${urgencyEmojis} *Conteneur ${containerId} — ${urgencyLabel}*`,
    ``,
    `📊 *Taux de remplissage actuel : ${currentPercentage}%*`,
    `📦 Places restantes : seulement *${remainingCBM.toFixed(1)} m³* disponibles`,
    `🗓️ *Départ du navire : ${departureDate}*`,
    ``,
    `⚡ Commandez maintenant pour être dans ce conteneur et bénéficier`,
    `   des meilleurs tarifs au CBM groupé !`,
    ``,
    ...shareSection,
    `📲 Partagez ce lien avec vos proches pour remplir le conteneur :`,
    `   ${shareUrl ?? `https://doukoure-import.sn/container/${containerId}`}`,
    ``,
    `*Doukoure Import* — Import direct Chine 🇨🇳 → Sénégal 🇸🇳`,
  ].join('\n')

  return dispatch(normalizePhone(phone), body)
}
