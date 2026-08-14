const APP_CACHE = 'doukoure-import-app-v2'
const APP_SHELL = ['/', '/manifest.json', '/icons/doukoure-import-icon.svg', '/icons/icon-192.png', '/icons/icon-512.png']
const DB_NAME = 'doukoure-import-offline'
const DB_VERSION = 1
const QUEUE_STORE = 'delivery_pass_validation_queue'
const DELIVERY_PASS_SYNC_TAG = 'delivery-pass-validation-sync'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'idempotencyKey' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed in service worker'))
  })
}

async function listQueuedValidations() {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, 'readonly')
    const store = transaction.objectStore(QUEUE_STORE)
    const request = store.getAll()

    request.onsuccess = () => {
      db.close()
      resolve(Array.isArray(request.result) ? request.result : [])
    }
    request.onerror = () => {
      db.close()
      reject(request.error || new Error('Unable to read queued validations'))
    }
  })
}

async function deleteQueuedValidation(idempotencyKey) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, 'readwrite')
    const store = transaction.objectStore(QUEUE_STORE)
    const request = store.delete(idempotencyKey)

    request.onsuccess = () => {
      db.close()
      resolve(true)
    }
    request.onerror = () => {
      db.close()
      reject(request.error || new Error('Unable to delete queued validation'))
    }
  })
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  clients.forEach((client) => client.postMessage(message))
}

async function replayQueuedValidations() {
  const items = await listQueuedValidations()
  let synced = 0
  let failed = 0

  for (const item of items) {
    try {
      const response = await fetch('/make-server-9c5a520a/delivery-pass/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      })

      if (!response.ok) {
        throw new Error(`Delivery validation sync failed (${response.status})`)
      }

      const payload = await response.json()
      if (payload?.ok === true || payload?.deduped === true) {
        await deleteQueuedValidation(item.idempotencyKey)
        synced += 1
      }
    } catch {
      failed += 1
    }
  }

  await notifyClients({
    type: 'delivery-pass-sync-result',
    synced,
    failed,
  })
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== APP_CACHE).map((key) => caches.delete(key)),
    )),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  const isAppShell = url.origin === self.location.origin && (
    url.pathname === '/' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json')
  )

  if (!isAppShell) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(APP_CACHE).then((cache) => cache.put(event.request, copy)).catch(() => undefined)
          return response
        })
        .catch(() => caches.match('/'))
    }),
  )
})

self.addEventListener('message', (event) => {
  const messageType = event.data?.type
  if (messageType === 'delivery-pass-sync-request') {
    event.waitUntil?.(replayQueuedValidations())
  }
})

self.addEventListener('sync', (event) => {
  if (event.tag === DELIVERY_PASS_SYNC_TAG) {
    event.waitUntil(replayQueuedValidations())
  }
})

self.addEventListener('periodicsync', (event) => {
  if (event.tag === DELIVERY_PASS_SYNC_TAG) {
    event.waitUntil(replayQueuedValidations())
  }
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data?.text() }
  }

  const title = payload.title || 'Doukoure Import'
  const options = {
    body: payload.body || 'Vous avez une nouvelle notification.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || 'doukoure-import-notification',
    data: { url: payload.url || '/?screen=notifications' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url === targetUrl || client.url.startsWith(self.location.origin))
      if (existingClient) return existingClient.focus()
      return self.clients.openWindow(targetUrl)
    }),
  )
})
