# Microsoft Rewards Script

A TypeScript application that runs Microsoft Rewards workflows in a browser. It supports multiple accounts, configurable activities, an optional local control API, and Discord, ntfy, or Telegram notifications.

> This is an independent project and is not affiliated with Microsoft. Review the Microsoft Rewards terms before use. Activity availability and results are not guaranteed.

## Requirements

- Node.js 24 or newer
- Windows, Linux, macOS, or WSL
- Internet access and Chromium installed through Patchright

## Quick Start

```bash
git clone https://github.com/lasbt/Microsoft-Rewards-Script.git
cd Microsoft-Rewards-Script
npm install
npm run install:browser
```

Copy `config/env.example` to `.env` and set at least one `ACCOUNT_N_EMAIL`. Then run:

```bash
npm run build
npm run start
```

If `config.json` does not exist, the application creates it from `config/config.example.json` and does not overwrite existing files. See the [usage and installation guide](docs/usage.md) and [configuration guide](docs/configuration.md).

## Commands

| Command                          | Purpose                                    |
| -------------------------------- | ------------------------------------------ |
| `npm run build`                  | Compile TypeScript and copy query data     |
| `npm run start`                  | Run the application                        |
| `npm run dev`                    | Run TypeScript directly with debug logging |
| `npm run manual-login -- --help` | Show manual login options                  |
| `npm run clear-sessions -- help` | Show session management commands           |
| `npm run open-session -- --help` | Open a saved session in Chromium           |
| `npm run api -- --help`          | Show control API options                   |
| `npm test`                       | Run tests                                  |
| `npm run lint`                   | Run ESLint                                 |

The optional API can start and monitor runs and maintain a local schedule while the API process is running. See the [control API guide](scripts/api/README.md).

## Documentation

The [documentation index](docs/README.md) links to installation, configuration, architecture, usage, and troubleshooting guides.
