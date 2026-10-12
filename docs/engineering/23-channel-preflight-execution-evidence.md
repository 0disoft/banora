# Package Channel Preflight Execution Evidence

Status: read-only complete-family channel inspection executed from clean source
`14ba2b0` on October 12, 2026. It confirmed no change was needed; no tag, package,
trusted-publisher permission or host data was changed. This is not a prior-version
rollback or a privileged workflow execution.

## Actual Source and Registry Observation

The original successful preparation artifact was downloaded again from run
`38211207226`: artifact `11729635590`, name
`banora-candidate-41e0e897a250674d71ed89e5a41c4fb8429072bc-38211207226-1`.
The provider still reported `expired: false` and the previously recorded Actions
archive digest `f90fd86a5479c4a7436b64450c7cbfe4b820ba2de6f3dfd83f401c74114a59e9`.
The local `manifest.json` hash independently matched
`d40ad9ba0cee77a917b06ad8c18d4a22205f2a0944c6994de4491814f7fb6332`.
The original prepared source is `41e0e897a250674d71ed89e5a41c4fb8429072bc`,
tree `60e50bd3984b8346caf7cbca6664a5e2d5a6d3bc`. That bundle has all nine gates
and is the actual five-package development publication candidate, not a stage
placeholder or a newly invented prior version. See the
[publication record](18-release-tooling-execution-evidence.md).

```sh
bun run release channel-plan \
  --bundle .artifacts/downloads/38211207226-channel-plan \
  --manifest-sha256 d40ad9ba0cee77a917b06ad8c18d4a22205f2a0944c6994de4491814f7fb6332 \
  --source-commit 41e0e897a250674d71ed89e5a41c4fb8429072bc \
  --tag dev --expected-current-version 0.1.0-dev.0
```

The command completed two entire credential-free public registry observations
(ten `npm view` reads). All five package names, target versions, canonical tarball
URLs and SHA512 integrity values matched the reviewed local bytes. Each selected
`dev` tag was `0.1.0-dev.0` in both observations. Source/manifest/archive integrity
was verified before reads and again afterward. The original manifest remained
byte-identical. A previous exploratory read also returned the same no-change state;
the clean committed-source observation is the retained evidence.

| Package                  | Observed `dev` | Reviewed target | Planned mutation arguments |
| ------------------------ | -------------- | --------------- | -------------------------- |
| `@0disoft/banora`        | `0.1.0-dev.0`  | `0.1.0-dev.0`   | Empty                      |
| `@0disoft/banora-cli`    | `0.1.0-dev.0`  | `0.1.0-dev.0`   | Empty                      |
| `@0disoft/banora-react`  | `0.1.0-dev.0`  | `0.1.0-dev.0`   | Empty                      |
| `@0disoft/banora-vue`    | `0.1.0-dev.0`  | `0.1.0-dev.0`   | Empty                      |
| `@0disoft/banora-svelte` | `0.1.0-dev.0`  | `0.1.0-dev.0`   | Empty                      |

The result was `operation: no-change`, `observations: 2` and
`olderCommonVersions: []`. The original `0.0.0-stage` identity placeholders are
excluded from prior-version candidates. A different reviewed SDK version is
required before a meaningful live downgrade can be rehearsed; the same version
or a placeholder must not be called a rollback. Comparing the publication source
with this checkout found only package README changes, with no SDK/adapter/CLI
runtime, package metadata or version change. A duplicate SDK publication solely
to manufacture rollback evidence was not performed.

The local exclusive receipt is `.artifacts/channel-observation-14ba2b0.json`,
recorded at `2026-10-12T14:13:09.511Z`, with clean tool source
`14ba2b0b5dfdc72323a50045758bb4a20205102a` and SHA256
`46bf8280c19d405e4e724e8c2fc6a3199bc8eadde0af78fc5237375eeb2b77f0`.
It contains the reconstructed bounded plan, not raw provider responses or secrets.
The download and receipt are ignored local artifacts; they do not replace the
owning release/rollback contracts or authenticate an arbitrary future candidate.

## Implemented Guards and Limits

The private command discovers through `release --help`, uses the existing JSON
command/error envelope, requires an explicit expected current version and rejects
`--execute`. Its supported target is a fully verified prepared complete-family
bundle bound to the independently reviewed source and manifest hash. Forward
moves, malformed versions, stage placeholders, deprecated targets, foreign URLs,
missing/duplicate version inventory, provider errors, mixed tags, SHA512 mismatch,
between-observation drift and locally modified bundle bytes stop before returning
a usable plan. Unknown input/provider text does not enter error output.

A genuine older target produces `rollback-plan` and structured `changeArgv` arrays;
these are reviewable arguments, not operations performed by this tool. Two
observations do not provide a registry lock or compare-and-swap. All five tag
writes are independent, and a later manual operation may partially succeed.
Fresh target installed-consumer health, an immediately repeated preflight,
separately authorized mutation and complete-family post-change verification remain
required. Locked/existing installations and host data are unaffected by a tag move.

Current npm documentation supports OIDC tag operations with explicit per-package
**Allow npm dist-tag**, separate from publication permission. It requires npm
11.21.0+ in major 11 or 12.2.0+ in major 12. The current plan did not verify or
enable that permission, replace any connection or add a privileged workflow. See
[npm trusted publishers](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing)
and [npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/).
An existing successful OIDC publish does not prove tag-mutation authority.

## Validation and Ownership

Final related checks passed 29 tests / 409 assertions across channel, release
and CI tests, root typecheck, lint/format, module boundaries, docs/relative links,
whitespace and file/permission signals. Tests use clearly authored hash/provider
fixtures, not fake live publications, and execute the actual discovery/error
command with no npm executable in PATH. Existing release/publication/registry
health gates and error behavior remain covered.

The isolated diff selects only existing `check` and `security:files` in CI, with
no browser job/download, dependency audit, extra runner or schedule. Mixed SDK
changes still select full functional browser verification. No public SDK API,
DB/storage schema, package version, dependencies, repository hygiene, publisher
settings or workflow permissions change. Public registry reads may create the
existing local empty npm config and normal read cache; no credentials are used.
Browser/device checks were not repeated for private release-tool changes.

Owning contracts are [rollback](../ops/rollback.md#registry-and-data-boundaries),
[release](../ops/release.md), [VALIDATION](../../VALIDATION.md) and the active
[readiness review](12-readiness-review.md). Ops-change and SDK procedures apply.
This closes the read-only whole-family preflight gap; actual prior-version channel
and consuming-host/data rollback remain unverified.
