import fs from 'node:fs'
import path from 'node:path'

import { getWorkspaceDirectory, isSeaBuild } from './AppPaths'

const USER_CONFIG = {
    webhook: {
        discord: {
            enabled: false,
            url: ''
        },
        webhookLogFilter: {
            enabled: false,
            mode: 'whitelist',
            levels: ['error'],
            keywords: ['Starting account', 'Points collected']
        }
    }
}

const ACCOUNTS_TEMPLATE = [
    '# Add one Microsoft account per block.',
    '# Optional: totpSecret, recoveryEmail, region, and proxy settings.',
    '#',
    '# email: user@example.com',
    '# password: your-password',
    ''
].join('\n')

function writePrivateJson(filePath: string, value: unknown): void {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 4)}\n`, { mode: 0o600 })
    fs.chmodSync(filePath, 0o600)
}

export function runOnboarding(): void {
    const workspaceDirectory = getWorkspaceDirectory()
    const development = process.env.MRS_ENV === 'development' || process.argv.includes('-dev') || process.argv.includes('--dev')
    const configName = development ? 'config.dev.json' : 'config.json'
    const accountsName = development ? 'accounts.dev.txt' : 'accounts.txt'
    const configPath = path.join(workspaceDirectory, configName)
    const accountsPath = path.join(workspaceDirectory, accountsName)

    if (!fs.existsSync(configPath)) writePrivateJson(configPath, USER_CONFIG)

    if (!fs.existsSync(accountsPath)) {
        fs.writeFileSync(accountsPath, ACCOUNTS_TEMPLATE, { mode: 0o600 })
        fs.chmodSync(accountsPath, 0o600)
    }

    if (!isSeaBuild()) return
    fs.mkdirSync(path.join(workspaceDirectory, 'sessions'), { recursive: true })
    fs.mkdirSync(path.join(workspaceDirectory, 'diagnostics'), { recursive: true })
}
