import { emitQaError, emitQaEvent } from "./observability"

const DB_NAME = "doukoure-import-offline"
const DB_VERSION = 1
const SNAPSHOT_STORE = "delivery_pass_snapshots"
const QUEUE_STORE = "delivery_pass_validation_queue"
const SNAPSHOT_FALLBACK_KEY = "doukoure_delivery_pass_snapshots"
const QUEUE_FALLBACK_KEY = "doukoure_delivery_pass_validation_queue"
export const DELIVERY_PASS_SYNC_TAG = "delivery-pass-validation-sync"

export interface DeliveryPassSnapshot {
  orderId: string
  customerPhone: string
  remainingBalanceAmount: number
  isBalancePaid: boolean
  orderStatus: string
  qrPayload: string
  validationToken: string
  qrTimestamp: string
  updatedAt: string
}

export interface PendingDeliveryPassValidation {
  idempotencyKey: string
  orderId: string
  validationToken: string
  qrTimestamp: string
  queuedAt: string
}

interface QueueSyncResult {
  synced: number
  failed: number
}

interface BackgroundSyncCapableRegistration extends ServiceWorkerRegistration {
  sync?: {
    register: (tag: string) => Promise<void>
  }
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined"
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        const store = db.createObjectStore(SNAPSHOT_STORE, { keyPath: "orderId" })
        store.createIndex("updatedAt", "updatedAt", { unique: false })
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: "idempotencyKey" })
        store.createIndex("queuedAt", "queuedAt", { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"))
  })
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  return openDatabase().then((db) => {
    if (!db) {
      return undefined
    }

    return new Promise<T | undefined>((resolve, reject) => {
      const transaction = db.transaction(storeName, mode)
      const store = transaction.objectStore(storeName)
      const request = operation(store)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error(`IndexedDB request failed for ${storeName}`))
      transaction.oncomplete = () => db.close()
      transaction.onerror = () => reject(transaction.error ?? new Error(`IndexedDB transaction failed for ${storeName}`))
    })
  })
}

function safeParseList<T>(raw: string | null): T[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readFallbackList<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return []
  return safeParseList<T>(localStorage.getItem(key))
}

function writeFallbackList<T>(key: string, items: T[]) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(key, JSON.stringify(items))
}

async function getServiceWorkerRegistration(): Promise<BackgroundSyncCapableRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null
  }

  try {
    return await navigator.serviceWorker.ready as BackgroundSyncCapableRegistration
  } catch {
    return null
  }
}

export async function requestDeliveryPassBackgroundSync(): Promise<boolean> {
  const registration = await getServiceWorkerRegistration()
  if (!registration) {
    return false
  }

  try {
    if (registration.sync?.register) {
      await registration.sync.register(DELIVERY_PASS_SYNC_TAG)
      emitQaEvent("delivery-pass:validation:background-sync-registered", {
        tag: DELIVERY_PASS_SYNC_TAG,
      })
      return true
    }

    registration.active?.postMessage({ type: "delivery-pass-sync-request" })
    emitQaEvent("delivery-pass:validation:worker-message-requested", {
      tag: DELIVERY_PASS_SYNC_TAG,
    })
    return true
  } catch (error) {
    emitQaError("delivery-pass:validation:background-sync-register-failed", error, {
      tag: DELIVERY_PASS_SYNC_TAG,
    })
    return false
  }
}

export async function cacheDeliveryPassSnapshot(snapshot: DeliveryPassSnapshot): Promise<void> {
  try {
    const stored = await withStore(SNAPSHOT_STORE, "readwrite", (store) => store.put(snapshot))
    if (stored === undefined) {
      const snapshots = readFallbackList<DeliveryPassSnapshot>(SNAPSHOT_FALLBACK_KEY)
      const next = snapshots.filter((item) => item.orderId !== snapshot.orderId)
      next.push(snapshot)
      writeFallbackList(SNAPSHOT_FALLBACK_KEY, next)
    }
    emitQaEvent("delivery-pass:snapshot:cached", { orderId: snapshot.orderId })
  } catch (error) {
    emitQaError("delivery-pass:snapshot:cache-failed", error, { orderId: snapshot.orderId })
  }
}

export async function getCachedDeliveryPassSnapshot(orderId: string): Promise<DeliveryPassSnapshot | null> {
  try {
    const snapshot = await withStore<DeliveryPassSnapshot>(SNAPSHOT_STORE, "readonly", (store) => store.get(orderId))
    if (snapshot !== undefined) {
      return snapshot ?? null
    }
  } catch {
    // fallback below
  }

  const snapshots = readFallbackList<DeliveryPassSnapshot>(SNAPSHOT_FALLBACK_KEY)
  return snapshots.find((item) => item.orderId === orderId) ?? null
}

export async function getLatestCachedDeliveryPassSnapshot(): Promise<DeliveryPassSnapshot | null> {
  try {
    const snapshots = await withStore<DeliveryPassSnapshot[]>(SNAPSHOT_STORE, "readonly", (store) => store.getAll())
    if (snapshots !== undefined) {
      const ordered = [...(snapshots ?? [])].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      return ordered[0] ?? null
    }
  } catch {
    // fallback below
  }

  const snapshots = readFallbackList<DeliveryPassSnapshot>(SNAPSHOT_FALLBACK_KEY)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  return snapshots[0] ?? null
}

export async function enqueueDeliveryPassValidation(item: PendingDeliveryPassValidation): Promise<void> {
  try {
    const stored = await withStore(QUEUE_STORE, "readwrite", (store) => store.put(item))
    if (stored === undefined) {
      const queue = readFallbackList<PendingDeliveryPassValidation>(QUEUE_FALLBACK_KEY)
      const next = queue.filter((entry) => entry.idempotencyKey !== item.idempotencyKey)
      next.push(item)
      writeFallbackList(QUEUE_FALLBACK_KEY, next)
    }
    emitQaEvent("delivery-pass:validation:queued", { orderId: item.orderId, idempotencyKey: item.idempotencyKey })
    await requestDeliveryPassBackgroundSync()
  } catch (error) {
    emitQaError("delivery-pass:validation:queue-failed", error, { orderId: item.orderId })
    throw error
  }
}

async function listQueuedValidations(): Promise<PendingDeliveryPassValidation[]> {
  try {
    const queue = await withStore<PendingDeliveryPassValidation[]>(QUEUE_STORE, "readonly", (store) => store.getAll())
    if (queue !== undefined) {
      return [...(queue ?? [])].sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))
    }
  } catch {
    // fallback below
  }

  return readFallbackList<PendingDeliveryPassValidation>(QUEUE_FALLBACK_KEY)
    .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))
}

async function removeQueuedValidation(idempotencyKey: string): Promise<void> {
  try {
    const deleted = await withStore(QUEUE_STORE, "readwrite", (store) => store.delete(idempotencyKey))
    if (deleted === undefined) {
      const queue = readFallbackList<PendingDeliveryPassValidation>(QUEUE_FALLBACK_KEY)
      writeFallbackList(
        QUEUE_FALLBACK_KEY,
        queue.filter((item) => item.idempotencyKey !== idempotencyKey),
      )
    }
  } catch {
    const queue = readFallbackList<PendingDeliveryPassValidation>(QUEUE_FALLBACK_KEY)
    writeFallbackList(
      QUEUE_FALLBACK_KEY,
      queue.filter((item) => item.idempotencyKey !== idempotencyKey),
    )
  }
}

export function buildDeliveryValidationIdempotencyKey(orderId: string, qrTimestamp: string): string {
  return ["delivery-validation", orderId, qrTimestamp].join(":")
}

async function syncQueuedValidation(item: PendingDeliveryPassValidation): Promise<boolean> {
  const response = await fetch("/make-server-9c5a520a/delivery-pass/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(item),
  })

  if (!response.ok) {
    throw new Error(`Delivery validation sync failed (${response.status})`)
  }

  const payload = await response.json() as { ok?: boolean; deduped?: boolean }
  return payload.ok === true || payload.deduped === true
}

export async function flushDeliveryPassValidationQueue(): Promise<QueueSyncResult> {
  const queue = await listQueuedValidations()
  let synced = 0
  let failed = 0

  for (const item of queue) {
    try {
      const done = await syncQueuedValidation(item)
      if (done) {
        await removeQueuedValidation(item.idempotencyKey)
        synced += 1
        emitQaEvent("delivery-pass:validation:synced", {
          orderId: item.orderId,
          idempotencyKey: item.idempotencyKey,
        })
      }
    } catch (error) {
      failed += 1
      emitQaError("delivery-pass:validation:sync-failed", error, {
        orderId: item.orderId,
        idempotencyKey: item.idempotencyKey,
      })
    }
  }

  return { synced, failed }
}

export async function queueOrSyncDeliveryPassValidation(item: PendingDeliveryPassValidation): Promise<"queued" | "synced"> {
  const online = typeof navigator === "undefined" ? true : navigator.onLine

  if (!online) {
    await enqueueDeliveryPassValidation(item)
    return "queued"
  }

  try {
    const synced = await syncQueuedValidation(item)
    if (synced) {
      emitQaEvent("delivery-pass:validation:immediate-sync", {
        orderId: item.orderId,
        idempotencyKey: item.idempotencyKey,
      })
      return "synced"
    }
  } catch {
    await enqueueDeliveryPassValidation(item)
    return "queued"
  }

  await enqueueDeliveryPassValidation(item)
  return "queued"
}

export function attachDeliveryPassReplayHandlers(intervalMs = 30000): () => void {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const replay = () => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      flushDeliveryPassValidationQueue().catch(() => undefined)
    }
  }

  const onOnline = () => replay()
  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      replay()
    }
  }
  const onWorkerMessage = (event: MessageEvent) => {
    const messageType = (event.data as { type?: string } | undefined)?.type
    if (messageType === "delivery-pass-sync-request" || messageType === "delivery-pass-sync-result") {
      replay()
    }
  }

  window.addEventListener("online", onOnline)
  document.addEventListener("visibilitychange", onVisibility)
  navigator.serviceWorker?.addEventListener?.("message", onWorkerMessage)
  const intervalId = window.setInterval(replay, intervalMs)

  return () => {
    window.removeEventListener("online", onOnline)
    document.removeEventListener("visibilitychange", onVisibility)
    navigator.serviceWorker?.removeEventListener?.("message", onWorkerMessage)
    window.clearInterval(intervalId)
  }
}
