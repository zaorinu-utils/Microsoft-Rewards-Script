import { pathToFileURL } from 'node:url'

const ART = [
    '                  .-.    _       ',
    '                  : :.-.:_;      ',
    " .--.  .--.  .--. : `'.'.-. .--. ",
    "'  ..'' .; :' .; :: . `.: :' '_.'",
    "`.__.'`.__.'`.__.':_;:_;`.__.'",
    '                                 ',
    '                                 ',
    '                        '
].join('\n')

const DEMO_ACCOUNTS = ['alex@example.com', 'jordan@example.com', 'casey@example.com', 'taylor@example.com']
const DEMO_MESSAGES = ['Session started', 'Progress updated', 'Points received', 'Account complete']

export function createDashboardState({ mode = 'live', apiUrl = 'http://127.0.0.1:3010' } = {}) {
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
        events: []
    }
}

export function parseSseFrame(frame) {
    let type = 'message'
    const data = []

    for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith('event:')) type = line.slice(6).trim()
        if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
    }

    if (!data.length) return null
    const raw = data.join('\n')
    try {
        return { type, data: JSON.parse(raw) }
    } catch {
        return { type, data: raw }
    }
}

export function applyDashboardEvent(state, event) {
    if (!event || !event.data) return state

    if (event.type === 'hello' || event.type === 'status') {
        const status = event.data
        const run = status.run ?? {}
        state.appStatus = status.state ?? state.appStatus
        state.pid = status.pid ?? null
        state.startedAt = status.startedAt ?? state.startedAt
        state.currentAccount = run.live?.currentAccount ?? null
        state.accountsSeen = run.accountsSeen ?? 0
        state.accountsTotal = run.accountsTotal ?? null
        state.pointsGained = run.collected ?? 0
    } else if (event.type === 'log') {
        const entry = event.data
        const text = [entry.title, entry.message].filter(Boolean).join(': ')
        state.events.push({ level: entry.level ?? 'info', at: entry.ts ?? null, text: text || entry.raw || '' })
        state.events = state.events.slice(-8)
    }

    return state
}

function elapsed(startedAt) {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

function fit(text, width) {
    const value = String(text ?? '').replace(/[\r\n\t]/g, ' ')
    return value.length > width ? `${value.slice(0, Math.max(0, width - 3))}...` : value
}

export function renderDashboard(state, width = 80) {
    const screenWidth = Math.max(40, Math.min(100, width))
    const divider = '-'.repeat(screenWidth - 2)
    const accountCount =
        state.accountsTotal == null ? `${state.accountsSeen}` : `${state.accountsSeen}/${state.accountsTotal}`
    const lines = [
        ...ART.split('\n'),
        '',
        `  ${state.mode === 'demo' ? 'DEMO - DUMMY DATA' : 'LIVE - READ ONLY'}`,
        divider,
        `  API         ${fit(state.apiUrl, screenWidth - 14)}`,
        `  Connection  ${fit(state.connection, screenWidth - 14)}`,
        `  Run         ${fit(state.appStatus, 16)}  |  PID ${state.pid ?? '-'}`,
        `  Runtime     ${elapsed(state.startedAt)}`,
        `  Accounts    ${accountCount}  |  Points +${state.pointsGained}`,
        `  Current     ${fit(state.currentAccount ?? 'Waiting for account activity', screenWidth - 14)}`,
        divider,
        '  RECENT ACTIVITY'
    ]

    if (!state.events.length) lines.push('  Waiting for events...')
    for (const event of state.events.slice(-7)) {
        const time = event.at ? new Date(event.at).toLocaleTimeString() : '--:--:--'
        lines.push(`  ${time} [${String(event.level).toUpperCase()}] ${fit(event.text, screenWidth - 25)}`)
    }

    lines.push(divider, '  Press Ctrl+C to exit')
    return lines.map(line => fit(line, screenWidth)).join('\n')
}

function paint(state) {
    process.stdout.write(`\u001b[H\u001b[2J${renderDashboard(state, process.stdout.columns || 80)}`)
}

function addDemoEvent(state, tick) {
    const accountIndex = tick % DEMO_ACCOUNTS.length
    const message = DEMO_MESSAGES[tick % DEMO_MESSAGES.length]
    state.currentAccount = DEMO_ACCOUNTS[accountIndex]
    state.accountsSeen = accountIndex + 1
    state.accountsTotal = DEMO_ACCOUNTS.length
    state.pointsGained += tick % 3 === 0 ? 5 : 2
    state.events.push({ level: 'info', at: new Date().toISOString(), text: `${message}: ${state.currentAccount}` })
    state.events = state.events.slice(-8)
}

function parseArgs(args) {
    if (args.length > 1 || (args.length === 1 && args[0] !== '--demo')) {
        throw new Error('Usage: npm run dashboard [-- --demo]')
    }
    return { demo: args[0] === '--demo' }
}

function wait(ms, signal) {
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

async function consumeEvents(response, state, signal) {
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

async function connectToApi(state, signal, token) {
    while (!signal.aborted) {
        try {
            state.connection = 'connecting'
            paint(state)
            const endpoint = new URL('/events?replay=30', state.apiUrl)
            const headers = token ? { Authorization: `Bearer ${token}` } : {}
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

export async function runDashboard({ demo = false } = {}) {
    if (!process.stdout.isTTY) throw new Error('The dashboard needs an interactive terminal.')

    const apiUrl = process.env.CONTROL_API_URL || `http://127.0.0.1:${process.env.API_PORT || '3010'}`
    const state = createDashboardState({ mode: demo ? 'demo' : 'live', apiUrl })
    const controller = new AbortController()
    let interval
    let tick = 0
    let closed = false

    const cleanup = () => {
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

async function main() {
    try {
        const { demo } = parseArgs(process.argv.slice(2))
        await runDashboard({ demo })
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exitCode = 1
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    void main()
}
