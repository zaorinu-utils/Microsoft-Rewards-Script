import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const dashboard = require('../dist/interface/TerminalDashboard.js')

export const {
    applyDashboardEvent,
    createDashboardState,
    DASHBOARD_ART,
    parseSseFrame,
    renderDashboard,
    runDashboard,
    stageFor
} = dashboard

async function main() {
    try {
        await dashboard.runDashboardCli(process.argv.slice(2))
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exitCode = 1
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    void main()
}