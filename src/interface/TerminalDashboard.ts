import { createHash } from 'node:crypto'
import errorMessages from './error-messages.en.json'
import { appendErrorLog } from '../util/AppData'
import { errorCodeFromHash } from '../constants/errorWords'
import { renderDashboard } from './TerminalDashboardLayout'

export { DASHBOARD_ART, renderDashboard } from './TerminalDashboardLayout'

const DEMO_ACCOUNTS = ['alex@example.com', 'jordan@example.com', 'casey@example.com', 'taylor@example.com']
const DEMO_MESSAGES = ['Session started', 'Progress updated', 'Points received', 'Account complete']

export interface DashboardEvent {
    level: string
    at: string | null
    text: string
}

export interface DashboardState {
    mode: 'demo' | 'live' | 'app'
    apiUrl: string
    connection: string
    appStatus: string
    pid: number | null
    startedAt: string
    startedAtMonotonic: number
    currentAccount: string | null
    accountsSeen: number
    accountsTotal: number | null
    pointsGained: number
    events: DashboardEvent[]
    runId: string
    stage: string
    error: { code: string; message: string; logPath: string | null; details?: string } | null
}

interface ErrorMessageEntry {
    match: string
    code: string
    message: string
}

const knownErrors = errorMessages as ErrorMessageEntry[]

export interface DashboardEventMessage {
    type: string
    data: unknown
}

export function createDashboardState({
    mode = 'live',
    apiUrl = 'http://127.0.0.1:3010'
}: { mode?: DashboardState['mode']; apiUrl?: string } = {}): DashboardState {
    return {
        mode,
        apiUrl,
        connection: mode === 'demo' ? 'dummy data' : 'connecting',
        appStatus: mode === 'demo' ? 'running' : 'unknown',
        pid: null,
        startedAt: new Date().toISOString(),
        startedAtMonotonic: performance.now(),
        currentAccount: null,
        accountsSeen: 0,
        accountsTotal: null,
        pointsGained: 0,
        events: [],
        runId: createHash('sha256').update(`${process.pid}:${Date.now()}`).digest('hex').slice(0, 10),
        stage: 'Checking all accounts > Collecting points',
        error: null
    }
}

export function parseSseFrame(frame: string): DashboardEventMessage | null {
    let type = 'message'
    const data: string[] = []

    for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith('event:')) type = line.slice(6).trim()
        if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
    }

    if (!data.length) return null
    const raw = data.join('\n')
    try {
        return { type, data: JSON.parse(raw) as unknown }
    } catch {
        return { type, data: raw }
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function applyDashboardEvent(state: DashboardState, event: DashboardEventMessage | null): DashboardState {
    if (!event || !isRecord(event.data)) return state

    if (event.type === 'hello' || event.type === 'status') {
        const status = event.data
        const run = isRecord(status.run) ? status.run : {}
        const live = isRecord(run.live) ? run.live : {}
        state.appStatus = typeof status.state === 'string' ? status.state : state.appStatus
        state.pid = typeof status.pid === 'number' ? status.pid : null
        const startedAt = typeof status.startedAt === 'string' ? status.startedAt : null
        if (startedAt && startedAt !== state.startedAt) {
            state.startedAt = startedAt
            state.startedAtMonotonic = performance.now()
        }
        state.currentAccount = typeof live.currentAccount === 'string' ? live.currentAccount : null
        state.accountsSeen = typeof run.accountsSeen === 'number' ? run.accountsSeen : 0
        state.accountsTotal = typeof run.accountsTotal === 'number' ? run.accountsTotal : null
        state.pointsGained = typeof run.collected === 'number' ? run.collected : 0
    } else if (event.type === 'log') {
        const entry = event.data
        const text = [entry.title, entry.message].filter(value => typeof value === 'string').join(': ')
        if (entry.title === 'RUN-END' && typeof entry.message === 'string' && /alreadyCollected=true\b/i.test(entry.message)) {
            state.stage = 'Already collected all points for today'
            state.appStatus = 'complete'
        }
        state.events.push({
            level: typeof entry.level === 'string' ? entry.level : 'info',
            at: typeof entry.ts === 'string' ? entry.ts : null,
            text: text || (typeof entry.raw === 'string' ? entry.raw : '')
        })
        state.events = state.events.slice(-8)
    }

    return state
}

function friendlyError(message: string): { code: string; message: string } {
    const hash = createHash('sha256').update(message).digest('hex')
    const known = knownErrors.find(entry => message.includes(entry.match))
    if (known) return { code: errorCodeFromHash(hash), message: known.message }

    const cleanMessage = message.replace(/^Error:\s*/i, '').trim()
    return { code: errorCodeFromHash(hash), message: cleanMessage || 'An unexpected error occurred.' }
}

export function stageFor(title: string, message: string): string {
    const activity: Record<string, string> = {
        'RUN-START': 'Checking accounts and preparing rewards',
        'RUN-END': 'Finished checking accounts',
        'ACCOUNT-START': 'Checking account',
        'ACCOUNT-END': 'Finished account',
        'ACCOUNT-DELAY': 'Waiting between accounts',
        'ACCOUNT-SKIP': 'Skipping account',
        'BROWSER': 'Opening browser',
        'LOGIN': 'Signing in',
        'LOGIN-CHECKPOINT': 'Checking login status',
        'LOGIN-APP': 'Opening Microsoft Rewards login',
        'SEARCH-MANAGER': 'Preparing searches',
        'SEARCH-BING': 'Collecting search points',
        'DAILY-SET': 'Completing Daily Set',
        'MORE-PROMOTIONS': 'Checking more promotions',
        'PUNCHCARD': 'Completing punch cards',
        'READ-TO-EARN': 'Completing Read to Earn',
        'DAILY-CHECK-IN': 'Completing daily check-in',
        'APP-PROMOTION': 'Completing app promotion',
        'CLAIM-REWARD': 'Claiming reward'
    }
    if (activity[title]) return activity[title]
    if (/Starting account:/i.test(message)) return 'Checking account'
    if (/LOGIN/i.test(title)) return 'Signing in'
    if (/SEARCH/i.test(title)) return 'Collecting search points'
    if (/DAILY/i.test(title)) return 'Completing Daily Set'
    if (/PROMOTION/i.test(title)) return 'Completing promotions'
    if (/PUNCHCARD/i.test(title)) return 'Completing punch cards'
    return title.replace(/[-_]+/g, ' ').toLowerCase().replace(/^./, character => character.toUpperCase())
}

export class TerminalDashboard {
    private readonly state = createDashboardState({ mode: 'app', apiUrl: 'local process' })
    private active = false
    private fatalError = false
    private removeQuitListener: (() => void) | null = null
    private runtimeInterval: NodeJS.Timeout | null = null
    private errorFinalized = false

    writeLog(level: string, userName: string, title: string, message: string, diagnosticMessage = message): boolean {
        if (!process.stdout.isTTY) return false
        if (this.errorFinalized && (level === 'error' || title === 'RUN-END')) return true

        if (title === 'RUN-START') {
            this.state.startedAt = new Date().toISOString()
            this.state.startedAtMonotonic = performance.now()
            this.state.appStatus = 'running'
            this.state.runId = createHash('sha256')
                .update(`${this.state.startedAt}:${process.pid}`)
                .digest('hex')
                .slice(0, 10)
            const accounts = /Accounts:\s*(\d+)/.exec(message)?.[1]
            this.state.accountsTotal = accounts ? Number(accounts) : null
            this.state.currentAccount = null
            this.state.accountsSeen = 0
            this.state.pointsGained = 0
            this.state.error = null
            this.errorFinalized = false
        } else if (title === 'RUN-END') {
            this.state.appStatus = 'complete'
            if (/alreadyCollected=true\b/i.test(message)) {
                this.state.stage = 'Already collected all points for today'
            } else {
                this.state.stage = stageFor(title, message)
            }
        } else if (level === 'error') {
            this.state.appStatus = 'error'
            this.state.stage = 'Stopped on error'
            this.fatalError = ['MAIN-ERROR', 'UNCAUGHT-EXCEPTION', 'UNHANDLED-REJECTION'].includes(title)
            const rawMessage = diagnosticMessage
                .split(/\r?\n/, 1)[0]
                ?.replace(/^\S+\s+/, '')
                .replace(/^\w+:\s*/, '') ?? ''
            const error = friendlyError(rawMessage)
            let logPath: string | null = null
            try {
                logPath = appendErrorLog({
                    at: new Date().toISOString(),
                    code: error.code,
                    title,
                    message: rawMessage,
                    details: process.argv.includes('-dev') ? diagnosticMessage : undefined
                })
            } catch {}
            this.state.error = { ...error, logPath, details: diagnosticMessage }
        } else {
            this.state.stage = stageFor(title, message)
        }

        const account = /Starting account:\s*(\S+)/.exec(message)?.[1]
        if (account) {
            this.state.currentAccount = account
            this.state.accountsSeen++
        } else if (userName !== 'MAIN') {
            const currentEmail = this.state.currentAccount
            const currentLocal = currentEmail?.includes('@')
                ? currentEmail.slice(0, currentEmail.indexOf('@'))
                : null
            if (!currentEmail || (currentEmail.includes('@') && currentLocal !== userName)) {
                this.state.currentAccount = userName
            }
        }

        const points = /pointsGained=(-?\d+)/.exec(message)
        if (title === 'ACCOUNT-END' && points) this.state.pointsGained += Number(points[1])

        this.state.events.push({ level, at: new Date().toISOString(), text: `${userName} [${title}] ${message}` })
        this.state.events = this.state.events.slice(-8)

        if (!this.active) {
            this.active = true
            process.stdout.write('\u001b[?1049h\u001b[?25l')
            this.runtimeInterval = setInterval(() => {
                if (!this.errorFinalized) {
                    process.stdout.write(`\u001b[H\u001b[2J${renderDashboard(this.state, process.stdout.columns || 80, true)}`)
                }
            }, 1000)
            process.once('exit', () => this.restoreTerminal())
            this.removeQuitListener = listenForQuit(() => {
                if (this.fatalError) {
                    this.restoreTerminal()
                    process.exit(1)
                }
                process.kill(process.pid, 'SIGINT')
            })
        }

        if (title === 'RUN-END' || level === 'error') {
            const errorSignature = level === 'error'
                ? `${this.state.error?.code}:${this.state.error?.message}`
                : ''
            if (errorSignature && !this.errorFinalized) {
                this.errorFinalized = true
                const finalScreen = renderDashboard(this.state, process.stdout.columns || 80, false)
                this.restoreTerminal()
                process.stdout.write(`\n${finalScreen}\n`)
            } else if (!errorSignature) {
                const finalScreen = renderDashboard(this.state, process.stdout.columns || 80, false)
                this.restoreTerminal()
                process.stdout.write(`\n${finalScreen}\n`)
            }
        } else {
            process.stdout.write(`\u001b[H\u001b[2J${renderDashboard(this.state, process.stdout.columns || 80, true)}`)
        }
        return true
    }

    private restoreTerminal(): void {
        if (this.runtimeInterval) clearInterval(this.runtimeInterval)
        this.runtimeInterval = null
        this.removeQuitListener?.()
        this.removeQuitListener = null
        if (this.active) process.stdout.write('\u001b[?25h\u001b[?1049l')
        this.active = false
    }
}

function listenForQuit(onQuit: () => void): () => void {
    const input = process.stdin
    if (!input.isTTY) return () => {}

    input.setRawMode(true)
    input.resume()
    const onData = (key: Buffer): void => {
        const value = key.toString().toLowerCase()
        if (value.includes('q') || value.includes('\u0003')) onQuit()
    }
    input.on('data', onData)

    return () => {
        input.off('data', onData)
        if (input.isTTY) input.setRawMode(false)
        input.pause()
    }
}

function addDemoEvent(state: DashboardState, tick: number): void {
    const accountIndex = tick % DEMO_ACCOUNTS.length
    state.currentAccount = DEMO_ACCOUNTS[accountIndex] ?? null
    state.accountsSeen = accountIndex + 1
    state.accountsTotal = DEMO_ACCOUNTS.length
    state.pointsGained += tick % 3 === 0 ? 5 : 2
    state.events.push({
        level: 'info',
        at: new Date().toISOString(),
        text: `${DEMO_MESSAGES[tick % DEMO_MESSAGES.length]}: ${state.currentAccount}`
    })
    state.events = state.events.slice(-8)
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise(resolve => {
        const timer = setTimeout(resolve, ms)
        signal.addEventListener(
            'abort',
            () => {
                clearTimeout(timer)
                resolve()
            },
            { once: true }
        )
    })
}

async function consumeEvents(
    response: Response,
    state: DashboardState,
    signal: AbortSignal,
    onComplete: () => void
): Promise<void> {
    if (!response.body) throw new Error('API returned an empty event stream.')
    const decoder = new TextDecoder()
    let buffer = ''

    for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true })
        const frames = buffer.split(/\r?\n\r?\n/)
        buffer = frames.pop() ?? ''
        for (const frame of frames) {
            const event = parseSseFrame(frame)
            if (event) applyDashboardEvent(state, event)
        }
        paint(state)
        if (state.appStatus === 'complete') {
            onComplete()
            return
        }
        if (signal.aborted) return
    }
}

function paint(state: DashboardState): void {
    process.stdout.write(`\u001b[H\u001b[2J${renderDashboard(state, process.stdout.columns || 80, true)}`)
}

async function connectToApi(
    state: DashboardState,
    signal: AbortSignal,
    token: string,
    onComplete: () => void
): Promise<void> {
    while (!signal.aborted) {
        try {
            state.connection = 'connecting'
            paint(state)
            const endpoint = new URL('/events?replay=30', state.apiUrl)
            const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
            const response = await fetch(endpoint, { headers, signal })
            if (!response.ok) throw new Error(`API returned HTTP ${response.status}`)
            state.connection = 'connected'
            paint(state)
            await consumeEvents(response, state, signal, onComplete)
            if (state.appStatus === 'complete') return
            if (!signal.aborted) throw new Error('Event stream ended')
        } catch (error) {
            if (signal.aborted) return
            state.connection = `retrying: ${error instanceof Error ? error.message : String(error)}`
            paint(state)
            await wait(3000, signal)
        }
    }
}

export async function runDashboard({ demo = false }: { demo?: boolean } = {}): Promise<void> {
    if (!process.stdout.isTTY) throw new Error('The dashboard needs an interactive terminal.')

    const apiUrl = process.env.CONTROL_API_URL || `http://127.0.0.1:${process.env.API_PORT || '3010'}`
    const state = createDashboardState({ mode: demo ? 'demo' : 'live', apiUrl })
    const controller = new AbortController()
    let interval: NodeJS.Timeout | undefined
    let tick = 0
    let closed = false

    let removeQuitListener: (() => void) | null = null
    const cleanup = (exit = false): void => {
        if (closed) return
        closed = true
        controller.abort()
        if (interval) clearInterval(interval)
        removeQuitListener?.()
        process.stdout.write('\u001b[?25h\u001b[?1049l')
        if (exit) process.exit(0)
    }

    const finish = (): void => {
        if (closed) return
        const finalScreen = renderDashboard(state, process.stdout.columns || 80, false)
        cleanup()
        process.stdout.write(`\n${finalScreen}\n`)
    }

    process.stdout.write('\u001b[?1049h\u001b[?25l')
    process.once('SIGINT', () => cleanup())
    process.once('SIGTERM', () => cleanup())
    removeQuitListener = listenForQuit(() => cleanup(true))

    if (demo) {
        addDemoEvent(state, tick++)
        interval = setInterval(() => {
            addDemoEvent(state, tick++)
            paint(state)
        }, 1400)
        paint(state)
        return
    }

    const token = process.env.CONTROL_API_TOKEN || process.env.API_TOKEN || ''
    interval = setInterval(() => paint(state), 1000)
    await connectToApi(state, controller.signal, token, finish)
}

export async function runDashboardCli(args: string[] = process.argv.slice(2)): Promise<void> {
    if (args.length > 1 || (args.length === 1 && args[0] !== '--demo')) {
        throw new Error('Usage: npm run dashboard [-- --demo]')
    }
    await runDashboard({ demo: args[0] === '--demo' })
}

export const terminalDashboard = new TerminalDashboard()
