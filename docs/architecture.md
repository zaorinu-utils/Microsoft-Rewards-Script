# Architecture

## Startup and Execution

`src/index.ts` checks the Node.js version, loads accounts from `.env`, reads and validates `config.json`, and creates the browser, login, activity, search, and logging components. Accounts run sequentially by default. The `clusters` option distributes accounts among Node.js workers; searches can also run separate mobile and desktop contexts in parallel.

Each run restores or creates the browser session, authenticates when necessary, loads dashboard state, runs enabled activities, updates points, and closes contexts in a `finally` block. Errors are logged per account when possible so later accounts can continue.

## Sessions and Files

- `sessions/sessions.db` stores mobile and desktop browser state and, optionally, saved fingerprints. `sessionPath` can change this location.
- `.env` contains credentials and account-specific options.
- `config.json` contains application preferences and is created from the example only when it does not exist.
- `config/schedule.json` stores the schedule persisted by the control API.
- `diagnostics/` receives error captures when diagnostics are enabled.

Sessions contain authentication cookies. Treat them as sensitive data, keep them private, and remove records only through the provided commands.

## API, Scheduling, and Shutdown

The optional API in `scripts/api/` runs as a separate Node.js process. It starts the compiled bot as a child process, parses structured logs, keeps status and history in memory, and provides HTTP and Server-Sent Events endpoints. API history is not stored in a database.

The API checks the schedule with a timer aligned to the minute. A match starts a normal bot run; no cron service or other scheduler process is used. The schedule persists across restarts but does not trigger while the API is stopped. Account exclusions are applied to the child process environment without changing the original account list.

Ctrl+C and SIGTERM initiate cleanup. The bot flushes notification queues and closes the session store; the API stops its child process and clears the timer. The API also provides explicit stop and restart endpoints.

## Modules and Maintenance

| Path                           | Responsibility                                           |
| ------------------------------ | -------------------------------------------------------- |
| `src/index.ts`                 | Lifecycle, account coordination, workers, and cleanup    |
| `src/browser/`                 | Chromium contexts, page actions, and authentication      |
| `src/functions/Activities.ts`  | Dispatch activities                                      |
| `src/functions/activities/`    | Rewards, app, search, and experimental workflows         |
| `src/functions/QueryEngine.ts` | Query external sources and build topics                  |
| `src/util/Load.ts`             | Read `.env`, load accounts, and initialize configuration |
| `src/util/Validator.ts`        | Schemas, defaults, and input validation                  |
| `src/util/SessionStore.ts`     | SQLite session persistence                               |
| `src/logging/`                 | Console output and notification queues                   |
| `scripts/main/`                | Manual login and session commands                        |
| `scripts/api/`                 | HTTP API, process execution, and scheduling              |

To add an application preference, update `config/config.example.json`, its type in `src/interface/Config.ts`, and its schema in `src/util/Validator.ts`. Account fields belong in `config/env.example` and are mapped in `src/util/Load.ts`. Change an activity in its group under `src/functions/activities/`; use `src/functions/Activities.ts` to dispatch it and `src/index.ts` to adjust when it runs. Search sources belong in `src/functions/QueryEngine.ts`, and RSS feeds in `src/constants/rssFeeds.ts`. Keep workflows within their existing responsibilities and avoid wrappers for one-off calls.
