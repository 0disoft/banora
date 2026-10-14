# Studio Notice and Failure Localization Patch

Status: authorized `0.1.2` preparation; hosted preparation, public demo deployment
and npm publication are pending. The prior published version remains `0.1.1`.

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

## Executed Local Validation

`build:examples` and `check` passed: 271 tests across 53 files, lint, formatting,
module boundaries, SDK/adapter/CLI builds, root/Svelte typechecks, documentation
links and packed SDK/classic/CLI consumers. Chrome locale, scoring, sharing,
texture and file-drop checks passed. The locale scenario exercises live failures
in all twelve languages, record preservation, timer replacement and expiration.
The static Studio/menu/dialog catalog audit found no missing owned static labels.

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
