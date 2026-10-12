# Draft Demo Backup Execution Evidence

Status: hosted normal deployment/capture, local exact-byte restore and hosted
draft recovery passed on October 12, 2026. This
does not certify observed artifact expiry, provider/account recovery, SDK host
data, npm channel rollback or physical device/assistive technology behavior.

## Implemented and Checked Boundary

Commits `241e827` and `8d9c213` add the private bounded manifest/tar tools and
manual workflow route defined by [ADR 0024](../adr/0024-draft-release-demo-backups.md).
Plan is offline. Capture requires explicit execution in the matching original
manual public-main run, preserves only a maintainer-only draft and refuses tag
conflicts. Restore reads only fixed own-repository release metadata/assets;
independently reviewed hashes bind the exact two assets and embedded build
identity. No original Actions endpoint, source execution or extraction is used.

Archive receives Contents write after normal deploy and health. Draft fetching
also needs Contents write for GitHub's private draft access requirement; its
isolated `restore` job performs release GETs and a verified artifact upload.
Neither job has Pages/OIDC permission. The deployment job retains the Pages/OIDC
exception; build/health remain read-only. Recovery skips archive and rejects
mixed/partial selections before dependency installation or deployment. The
reviewed parsed workflow SHA256 is
`90e1a16be459ec7d202e9a2950473b3ed4b7b9135c7a40c81578321e4b4e32b3`;
permission/branch/step mutations are rejected by the local drift gate.

Windows `check` passed 234 tests / 3,273 assertions, SDK/classic installed
consumers, 297 installed CLI checks, lint/format/boundaries, builds, root/Svelte
types and 127 documents / 540 links. [Linux CI 38250408451](https://github.com/0disoft/banora/actions/runs/38250408451)
passed at `8d9c213`. Private ops routing omits unrelated browser suites and
retains broad routing for mixed SDK changes. Existing device/engine limits remain.

Actual plan output revealed the manifest's schema field overwriting the command
envelope schema. Commit `f34f21d` fixes that ordering and checks the real subprocess
receipt; focused tests (8 / 180 assertions), types/lint and whitespace checks passed.
The archived manifest and tar bytes remain unchanged by that private receipt fix.

The first hosted draft recovery [38250878219](https://github.com/0disoft/banora/actions/runs/38250878219)
at `f34f21d` failed in the read-only draft operation with fixed `restore` code;
deploy/health/archive were skipped, preserving the healthy site and draft.
The initial receipt did not expose an HTTP status. GitHub documents that private
draft access requires push permission. Commit `aa98362` separates draft fetching
into a Contents-write job with no Pages/OIDC authority and only release GETs,
leaving build/health read-only. Later failures may expose a fixed allowlisted
provider status, never raw provider text. Explicit success/cancellation conditions
also keep skipped draft jobs from suppressing normal dependent jobs.

[Final code CI 38251380507](https://github.com/0disoft/banora/actions/runs/38251380507)
passed at `aa98362`; focused local checks passed 8 tests / 184 assertions plus
types, lint/format, docs, workflow/file signals and whitespace. The preceding
receipt fix's [CI 38250724203](https://github.com/0disoft/banora/actions/runs/38250724203)
also passed. No whole local suite was repeated solely for these private fixes.
Final Linux checks reported 234 tests / 3,277 assertions and 297 installed CLI
checks; normal SDK/classic installed checks remained successful.

## Hosted Original and Draft Capture

[Run 38250495418](https://github.com/0disoft/banora/actions/runs/38250495418)
built/deployed source `8d9c213aa8682a0f577370d1660992942f8065ec` and passed
build, deployment, independent health and archive. Original Pages artifact
`11747463696` has provider ZIP digest
`sha256:c0ae49d4b636a8cd947e631787897b7f89689472dd363e1065bbfe5f563eef69`
and recorded expiry October 26. Health artifact `11748008454` has provider digest
`sha256:474bcb1a98874acff8388ec55b881d94ac1270d40623d1148e1c9730c23d179d`.
Its independently downloaded success receipt reports 47 files / 14 HTML files /
47 HTTP attempts and `buildIdentityAbsent: false`.

Draft release ID `410588497`, tag `demo-backup-38250495418`, remains `draft: true`,
`prerelease: true`, `published_at: null`, targeting that full original source.
It contains exactly two uploaded assets:

| Asset                | ID          | Bytes  | SHA256                                                             |
| -------------------- | ----------- | ------ | ------------------------------------------------------------------ |
| `artifact.tar`       | `633758296` | 942080 | `bca44ee66f951a16912e8efb7c97f9443afdd0dd4ec10e7d91adb26dff40332b` |
| `demo-manifest.json` | `633758295` | 225    | `ba0c30d7c68781970e17a8e26201d55ddb8b42ad6203c22cd2e7b73677a4d378` |

Read-only original candidate inspection accepted the actual successful run and
immutable artifact binding. The separately downloaded original tar produced the
same hash with the OS hash tool and the same manifest hash with offline plan.
Local restore of the two draft assets staged an identical tar, checked again
by independent hash and inventory (47 files / 14 HTML). Originals were preserved.
No draft publication, npm release/tag change or existing backup replacement occurred.

## Revised Normal Path

[Run 38251540658](https://github.com/0disoft/banora/actions/runs/38251540658)
built source `aa983622c3a39c4c83d500adb8d779457e18820c`. The restore job was
skipped, and build/deploy/health/archive all succeeded with the revised explicit
dependency conditions. Original artifact `11747114834` has ZIP digest
`sha256:2bef6c6c1959aabc74284c5fa1955a66cd058cab0bb76fb613dc85ce6db74411`.
Downloaded health receipt `11748420509` reports 47 files / 14 HTML / 47 attempts
and tar hash `7af5a57eab535c9f7ff3a622aa397ae9a72fc81e280ffb212b8173a82b33a019`.

Its automatic draft `410596438` contains tar asset `633780235` with that same
hash and manifest asset `633780239`, SHA256
`4219d2dea35a8f85d0fe51fca8ded3642fb8212bb44a23ee82ba12d7b9850fc0`.
Both drafts remain unpublished. This newer original has its own source/run
receipt, allowing the subsequent older-draft recovery to verify a real byte
identity change without pretending the SDK runtime itself changed.

## Actual Hosted Draft Recovery

[Recovery 38251697826](https://github.com/0disoft/banora/actions/runs/38251697826)
checked out `aa983622c3a39c4c83d500adb8d779457e18820c` and selected the earlier
draft `410588497` with the independently reviewed manifest hash above. Restore,
read-only build, deployment and health succeeded; archive skipped. Node setup,
dependency installation, static build, new build receipt, original Actions
candidate inspection and original artifact download were all skipped. Only
release metadata/assets supplied the original bytes; current-run upload/health
downloads do not depend on the original Actions retention.

The recovery Pages artifact is `11749160130`, ZIP digest
`sha256:8ba59d42c1aa82a8e585d0edd5d0d27d69de041848ad0447fbda45ae013c4cc4`.
Independently downloading it yielded a 942080-byte tar with the original
`bca44ee66f951a16912e8efb7c97f9443afdd0dd4ec10e7d91adb26dff40332b` hash,
verified by both the OS hash command and strict archive checker. The downloaded
health artifact `11748710809`, ZIP digest
`sha256:094b4a4ff5a92058f661f591d9b1c0c1e29fa77e73492415918e84082a9c34da`,
reports 47 files / 14 HTML / 47 attempts, that exact tar hash and
`buildIdentityAbsent: false`.

The live `banora-build.json` returns original source
`8d9c213aa8682a0f577370d1660992942f8065ec` / run `38250495418`, confirming
restoration from the newer normal build's different receipt. Workflow checkout
and deployment metadata are not relabeled as original build identity. Read-only
provider checks still show exactly the two backups, both unpublished drafts.
No second archive was created by recovery; all local original/restored tars remain.

## Retention and Failure Limits

The original Actions artifact was still available during these checks. Tests
demonstrate release-only reads even when no original Actions provider exists;
do not describe this as an observed provider expiry or deletion. Draft assets
have their own editable/deletable lifecycle on the same account/provider. Keep
approved hashes and independent copies separately. Capture stops rather than
clobbering/retrying partial uploads, records any known created release ID and
can fail after an already healthy site deployment. No operational SLA follows.

No SDK public API/version, DB/storage schema, dependency or hygiene change.
Private tools/tests, CI path classification, permission binding and the separate
archive/recovery runner are the changed scope. Source-of-truth updates are this
record, ADR 0024 and the [rollback](../ops/rollback.md) /
[demo deployment](../ops/demo-deployment.md) runbooks. Ops-change and test-hardening
skills apply; independent contract runner and new browser/device checks are skipped
because this increment changes private tooling rather than browser/SDK runtime.
