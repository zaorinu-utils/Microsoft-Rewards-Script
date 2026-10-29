# Usage

## Installation

Requirements: Node.js 24 or newer, npm, Windows/Linux/macOS/WSL, and internet access. On Linux, Chromium may require additional system libraries.

```bash
git clone https://github.com/lasbt/Microsoft-Rewards-Script.git
cd Microsoft-Rewards-Script
npm install
npm run install:browser
```

Copy `config/env.example` to `.env` and set at least one `ACCOUNT_N_EMAIL`. On first startup, `config.json` is created from `config/config.example.json` and an existing configuration is never overwritten. You can also create the files manually:

```bash
cp config/env.example .env
cp config/config.example.json config.json
```

In PowerShell, use `Copy-Item` with the same paths. Build with `npm run build` and run with `npm run start`. Manual login requires a graphical session to open Chromium.

## Main Application

Build with `npm run build` and run with `npm run start`. Use `npm run dev` to run TypeScript directly with debug logging. Ctrl+C requests a clean shutdown. Browser visibility, activities, intervals, and searches are configured in `config.json`.

## Accounts and Sessions

```bash
npm run manual-login -- --help
npm run clear-sessions -- help
npm run open-session -- --help
```

Manual login saves the session after the Rewards page remains open for five seconds. Listing sessions does not change data; to delete sessions, specify an account or explicitly choose `all`. A saved session can be opened in Chromium for inspection.

## Control API

Start the API separately with `npm run api`. By default, it listens on `127.0.0.1:3010`. Set a long, random `API_TOKEN` before listening on a network-accessible interface. The API starts and stops runs, selects accounts, exposes status and logs, lists sessions, and can optionally update configuration or the schedule. See the [API reference](../scripts/api/README.md).

To enable schedules, set `API_ALLOW_SCHEDULE_WRITE=true` in `.env` and send an authenticated `PUT` or `PATCH` request to `/schedule`. The schedule file persists, but the API process must remain running. Expressions are checked once per minute using the configured local time zone; an occurrence is skipped if a run is already active.

## Notifications and Logs

Configure Discord, ntfy, or Telegram in the `webhook` section of `config.json`. Keep secrets only in local configuration. Console output can be filtered by level, keyword, or regular expression. Notification queues are flushed during shutdown.

## Development Checks

```bash
npm test
npm run lint
npm run format:check
npm run build
```

## Troubleshooting

If the browser does not start, run `npm run install:browser`. On Linux, install the system libraries required by Chromium. For configuration errors, compare `config.json` with `config/config.example.json`; accounts use the `ACCOUNT_N_*` names from `config/env.example` and require at least one email address.

If login repeats, list sessions with `npm run clear-sessions -- list`, remove only the affected account with `npm run clear-sessions -- email person@example.com`, and log in again manually. Sessions contain cookies and must not be shared.

For a schedule to trigger, the API must remain active. Check `GET /schedule`, the local time zone or `TZ`, and whether `API_ALLOW_SCHEDULE_WRITE=true` was set when the schedule was changed. The API listens on loopback by default. For remote access, configure `API_TOKEN` and use a trusted network.

See the [API reference](../scripts/api/README.md) for HTTP errors, authentication, and detailed configuration.
