# Node SEA Readiness

## Recommended layout

Use one data directory beside the executable:

```text
Microsoft-Rewards-Script/
  microsoft-rewards-script(.exe)
  workspace/
    accounts.txt
    config.json
    accounts.dev.txt
    config.dev.json
    diagnostics/
    sessions/
```

Override it with `MRS_DATA_DIR`. Packaged builds should set `MRS_SEA=1`.
Runtime state must not be stored inside the executable or inside embedded files.

## Current blockers

- The application currently depends on external JavaScript modules and the
  compiled `dist` tree for CLI and API helpers.
- The API starts separate Node processes and loads JavaScript from `dist`.
- Patchright requires its Chromium executable and native package contents
  outside the JavaScript SEA blob.
- Chromium must be installed and detected after extraction or installation.
- Native Node modules should be tested individually before packaging because
  SEA does not automatically package native addons.
- ZIP diagnostics use the external `zip` command and remain platform-dependent.

## Minimum packaging phases

1. Bundle the core application with an explicit static entry point.
2. Embed immutable data such as `appConfig.json`; keep credentials and
   runtime state external.
3. Replace API and CLI child processes with packaged modules or a separate
   desktop/service executable.
4. Bundle or ship Patchright and Chromium according to the platform licensing
   and packaging policy.
5. Replace the external `zip` dependency with a maintained archive library.
6. Build and smoke-test on Windows, Linux, and macOS from a directory that is
   not a source checkout.
