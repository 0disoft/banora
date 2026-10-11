# Configuration and Environment

Status: explicit SDK/local-consumer configuration; host service settings remain host-owned.

Banora SDK reads no environment file, process environment, credentials or endpoint
automatically. Consumers pass validated options to the owning public module.
Configuration changes never grant permission to access a host record or service.

| Surface            | Defaults and validation                                                                                    | Change/reload owner                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Development        | Bun 1.x / Node 24.x from `mise.toml`; frozen `bun.lock` and supported-major manifest ranges                | Maintainer reviews tool/lockfile changes; setup/doctor check actual environment                       |
| SGF/controller     | Default 5 MiB, 50,000 nodes, nesting depth 128, property value 65,536 characters; checked parser limits    | Host constructs controller with explicit limits; failed imports preserve active record                |
| Play/scoring       | Default simple ko/suicide forbidden; named policy chosen explicitly; SGF RU does not silently choose rules | Host chooses/replays policy; checkpoint restores its saved rules                                      |
| Automation CLI     | Each input capped at 8 MiB; canonical versioned schema; explicit file output                               | Per invocation; discover with schema/help, use files/stdin                                            |
| Studio recovery    | IndexedDB version 1, 20 drafts, 500ms quiet interval; backup JSON at most 64 MiB                           | Local user toggles autosave and controls Retry, refresh, backup, restore/delete                       |
| Studio preferences | Twelve independently versioned scalar fields, 4 KiB per envelope; safe legacy migration                    | User action/reload; future/corrupt data retained until explicit reset; unreadable autosave starts off |
| Diagnostics        | Explicit SDK input; Studio off by default, in-memory consent epoch; terminal invocation opts in once       | Host/user clears/disables; no persistent/global telemetry                                             |
| KataGo adapter     | Explicit reporting perspective; default pending budget 8, configurable 1–64; bounded protocol lines        | Host owns transport/process/auth/deadline; explicitly disposes/replaces provider                      |

Owning contracts: [SGF/API](../sdk/public-api.md), [automation](../sdk/automation.md),
[recovery/preferences](../sdk/recovery.md), [analysis](../sdk/analysis.md),
[KataGo](../sdk/katago.md) and [diagnostics](../sdk/diagnostics.md). Keep changed
defaults in their types/schema/source and these contracts together; run relevant
tests, types and installed consumers. A docs check verifies command references and
links; it does not infer behavioral compatibility.

The local KataGo example requires explicit engine/model paths and committed
`examples/katago-cli/analysis.cfg`, uses a separate `.tmp` working directory,
Black reporting, bounded CPU/visits/time and a 30-second host deadline. The engine
configuration is not a hosted service or playing-strength recommendation. Its
`logAllRequests`/`logAllResponses` settings are false. Review changed config and
optional raw stdio hooks for private board data before enabling them. No asset
download, credentials or process startup occurs merely by importing SDK/helper code.

A host web/server integration must validate its own environment at startup, reject
unknown/invalid settings before connecting, keep credentials server-side and define
which changes require reconnect/restart. Browser code may expose only public
settings; never place tokens in client build variables or share URLs. No SDK dotenv
loader or hosted config service is required.
