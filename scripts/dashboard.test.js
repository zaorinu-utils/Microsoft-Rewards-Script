import assert from 'node:assert/strict'
import test from 'node:test'

import {
    applyDashboardEvent,
    createDashboardState,
    DASHBOARD_ART,
    parseSseFrame,
    renderDashboard,
    stageFor
} from './dashboard-cli.js'
import { maskEmail } from '../dist/interface/TerminalDashboardLayout.js'

test('parses JSON Server-Sent Events', () => {
    assert.deepEqual(parseSseFrame('event: status\ndata: {"state":"running"}'), {
        type: 'status',
        data: { state: 'running' }
    })
})

test('updates the live summary and retains recent log events', () => {
    const state = createDashboardState()
    applyDashboardEvent(state, {
        type: 'hello',
        data: {
            state: 'running',
            pid: 42,
            run: {
                accountsSeen: 2,
                accountsTotal: 4,
                collected: 15,
                live: { currentAccount: 'alex@example.com' }
            }
        }
    })
    applyDashboardEvent(state, {
        type: 'log',
        data: { level: 'info', title: 'RUN', message: 'Started' }
    })

    assert.equal(state.appStatus, 'running')
    assert.equal(state.pid, 42)
    assert.equal(state.accountsSeen, 2)
    assert.equal(state.accountsTotal, 4)
    assert.equal(state.pointsGained, 15)
    assert.equal(state.currentAccount, 'alex@example.com')
    assert.equal(state.events[0].text, 'RUN: Started')
})

test('renders the exact requested ASCII art in cyan and labels simulated data', () => {
    const state = createDashboardState({ mode: 'demo' })
    const expectedArt = [
        '                                        ',
        '                    ,--.    ,--.        ',
        " ,---. ,---.  ,---. |  |,-. `--' ,---.  ",
        "| .--'| .-. || .-. ||     / ,--.| .-. : ",
        "\\ `--.' '-' '' '-' '|  \\  \\ |  |\\   --. ",
        " `---' `---'  `---' `--'`--'`--' `----' ",
        '                                        ',
        '                                        '
    ].join('\n')
    const screen = renderDashboard(state, 80, true)

    assert.equal(DASHBOARD_ART, expectedArt)
    assert.ok(screen.startsWith(`\u001b[36m${expectedArt.split('\n')[0]}`))
    assert.ok(screen.includes('\u001b[39m'))
    assert.match(screen, /DEMO - DUMMY DATA/)
    assert.match(screen, /Waiting for account activity/)
})
test('wraps configuration errors instead of truncating them', () => {
    const state = createDashboardState({ mode: 'live' })
    state.error = {
        code: 'ACCOUNT_CONFIG_REQUIRED',
        message: 'Account configuration is missing. Run npm run setup and add your accounts.',
        logPath: null
    }

    const screen = renderDashboard(state, 50, false)

    assert.match(screen, /Account configuration is missing\. Run npm\nrun setup and add your accounts\./)
})

test('maps live log titles to explanatory activities', () => {
    assert.equal(stageFor('SEARCH-BING', 'Starting Bing searches'), 'Collecting search points')
    assert.equal(stageFor('DAILY-SET', 'Completing Daily Set'), 'Completing Daily Set')
    assert.equal(stageFor('ACCOUNT-DELAY', 'Waiting 1 min'), 'Waiting between accounts')
})

test('shows that all daily points were already collected', () => {
    const state = createDashboardState({ mode: 'live' })
    applyDashboardEvent(state, {
        type: 'log',
        data: {
            level: 'info',
            title: 'RUN-END',
            message: 'Completed all accounts | accountsProcessed=1 | pointsGained=0 | alreadyCollected=true'
        }
    })

    assert.equal(state.stage, 'Already collected all points for today')
    assert.equal(state.appStatus, 'complete')
})

test('preserves the email domain when masking an account', () => {
    assert.equal(maskEmail('betauragameplays@outlook.com'), 'be**************@ou*****.com')
    assert.equal(maskEmail('person@example.com'), 'pe****@ex*****.com')
})

test('only displays earned points after positive points are collected', () => {
    const state = createDashboardState({ mode: 'live' })
    const screenWithoutPoints = renderDashboard(state, 80, false)
    assert.doesNotMatch(screenWithoutPoints, /Points earned/)

    state.pointsGained = 15
    const screenWithPoints = renderDashboard(state, 80, false)
    assert.match(screenWithPoints, /Points earned\s+\+15/)
})

test('shows stack details only in developer mode', () => {
    const state = createDashboardState({ mode: 'live' })
    state.error = {
        code: 'ERR-LAUNCH',
        message: 'Browser launch failed',
        logPath: null,
        details: 'Error: Browser launch failed\n    at Browser.launch (/app/browser.ts:10:20)'
    }

    const originalArgv = process.argv
    try {
        process.argv = originalArgv.filter(arg => arg !== '-dev')
        const productionScreen = renderDashboard(state, 80, false)

        process.argv = [...originalArgv, '-dev']
        const developerScreen = renderDashboard(state, 80, false)

        assert.doesNotMatch(productionScreen, /\/app\/browser\.ts:10:20/)
        assert.match(developerScreen, /\/app\/browser\.ts:10:20/)
    } finally {
        process.argv = originalArgv
    }
})