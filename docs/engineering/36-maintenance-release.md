# 0.1.3 Maintenance Release

Status: all five `0.1.3` packages published on `latest`; protected publication,
fresh installed-consumer health and independently downloaded release recovery
passed. `dev` remains `0.1.0-dev.1`.

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

## Executed Preparation and Publication

Source `9a81a2c6d12bb6db050ff27d76ef14fb81e113cb`, tree
`53bcdc5067742bce9a2e8eb36e8fe9265571e08b`, advances the five versions and
lockfile entries together. Local compatibility checks passed 51 assertions;
formatting, documentation links and diff checks passed. Candidate
[CI 40290491058](https://github.com/0disoft/banora/actions/runs/40290491058) passed.

Hosted preparation attempt 1 stopped at `browser-bundle`, after the check,
security and packed-consumer gates passed. Its bounded logs do not identify the
failing browser assertion; no root cause is claimed. The same source passed all
nine local preparation gates, including the complete retained-bundle browser
suite, independent starter and recovery drill. The failed hosted job alone was
rerun, and [attempt 2](https://github.com/0disoft/banora/actions/runs/40291247765/attempts/2)
passed all nine gates without a source, test, permission or workflow change.

The successful candidate retains 589 payload files in artifact `12637692116`,
named `banora-candidate-9a81a2c6d12bb6db050ff27d76ef14fb81e113cb-40291247765-2`.
Provider ZIP digest is
`sha256:c9361663d09d2766909181c3a38964dfa8a0c1811514bb643d6f6e0ff580eaf4`.
The independently downloaded candidate passed `release verify`; original
manifest SHA256 is
`7b13f2c60b49f726f9c5cd4714dc5b39cb3bab327f392fc06a29da86e2560438`.

Offline preview and [hosted preview 40294353287](https://github.com/0disoft/banora/actions/runs/40294353287)
passed. The existing required reviewer approved the exact source/hash/channel in
the protected `npm-release` environment. [Publication and health 40294524740](https://github.com/0disoft/banora/actions/runs/40294524740)
then published all five archives in one attempt and passed fresh registry-byte,
SDK/CLI/framework installed-consumer and final channel checks. The owner-authorized
review used the existing self-review policy; no protection setting was changed.
There was no package re-upload, static-token fallback or publisher reconfiguration.

| Package                  | Reviewed and registry archive SHA256                               |
| ------------------------ | ------------------------------------------------------------------ |
| `@0disoft/banora`        | `e218c7a2ab139efc9cd01efed6c923fa3a26701f669924f83cc48f5c4840eab7` |
| `@0disoft/banora-cli`    | `5716aaf6c66866cda0b8679e2202b9d0e92f8226cacbe2a62e17f5ba64d90008` |
| `@0disoft/banora-react`  | `18d9b2147fe5cf51eff4847480fdd80004896116bdb59d91cb9316278c70aa7d` |
| `@0disoft/banora-vue`    | `d0f50ac4c0b0ae9db80172e16c23950b4e18237615d4e70abbb510a1d192fad2` |
| `@0disoft/banora-svelte` | `193205766c1bce16cb0ffa9f71466017e7e915b21b02691fe270c14bffa8fa53` |

## Public Release and Recovery

The public [v0.1.3 release](https://github.com/0disoft/banora/releases/tag/v0.1.3)
is the non-prerelease Latest release, published on October 26, 2026. Its actual
tag resolves to the reviewed source above. It retains six assets: the exact
16,057,320-byte prepared tar archive, original 110,136-byte manifest, publication
and registry-health receipts, independent registry inspection and `SHA256SUMS`.

All six uploaded assets were downloaded again and matched their independently
retained pre-upload hashes. The recovered archive was extracted into a new empty
directory; `release verify` passed for all 589 payload files without rebuilding.
Prepared tar SHA256 is
`5b00088246bb1425e4a4f8e40a0b54116a1002d8108e0b4da157cffdec3b6147`.
Publication receipt SHA256 is
`a0acea634163a17c9b76275a8e028c3c0848bc715aa2cfdc27a7938dff8e8c45`;
registry-health receipt SHA256 is
`aa7ff945d973c6bb784a817c6b5418a3e79ef1e9aca50241dd2a5d75c9802327`.
The previous `v0.1.2` release and recovery assets remain available.

The Pages site was already deployed at runtime source `8309f2c` by
[40231862731](https://github.com/0disoft/banora/actions/runs/40231862731);
this package publication does not change that deployment. Other browser engines,
physical devices and native-speaker proofreading were not rerun for this release.
No DB/schema, runtime API, repository hygiene or runner configuration changes
accompany the versioning/publication work. Release assets remain mutable
maintainer-managed storage; these checks do not establish independent-provider
retention or a host/data rollback.
