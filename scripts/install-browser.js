import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const projectRoot = path.resolve(import.meta.dirname, '..')

if (process.env.MRS_SKIP_BROWSER_INSTALL === '1') {
    console.log('[Setup] Chromium installation skipped by MRS_SKIP_BROWSER_INSTALL=1.')
    process.exit(0)
}

let executablePath
try {
    executablePath = require('patchright').chromium.executablePath()
} catch {
    console.error('[Setup] Patchright is not installed yet.')
    process.exit(1)
}

if (fs.existsSync(executablePath)) {
    console.log('[Setup] Chromium is already installed.')
    process.exit(0)
}

const cliPath = path.join(projectRoot, 'node_modules', 'patchright', 'cli.js')
const args = [cliPath, 'install', 'chromium']
if (process.platform === 'linux' && typeof process.getuid === 'function' && process.getuid() === 0) {
    args.push('--with-deps')
}

console.log('[Setup] Installing Chromium automatically...')
const result = spawnSync(process.execPath, args, { cwd: projectRoot, stdio: 'inherit' })
if (result.error) {
    console.error(`[Setup] Chromium installation failed: ${result.error.message}`)
    process.exit(1)
}
process.exit(result.status ?? 1)
