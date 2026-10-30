import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

interface AppDataOptions {
    platform?: NodeJS.Platform
    env?: NodeJS.ProcessEnv
    home?: string
}

export function getAppDataDirectory({ platform = process.platform, env = process.env, home = os.homedir() }: AppDataOptions = {}): string {
    let baseDirectory: string

    if (platform === 'win32') {
        baseDirectory = env.LOCALAPPDATA || env.APPDATA || path.join(home, 'AppData', 'Local')
    } else if (platform === 'darwin') {
        baseDirectory = path.join(home, 'Library', 'Application Support')
    } else {
        baseDirectory = env.XDG_DATA_HOME || path.join(home, '.local', 'share')
    }

    return path.join(baseDirectory, 'CookieBot')
}

export function appendErrorLog(entry: Record<string, unknown>): string {
    const logDirectory = path.join(getAppDataDirectory(), 'logs')
    fs.mkdirSync(logDirectory, { recursive: true, mode: 0o700 })

    const logPath = path.join(logDirectory, 'errors.jsonl')
    fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', mode: 0o600 })
    try {
        fs.chmodSync(logDirectory, 0o700)
        fs.chmodSync(logPath, 0o600)
    } catch {}

    return logPath
}