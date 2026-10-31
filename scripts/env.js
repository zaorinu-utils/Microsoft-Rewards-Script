import fs from 'node:fs'
import path from 'node:path'

export function envStrFrom(sourceEnv, key) {
    const value = sourceEnv[key]
    if (value === undefined) return undefined

    const trimmed = String(value).trim()
    return trimmed.length ? trimmed : undefined
}

export function envStr(key, sourceEnv = process.env) {
    return envStrFrom(sourceEnv, key)
}

export function envBool(key, fallback, sourceEnv = process.env) {
    const value = envStr(key, sourceEnv)
    if (value === undefined) return fallback
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export function envInt(key, fallback, sourceEnv = process.env) {
    const value = envStr(key, sourceEnv)
    if (value === undefined) return fallback

    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : fallback
}

function isDevelopmentMode(sourceEnv = process.env) {
    return sourceEnv.MRS_ENV === 'development' || process.argv.includes('-dev') || process.argv.includes('--dev')
}

export function workspaceAccountsFile(projectRoot, sourceEnv = process.env) {
    const filename = isDevelopmentMode(sourceEnv) ? 'accounts.dev.txt' : 'accounts.txt'
    return path.join(projectRoot, 'workspace', filename)
}

export function parseAccountsText(text) {
    const blocks = []
    let current = []

    for (const rawLine of String(text).replace(/\r/g, '').split('\n')) {
        if (!rawLine.trim()) {
            if (current.length) {
                blocks.push(current.join('\n'))
                current = []
            }

            continue
        }
        if (rawLine.trimStart().startsWith('#')) continue
        current.push(rawLine)
    }
    if (current.length) blocks.push(current.join('\n'))

    return blocks.map((block, index) => {
        const account = { email: '', password: '' }
        for (const line of block.split('\n')) {
            const separator = line.indexOf(':')
            if (separator < 1) throw new Error(`Invalid account setting on line ${index + 1}: ${line}`)
            const key = line.slice(0, separator).trim()
            if (key !== 'email' && key !== 'password') throw new Error(`Unknown account setting: ${key}`)
            account[key] = line.slice(separator + 1).trim()
        }
        if (!account.email) throw new Error(`Account block ${index + 1} must start with email: ...`)
        return account
    })
}

export function parseAccountsJson(sourceEnv = process.env) {
    const accountsFile = path.resolve(
        process.cwd(),
        envStrFrom(sourceEnv, 'ACCOUNTS_FILE') || workspaceAccountsFile(process.cwd(), sourceEnv)
    )
    if (!fs.existsSync(accountsFile)) return []
    return parseAccountsText(fs.readFileSync(accountsFile, 'utf8'))
}
