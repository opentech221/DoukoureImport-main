# Runbook provider réel 6.4

## Blocage actuel

Le provider réel Wave / Orange Money ne peut pas être branché tant que les secrets Edge Supabase suivants ne sont pas fournis dans le projet cible:

- ADMIN_API_TOKEN
- APP_PUBLIC_BASE_URL

## Secrets requis en mode provider réel

- WAVE_API_URL
- WAVE_API_KEY
- WAVE_WEBHOOK_SECRET
- ORANGE_API_URL
- ORANGE_API_KEY
- ORANGE_WEBHOOK_SECRET

## Fallback sandbox encore supporté

- WAVE_SANDBOX_API_URL
- WAVE_SANDBOX_API_KEY
- WAVE_SANDBOX_WEBHOOK_SECRET
- ORANGE_SANDBOX_API_URL
- ORANGE_SANDBOX_API_KEY
- ORANGE_SANDBOX_WEBHOOK_SECRET

## Commande de préparation

Utiliser le script de vérification:

powershell -ExecutionPolicy Bypass -File .\scripts\verify-edge-env.ps1

## Commande de configuration type

supabase secrets set ADMIN_API_TOKEN=__A_COMPLETER__ WAVE_API_URL=__A_COMPLETER__ WAVE_API_KEY=__A_COMPLETER__ WAVE_WEBHOOK_SECRET=__A_COMPLETER__ ORANGE_API_URL=__A_COMPLETER__ ORANGE_API_KEY=__A_COMPLETER__ ORANGE_WEBHOOK_SECRET=__A_COMPLETER__ APP_PUBLIC_BASE_URL=__A_COMPLETER__

## Validation après injection

1. Re-déployer la fonction server.
2. Lancer scripts/test-signed-webhook-e2e.ps1 contre l'URL Edge exposée, pas localhost Vite.
3. Vérifier que le fallback local n'est plus utilisé sur src/utils/paymentService.ts.
4. Contrôler les écritures payment_transactions et order_status_events.
