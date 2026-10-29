# Configuration

Application preferences live in the root `config.json`. If the file does not exist, the application copies `config/config.example.json` once and validates the options at startup. Invalid fields are reported and, when possible, replaced with default values. The versioned example contains the complete list of options.

Account-specific data lives in `.env`, created from `config/env.example`. Git ignores this file. Do not commit passwords, TOTP secrets, proxy passwords, API tokens, or webhook credentials.

## Accounts

Add one numbered block per account. Numbers may have gaps; accounts are processed in ascending order.

```dotenv
ACCOUNT_1_EMAIL=person@example.com
# ACCOUNT_1_PASSWORD=
# ACCOUNT_1_TOTP_SECRET=
# ACCOUNT_1_RECOVERY_EMAIL=
# ACCOUNT_1_LANG_CODE=en-US
# ACCOUNT_1_GEO_LOCALE=auto
```

The password is optional for passwordless accounts. The language accepts a BCP 47 tag such as `en-US`; the region accepts a two-letter code or `auto`. In automatic mode, the profile region is stored after a successful dashboard request. `config/env.example` lists proxy and fingerprint persistence options.

## Application Options

Keep these options in `config.json`; there are no `CONFIG_*` environment variable overrides.

| Section                                                                | Purpose                                                               |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `sessionPath`, `headless`, `clusters`, `accountDelay`, `globalTimeout` | Storage, browser visibility, concurrency, and timeouts                |
| `workers`                                                              | Enable or disable individual workflows                                |
| `activities`                                                           | URL Reward and Explore on Bing activities                             |
| `searchSettings`                                                       | Query sources, intervals, result interaction, and concurrency         |
| `experimental`                                                         | Optional API search, media blocking, and Edge browsing                |
| `proxy`                                                                | Proxy use for queries and TLS handling for trusted inspection proxies |
| `consoleLogFilter`, `debugLogs`, `errorDiagnostics`                    | Console output and diagnostics                                        |
| `webhook`                                                              | Discord, ntfy, Telegram, and notification filters                     |

Durations accept numeric milliseconds or strings such as `30sec` and `1min`. For intervals, `max` must be greater than or equal to `min`. Query sources include `google`, `wikipedia`, `wikirandom`, `hackernews`, `reddit`, and configured RSS feeds. Queries come from these external sources; if none respond, search is skipped rather than using a local fallback list. Defaults are in [`config/config.example.json`](../config/config.example.json).

The distributed example sets `headless` to `false`. Use headless mode on servers without a graphical environment.

## API and Scheduling

API options are environment variables listed in `config/env.example` and the [API guide](../scripts/api/README.md). API configuration and schedule changes are disabled by default. The schedule is stored in `config/schedule.json`; the API process checks it once per minute using the system's local time zone or the `TZ` value. Keep the API running to trigger scheduled runs. Existing runs are not overlapped.
