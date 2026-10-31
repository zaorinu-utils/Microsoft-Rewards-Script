# Usage

## Installation

Requirements: Node.js 24 or newer, npm, Windows/Linux/macOS/WSL, and internet access. On Linux, Chromium may require additional system libraries.

```bash
git clone https://github.com/lasbt/Microsoft-Rewards-Script.git
cd Microsoft-Rewards-Script
npm install
```

`npm install` installs dependencies and Chromium automatically. On Linux,
the Chromium installer also installs system packages when npm is run as root.

Run the setup wizard and build/start normally:

```bash
npm run setup
npm run build
npm run start
```

Setup creates `workspace/accounts.txt` and `workspace/config.json`. Manual login requires a graphical session to open Chromium.

Run `npm run doctor` before the application to verify Node.js, accounts,
configuration, and Chromium in one step.

Use `npm run setup` for production files (`workspace/accounts.txt` and
`workspace/config.json`). Use `npm run setup:dev` for development files
(`workspace/accounts.dev.txt` and `workspace/config.dev.json`). `npm run dev`
selects development files automatically. Check the development setup with
`npm run doctor -- -dev`.

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

If Chromium starts without system libraries, run `npm run doctor`. It reports
the missing browser or executable details. On Linux, install missing system
libraries with `npm run install:browser-deps`; this command may require your
system administrator password. Run `npm run setup` to create accounts.

If login repeats, list sessions with `npm run clear-sessions -- list`, remove only the affected account with `npm run clear-sessions -- email person@example.com`, and log in again manually. Sessions contain cookies and must not be shared.

For a schedule to trigger, the API must remain active. Check `GET /schedule`, the local time zone or `TZ`, and whether `API_ALLOW_SCHEDULE_WRITE=true` was set when the schedule was changed. The API listens on loopback by default. For remote access, configure `API_TOKEN` and use a trusted network.

See the [API reference](../scripts/api/README.md) for HTTP errors, authentication, and detailed configuration.

# Uso

## Instalação

Requisitos: Node.js 24 ou mais recente, npm, Windows/Linux/macOS/WSL e acesso à
internet. Em Linux, Chromium pode exigir bibliotecas de sistema adicionais.

```bash
git clone https://github.com/lasbt/Microsoft-Rewards-Script.git
cd Microsoft-Rewards-Script
npm install
```

Execute `npm run setup` para criar `workspace/accounts.txt` e
`workspace/config.json`. Os arquivos do workspace são locais e não são
versionados.

No PowerShell, use `Copy-Item` com os mesmos caminhos. Compile com
`npm run build` e execute com `npm run start`. O login manual precisa de sessão
gráfica para abrir o Chromium.

## Aplicação principal

Compile com `npm run build` e execute com `npm run start`. Use `npm run dev`
para executar TypeScript diretamente com logs de depuração. Ctrl+C solicita
encerramento limpo. Visibilidade do navegador, atividades, intervalos e buscas
são definidos em `config.json`.

## Contas e sessões

```bash
npm run manual-login -- --help
npm run clear-sessions -- help
npm run open-session -- --help
```

O login manual salva a sessão após a página Rewards permanecer aberta por cinco
segundos. Listar sessões não altera dados; para apagar, informe uma conta ou
escolha explicitamente `all`. Uma sessão salva pode ser aberta no Chromium para
inspeção.

## API de controle

Inicie-a separadamente com `npm run api`. Por padrão, ela escuta em
`127.0.0.1:3010`. Configure um `API_TOKEN` longo e aleatório antes de escutar em
uma interface acessível pela rede. A API inicia e encerra execuções, seleciona
contas, expõe status e logs, lista sessões e, opcionalmente, altera configuração
ou agenda. Consulte a [referência da API](../scripts/api/README.md).

Para habilitar agendas, defina `API_ALLOW_SCHEDULE_WRITE=true` em `.env` e
envie um `PUT` ou `PATCH` autenticado para `/schedule`. O arquivo persiste, mas
o processo da API precisa continuar ativo. As expressões são verificadas uma
vez por minuto no fuso local configurado; uma ocorrência é ignorada se já
houver uma execução.

## Notificações e logs

Configure Discord, ntfy ou Telegram na seção `webhook` de `config.json`. Os
segredos devem ficar apenas na configuração local. A saída do console pode ser
filtrada por nível, palavra-chave ou expressão regular. As filas de notificação
são descarregadas no encerramento.

## Verificações de desenvolvimento

```bash
npm test
npm run lint
npm run format:check
npm run build
```

## Diagnóstico

Se o Chromium não iniciar por falta de bibliotecas, execute `npm run doctor`.
No Linux, instale as bibliotecas com `npm run install:browser-deps`; o comando
pode pedir a senha do administrador. Para configurar contas, execute
`npm run setup`.

Se o login se repetir, liste sessões com `npm run clear-sessions -- list`,
remova apenas a conta afetada com `npm run clear-sessions -- email
pessoa@example.com` e refaça o login manual. Sessões contêm cookies e não devem
ser compartilhadas.

Para uma agenda, a API precisa continuar ativa; verifique `GET /schedule`, o
fuso local ou `TZ` e se `API_ALLOW_SCHEDULE_WRITE=true` estava definido ao
alterá-la. A API escuta em loopback por padrão. Para acesso remoto, configure
`API_TOKEN` e use uma rede confiável.

Consulte a [referência da API](../scripts/api/README.md) para erros HTTP,
autenticação e configuração detalhada.
