import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

function accountsInFile(accountsText) {
    const emails = []
    for (const match of accountsText.matchAll(/^email:\s*(.+)$/gm)) {
        emails.push(match[1].trim().toLowerCase())
    }
    return new Set(emails)
}

function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function developmentMode() {
    return process.env.MRS_ENV === 'development' || process.argv.includes('-dev') || process.argv.includes('--dev')
}

function workspaceFileName(filename) {
    if (!developmentMode()) return filename
    const extension = path.extname(filename)
    return `${filename.slice(0, -extension.length)}.dev${extension}`
}

async function promptSecret(rl, question) {
    if (!input.isTTY || typeof input.setRawMode !== 'function') {
        return rl.question(question)
    }

    rl.pause()
    output.write(question)
    input.setRawMode(true)
    input.resume()
    input.setEncoding('utf8')

    let value = ''
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            input.setRawMode(false)
            input.pause()
            input.removeListener('data', onData)
        }
        const onData = chunk => {
            for (const character of chunk) {
                if (character === '\r' || character === '\n') {
                    cleanup()
                    output.write('\n')
                    rl.resume()
                    resolve(value)
                    return
                }
                if (character === '\u0003') {
                    cleanup()
                    rl.resume()
                    reject(new Error('Setup cancelled'))
                    return
                }
                if (character === '\u007f' || character === '\b') {
                    value = value.slice(0, -1)
                    continue
                }
                if (character >= ' ') value += character
            }
        }
        input.on('data', onData)
    })
}

async function main() {
    const workspaceDirectory = path.resolve('workspace')
    const accountsPath = path.join(workspaceDirectory, workspaceFileName('accounts.txt'))
    const configPath = path.join(workspaceDirectory, workspaceFileName('config.json'))
    fs.mkdirSync(workspaceDirectory, { recursive: true })

    if (!fs.existsSync(configPath)) {
        const examplePath = path.join(workspaceDirectory, 'config.json')
        const exampleConfig = JSON.parse(fs.readFileSync(examplePath, 'utf8'))
        fs.writeFileSync(configPath, `${JSON.stringify(exampleConfig, null, 4)}\n`, { mode: 0o600 })
    }

    const rl = readline.createInterface({ input, output })
    const accounts = []
    const existingAccountsText = fs.existsSync(accountsPath) ? fs.readFileSync(accountsPath, 'utf8') : ''
    const existingEmails = accountsInFile(existingAccountsText)

    while (true) {
        const email = (await rl.question('Email (leave empty to finish): ')).trim()
        if (!email) break

        if (!validEmail(email)) {
            output.write('Enter a valid email address.\n')
            continue
        }
        if (existingEmails.has(email.toLowerCase())) {
            output.write(`Account ${email} already exists. It was not added again.\n`)
            continue
        }

        const password = (await promptSecret(rl, 'Password: ')).trim()
        if (!password) {
            output.write('Password cannot be empty.\n')
            continue
        }

        const totpSecret = (await rl.question('TOTP secret (optional): ')).trim()
        accounts.push({ email, password, totpSecret })
        existingEmails.add(email.toLowerCase())
    }

    rl.close()

    if (accounts.length) {
        const additions = accounts
            .map(account =>
                [
                    `email: ${account.email}`,
                    `password: ${account.password}`,
                    ...(account.totpSecret ? [`totpSecret: ${account.totpSecret}`] : [])
                ].join('\n')
            )
            .join('\n\n')
        const existing = existingAccountsText.trim()
        const contents = existing ? `${existing}\n\n${additions}\n` : `${additions}\n`
        fs.writeFileSync(accountsPath, contents, { mode: 0o600 })
        try {
            fs.chmodSync(accountsPath, 0o600)
        } catch {}
        console.log(`Saved ${accounts.length} account${accounts.length === 1 ? '' : 's'} to ${accountsPath}`)
    } else {
        console.log('Setup cancelled. No accounts were saved.')
    }
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
})
