import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import semver from 'semver'

const projectRoot = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)

function check(name, ok, detail) {
    console.log(`${ok ? 'OK' : 'FAIL'}  ${name}: ${detail}`)
    return ok
}

function main() {
    let healthy = true
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
    healthy =
        check(
            'Node.js',
            semver.satisfies(process.version, packageJson.engines.node),
            `${process.version} (requires ${packageJson.engines.node})`
        ) && healthy

    const developmentMode = process.env.MRS_ENV === 'development' || process.argv.includes('-dev')
    const accountsPath = path.join(projectRoot, 'workspace', developmentMode ? 'accounts.dev.txt' : 'accounts.txt')
    const accountsExist =
        fs.existsSync(accountsPath) &&
        fs
            .readFileSync(accountsPath, 'utf8')
            .split(/\r?\n/)
            .some(line => /^email:\s*\S+@\S+/i.test(line.trim()))
    healthy = check('Accounts', accountsExist, accountsExist ? accountsPath : 'missing; run npm run setup') && healthy

    const configPath = path.join(projectRoot, 'workspace', developmentMode ? 'config.dev.json' : 'config.json')
    if (fs.existsSync(configPath)) {
        try {
            JSON.parse(fs.readFileSync(configPath, 'utf8'))
            healthy = check('Configuration', true, configPath) && healthy
        } catch {
            healthy = check('Configuration', false, `${configPath} contains invalid JSON`) && healthy
        }
    } else {
        healthy = check('Configuration', false, 'missing; run npm run setup') && healthy
    }

    try {
        const { chromium } = require('patchright')
        const executablePath = chromium.executablePath()
        if (!fs.existsSync(executablePath)) {
            healthy = check('Chromium', false, `${executablePath}; run npm install to restore it`) && healthy
        } else {
            const launch = spawnSync(
                executablePath,
                ['--headless', '--no-sandbox', '--disable-gpu', '--dump-dom', 'about:blank'],
                { encoding: 'utf8', timeout: 15000 }
            )
            healthy =
                check(
                    'Chromium',
                    launch.status === 0 && !launch.error,
                    launch.status === 0
                        ? executablePath
                        : launch.stderr?.trim() || `exit code ${launch.status ?? 'unknown'}`
                ) && healthy
        }
    } catch (error) {
        healthy = check('Chromium', false, error instanceof Error ? error.message : String(error)) && healthy
    }

    if (!healthy) process.exitCode = 1
}

main()
