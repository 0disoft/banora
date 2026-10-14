# Studio Notice and Failure Localization Patch

Status: authorized `0.1.2` preparation; hosted preparation, public demo deployment
and npm publication are pending. The prior published version remains `0.1.1`.

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
