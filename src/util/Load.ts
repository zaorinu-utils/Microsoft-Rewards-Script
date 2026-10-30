import fs from 'fs'
import path from 'path'
import process from 'node:process'

import type { Account } from '../interface/Account'
import type { Config } from '../interface/Config'
import { validateAccounts, validateConfig } from './Validator'

let configCache: Config
let envLoaded = false

function getProjectRoot(): string {
    const cwd = process.cwd()
    if (fs.existsSync(path.join(cwd, 'package.json'))) return cwd

    let dir = __dirname
    while (dir !== path.parse(dir).root) {
        if (fs.existsSync(path.join(dir, 'package.json'))) return dir
        dir = path.dirname(dir)
    }

    return cwd
}

// Check root -> dist -> src (not in dist, but root)
function resolveProjectFile(filename: string): string | undefined {
    const root = getProjectRoot()
    const candidates = [
        path.join(process.cwd(), filename),
        path.join(root, filename),
        path.join(root, 'dist', filename),
        path.join(root, 'src', filename)
    ]
    return candidates.find(p => fs.existsSync(p))
}

function ensureEnvLoaded(): void {
    if (envLoaded) return
    envLoaded = true

    const envFile = resolveProjectFile('.env')
    if (envFile) process.loadEnvFile(envFile)
}

function envStr(key: string): string | undefined {
    const v = process.env[key]
    if (v === undefined) return undefined
    const trimmed = v.trim()
    return trimmed.length ? trimmed : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeConfig(base: unknown, override: unknown): unknown {
    if (!isRecord(base) || !isRecord(override)) return override
    const merged = { ...base }
    for (const [key, value] of Object.entries(override)) {
        merged[key] = key in base ? mergeConfig(base[key], value) : value
    }
    return merged
}

function parseAccounts(value: string): unknown[] {
    let accounts: unknown
    try {
        accounts = JSON.parse(value)
    } catch (error) {
        throw new Error(`ACCOUNTS_JSON must contain valid JSON: ${error instanceof Error ? error.message : error}`)
    }
    if (!Array.isArray(accounts)) throw new Error('ACCOUNTS_JSON must be a JSON array of account objects.')
    return accounts
}

export function loadAccounts(): Account[] {
    try {
        ensureEnvLoaded()

        const accountsJson = envStr('ACCOUNTS_JSON')
        if (!accountsJson) throw new Error('ACCOUNTS_JSON is required; see config/env.example.')
        return validateAccounts(parseAccounts(accountsJson))
    } catch (error) {
        if (error instanceof Error) throw error
        throw new Error(String(error))
    }
}

export function loadConfig(): Config {
    try {
        if (configCache) return configCache
        ensureEnvLoaded()

        const envConfig = envStr('BOT_CONFIG')
        let overrides: unknown = {}
        if (envConfig) {
            let parsed: unknown
            try {
                parsed = JSON.parse(envConfig)
            } catch (error) {
                throw new Error(`BOT_CONFIG must contain valid JSON: ${error instanceof Error ? error.message : error}`)
            }
            if (!isRecord(parsed)) throw new Error('BOT_CONFIG must be a JSON object.')
            overrides = mergeConfig(overrides, parsed)
        }

        configCache = validateConfig(overrides)
        return configCache
    } catch (error) {
        if (error instanceof Error) throw error
        throw new Error(String(error))
    }
}
