import assert from 'node:assert/strict'
import test from 'node:test'

import { applyDashboardEvent, createDashboardState, parseSseFrame, renderDashboard } from './dashboard.js'

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

test('renders the requested ASCII art and labels simulated data', () => {
    const state = createDashboardState({ mode: 'demo' })
    const screen = renderDashboard(state)

    assert.ok(screen.split('\n').includes(" .--.  .--.  .--. : `'.'.-. .--. "))
    assert.ok(screen.split('\n').includes("'  ..'' .; :' .; :: . `.: :' '_.'"))
    assert.match(screen, /DEMO - DUMMY DATA/)
    assert.match(screen, /Waiting for account activity/)
})
