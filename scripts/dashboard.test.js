import assert from 'node:assert/strict'
import test from 'node:test'

import {
    applyDashboardEvent,
    createDashboardState,
    DASHBOARD_ART,
    parseSseFrame,
    renderDashboard
} from './dashboard-cli.js'

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
