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

# Configuração

As preferências do aplicativo ficam no `config.json` da raiz. Se o arquivo não
existir, a aplicação copia `config/config.example.json` uma única vez e valida as
opções ao iniciar. Campos inválidos são reportados e, quando possível,
substituídos pelos valores padrão. O exemplo versionado contém a lista completa
de opções.

Os dados específicos das contas ficam em `.env`, criado a partir de
`config/env.example`. Esse arquivo é ignorado pelo Git. Não versione senhas, segredos
TOTP, senhas de proxy, tokens da API ou credenciais de webhook.

## Contas

Adicione um bloco numerado por conta. Os números podem ter lacunas; as contas
são processadas em ordem crescente.

```dotenv
ACCOUNT_1_EMAIL=pessoa@example.com
# ACCOUNT_1_PASSWORD=
# ACCOUNT_1_TOTP_SECRET=
# ACCOUNT_1_RECOVERY_EMAIL=
# ACCOUNT_1_LANG_CODE=pt-BR
# ACCOUNT_1_GEO_LOCALE=auto
```

A senha é opcional para contas com login sem senha. O idioma aceita uma tag BCP
47, como `pt-BR`; a região aceita um código de duas letras ou `auto`. Em modo
automático, a região do perfil é armazenada após uma consulta bem-sucedida ao
painel. `config/env.example` lista as opções de proxy e persistência de fingerprint.

## Opções do aplicativo

Mantenha essas opções em `config.json`; não há overrides `CONFIG_*` por
variáveis de ambiente.

| Seção                                                                  | Finalidade                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `sessionPath`, `headless`, `clusters`, `accountDelay`, `globalTimeout` | Armazenamento, visibilidade do navegador, concorrência e tempos limite          |
| `workers`                                                              | Ativar ou desativar fluxos individuais                                          |
| `activities`                                                           | Atividades de URL Reward e Explore on Bing                                      |
| `searchSettings`                                                       | Fontes de consulta, intervalos, interação com resultados e concorrência         |
| `experimental`                                                         | Busca por API, bloqueio de mídia e navegação Edge opcionais                     |
| `proxy`                                                                | Uso de proxy nas consultas e tratamento TLS para proxies de inspeção confiáveis |
| `consoleLogFilter`, `debugLogs`, `errorDiagnostics`                    | Saída do console e diagnósticos                                                 |
| `webhook`                                                              | Destinos Discord, ntfy, Telegram e filtros de notificação                       |

Durações aceitam milissegundos numéricos ou strings como `30sec` e `1min`. Em
intervalos, `max` deve ser maior ou igual a `min`. Fontes de consulta incluem
`google`, `wikipedia`, `wikirandom`, `hackernews`, `reddit` e feeds RSS
configurados. As consultas vêm dessas fontes externas; se nenhuma responder, a
execução de busca é ignorada, sem lista local de reserva. Os valores padrão estão em
[`config/config.example.json`](../config/config.example.json).

O exemplo distribuído define `headless` como `false`. Use o modo headless em
servidores sem ambiente gráfico.

## API e agenda

As opções da API são variáveis de ambiente listadas em `config/env.example` e no
[guia da API](../scripts/api/README.md). Alterações de configuração e agenda
pela API ficam desativadas por padrão. A agenda é armazenada em
`config/schedule.json`; o processo da API a verifica uma vez por minuto no fuso
local do sistema ou no valor de `TZ`. Mantenha a API em execução para disparar
agendamentos. Execuções existentes não são sobrepostas.
