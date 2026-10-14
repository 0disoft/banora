# Studio Notice and Failure Localization Patch

Status: `0.1.2` published for SDK, CLI, React, Vue and Svelte on `latest`.
Hosted preparation, fresh-registry installed health, public demo health and
independently downloaded release recovery all passed. `dev` remains `0.1.0-dev.1`.

The first hosted preparation stopped in its full browser gate because the support
consent-race fixture still waited for the old raw `Invalid SGF point` exception.
The fixture now checks the localized SGF-property explanation while retaining all
opt-in/disable/clear and private-content assertions. No runtime change was needed.
Preparation `38505740808` retained no approved candidate and published no packages.
The focused support browser check, lint, format and documentation checks passed
after correcting this assertion.

Pages run `38505743666` successfully deployed runtime source `358198a` and passed
live-byte health/archive. Public Chrome verified Korean/English rejection feedback,
three-second expiration, dirty-state retention and SGF import/edit/export/reopen,
including Korean text, literal `<tag>`/`$&` content and unknown SGF properties.

## Changes and Compatibility

Source fixes `dd5d09e` and `0184c11` add three-second Studio action notices and
localized controller, SGF, sharing, texture, scoring and file failure feedback in
all twelve languages. New feedback restarts the notice timer; language changes
neither extend the timer nor revive expired messages. The independent dirty-record
indicator remains visible. Authored names/comments and machine diagnostic contracts
are preserved.

The SDK's additive `formatUiFailure` root/locale/classic helper provides safe,
DOM-free human explanations with a localized fallback for unknown codes. Existing
custom message bags gain no required fields. All five package versions advance
together to `0.1.2`; compatible SDK peer ranges and framework/tool majors remain
unchanged. There is no database, saved-data migration, credential, repository
hygiene or CI authority change. The headless module inventory registers the helper.
The existing CI workflow's manual dispatch now supplies a zero-SHA fallback when
event diff metadata is absent; this selects full checks without changing permissions,
events, job count, concurrency or normal push/PR comparisons. Manual run
`38506787214` exposed the old empty-argument failure. The actual CLI boundary is
covered by a workflow/plan regression test. Local full browser smoke also passed.

## Executed Local Validation

`build:examples` and `check` passed: 271 tests across 53 files, lint, formatting,
module boundaries, SDK/adapter/CLI builds, root/Svelte typechecks, documentation
links and packed SDK/classic/CLI consumers. Chrome locale, scoring, sharing,
texture and file-drop checks passed. The locale scenario exercises live failures
in all twelve languages, record preservation, timer replacement and expiration.
The static Studio/menu/dialog catalog audit found no missing owned static labels.

The final [Linux CI](https://github.com/0disoft/banora/actions/runs/38506982716)
passed 272 tests after the CI regression test, full production browser smoke,
packed SDK/CLI/framework consumers and the standalone starter.

Other browser engines and native-speaker proofreading were not rerun. Physical
device and screen-reader validation remain waived by the owner. See
[Validation](../../VALIDATION.md) and the
[localization contract](../sdk/localization.md) for scope boundaries.

## Release Procedure and Recovery

Push the reviewed commits once, then use the existing manual Pages deployment and
hosted release preparation. Publish only the exact successful prepared bytes through
the protected `npm-release` OIDC workflow, targeting `latest`. Retain manifest and
archive hashes, verify fresh registry tarballs and installed consumers, and record
terminal workflow outcomes. No upload retry is permitted merely because registry
visibility is delayed; inspect receipts and reuse confirmed versions.

Stop on failed health, mismatched bytes or broken open/edit/export flows. Preserve
the failed evidence and prior `0.1.1` release; use the existing
[manual recovery procedure](../ops/rollback.md) if necessary. No automatic
unpublish, channel rollback or host migration is authorized by a successful upload.

## Prepared Candidate and Publication

The successful [preparation 38507482467](https://github.com/0disoft/banora/actions/runs/38507482467)
passed all nine gates at source `e3bda1d0ae9a289b5fc8c569e63b8869bc3ca4c0`,
tree `1022838c26f4de8b5f2ba41107a62354fee13239`. It retained 572 payload files in
artifact `11868786102`, named
`banora-candidate-e3bda1d0ae9a289b5fc8c569e63b8869bc3ca4c0-38507482467-1`.
Provider ZIP digest is
`sha256:72778f519a93b996a10c37c1af578bd381a17dd6a3c33611f2687e3a7b6ab86f`.
The downloaded bundle independently passed `release verify`; manifest SHA256 is
`2329cab655f2f2d41f4c39ce8b5e4727dc94c86990bd35a605f9d8b8fed6c623`.

Earlier preparation `38506128163` stopped in its browser gate with no approved
artifact. Its bounded log did not retain the failing browser assertion. Local full
browser and the later full Linux CI/preparation passed; no root cause for that
isolated candidate failure is claimed. Neither failed preparation published packages.

[Publication and health 38507979327](https://github.com/0disoft/banora/actions/runs/38507979327)
completed successfully in one attempt through the unchanged protected OIDC workflow.
All five exact archives were published to `latest=0.1.2`; `dev=0.1.0-dev.1` remained
unchanged. Fresh downloads independently matched reviewed SHA256 and registry
SHA512 integrity. The read-only health job installed and exercised SDK, CLI and
native framework consumers. There was no re-upload, publisher change, static-token
fallback, channel-only mutation or permission expansion.

| Package                  | Reviewed and registry archive SHA256                               |
| ------------------------ | ------------------------------------------------------------------ |
| `@0disoft/banora`        | `243e09c685b13e1b85dbf997859043eb693c985166a711dd173d3534d573bf83` |
| `@0disoft/banora-cli`    | `1e24c70f4bd1d1560f6bb2840827a33c87904634d84fcb9fee2f252cf83d27eb` |
| `@0disoft/banora-react`  | `27fa91a3d898e17d84c95aa3f401f215086bf2eaa85a17a3631ad02276332818` |
| `@0disoft/banora-vue`    | `641c561750b3b0acb58279ac6cd77fc9fa23235d21eb37ba1454122e3add9044` |
| `@0disoft/banora-svelte` | `2174abca06c385b7aa843ce9d6830082ae974ced1a2fda959cecdb52aafe659f` |

## Public Release and Recovery Evidence

The public [v0.1.2 release](https://github.com/0disoft/banora/releases/tag/v0.1.2)
is non-prerelease, and its tag resolves to the reviewed source above. It retains
the 15,869,320-byte prepared tar archive, original 107,263-byte manifest, publication
and registry-health receipts, independent registry inspection and `SHA256SUMS`.
All six public assets were downloaded anew and matched independently retained
originals. The downloaded archive was extracted into a fresh directory, and all
572 payload files passed `release verify` without rebuilding.

Prepared tar SHA256 is
`085d79eb646b996e15b337e4b000cce6d0361da7a03219ed442d2c74a860d4d7`.
Publication receipt SHA256 is
`5ce2ff4a214c03de57e8e5a19a842bc6fcff5426898d1a5a8370833ef6c9c26d`;
registry-health receipt SHA256 is
`7b64074384ddcbdb27189b137da9d211f62a3ac65fc911157805248ded9eb2d5`.

The public demo remains runtime source `358198a`; subsequent commits only correct
test/CI orchestration and release documentation. Its 457-file health receipt records
original tar SHA256
`a94c8c898facc5cd8d86a66b8ab8e565075e55e315cff68dcfafb56e5d046b92`.
The successful archive job also retained draft `demo-backup-38505743666`.
Release/draft assets remain mutable maintainer-managed provider storage; this does
not establish independent-provider retention or a host/data rollback guarantee.
