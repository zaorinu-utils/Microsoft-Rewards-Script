import { createHash } from 'node:crypto'
import errorMessages from './error-messages.en.json'
import { appendErrorLog } from '../util/AppData'

export const DASHBOARD_ART = [
    '                                        ',
    '                    ,--.    ,--.        ',
    " ,---. ,---.  ,---. |  |,-. `--' ,---.  ",
    "| .--'| .-. || .-. ||     / ,--.| .-. : ",
    "\\ `--.' '-' '' '-' '|  \\  \\ |  |\\   --. ",
    " `---' `---'  `---' `--'`--'`--' `----' ",
    '                                        ',
    '                                        '
].join('\n')

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
    currentAccount: string | null
    accountsSeen: number
    accountsTotal: number | null
    pointsGained: number
    events: DashboardEvent[]
    runId: string
    stage: string
    error: { code: string; message: string; logPath: string | null } | null
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
        currentAccount: null,
        accountsSeen: 0,
        accountsTotal: null,
        pointsGained: 0,
        events: [],
        runId: createHash('sha256').update(`${process.pid}:${Date.now()}`).digest('hex').slice(0, 10),
        stage: 'Starting',
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
        state.startedAt = typeof status.startedAt === 'string' ? status.startedAt : state.startedAt
        state.currentAccount = typeof live.currentAccount === 'string' ? live.currentAccount : null
        state.accountsSeen = typeof run.accountsSeen === 'number' ? run.accountsSeen : 0
        state.accountsTotal = typeof run.accountsTotal === 'number' ? run.accountsTotal : null
        state.pointsGained = typeof run.collected === 'number' ? run.collected : 0
    } else if (event.type === 'log') {
        const entry = event.data
        const text = [entry.title, entry.message].filter(value => typeof value === 'string').join(': ')
        state.events.push({
            level: typeof entry.level === 'string' ? entry.level : 'info',
            at: typeof entry.ts === 'string' ? entry.ts : null,
            text: text || (typeof entry.raw === 'string' ? entry.raw : '')
        })
        state.events = state.events.slice(-8)
    }

    return state
}

function elapsed(startedAt: string): string {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

function fit(text: unknown, width: number): string {
    const value = String(text ?? '').replace(/[\r\n\t]/g, ' ')
    return value.length > width ? `${value.slice(0, Math.max(0, width - 3))}...` : value
}

function cyan(text: string): string {
    return `\u001b[36m${text}\u001b[39m`
}

export function maskEmail(email: string | null): string {
    if (!email) return 'Waiting for account'
    const [local = '', host = ''] = email.split('@')
    const lastDot = host.lastIndexOf('.')
    if (lastDot < 0) return `${maskSegment(local)}@${maskSegment(host)}`
    return `${maskSegment(local)}@${maskSegment(host.slice(0, lastDot))}${host.slice(lastDot)}`
}

function maskSegment(value: string): string {
    return `${value.slice(0, 2)}${'*'.repeat(Math.max(0, value.length - 2))}`
}

function friendlyError(message: string): { code: string; message: string } {
    const known = knownErrors.find(entry => message.includes(entry.match))
    if (known) return { code: known.code, message: known.message }

    const code = createHash('sha256').update(message).digest('hex').slice(0, 12).toUpperCase()
    return { code: `ERR-${code}`, message: 'An unexpected error occurred. Share this reference with the development team.' }
}

function stageFor(title: string, message: string): string {
    if (title === 'RUN-START') return 'Preparing run'
    if (title === 'RUN-END') return 'Run complete'
    if (/Starting account:/i.test(message)) return 'Starting account'
    if (/LOGIN/i.test(title)) return 'Signing in'
    if (/SEARCH/i.test(title)) return 'Searching'
    if (/DAILY|PROMOTION|PUNCHCARD|CHECK-IN|READ-TO-EARN/i.test(title)) return 'Completing activities'
    if (/ACCOUNT-END/.test(title)) return 'Finishing account'
    if (/ERROR/.test(title)) return 'Stopped on error'
    return title.toLowerCase().replace(/[-_]+/g, ' ')
}

export function renderDashboard(state: DashboardState, width = 80, color = process.stdout.isTTY): string {
    const screenWidth = Math.max(40, Math.min(100, width))
    const accountCount = state.accountsTotal ?? state.accountsSeen
    const art = color && !process.env.NO_COLOR ? cyan(DASHBOARD_ART) : DASHBOARD_ART
    const lines = [
        ...art.split('\n'),
        '',
        `Run       ${state.runId}`,
        `Runtime   ${elapsed(state.startedAt)}`,
        `Accounts  ${accountCount}`,
        `Current   ${maskEmail(state.currentAccount)}`,
        `Doing now ${fit(state.stage, screenWidth - 11)}`
    ]

    if (state.error) {
        lines.push('', `Error ${state.error.code}`, fit(state.error.message, screenWidth))
        if (state.error.logPath) lines.push(fit(`Details saved to ${state.error.logPath}`, screenWidth))
    }

    lines.push('', 'Press Q to exit')
    return lines.map(line => fit(line, screenWidth)).join('\n')
}

export class TerminalDashboard {
    private readonly state = createDashboardState({ mode: 'app', apiUrl: 'local process' })
    private active = false
    private fatalError = false
    private removeQuitListener: (() => void) | null = null

    writeLog(level: string, userName: string, title: string, message: string, diagnosticMessage = message): boolean {
        if (!process.stdout.isTTY) return false

        if (title === 'RUN-START') {
            this.state.startedAt = new Date().toISOString()
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
        } else if (title === 'RUN-END') {
            this.state.appStatus = 'complete'
        } else if (level === 'error') {
            this.state.appStatus = 'error'
            this.state.stage = 'Stopped on error'
            this.fatalError = ['MAIN-ERROR', 'UNCAUGHT-EXCEPTION', 'UNHANDLED-REJECTION'].includes(title)
            const rawMessage = diagnosticMessage.split(' | stack=')[0]
            const error = friendlyError(rawMessage)
            let logPath: string | null = null
            try {
                logPath = appendErrorLog({
                    at: new Date().toISOString(),
                    code: error.code,
                    title,
                    message: rawMessage,
                    details: diagnosticMessage
                })
            } catch {}
            this.state.error = { ...error, logPath }
        } else {
            this.state.stage = stageFor(title, message)
        }

        const account = /Starting account:\s*(\S+)/.exec(message)?.[1]
        if (account) {
            this.state.currentAccount = account
            this.state.accountsSeen++
        } else if (userName !== 'MAIN') {
            this.state.currentAccount = userName
        }

        const points = /pointsGained=(-?\d+)/.exec(message)
        if (title === 'ACCOUNT-END' && points) this.state.pointsGained += Number(points[1])

        this.state.events.push({ level, at: new Date().toISOString(), text: `${userName} [${title}] ${message}` })
        this.state.events = this.state.events.slice(-8)

        if (!this.active) {
            this.active = true
            process.stdout.write('\u001b[?1049h\u001b[?25l')
            process.once('exit', () => this.restoreTerminal())
            this.removeQuitListener = listenForQuit(() => {
                if (this.fatalError) {
                    this.restoreTerminal()
                    process.exit(1)
                }
                process.kill(process.pid, 'SIGINT')
            })
        }

        process.stdout.write(`\u001b[H\u001b[2J${renderDashboard(this.state, process.stdout.columns || 80, true)}`)
        return true
    }

    private restoreTerminal(): void {
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

async function consumeEvents(response: Response, state: DashboardState, signal: AbortSignal): Promise<void> {
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
        if (signal.aborted) return
    }
}

function paint(state: DashboardState): void {
    process.stdout.write(`\u001b[H\u001b[2J${renderDashboard(state, process.stdout.columns || 80, true)}`)
}

async function connectToApi(state: DashboardState, signal: AbortSignal, token: string): Promise<void> {
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
            await consumeEvents(response, state, signal)
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

    const cleanup = (): void => {
        if (closed) return
        closed = true
        controller.abort()
        if (interval) clearInterval(interval)
        process.stdout.write('\u001b[?25h\u001b[?1049l')
    }

    process.stdout.write('\u001b[?1049h\u001b[?25l')
    process.once('SIGINT', cleanup)
    process.once('SIGTERM', cleanup)

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
    await connectToApi(state, controller.signal, token)
}

export async function runDashboardCli(args: string[] = process.argv.slice(2)): Promise<void> {
    if (args.length > 1 || (args.length === 1 && args[0] !== '--demo')) {
        throw new Error('Usage: npm run dashboard [-- --demo]')
    }
    await runDashboard({ demo: args[0] === '--demo' })
}

export const terminalDashboard = new TerminalDashboard()
