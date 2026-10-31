import { createHash } from 'node:crypto'

const ERROR_WORDS = [
    'amber', 'apple', 'atlas', 'bamboo', 'beach', 'berry', 'birch', 'brook',
    'cedar', 'cloud', 'comet', 'coral', 'dawn', 'delta', 'dune', 'ember',
    'fern', 'fjord', 'flame', 'forest', 'glass', 'globe', 'grain', 'harbor',
    'ivory', 'jade', 'lake', 'lemon', 'lunar', 'maple', 'marble', 'mint',
    'moon', 'noble', 'north', 'olive', 'orbit', 'pearl', 'pine', 'river',
    'rook', 'rose', 'sage', 'shore', 'snow', 'solar', 'stone', 'summit',
    'tide', 'trail', 'vale', 'wave', 'willow', 'wind', 'winter', 'zenith'
] as const

export function errorCodeFromHash(hash: string): string {
    const normalized = hash.replace(/[^0-9a-f]/gi, '').toLowerCase()
    const bytes = normalized.match(/.{2}/g) ?? []
    const words = bytes
        .slice(0, 4)
        .map(byte => ERROR_WORDS[Number.parseInt(byte, 16) % ERROR_WORDS.length])
    return words.join('-') || 'amber-amber-amber-amber'
}

export function createErrorReference(message: string | Error): string {
    const text = message instanceof Error ? message.message : message
    const summary = text.split(/\r?\n|\\n/, 1)[0]?.trim() || (message instanceof Error ? message.name : '')
    const hash = createHash('sha256').update(summary).digest('hex')
    return errorCodeFromHash(hash)
}
