import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import type { Context } from "npm:hono";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
import {
  calculateCatalogPriceXOF,
  canAccessInspectionMedia,
  classifyInspectionMediaReference,
  createInMemoryRateLimiter,
  getWebhookSecretForProvider,
  processWebhookEvent,
  validateAdminSettingsPayload,
  verifyAdminToken,
  type PaymentProvider,
} from "./endpoint_logic.ts";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-9c5a520a/health", (c) => {
  return c.json({ status: "ok" });
});

const adminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

function getAdminTokenFromEnv(): string | null {
  return Deno.env.get("ADMIN_API_TOKEN") ?? null
}

const adminRateLimiter = createInMemoryRateLimiter({ windowMs: 60_000, maxRequests: 60 })
const webhookRateLimiter = createInMemoryRateLimiter({ windowMs: 60_000, maxRequests: 120 })

function getClientIp(c: Context): string {
  return c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
    ?? c.req.header("x-real-ip")
    ?? "unknown"
}

function applyRateLimit(
  c: Context,
  key: string,
  limiter: ReturnType<typeof createInMemoryRateLimiter>,
): Response | null {
  const result = limiter.check(key)
  if (result.allowed) {
    return null
  }

  c.header("Retry-After", String(result.retryAfterSec))
  return c.json({ error: "Too Many Requests", retryAfterSec: result.retryAfterSec }, 429)
}

function generateDeliveryValidationToken(orderRef: string, qrTimestamp: string): string {
  const raw = `${orderRef}:${qrTimestamp}:DI_SECRET_2024`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i)
    hash |= 0
  }
  return `DI-${Math.abs(hash).toString(36).toUpperCase().padStart(8, "0")}`
}

function providerConfig(provider: PaymentProvider) {
  if (provider === "wave") {
    return {
      apiUrl: Deno.env.get("WAVE_API_URL") ?? Deno.env.get("WAVE_SANDBOX_API_URL") ?? "",
      apiKey: Deno.env.get("WAVE_API_KEY") ?? Deno.env.get("WAVE_SANDBOX_API_KEY") ?? "",
    }
  }

  return {
    apiUrl: Deno.env.get("ORANGE_API_URL") ?? Deno.env.get("ORANGE_SANDBOX_API_URL") ?? "",
    apiKey: Deno.env.get("ORANGE_API_KEY") ?? Deno.env.get("ORANGE_SANDBOX_API_KEY") ?? "",
  }
}

function isAdminRequest(token: string | null): boolean {
  return verifyAdminToken(token, getAdminTokenFromEnv())
}

async function signInspectionMediaUrl(storagePath: string, bucketName: string, ttlSeconds: number): Promise<string | null> {
  const supabase = adminClient()
  const storage = supabase.storage.from(bucketName)
  const { data, error } = await storage.createSignedUrl(storagePath, ttlSeconds)

  if (error || !data?.signedUrl) {
    return null
  }

  return data.signedUrl
}

async function markOrderPaid(orderRef: string) {
  const supabase = adminClient()
  const { error } = await supabase
    .from("orders")
    .update({ status: "PAID", balance_xof: 0, updated_at: new Date().toISOString() })
    .eq("order_ref", orderRef)

  if (error) {
    throw new Error(error.message)
  }
}

app.get("/make-server-9c5a520a/admin/settings", async (c) => {
  const token = c.req.header("x-admin-token") ?? null
  if (!verifyAdminToken(token, getAdminTokenFromEnv())) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const rateLimitRes = applyRateLimit(c, `admin:${getClientIp(c)}:settings:read`, adminRateLimiter)
  if (rateLimitRes) {
    return rateLimitRes
  }

  const supabase = adminClient()
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ data })
})

app.post("/make-server-9c5a520a/admin/settings", async (c) => {
  const rateLimitRes = applyRateLimit(c, `admin:${getClientIp(c)}:settings:write`, adminRateLimiter)
  if (rateLimitRes) {
    return rateLimitRes
  }

  const token = c.req.header("x-admin-token") ?? null
  if (!verifyAdminToken(token, getAdminTokenFromEnv())) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const payload = await c.req.json()
  if (!validateAdminSettingsPayload(payload)) {
    return c.json({ error: "Invalid payload" }, 400)
  }

  console.info('[qa-event] admin:settings:update:start', { source: 'edge_admin_settings' })

  const supabase = adminClient()

  const current = await supabase
    .from("system_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  const { error } = await supabase
    .from("system_settings")
    .upsert({
      id: 1,
      rate_air_express_xof: payload.rateAirExpressXOF,
      rate_air_eco_xof: payload.rateAirEcoXOF,
      rate_maritime_cbm_xof: payload.rateMaritimeCbmXOF,
      margin_percentage: payload.marginPercentage,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('[qa-event] admin:settings:update:failed', { error: error.message })
    return c.json({ error: error.message }, 500)
  }

  await supabase.from("system_settings_audit_logs").insert({
    action: "UPDATE",
    actor: "admin_token",
    before_payload: current.data ?? null,
    after_payload: {
      id: 1,
      rateAirExpressXOF: payload.rateAirExpressXOF,
      rateAirEcoXOF: payload.rateAirEcoXOF,
      rateMaritimeCbmXOF: payload.rateMaritimeCbmXOF,
      marginPercentage: payload.marginPercentage,
    },
    source: "edge_admin_settings",
  })

  return c.json({ ok: true })
})

app.post("/make-server-9c5a520a/admin/repricing/start", async (c) => {
  const rateLimitRes = applyRateLimit(c, `admin:${getClientIp(c)}:repricing:start`, adminRateLimiter)
  if (rateLimitRes) {
    return rateLimitRes
  }

  const token = c.req.header("x-admin-token") ?? null
  if (!verifyAdminToken(token, getAdminTokenFromEnv())) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const supabase = adminClient()
  const nowIso = new Date().toISOString()

  const currentSettings = await supabase
    .from("system_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  if (currentSettings.error || !currentSettings.data) {
    console.error('[qa-event] repricing:start:failed', { error: currentSettings.error?.message ?? 'system_settings not found' })
    return c.json({ error: currentSettings.error?.message ?? "system_settings not found" }, 500)
  }

  console.info('[qa-event] repricing:start', { totalProducts: 0 })

  const rates = {
    rateAirExpressXOF: Number(currentSettings.data.rate_air_express_xof ?? 0),
    rateAirEcoXOF: Number(currentSettings.data.rate_air_eco_xof ?? 0),
    rateMaritimeCbmXOF: Number(currentSettings.data.rate_maritime_cbm_xof ?? 0),
    marginPercentage: Number(currentSettings.data.margin_percentage ?? 0),
  }

  const productsRes = await supabase
    .from("products")
    .select("id, price_xof, base_cost_xof, estimated_weight_kg, length_cm, width_cm, height_cm")

  if (productsRes.error) {
    console.error('[qa-event] repricing:load-products:failed', { error: productsRes.error.message })
    return c.json({ error: productsRes.error.message }, 500)
  }

  const products = productsRes.data ?? []

  const createdJob = await supabase
    .from("catalog_repricing_jobs")
    .insert({
      trigger_source: "admin_panel",
      requested_by: "admin_token",
      status: "RUNNING",
      previous_settings: currentSettings.data,
      applied_settings: rates,
      total_products: products.length,
      processed_products: 0,
      succeeded_products: 0,
      failed_products: 0,
      started_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .single()

  if (createdJob.error || !createdJob.data) {
    return c.json({ error: createdJob.error?.message ?? "Unable to create repricing job" }, 500)
  }

  const jobId = createdJob.data.id
  let processedProducts = 0
  let succeededProducts = 0
  let failedProducts = 0
  const errorSamples: string[] = []

  for (const product of products) {
    processedProducts += 1
    try {
      const repriced = calculateCatalogPriceXOF(product, rates)
      const updateRes = await supabase
        .from("products")
        .update({
          price_xof: repriced.newPriceXof,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id)

      if (updateRes.error) {
        throw new Error(updateRes.error.message)
      }

      const snapshotRes = await supabase
        .from("catalog_price_snapshots")
        .insert({
          job_id: jobId,
          product_id: product.id,
          old_price_xof: Number(product.price_xof ?? 0),
          new_price_xof: repriced.newPriceXof,
          shipping_mode: repriced.selectedMode,
          shipping_cost_xof: repriced.shippingCostXof,
          base_cost_xof: repriced.baseCostXof,
          margin_percentage: rates.marginPercentage,
          details: {
            cbmVolume: repriced.cbmVolume,
            rates,
          },
        })

      if (snapshotRes.error) {
        throw new Error(snapshotRes.error.message)
      }

      succeededProducts += 1
    } catch (error) {
      failedProducts += 1
      if (errorSamples.length < 8) {
        errorSamples.push(`product:${product.id}:${String(error)}`)
      }
    }

    if (processedProducts % 25 === 0 || processedProducts === products.length) {
      await supabase
        .from("catalog_repricing_jobs")
        .update({
          processed_products: processedProducts,
          succeeded_products: succeededProducts,
          failed_products: failedProducts,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId)
    }
  }

  const finalStatus = failedProducts === 0 ? "COMPLETED" : (succeededProducts > 0 ? "COMPLETED" : "FAILED")

  await supabase
    .from("catalog_repricing_jobs")
    .update({
      status: finalStatus,
      processed_products: processedProducts,
      succeeded_products: succeededProducts,
      failed_products: failedProducts,
      error_summary: errorSamples.length > 0 ? errorSamples.join(" | ") : null,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)

  return c.json({
    ok: finalStatus !== "FAILED",
    jobId,
    status: finalStatus,
    totalProducts: products.length,
    processedProducts,
    succeededProducts,
    failedProducts,
    errors: errorSamples,
  })
})

app.get("/make-server-9c5a520a/admin/repricing/:jobId", async (c) => {
  const rateLimitRes = applyRateLimit(c, `admin:${getClientIp(c)}:repricing:job`, adminRateLimiter)
  if (rateLimitRes) {
    return rateLimitRes
  }

  const token = c.req.header("x-admin-token") ?? null
  if (!verifyAdminToken(token, getAdminTokenFromEnv())) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const jobId = c.req.param("jobId")
  if (!jobId) {
    return c.json({ error: "jobId is required" }, 400)
  }

  const supabase = adminClient()
  const jobRes = await supabase
    .from("catalog_repricing_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle()

  if (jobRes.error) {
    return c.json({ error: jobRes.error.message }, 500)
  }

  if (!jobRes.data) {
    return c.json({ error: "Job not found" }, 404)
  }

  const snapshotsRes = await supabase
    .from("catalog_price_snapshots")
    .select("product_id, old_price_xof, new_price_xof, shipping_mode, shipping_cost_xof, created_at")
    .eq("job_id", jobId)
    .order("product_id", { ascending: true })
    .limit(20)

  if (snapshotsRes.error) {
    return c.json({ error: snapshotsRes.error.message }, 500)
  }

  return c.json({
    ok: true,
    data: {
      job: jobRes.data,
      sampleSnapshots: snapshotsRes.data ?? [],
    },
  })
})

app.get("/make-server-9c5a520a/admin/repricing/latest", async (c) => {
  const rateLimitRes = applyRateLimit(c, `admin:${getClientIp(c)}:repricing:latest`, adminRateLimiter)
  if (rateLimitRes) {
    return rateLimitRes
  }

  const token = c.req.header("x-admin-token") ?? null
  if (!verifyAdminToken(token, getAdminTokenFromEnv())) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const supabase = adminClient()
  const latest = await supabase
    .from("catalog_repricing_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest.error) {
    return c.json({ error: latest.error.message }, 500)
  }

  return c.json({ ok: true, data: latest.data ?? null })
})

app.post("/make-server-9c5a520a/delivery-pass/validate", async (c) => {
  const payload = await c.req.json().catch(() => null) as {
    orderId?: string
    validationToken?: string
    qrTimestamp?: string
    queuedAt?: string
    idempotencyKey?: string
  } | null

  if (!payload?.orderId || !payload.validationToken || !payload.qrTimestamp || !payload.idempotencyKey) {
    return c.json({ error: "orderId, validationToken, qrTimestamp and idempotencyKey are required" }, 400)
  }

  const expectedToken = generateDeliveryValidationToken(payload.orderId, payload.qrTimestamp)
  if (expectedToken !== payload.validationToken) {
    return c.json({ error: "Invalid validation token" }, 401)
  }

  const dedupeKey = `delivery-pass:validation:${payload.idempotencyKey}`
  const existing = await kv.get(dedupeKey)
  if (existing) {
    return c.json({ ok: true, deduped: true })
  }

  const supabase = adminClient()
  const orderRes = await supabase
    .from("orders")
    .select("order_ref, status, updated_at")
    .eq("order_ref", payload.orderId)
    .maybeSingle()

  if (orderRes.error || !orderRes.data) {
    return c.json({ error: orderRes.error?.message ?? "Order not found" }, 404)
  }

  const currentStatus = String(orderRes.data.status ?? "")
  const serverUpdatedAt = String(orderRes.data.updated_at ?? "")
  const clientQueuedAt = payload.queuedAt ?? payload.qrTimestamp

  if (currentStatus === "DELIVERED" || currentStatus === "PAID") {
    await kv.set(dedupeKey, {
      orderId: payload.orderId,
      resolvedAt: new Date().toISOString(),
      status: currentStatus,
      deduped: true,
    })
    return c.json({ ok: true, deduped: true, status: currentStatus })
  }

  if (currentStatus !== "OUT_FOR_DELIVERY") {
    const resolvedByTimestamp = serverUpdatedAt && serverUpdatedAt >= clientQueuedAt
    if (!resolvedByTimestamp) {
      return c.json({ error: `Unexpected status for validation sync: ${currentStatus}` }, 409)
    }

    await kv.set(dedupeKey, {
      orderId: payload.orderId,
      resolvedAt: new Date().toISOString(),
      status: currentStatus,
      resolvedBy: "server_timestamp",
    })
    return c.json({ ok: true, deduped: true, status: currentStatus })
  }

  const nowIso = new Date().toISOString()
  const updateRes = await supabase
    .from("orders")
    .update({ status: "DELIVERED", updated_at: nowIso })
    .eq("order_ref", payload.orderId)
    .eq("status", "OUT_FOR_DELIVERY")

  if (updateRes.error) {
    return c.json({ error: updateRes.error.message }, 500)
  }

  await supabase.from("order_status_events").insert({
    order_ref: payload.orderId,
    previous_status: "OUT_FOR_DELIVERY",
    next_status: "DELIVERED",
    source: "delivery_pass_sync",
    metadata: {
      idempotencyKey: payload.idempotencyKey,
      qrTimestamp: payload.qrTimestamp,
      queuedAt: payload.queuedAt ?? null,
      resolvedBy: "client_queue",
    },
  })

  await kv.set(dedupeKey, {
    orderId: payload.orderId,
    resolvedAt: nowIso,
    status: "DELIVERED",
  })

  console.info("[qa-event] delivery-pass:validation:server-synced", {
    orderId: payload.orderId,
    idempotencyKey: payload.idempotencyKey,
  })

  return c.json({ ok: true, status: "DELIVERED" })
})

app.post("/make-server-9c5a520a/payments/initiate", async (c) => {
  const payload = await c.req.json()
  const provider = payload?.provider as PaymentProvider | undefined
  const orderRef = payload?.orderRef as string | undefined
  const amountXof = payload?.amountXof as number | undefined
  const idempotencyKey = payload?.idempotencyKey as string | undefined
  const payerName = payload?.payerName as string | undefined
  const payerPhone = payload?.payerPhone as string | undefined

  if (!provider || !orderRef || !idempotencyKey || typeof amountXof !== "number") {
    return c.json({ error: "provider, orderRef, idempotencyKey and amountXof are required" }, 400)
  }

  if (provider !== "wave" && provider !== "orange") {
    return c.json({ error: "Unsupported payment provider" }, 400)
  }

  const supabase = adminClient()
  const existingTx = await supabase
    .from("payment_transactions")
    .select("id, status, provider_reference")
    .eq("provider", provider)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle()

  if (existingTx.data?.status === "CONFIRMED") {
    return c.json({
      ok: true,
      status: "PAID",
      providerReference: existingTx.data.provider_reference,
      idempotencyKey,
      deduped: true,
    })
  }

  const providerReference = `${provider.toUpperCase()}-${orderRef}-${Date.now()}`
  await supabase.from("payment_transactions").upsert({
    order_ref: orderRef,
    provider,
    provider_reference: providerReference,
    amount_xof: amountXof,
    status: "PENDING",
    idempotency_key: idempotencyKey,
    payer_name: payerName ?? null,
    payer_phone: payerPhone ?? null,
    metadata: {
      mode: "sandbox",
      initiatedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  })

  const cfg = providerConfig(provider)

  // If provider sandbox credentials are configured, call provider and wait webhook callback.
  if (cfg.apiUrl && cfg.apiKey) {
    try {
      const callbackBase = Deno.env.get("APP_PUBLIC_BASE_URL") ?? ""
      const callbackUrl = callbackBase
        ? `${callbackBase}/make-server-9c5a520a/payments/webhook/${provider}`
        : ""

      await fetch(cfg.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          orderRef,
          amountXof,
          providerReference,
          idempotencyKey,
          callbackUrl,
        }),
      })

      return c.json({
        ok: true,
        status: "PENDING",
        providerReference,
        idempotencyKey,
      })
    } catch (error) {
      return c.json({ error: `Provider call failed: ${String(error)}` }, 502)
    }
  }

  // Fallback sandbox simulation: complete payment immediately using internal webhook semantics.
  await markOrderPaid(orderRef)
  await supabase
    .from("payment_transactions")
    .update({ status: "CONFIRMED", updated_at: new Date().toISOString() })
    .eq("provider", provider)
    .eq("idempotency_key", idempotencyKey)

  await kv.set(`payment:webhook:${provider}:${idempotencyKey}`, {
    source: "sandbox_simulation",
    receivedAt: new Date().toISOString(),
  })

  return c.json({
    ok: true,
    status: "PAID",
    providerReference,
    idempotencyKey,
    simulated: true,
  })
})

app.post("/make-server-9c5a520a/payments/webhook/:provider", async (c) => {
  const rateLimitRes = applyRateLimit(c, `webhook:${getClientIp(c)}:payments`, webhookRateLimiter)
  if (rateLimitRes) {
    return rateLimitRes
  }

  const provider = c.req.param("provider") as PaymentProvider
  if (provider !== "wave" && provider !== "orange") {
    return c.json({ error: "Unsupported payment provider" }, 400)
  }

  const signature = c.req.header("x-webhook-signature") ?? null
  const rawBody = await c.req.text()

  let payload: unknown = null
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400)
  }

  const result = await processWebhookEvent(
    {
      getDedupe: kv.get,
      setDedupe: kv.set,
      markOrderPaid,
    },
    {
      provider,
      rawBody,
      signature,
      payload: payload as {
        orderRef: string
        idempotencyKey: string
      },
      secret: getWebhookSecretForProvider(provider, (name) => Deno.env.get(name)),
    },
  )

  if (!result.ok) {
    console.error('[qa-event] payment:webhook:failed', { provider, error: result.error })
    return c.json({ error: result.error ?? "Webhook error" }, result.statusCode)
  }

  const webhookPayload = payload as {
    orderRef: string
    idempotencyKey: string
    providerReference?: string
  }

  const supabase = adminClient()
  await supabase
    .from("payment_transactions")
    .update({ status: "CONFIRMED", updated_at: new Date().toISOString() })
    .eq("provider", provider)
    .eq("idempotency_key", webhookPayload.idempotencyKey)

  await supabase.from("order_status_events").insert({
    order_ref: webhookPayload.orderRef,
    previous_status: "OUT_FOR_DELIVERY",
    next_status: "PAID",
    source: "payment_webhook",
    metadata: {
      provider,
      providerReference: webhookPayload.providerReference ?? null,
      deduped: result.deduped ?? false,
    },
  })

  console.info('[qa-event] payment:webhook:confirmed', {
    provider,
    orderRef: webhookPayload.orderRef,
    deduped: result.deduped ?? false,
  })

  return c.json({ ok: true, deduped: result.deduped ?? false })
})

app.get("/make-server-9c5a520a/orders/:orderRef/inspection-media", async (c) => {
  const rateLimitRes = applyRateLimit(c, `media:${getClientIp(c)}:inspection`, webhookRateLimiter)
  if (rateLimitRes) {
    return rateLimitRes
  }

  const orderRef = c.req.param("orderRef")
  const requestedCustomerPhone = c.req.query("customerPhone") ?? c.req.header("x-customer-phone") ?? null
  const adminToken = c.req.header("x-admin-token") ?? null

  const supabase = adminClient()
  const orderRes = await supabase
    .from("orders")
    .select(
      "order_ref, customer_phone, inspection_photo_url, inspection_video_url, inspection_thumbnail_url, inspection_photo_path, inspection_video_path, inspection_thumbnail_path",
    )
    .eq("order_ref", orderRef)
    .maybeSingle()

  if (orderRes.error) {
    return c.json({ error: orderRes.error.message }, 500)
  }

  if (!orderRes.data) {
    return c.json({ error: "Order not found" }, 404)
  }

  const isAdmin = isAdminRequest(adminToken)
  const isOwner = canAccessInspectionMedia(orderRes.data.customer_phone ?? null, requestedCustomerPhone)

  if (!isAdmin && !isOwner) {
    return c.json({ error: "Forbidden" }, 403)
  }

  const bucketName = Deno.env.get("INSPECTION_MEDIA_BUCKET") ?? "inspection-media"
  const ttlSeconds = Number(Deno.env.get("INSPECTION_MEDIA_URL_TTL_SECONDS") ?? "600")
  const photoRef = classifyInspectionMediaReference(orderRes.data.inspection_photo_path ?? orderRes.data.inspection_photo_url)
  const videoRef = classifyInspectionMediaReference(orderRes.data.inspection_video_path ?? orderRes.data.inspection_video_url)
  const thumbRef = classifyInspectionMediaReference(orderRes.data.inspection_thumbnail_path ?? orderRes.data.inspection_thumbnail_url)

  const photoUrl = photoRef.kind === "direct"
    ? photoRef.value ?? null
    : photoRef.kind === "storage"
      ? await signInspectionMediaUrl(photoRef.value ?? "", bucketName, ttlSeconds)
      : null

  const videoUrl = videoRef.kind === "direct"
    ? videoRef.value ?? null
    : videoRef.kind === "storage"
      ? await signInspectionMediaUrl(videoRef.value ?? "", bucketName, ttlSeconds)
      : null

  const videoThumbUrl = thumbRef.kind === "direct"
    ? thumbRef.value ?? null
    : thumbRef.kind === "storage"
      ? await signInspectionMediaUrl(thumbRef.value ?? "", bucketName, ttlSeconds)
      : null

  return c.json({
    ok: true,
    secure: true,
    ownerAccess: isOwner,
    adminAccess: isAdmin,
    ttlSeconds,
    data: {
      orderRef,
      photoUrl,
      videoUrl,
      videoThumbUrl,
      source: {
        photo: photoRef.kind,
        video: videoRef.kind,
        videoThumb: thumbRef.kind,
      },
    },
  })
})

Deno.serve(app.fetch);