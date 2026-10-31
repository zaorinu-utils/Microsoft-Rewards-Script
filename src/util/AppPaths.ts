import fs from 'node:fs'
import path from 'node:path'

export function isSeaBuild(): boolean {
    return process.env.MRS_SEA === '1'
}

export function getDataDirectory(): string {
    if (process.env.MRS_DATA_DIR) return path.resolve(process.env.MRS_DATA_DIR)
    if (isSeaBuild()) return path.dirname(process.execPath)
    return process.cwd()
}

export function getWorkspaceDirectory(): string {
    const directory = path.join(getDataDirectory(), 'workspace')
    fs.mkdirSync(directory, { recursive: true })
    return directory
}
