# 0.1.3 Maintenance Release

Status: authorized candidate; preparation and publication are pending.
The last confirmed npm default-channel version is `0.1.2`.

## Changes and Compatibility

This release collects the maintained source since `v0.1.2`, including:

- Retained SVG hover, touch and ink previews, bounded variation neighborhoods,
  adjacent move-number projection and large-record parsing/indexing improvements.
- Closed controller/view ownership cleanup, pending analysis transport cleanup,
  stale-response isolation and bounded external reads.
- Autosave/checkpoint freshness, draft restore/delete selection guards, IndexedDB
  connection recovery and serialized/reentrant workspace notifications.
- Twelve-language puzzle/analysis/board feedback and the typed, validated,
  undoable controller game-information API.
- Release/backup/recovery diagnostics and focused regression checks.

All five package versions advance together to `0.1.3`. Existing compatible
`>=0.1.0-dev.0 <0.2.0` SDK peer ranges and framework/tool majors are preserved.
This versioning increment changes no runtime API, database, storage format,
credentials, provider configuration or CI permissions. The preceding source
changes retain their detailed contracts and evidence in
[Validation](../../VALIDATION.md) and the [SDK follow-up](35-sdk-follow-up.md).
Pending Studio game-information UI and content tooling are not claimed as shipped.

## Publication and Recovery Plan

Commit the version/lockfile changes on existing main and push once. Run the
existing hosted preparation and inspect its terminal result and immutable
candidate. Independently download and verify the manifest and complete inventory.
Preview the exact candidate, then use the protected `npm-release` OIDC workflow
to publish the same SDK/CLI/React/Vue/Svelte archives on `latest`.

Require fresh registry-byte and installed-consumer health before declaring the
release complete. Retain the exact candidate, original manifest and publication/
health receipts in public `v0.1.3` release assets. Download those assets again,
compare independent hashes and verify extraction into a new empty directory.

Stop on conflicting bytes or failed health, preserve partial-publication receipts
and the previous `v0.1.2` recovery assets. Never re-upload an uncertain version,
unpublish, or retag an existing channel as a substitute for investigation.
Publication does not redeploy the separately hosted Pages site.
