# Retained Release Preparation Evidence

Status: scoped local tooling and clean-source preparation executed. This is not
publication, hosted rollback or all-72 completion.

Latest executed candidate: clean source `fdea584`, prepared and restaged after the
successful remote-main CI and Firefox/WebKit desktop verification. Its exact
evidence is recorded at the end of this document; older snapshots below remain
historical and do not describe current GitHub or candidate state.

After [ADR 0023](../adr/0023-existing-publisher-package-identity.md), current source
uses `@0disoft/banora*` identities. The retained fdea584 bundle still uses the
previous `@banora/*` identities and cannot be published under the new names.
Its 149 files verified successfully with the updated verifier; originals were
not rewritten. A newly prepared candidate is required for current package names.
Use the recorded source commit for executable legacy-bundle consumers.

## Implementation and Initial Checks

The repository `release` command prepares a clean commit's five packages and
production browser examples, verifies their inventory and restages reviewed
prepared bundles into a new isolated directory. Installed/browser smoke runners
can select exact retained bytes through `--release-bundle`. Normal cleanup preserves
the ignored `.artifacts` directory; documentation discovery excludes generated
retained artifacts. The [release](../ops/release.md), [rollback](../ops/rollback.md)
and [ADR 0022](../adr/0022-retained-release-artifacts.md) own behavior and limits.

On October 12, 2026, initial local validation passed root `check`: lint/format,
module boundaries, SDK/adapter/CLI builds, root/Svelte types, 193 tests with 2,707
assertions, 115 documents/407 relative links, public SDK/classic declarations and
installed Node CLI's 222 checks. Security file/permission signals passed 338 files;
this is not a complete security scan. Actual preparation on the dirty checkout
rejected with the fixed `source` error before starting checks or creating a bundle.

Four release tests exercise closed candidate/prepared schemas, bounds/traversal/
duplicates, altered/extra files, linked directories, exclusive source-preserving
restaging, actual Git state and failed/timed-out subprocess cleanup. Integrity
fixtures are authored non-executable test bytes, not claimed package evidence.

## Clean-Source Execution

Actual preparation on October 12 succeeded at commit
`2b8b67ed33c026db6d32ea1140f34bafe11de97b`, tree
`7d5b76e70fffdd214179fa5fa839ef3de1f6120b`, Bun 1.4.2/Node 24.14.0 on Windows x64.
It retained five `0.1.0-dev.0` tarballs and 149 total files, then completed `check`,
`security-files`, `security-deps`, `sdk-archive`, `cli-archive`, `adapter-archives`,
`browser-bundle`, `starter-archive` and `recovery-drill`. These are executed results,
not inferred from the manifest schema. The installed SDK/classic/CLI, independent
React/Vue/Svelte types/SSR, complete production browser and standalone starter used
the retained real artifacts. The root check included 193 tests/2,707 assertions;
dependency audit passed at preparation time. The browser exercised Studio recovery,
search/help, languages, navigation/edit/export/reopen, framework lifecycle and the
optional display/interaction consumers using the retained production files.

Actual prepared-bundle verification succeeded. Restoration created a distinct
directory and verified both its 149 files and the preserved original. A second
clean-source prepare returned `reused: true` without executing gates again, as
documented. These ignored local files are runtime output, not committed design
evidence or a public distribution. The source remains identified separately from
later documentation commits.

The actual restaged bundle passed a separate verification and installed Node CLI
run with 222 checks. This tests usable copied package bytes rather than treating
copying alone as successful restoration.

## Remaining Scope

Unsigned hashes do not authenticate unknown artifacts. A restaged copy of the
current version is not evidence of a distinct older release or a remote rollback.
No registry upload, host selection, credentials, public/private reporting channel,
DB/schema change, package version bump or physical-device test is included.
Private reporting, remaining migration/automation work and the full current-source
requirement-by-requirement audit remain active readiness work.

## October 12: Prepared Candidate at d1ee675 and Restaged Consumers

After the localized dialog/pass/komi and measured Studio tree improvements, actual
`bun run release prepare` completed on a clean checkout at
`d1ee675c90e828456937f458432f0d36885989f6`, tree
`578ac4f398d75bd9a0fcdcd30e44c584ba323546`. It returned `reused: false`, not an
old prepared bundle. Bun 1.4.2/Node 24.14.0 on Windows x64 retained all five
`0.1.0-dev.0` package tarballs and 149 files under
`.artifacts/releases/d1ee675c90e828456937f458432f0d36885989f6/`.

The actual command completed `check`, `security-files`, `security-deps`,
`sdk-archive`, `cli-archive`, `adapter-archives`, `browser-bundle`, `starter-archive`
and `recovery-drill`. These gates executed installed SDK/CLI and native adapter
types/SSR, the whole production browser flow including the new Studio tree fixture,
an independently installed/built browser starter and actual isolated recovery.
The run drained raw child output; the nine successful gates and terminal command
receipt, not merely a hand-written manifest, establish execution. Current source
tests were separately observed as 197 tests/2,746 assertions in the preceding
increment; no different test count is inferred from the drained release output.

The completed manifest state was `prepared`; SHA-256:
`ed7e0c24b337ae55588404320c5b97fb54dbbca605ec3380822854ffe808a473`.
`bun run release verify --bundle` passed on the retained bundle. Actual
`bun run release restore --bundle` produced the distinct isolated directory
`.artifacts/restores/d1ee675c90e8-fd28b89e-55dd-4976-9c69-623d0f6e2d49/`, verifying
both original and copied inventories. The copy then passed separate verification,
installed public SDK/classic/declaration/license checks and installed Node CLI
297 checks, including every embedded recipe and cross-process checkpoint paths.
This proves usable copied package bytes for this source, not a remote deployment
switch or rollback to a different published version. The prior 2b8b67e evidence
above remains historical; current CLI/Studio changes are now in this newer bundle.

Read-only GitHub inspection on October 12 still returned private repository
visibility, enabled Issues and zero Actions runs. Root SECURITY.md is absent;
its separate candidate/diff awaits the already-requested owner approval and an
actual private reporting channel. No public demo/registry upload, credentials,
package version promotion, hosted rollback or policy approval follows from local
preparation. The user's development server remained running. Doctor passed the
current tools/dependencies and command discovery includes the browser measurement.

Only execution evidence/readiness documentation changed in this increment;
SDK API, DB/schema, dependency, hygiene and runner contracts are unchanged.
Ops-change and Playwright procedures applied. Documentation/format/whitespace
checks cover the evidence update. Physical/other-engine, hosted CI/update delivery,
off-device recovery and actual published-version rollback remain unverified.

## October 12: Current Local-Main Candidate and Restaged Consumers

Executed `bun run release prepare` on clean local main at
`fdea58408b86aeca9024d018595f0e693d1a02f9`, tree
`29f94c5b59415d7b9a3d77bf0614b7eb32b08fe7`. This source includes the newer browser
engine guard, complete desktop profile, render-completion fixture and CI evidence.
The command returned `ok: true`, `reused: false`, five `0.1.0-dev.0` package
tarballs and 149 retained files under
`.artifacts/releases/fdea58408b86aeca9024d018595f0e693d1a02f9/`.
The actual tools were Bun 1.4.2/Node 24.14.0 on Windows x64.

All nine named gates executed successfully: `check`, `security-files`,
`security-deps`, `sdk-archive`, `cli-archive`, `adapter-archives`, `browser-bundle`,
`starter-archive` and `recovery-drill`. These include installed public SDK/CLI and
all native adapter types/SSR, the entire production browser suite served from
the retained files, an independently installed/built starter browser and isolated
recovery. The terminal receipt follows the actual serial child executions;
raw child output was deliberately drained, so no new inner test count is inferred
from this receipt or a manually edited manifest.

The final manifest is `prepared`; SHA-256:
`23661d09e231d408cca255ea909750bc9a09b7a940ced43a10eeb3d7ca28ee6b`.
Actual `release verify` succeeded. `release restore` created the distinct
`.artifacts/restores/fdea58408b86-a62747a6-cce3-4d3e-9f2c-579a2835148c/`, preserving
the original and verifying both 149-file inventories. A separate verify on the
copy succeeded, followed by installed public SDK/classic/declaration/license
checks and an actual installed Node CLI run with 297 passing checks. These copied
bytes are usable for this source; no deployment pointer or published-version
rollback was exercised. Both earlier retained candidates remain available.

The current remote-main hosted CI is independently recorded at `fed716a` in
[run 38164778251](https://github.com/0disoft/banora/actions/runs/38164778251).
Source/API, DB/schema, dependency, repository hygiene, runner and workflow
definitions do not change in this evidence-only increment. Ops-change and SDK
procedures applied. Documentation/format/whitespace checks cover the evidence
update; physical devices, an approved policy/private reporting channel, registry
scope/version/publication, actual hosted bot updates and remote rollback remain
outside these executed gates. The local prepared source has not been published;
preparation and unsigned hashes establish scoped execution/integrity, not release
approval, authentication or an off-device backup.
