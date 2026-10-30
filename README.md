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

# Microsoft Rewards Script

Aplicação TypeScript para executar fluxos do Microsoft Rewards usando um
navegador. Mantém sessões para várias contas, oferece atividades configuráveis,
API local opcional e notificações por Discord, ntfy ou Telegram.

> Projeto independente, sem afiliação com a Microsoft. Consulte os termos do
> Microsoft Rewards antes de usar. O funcionamento e a disponibilidade das
> atividades não são garantidos.

## Requisitos

- Node.js 24 ou mais recente
- Windows, Linux, macOS ou WSL
- Acesso à internet e Chromium instalado pelo Patchright

## Início rápido

```bash
git clone https://github.com/lasbt/Microsoft-Rewards-Script.git
cd Microsoft-Rewards-Script
npm install
npm run install:browser
```

Copie `config/env.example` para `.env` e informe ao menos um `ACCOUNT_N_EMAIL`. Depois:

```bash
npm run build
npm run start
```

Se `config.json` não existir, a aplicação cria uma cópia de
`config/config.example.json` sem substituir arquivos existentes. Consulte
[Instalação](docs/installation.md) e [Configuração](docs/configuration.md).

## Comandos

| Comando                          | Finalidade                                            |
| -------------------------------- | ----------------------------------------------------- |
| `npm run build`                  | Compilar TypeScript e copiar dados de consulta        |
| `npm run start`                  | Executar a aplicação                                  |
| `npm run dev`                    | Executar TypeScript diretamente com logs de depuração |
| `npm run manual-login -- --help` | Ver opções de login manual                            |
| `npm run clear-sessions -- help` | Ver comandos para gerenciar sessões                   |
| `npm run open-session -- --help` | Abrir sessão salva no Chromium                        |
| `npm run api -- --help`          | Ver opções da API de controle                         |
| `npm test`                       | Executar testes                                       |
| `npm run lint`                   | Executar ESLint                                       |

A API opcional pode iniciar e monitorar execuções e manter uma agenda local
enquanto o processo da API estiver ativo. Consulte o [guia da API](scripts/api/README.md).

## Documentação

O [índice de documentação](docs/README.md) reúne instalação, configuração,
arquitetura, módulos, uso e solução de problemas.
