import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

async function main() {
    const workspaceDirectory = path.resolve('workspace')
    const accountsPath = path.join(workspaceDirectory, 'accounts.txt')
    const configPath = path.join(workspaceDirectory, 'config.json')
    fs.mkdirSync(workspaceDirectory, { recursive: true })

    if (!fs.existsSync(configPath)) {
        const examplePath = path.join(workspaceDirectory, 'config.example.json')
        const exampleConfig = JSON.parse(fs.readFileSync(examplePath, 'utf8'))
        fs.writeFileSync(configPath, `${JSON.stringify(exampleConfig, null, 4)}\n`, { mode: 0o600 })
    }

    const rl = readline.createInterface({ input, output })
    const accounts = []

    while (true) {
        const email = (await rl.question('Email (leave empty to finish): ')).trim()
        if (!email) break

        if (!email.includes('@')) {
            output.write('Enter a valid email address.\n')
            continue
        }

        const password = (await rl.question('Password: ')).trim()
        if (!password) {
            output.write('Password cannot be empty.\n')
            continue
        }

        const totpSecret = (await rl.question('TOTP secret (optional): ')).trim()
        accounts.push({ email, password, totpSecret })
    }

    rl.close()

    if (accounts.length) {
        const additions = accounts.map(account =>
            [
                `email: ${account.email}`,
                `password: ${account.password}`,
                ...(account.totpSecret ? [`totpSecret: ${account.totpSecret}`] : [])
            ].join('\n')
        ).join('\n\n')
        const existing = fs.existsSync(accountsPath) ? fs.readFileSync(accountsPath, 'utf8').trim() : ''
        const contents = existing ? `${existing}\n\n${additions}\n` : `${additions}\n`
        fs.writeFileSync(accountsPath, contents, { mode: 0o600 })
        try { fs.chmodSync(accountsPath, 0o600) } catch {}
        console.log(`Saved ${accounts.length} account${accounts.length === 1 ? '' : 's'} to ${accountsPath}`)
    } else {
        console.log('Setup cancelled. No accounts were saved.')
    }
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
})
