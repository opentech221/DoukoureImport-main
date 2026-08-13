# Go-Live Security Checklist — Doukoure Import

## 1) RLS policies (blocking)
- [ ] Verify RLS is ENABLED on:
  - [ ] public.system_settings
  - [ ] public.system_settings_audit_logs
  - [ ] public.payment_transactions
  - [ ] public.order_status_events
- [ ] Confirm public read-only policy on public.system_settings:
  - [ ] anon/authenticated can SELECT only
  - [ ] no INSERT/UPDATE/DELETE for anon
- [ ] Confirm admin write policy on public.system_settings:
  - [ ] requires admin claim or service_role
- [ ] Confirm payment transactions policy:
  - [ ] insert/select rules are intentional for current stage
  - [ ] update/delete exposure reviewed and minimized
- [ ] Confirm audit table is immutable in practice:
  - [ ] no update/delete grants to non-service role

## 2) Token and secret rotation (blocking)
- [ ] Rotate and set secrets before prod switch:
  - [ ] ADMIN_API_TOKEN
  - [ ] WAVE_SANDBOX_API_KEY (or prod key at cutover)
  - [ ] WAVE_SANDBOX_WEBHOOK_SECRET
  - [ ] ORANGE_SANDBOX_API_KEY (or prod key at cutover)
  - [ ] ORANGE_SANDBOX_WEBHOOK_SECRET
- [ ] Enforce secret naming convention by environment:
  - [ ] *_SANDBOX_* for staging
  - [ ] *_PROD_* for production
- [ ] Validate APP_PUBLIC_BASE_URL points to HTTPS production domain
- [ ] Document next rotation date and owner (Security + Platform)

## 3) Webhook security (blocking)
- [ ] Webhook signature validation required for all providers
- [ ] Reject missing/invalid signatures with 401
- [ ] Idempotency key required and deduplication effective
- [ ] Replay attack test executed (same payload twice)
- [ ] Webhook endpoint has rate-limiting/protection at edge gateway

## 4) Audit logs and traceability (blocking)
- [ ] Admin settings changes write immutable audit rows:
  - [ ] action
  - [ ] actor
  - [ ] before_payload
  - [ ] after_payload
  - [ ] source
  - [ ] timestamp
- [ ] Payment flow writes transaction history with provider refs
- [ ] Order status transitions are logged and queryable
- [ ] Monitoring alerts configured for:
  - [ ] repeated webhook signature failures
  - [ ] payment initiation failures
  - [ ] unusual admin settings changes

## 5) Operational hardening (strongly recommended)
- [ ] Disable or gate local fallback payment mode in production
- [ ] Confirm no secrets in frontend build (inspect dist assets)
- [ ] Review CORS policy scope for edge endpoints
- [ ] Verify least privilege grants on all public tables/sequences
- [ ] Dry-run incident playbook:
  - [ ] revoke compromised token
  - [ ] rotate webhook secret
  - [ ] reprocess pending payment events safely

## 6) Release evidence (required for sign-off)
- [ ] Output of scripts/verify-edge-env.ps1 attached
- [ ] Output of scripts/test-signed-webhook-e2e.ps1 attached
- [ ] SQL snapshots of active RLS policies attached
  - Script: scripts/sql/rls-policy-snapshot.sql
  - Example run: psql "$DATABASE_URL" -f scripts/sql/rls-policy-snapshot.sql > artifacts/rls-policy-snapshot.txt
- [ ] RLS CI gate pass/fail output attached
  - SQL gate: scripts/sql/rls-go-live-gate.sql
  - Runner: scripts/run-rls-go-live-gate.ps1
  - Example run: powershell -ExecutionPolicy Bypass -File .\scripts\run-rls-go-live-gate.ps1
- [ ] QA evidence for end-to-end scenario attached
- [ ] Final Go/No-Go approval recorded
