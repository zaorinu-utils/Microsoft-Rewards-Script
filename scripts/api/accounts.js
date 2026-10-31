import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseAccountsJson } from '../env.js'

function createTemporaryAccountsFile(accounts) {
    const filePath = path.join(os.tmpdir(), `rewards-accounts-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`)
    fs.writeFileSync(filePath, accounts.map(account =>
        [
            `email: ${account.email}`,
            `password: ${account.password || ''}`,
            ...(account.totpSecret ? [`totpSecret: ${account.totpSecret}`] : [])
        ].join('\n')
    ).join('\n\n'), { mode: 0o600 })
    return filePath
}

function sanitizeProxyUrl(value) {
    try {
        const url = new URL(value)
        url.username = ''
        url.password = ''
        return url.toString().replace(/\/$/, '')
    } catch {
        return value.replace(/^(?:[^/@\s]+@|([a-z][a-z0-9+.-]*:\/\/)[^/@\s]+@)/i, '$1')
    }
}

export function loadAccounts(sourceEnv = process.env) {
    const sourceAccounts = parseAccountsJson(sourceEnv)
    return sourceAccounts.map((account, index) => {
        const proxyUrl = typeof account.proxy?.url === 'string' ? account.proxy.url.trim() : ''
        return {
            index: index + 1,
            email: account.email.trim(),
            emailKey: account.email.trim(),
            region: account.region ?? null,
            hasRecoveryEmail: Boolean(account.recoveryEmail),
            hasTotp: Boolean(account.totpSecret),
            proxy: proxyUrl
                ? {
                      url: sanitizeProxyUrl(proxyUrl),
                      port: account.proxy.port ?? null,
                      hasCredentials: Boolean(account.proxy.username && account.proxy.password)
                  }
                : null
        }
    })
}

export function buildSingleAccountEnv(accountIndex, sourceEnv = process.env) {
    const index = Number(accountIndex)
    if (!Number.isSafeInteger(index) || index < 1) {
        const err = new Error('`accountIndex` must be a positive integer.')
        err.code = 'BAD_REQUEST'
        throw err
    }

    const accounts = parseAccountsJson(sourceEnv)
    const selected = accounts[index - 1]
    if (!selected) {
        const err = new Error(`Account ${index} is not configured.`)
        err.code = 'BAD_REQUEST'
        throw err
    }

    return {
        env: { ACCOUNTS_FILE: createTemporaryAccountsFile([selected]) },
        account: { index, email: selected.email }
    }
}

export function buildExcludedAccountsEnv(excludedAccountIndexes, sourceEnv = process.env) {
    if (!Array.isArray(excludedAccountIndexes)) {
        const err = new Error('`excludedAccountIndexes` must be an array of positive integers.')
        err.code = 'BAD_REQUEST'
        throw err
    }

    const excluded = [...new Set(excludedAccountIndexes.map(Number))]
    if (excluded.some(index => !Number.isSafeInteger(index) || index < 1)) {
        const err = new Error('`excludedAccountIndexes` must contain only positive integers.')
        err.code = 'BAD_REQUEST'
        throw err
    }

    const sourceAccounts = parseAccountsJson(sourceEnv)
    const accounts = loadAccounts(sourceEnv)
    const knownIndexes = new Set(accounts.map(account => account.index))
    const unknown = excluded.filter(index => !knownIndexes.has(index))
    if (unknown.length) {
        const err = new Error(
            `Unknown account slot${unknown.length === 1 ? '' : 's'}: ${unknown.map(index => `ACCOUNT_${index}`).join(', ')}.`
        )
        err.code = 'BAD_REQUEST'
        throw err
    }

    const excludedSet = new Set(excluded)
    const included = accounts.filter(account => !excludedSet.has(account.index))
    if (!included.length) {
        const err = new Error('A scheduled run cannot exclude every configured account.')
        err.code = 'BAD_REQUEST'
        throw err
    }

    const env = {
        ACCOUNTS_FILE: createTemporaryAccountsFile(sourceAccounts.filter((_, index) => !excludedSet.has(index + 1)))
    }

    return {
        env,
        excludedAccounts: accounts
            .filter(account => excludedSet.has(account.index))
            .map(({ index, email }) => ({ index, email })),
        includedAccounts: included.map(({ index, email }) => ({ index, email }))
    }
}

export function mergeAccountStats(accounts, runs) {
    // Index history results by email.
    const byEmail = new Map()
    for (const run of runs) {
        const when = run.endedAt || run.startedAt || null
        for (const acc of run.accounts || []) {
            if (!byEmail.has(acc.email)) byEmail.set(acc.email, [])
            byEmail.get(acc.email).push({ ...acc, when })
        }
    }

    return accounts.map(a => {
        const results = byEmail.get(a.emailKey) || [] // already most-recent-first
        const last = results[0] || null
        const streakProtection = results.find(result => result.streakProtection != null)?.streakProtection ?? null
        const edgeBrowsing = results.find(result => result.edgeBrowsing != null)?.edgeBrowsing ?? null

        let totalCollected = 0
        for (const r of results) totalCollected += r.collected || 0

        // Consecutive successes from the most recent run backwards.
        let successStreak = 0
        for (const r of results) {
            if (r.success === true) successStreak++
            else break
        }

        const { emailKey, ...safe } = a
        void emailKey
        return {
            ...safe,
            runs: results.length,
            totalCollected,
            successStreak,
            lastRunAt: last?.when ?? null,
            lastCollected: last?.collected ?? null,
            lastSuccess: last ? last.success : null,
            lastError: last?.error ?? null,
            streakProtection,
            edgeBrowsing
        }
    })
}
