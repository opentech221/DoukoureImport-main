import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist')
const assetsDir = path.join(distDir, 'assets')
const reportDir = path.join(rootDir, 'artifacts')
const reportJsonPath = path.join(reportDir, 'qa-summary.json')
const reportMdPath = path.join(reportDir, 'qa-summary.md')
const reportCiPath = path.join(reportDir, 'qa-summary.ci.json')
const reportLogPath = path.join(reportDir, 'qa-gates.log')

const qaEnvironment = process.env.QA_ENV ?? process.env.NODE_ENV ?? 'local'
const defaultBudgets = {
  local: { entry: 40, total: 430 },
  ci: { entry: 45, total: 475 },
  production: { entry: 35, total: 400 },
}
const selectedBudget = defaultBudgets[qaEnvironment] ?? defaultBudgets.local
const entryBudgetKb = Number(process.env.QA_ENTRY_BUNDLE_MAX_KB ?? String(selectedBudget.entry))
const totalBudgetKb = Number(process.env.QA_TOTAL_BUNDLE_MAX_KB ?? String(selectedBudget.total))
const stepLogs = []

function runStep(label, command) {
  const startedAt = new Date().toISOString()
  try {
    execSync(command, { cwd: rootDir, stdio: 'inherit', shell: true })
    const step = { label, status: 'passed', startedAt, finishedAt: new Date().toISOString() }
    stepLogs.push(`${step.finishedAt} ${label} passed`)
    return step
  } catch (error) {
    const step = {
      label,
      status: 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error?.message ?? String(error),
      exitCode: error?.status ?? 1,
    }
    stepLogs.push(`${step.finishedAt} ${label} failed: ${step.error}`)
    return step
  }
}

function fileSizeBytes(filePath) {
  return statSync(filePath).size
}

function formatKb(bytes) {
  return (bytes / 1024).toFixed(2)
}

mkdirSync(reportDir, { recursive: true })

const steps = []
steps.push(runStep('build', 'npm run build'))
steps.push(runStep('design-system', 'npm run qa:design-system'))

let bundleResult = {
  status: 'skipped',
  entryBundleKb: 0,
  totalJsKb: 0,
  entryBudgetKb,
  totalBudgetKb,
}

try {
  const assetFiles = readdirSync(assetsDir).filter((fileName) => fileName.endsWith('.js'))
  const jsFiles = assetFiles.map((fileName) => path.join(assetsDir, fileName))
  const entryFiles = jsFiles.filter((filePath) => {
    const name = path.basename(filePath)
    return /^index-|^main-/.test(name)
  })

  const sizes = jsFiles.map(fileSizeBytes)
  const entrySizes = entryFiles.map(fileSizeBytes)
  const entryBytes = entrySizes.length > 0 ? Math.max(...entrySizes) : 0
  const totalBytes = sizes.reduce((sum, current) => sum + current, 0)

  bundleResult = {
    status: entryBytes <= entryBudgetKb * 1024 && totalBytes <= totalBudgetKb * 1024 ? 'passed' : 'failed',
    entryBundleKb: Number(formatKb(entryBytes)),
    totalJsKb: Number(formatKb(totalBytes)),
    entryBudgetKb,
    totalBudgetKb,
  }
} catch (error) {
  bundleResult = {
    status: 'failed',
    error: error?.message ?? String(error),
    entryBundleKb: 0,
    totalJsKb: 0,
    entryBudgetKb,
    totalBudgetKb,
  }
}

const budgetStep = {
  label: 'bundle-budgets',
  status: bundleResult.status,
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString(),
  ...bundleResult,
}
steps.push(budgetStep)

for (const testFile of [
  'src/screens/ProductPage.test.tsx',
  'src/screens/TrackingDashboard.test.tsx',
  'src/screens/DeliveryPass.test.tsx',
  'src/components/GlobalShippingRateSettings.test.tsx',
  'src/components/DeliveryValidationQRCode.test.tsx',
  'src/components/OrderTrackingTimeline.test.tsx',
  'src/utils/deliveryPassOffline.test.ts',
  'src/utils/paymentService.test.ts',
  'src/utils/endpointLogic.integration.test.ts',
  'src/utils/orderLifecycle.test.ts',
]) {
  steps.push(runStep(`synthetic-checks:${path.basename(testFile)}`, `npm test -- --run --pool=threads ${testFile}`))
}

const failedSteps = steps.filter((step) => step.status !== 'passed')
const summary = {
  generatedAt: new Date().toISOString(),
  environment: qaEnvironment,
  verdict: failedSteps.length === 0 ? 'passed' : 'failed',
  budgets: bundleResult,
  steps,
}

writeFileSync(reportJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
writeFileSync(reportCiPath, `${JSON.stringify({
  environment: qaEnvironment,
  verdict: summary.verdict,
  budgets: {
    entryBudgetKb,
    totalBudgetKb,
    measuredEntryKb: bundleResult.entryBundleKb,
    measuredTotalKb: bundleResult.totalJsKb,
  },
  failedSteps: failedSteps.map((step) => step.label),
}, null, 2)}\n`, 'utf8')
writeFileSync(
  reportMdPath,
  [
    '# QA Summary',
    '',
    `- Environment: ${qaEnvironment}`,
    `- Verdict: ${summary.verdict}`,
    `- Entry bundle budget: ${bundleResult.entryBudgetKb} KB`,
    `- Total JS budget: ${bundleResult.totalBudgetKb} KB`,
    `- Entry bundle measured: ${bundleResult.entryBundleKb ?? 0} KB`,
    `- Total JS measured: ${bundleResult.totalJsKb ?? 0} KB`,
    '',
    '## Steps',
    ...steps.map((step) => `- ${step.label}: ${step.status}`),
    '',
  ].join('\n'),
  'utf8',
)
writeFileSync(reportLogPath, `${stepLogs.join('\n')}\n`, 'utf8')

if (failedSteps.length > 0) {
  console.error(`Quality gates failed: ${failedSteps.map((step) => step.label).join(', ')}`)
  process.exit(1)
}

console.log(`QA summary written to ${reportJsonPath}`)