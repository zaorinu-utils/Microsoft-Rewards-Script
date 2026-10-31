import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { randomInt } from 'crypto'
import type { Page } from 'patchright'
import { createErrorReference } from '../constants/errorWords'

const execFileAsync = promisify(execFile)
const scheduledErrorDiagnostics = new Set<string>()

interface UnknownPageDiagnosticOptions {
    platform: 'mobile' | 'desktop'
    password: string
}

const diagnosticWords = [
    'amber',
    'cedar',
    'coral',
    'grain',
    'forest',
    'haven',
    'maple',
    'mist',
    'north',
    'oak',
    'pixel',
    'river',
    'rook',
    'silver',
    'stone',
    'summit',
    'tide',
    'zenith'
] as const

export function createDiagnosticId(): string {
    const words = [
        diagnosticWords[randomInt(diagnosticWords.length)],
        diagnosticWords[randomInt(diagnosticWords.length)],
        diagnosticWords[randomInt(diagnosticWords.length)],
        diagnosticWords[randomInt(diagnosticWords.length)]
    ]
    return words.join('-')
}

async function saveEncryptedDiagnostic(
    id: string,
    password: string,
    files: Array<{ name: string; content: string | Buffer }>
): Promise<string | null> {
    if (!password) return null

    const diagnosticsDirectory = path.join(process.cwd(), 'diagnostics')
    const archivePath = path.join(diagnosticsDirectory, `${id}.rrdump`)
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'rewards-diagnostic-'))

    try {
        await fs.mkdir(diagnosticsDirectory, { recursive: true })
        await Promise.all(files.map(file => fs.writeFile(path.join(temporaryDirectory, file.name), file.content)))
        await execFileAsync('zip', [
            '-q',
            '-j',
            '-P',
            password,
            archivePath,
            ...files.map(file => path.join(temporaryDirectory, file.name))
        ])
        return archivePath
    } finally {
        await fs.rm(temporaryDirectory, { recursive: true, force: true }).catch(() => {})
    }
}

export async function errorDiagnostic(page: Page, error: Error, password: string): Promise<string | null> {
    const id = createErrorReference(error)
    if (scheduledErrorDiagnostics.has(id)) return null
    scheduledErrorDiagnostics.add(id)

    try {
        const timestamp = new Date().toISOString()

        if (!page) {
            return null
        }

        if (page.isClosed()) {
            return null
        }

        const errorLog = `ID: ${id}
Message: ${error.message}
Timestamp: ${timestamp}
---------------------------------------------------
Stack Trace:
${error.stack || 'No stack trace available'}
        `.trim()

        const [htmlResult, screenshotResult] = await Promise.allSettled([
            page.content(),
            page.screenshot({ fullPage: true, type: 'png' })
        ])

        const files: Array<{ name: string; content: string | Buffer }> = []
        if (htmlResult.status === 'fulfilled') {
            files.push({ name: 'dump.html', content: htmlResult.value })
        }
        if (screenshotResult.status === 'fulfilled') {
            files.push({ name: 'screenshot.png', content: screenshotResult.value })
        }
        files.push({ name: 'error.txt', content: errorLog })

        return await saveEncryptedDiagnostic(id, password, files)
    } catch {
        return null
    }
}

export async function unknownPageDiagnostic(
    page: Page,
    { platform, password }: UnknownPageDiagnosticOptions
): Promise<string | null> {
    if (!page || page.isClosed()) return null

    const capturedAt = new Date().toISOString()
    const rawUrl = page.url()
    const id = createDiagnosticId()

    try {
        const [htmlResult, screenshotResult] = await Promise.allSettled([
            page.content(),
            page.screenshot({ fullPage: true, type: 'png' })
        ])

        const metadata = {
            id,
            url: rawUrl,
            capturedAt,
            platform,
            htmlCaptured: htmlResult.status === 'fulfilled',
            screenshotCaptured: screenshotResult.status === 'fulfilled',
            errors: [
                htmlResult.status === 'rejected'
                    ? `HTML: ${htmlResult.reason instanceof Error ? htmlResult.reason.message : String(htmlResult.reason)}`
                    : null,
                screenshotResult.status === 'rejected'
                    ? `Screenshot: ${screenshotResult.reason instanceof Error ? screenshotResult.reason.message : String(screenshotResult.reason)}`
                    : null
            ].filter((error): error is string => error !== null)
        }

        const files: Array<{ name: string; content: string | Buffer }> = [
            { name: 'metadata.json', content: JSON.stringify(metadata, null, 2) }
        ]
        if (htmlResult.status === 'fulfilled') files.push({ name: 'page.html', content: htmlResult.value })
        if (screenshotResult.status === 'fulfilled') files.push({ name: 'screenshot.png', content: screenshotResult.value })

        await saveEncryptedDiagnostic(id, password, files)
        return id
    } catch (error) {
        console.error('Unable to create unknown login page diagnostics:', error)
        return null
    }
}
