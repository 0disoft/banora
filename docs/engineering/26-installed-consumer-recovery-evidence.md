# Installed Consumer Recovery Evidence

Status: executed portable SDK/CLI downgrade and return; no npm-channel or host
deployment/storage rollback claim.

## Gap and Procedure

Fresh old-version registry health proves that the target installs and works on
its own. It does not show that a checkpoint produced by the current installation
survives a downgrade. The private
[consumer recovery command](../ops/rollback.md#rehearse-portable-data-across-an-installed-downgrade)
executes that transition using source/hash-bound prepared SDK/CLI tarballs and
independent Node processes. Default rejection tests use explicitly nonexecutable
authored archives; they are not positive installed-consumer evidence.

## Actual Execution

On October 13 in Korea (`2026-10-12T16:14:31.193Z`), the committed command at
`83b0382ccdc3574a889647d5e4bda60013939cb0` completed on Windows, Bun 1.4.2 and
Node 24.14.0. It used the retained exact bytes from the independently reviewed
prepared bundles below. Earlier fresh registry health bound these bytes to the
actual published packages; this drill did not download the registry again.

| Role               | Installed SDK/CLI version | Prepared source                            | Manifest SHA256                                                    |
| ------------------ | ------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| Current and return | `0.1.0-dev.1`             | `932b5830b5fa0b281702f6025fd58810b945b426` | `70060a2b9814ed75ef46abaa0575681c39ee640ae7ba2489742d3d4ac4b4126d` |
| Previous           | `0.1.0-dev.0`             | `41e0e897a250674d71ed89e5a41c4fb8429072bc` | `d40ad9ba0cee77a917b06ad8c18d4a22205f2a0944c6994de4491814f7fb6332` |

The command verified both original complete inventories and copied exact SDK/CLI
tarballs exclusively into separate consumers. Both installed package identities
and actual CLI runtime versions matched their reviewed manifests. No workspace
SDK source or rebuilt distribution supplied the behavior under test.

The current installed SDK produced the actual checkpoint used by successive
current, previous and return-current SDK/CLI processes. Every transition preserved:

- Exact checkpoint and working/baseline SGF, two games, two alternate branches and
  the selected path in the second game.
- Setup stones, board state, the explicit move-number override, two passes,
  situational-superko/pass-stone policy and pass-prisoner totals.
- Multilingual comment, label, arrow, freehand stroke and unknown property.
- Dirty export baseline and fresh restored Undo/Redo history. Each SDK reader
  reopened the exported SGF and restored the clean baseline separately.
- Rejection of unsupported future checkpoint schemas. SDK controller state and
  the saved authored checkpoint remained unchanged; CLI rejection used its actual
  documented failed-command exit rather than a successful result.

All five recorded stages completed: current installation, previous installation,
current recovery, previous recovery and return-current recovery. The originals and
copied probe source were verified again before success. The exclusive local receipt
is `.artifacts/consumer-recovery-83b0382.json`, with SHA256
`8d1bda3247499df5a52c169c137964e79a5802eebdc3698b9d493dedf000fe17`.
Its checkpoint SHA256 is
`b416bccd271edeea7b953496ca46862e8818cd068f83207e75e04e75acbc65be`;
state SHA256 is
`5646427252eca7c064f0b3e93e3d22da5485b1297059449498078798ce0d89fe`;
probe SHA256 is
`f46b1d0a013a34dd6fceaec48b0c21b93899bbcd764b7f8d0accae0ac045113a`.
The receipt excludes authored text, provider logs and process paths.

The first actual execution at `e0308ce` installed both releases but stopped because
the probe incorrectly required the future-schema rejection to omit its diagnostic
field. This was a probe expectation error, not an SDK acceptance or data-loss bug.
The corrected probe checks the failure code and unchanged state while permitting
the documented diagnostics. The failed receipt remains preserved separately as
`.artifacts/consumer-recovery-e0308ce.json`, SHA256
`84deb2d141fc6e10837576266fddfb2929a923cacfcc402f5c2bfe47bffadf53`;
it is not relabeled as successful recovery.

## Validation and Limits

Root `check` passed 244 tests/3,477 assertions, SDK/classic/declaration consumers,
298 installed CLI checks, typechecking, lint, format and documentation checks.
Focused recovery/CI checks passed after the probe correction. File/permission
signals passed. Private ops changes select only existing check/file-signal CI;
they introduce no dependency, public SDK API, data schema, package version,
privileged workflow or background process. Physical-device and screen-reader
execution remain owner-waived; no browser behavior changed in this increment.

This is actual installed portable `banora.checkpoint/v1` and SGF recovery for the
two named releases on authored data. The later prerelease corrected package
documentation without changing the SDK runtime, so this is not a rehearsal of
a changed data schema. It does not certify future downgrade compatibility,
arbitrary user records, IndexedDB conversion, lockfile/deployment replacement,
host backups, disk durability or a registry tag mutation. No user installation,
host application, live site or npm tag changed. Repeat the drill for the exact
selected releases and run the consuming host's own recovery checks before a real
host rollback.
