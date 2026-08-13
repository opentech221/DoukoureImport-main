import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const tokenFile = path.join(rootDir, 'src', 'index.css')
const governedDir = path.join(rootDir, 'src', 'components', 'ui')
const requiredTokens = [
  '--di-primary:',
  '--di-success:',
  '--di-warning:',
  '--di-danger:',
  '--di-surface:',
  '--di-card:',
  '--di-border:',
  '--di-text:',
  '--di-focus:',
]
const rawColorPattern = /#[0-9a-f]{3,8}\b|\brgb\(|\brgba\(/i

function collectFiles(directory) {
  if (!statSync(directory, { throwIfNoEntry: false })) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath]
  })
}

const tokenSource = readFileSync(tokenFile, 'utf8')
const missingTokens = requiredTokens.filter((token) => !tokenSource.includes(token))
const governedFiles = collectFiles(governedDir).filter((filePath) => /\.(tsx?|css)$/.test(filePath))
const rawColorFiles = governedFiles.filter((filePath) => rawColorPattern.test(readFileSync(filePath, 'utf8')))

if (missingTokens.length || rawColorFiles.length) {
  if (missingTokens.length) {
    console.error(`Missing Design System tokens: ${missingTokens.join(', ')}`)
  }
  if (rawColorFiles.length) {
    console.error('Raw colors are forbidden in governed UI files:')
    rawColorFiles.forEach((filePath) => console.error(`- ${path.relative(rootDir, filePath)}`))
  }
  process.exit(1)
}

console.log(`Design System gate passed (${requiredTokens.length} required tokens, ${governedFiles.length} governed files)`)
