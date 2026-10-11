# Retained Release Preparation Evidence

Status: scoped local tooling and clean-source preparation executed. This is not
publication, hosted rollback or all-72 completion.

Latest executed candidate: hosted clean source `52f7c3f`, retained in GitHub Actions,
downloaded/verified locally and consumed by the actual read-only publication workflow.
The earlier ff9edb7 and cb53a96 candidates are preserved. The newest execution
evidence is recorded first; older snapshots below remain
historical and do not describe current GitHub or candidate state.

After [ADR 0023](../adr/0023-existing-publisher-package-identity.md), current source
and the cb53a96 candidate use `@0disoft/banora*` identities. The older fdea584 bundle still uses the
previous `@banora/*` identities and cannot be published under the new names.
Its 149 files verified successfully with the updated verifier; originals were
not rewritten. The newly prepared candidate contains the current package names.
Use the recorded source commit for executable legacy-bundle consumers.

## October 12: Hosted Publication Preview from Exact Prepared Bytes

[Preparation run 38175691497](https://github.com/0disoft/banora/actions/runs/38175691497)
completed successfully in one 4m42s Ubuntu job at clean main source
`52f7c3f2b1bccc7726119c8b48af757138a969f5`, tree
`efe2a71b23636daa8b7c68c5a0eef852cba939bf`. Its downloaded manifest records
Bun 1.4.3 / Node 24.21.0, all five `0.1.0-dev.0` packages and 149 files.
The terminal preparation receipt confirms `reused: false` and all nine successful
gates: check, security-files, security-deps, sdk-archive, cli-archive,
adapter-archives, browser-bundle, starter-archive and recovery-drill. Browser,
independent starter and framework consumers ran against these retained bytes.
No additional inner test count is inferred from drained child output.

The one retained artifact is:

- ID `11715474426`; name
  `banora-candidate-52f7c3f2b1bccc7726119c8b48af757138a969f5-38175691497-1`.
- Archive SHA-256 `5380c2025185e4a69497a35fca9d1dfc08ec25b7d5e3778cc430ffa468b2b319`.
  Upload output, API metadata and the actual hosted download action's computed
  digest agree. The separate local downloaded ZIP was not independently hashed.
- Size 681,035 bytes; API expiry `2026-10-25T21:21:18Z`.
- Manifest SHA-256 `3a9764f89f697945d3f1c69aa8a5d592fd5e5682a1924200831decc4d42f9d64`.

[Publication preview run 38176068080](https://github.com/0disoft/banora/actions/runs/38176068080)
was explicitly dispatched with `execute=false`, that preparation run/source/hash
and channel `dev`. Its preview job completed successfully in 12s. The collector
accepted the actual successful main run and matching artifact identity/digest;
download-artifact@v8 downloaded exactly that ID into the fresh checkout.
The file/permission gate passed 361 files, and the guarded command returned
`operation: preview`, the exact reviewed source/hash and all five archive SHA-256/
SHA-512 values. No dependencies or package rebuild was needed for this workflow.
The separate publishing job is explicitly `skipped`, not a successful npm upload
or OIDC/environment approval test. Preview retains read-only token permissions.

The candidate was independently downloaded locally to
`.artifacts/downloads/38175691497-f1dc6406-e73c-4cf1-9d6a-5a38b3495d6d/`.
Its manifest matched the hosted receipt, `release verify` checked all 149 hashes,
and actual Windows `release publish` offline preview passed the same binding.
All five package archive hashes/byte lengths equal the earlier ff9edb7 downloaded
candidate's verified archives. That exact SDK/CLI byte identity preserves the
earlier Windows installed-consumer evidence below; it is not a claim of another
fresh Windows installed run. Original bundles remain unchanged.

Ordinary [CI run 38175680890](https://github.com/0disoft/banora/actions/runs/38175680890)
also completed successfully at this source in one 41s job. It selected code-only
release verification, correctly skipped unrelated extra browser/adapter/starter/
audit gates, and passed 210 tests / 2,939 assertions, quality/boundaries/builds,
root/Svelte types, installed SDK/classic and 297 installed CLI checks plus
361-file permission signals. The explicit preparation above ran the full release
gates independently of this narrow ordinary-CI choice.

Temporary artifact retention, successful preview and matching byte hashes do not
establish public visibility, trusted-publisher settings, owner policy approval/
private reporting, npm publication, registry-installed consumer health or live
rollback. A later evidence-only main commit is not this candidate's source;
if main advances, prepare/review a new matching candidate before approving
execution. No automatic repeated preparation or publication follows from the
unchanged external handoff.

## October 12: Hosted Candidate Retained and Downloaded

The manual-only
[preparation run 38173047836](https://github.com/0disoft/banora/actions/runs/38173047836)
completed successfully in one 4m31s Ubuntu job at main source
`ff9edb7156e148edcfcc406e3dddbecd7e0182a1`, tree
`a6dba1a4458a66ff7874c32b987ce31dc02c0b06`, using Bun 1.4.3 and Node 24.21.0.
Its terminal receipt records new preparation (`reused: false`), all nine successful
gates and 149 retained current-name files at version `0.1.0-dev.0`. The full browser
and starter gates ran against exact retained files, not a later rebuild. Child
output was drained; the receipt does not supply another inner test count.

GitHub retained one non-expired artifact:

- ID `11714732515`; name
  `banora-candidate-ff9edb7156e148edcfcc406e3dddbecd7e0182a1-38173047836-1`.
- Upload archive SHA-256 from action output and API metadata:
  `8670f93dfb2211a2b8865fd5452d43063bc78b7911cf9319ff3163dde3ab59a8`.
- Size 681,033 bytes; API expiry `2026-10-25T20:42:50Z`. This is temporary repository
  storage, not permanent retention, public access or a published npm release.
- Prepared manifest SHA-256 from the hosted publication-plan receipt:
  `6b63e49efa8f33ff28708a2109246baa513bbff6a0b1429bcf14ac3c0f761e2d`.

The named artifact was actually downloaded to
`.artifacts/downloads/38173047836-9dde2fd7-1d9a-4a2a-9d04-0ad8411c54e9/`.
The downloaded manifest hash equals the hosted receipt; `release verify` checked
all 149 file hashes and source/tree. Installed public SDK/classic/global/type/
license consumers passed from those downloaded Linux-built tarballs on Windows,
followed by 297 actual installed Node CLI checks. No package was rebuilt for these
consumer runs. The archive digest was inspected in hosted output/API metadata;
the separate downloaded ZIP archive hash was not independently recalculated.

The workflow's authority remained read-only repository access, without OIDC or
registry tokens. It changed neither repository visibility nor npm settings.
Verified transfer and cross-platform consumption close the configured-only upload
gap; authorization, public provenance, initial registry publication and live
previous-version rollback remain separate obligations.

## October 12: Current Publisher Identities Prepared and Restaged

Executed `bun run release prepare` against clean committed source
`cb53a9620ae949d5764a425429b83ebad304dd12`, tree
`c54b1a7b66e63439e8228fd4c5922757465f52f9`, on Windows with Bun 1.4.2 and
Node 24.14.0. This is a new candidate after the package identity change, not reuse
of the old namespace's tarballs. All five packages remain `0.1.0-dev.0`.

The terminal receipt reported `reused: false`, 149 retained files and all nine
successful checks: root check, file/permission and dependency gates, installed
SDK/CLI/adapter archives, the full production browser suite served from retained
files, independently installed starter/browser and the isolated recovery drill.
Child output was drained by the runner; no new inner assertion count is inferred.
This complete browser execution covers the current renamed examples, whereas
earlier Firefox/WebKit evidence remains scoped to its recorded source.

Manifest SHA-256:
`97fccd4a3eddaa514f2b9accee73cb08cd0a9206d101b7b6299261c0263cf3c7`.
Actual verify succeeded, followed by exclusive restaging to
`.artifacts/restores/cb53a9620ae9-9bd2fe85-b3ae-4bd2-86c6-ba7f0fa169c5/`.
The copied 149-file inventory verified separately. Actual SDK/classic/global/
declaration/license consumers passed from the copy, followed by 297 installed
Node CLI checks. Original and older bundles remain preserved.

The new offline publication-plan command inspected this actual candidate and
returned its exact manifest hash, `dev` channel and the five current package
identities. The supplied `publish.yml` workflow does not exist, accurately
reported as `workflowFileExists: false`; no npm/GitHub settings or publication
were attempted. Plan implementation is subsequent local tooling and does not
change the prepared package or example bytes. Physical device, external authority
and deployed rollback claims do not follow from this local evidence.

After the batched push, hosted Linux main
[run 38172034065](https://github.com/0disoft/banora/actions/runs/38172034065) passed
at ec13a69: current-name installed SDK/CLI/framework consumers, 202 tests/2,816
assertions, the complete Chrome 155 browser suite and independent starter. Its
3m58s Ubuntu job used Bun 1.4.3 and Node 24.21.0. This separately verifies hosted
source compatibility; it neither uploads nor authenticates the retained Windows
candidate, configures npm trusted publishers or changes public access.

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
