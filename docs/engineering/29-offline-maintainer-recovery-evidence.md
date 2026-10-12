# Offline Maintainer Source and Artifact Recovery

Status: actual source/tag recovery and prepared SDK execution passed on Windows
at clean source `8595f55f1d07cac1e2fd47297cfddadad17a09e9`.

## Source Capture and Actual Restore

The [maintainer procedure](../ops/maintainer-recovery.md) names `0disoft` as the solo
maintainer and provides discoverable private `release source-backup` and
`release source-recovery-check` commands. They change no SDK API, package version,
saved-data schema, provider setting or active checkout.

The first actual backup/restore passed with five locally available refs. A
supplementary check then found that public `v0.1.0` was absent locally: creating
the public release had not fetched its tag into this checkout. That backup was
not evidence of preserving the public release tag. Both its original files and
receipt remain retained; no manifest was rewritten to hide the missing ref.

A read-only GitHub tag lookup established `v0.1.0` as commit
`8ce352615329c2b773e36ec281d4e2c732a2d408`. The exact tag was fetched without forcing
or changing the provider. A new full backup then captured six refs, including
that tag. Independent file hashing and Git HEAD/tree reads matched the reviewed
manifest before the second recovery command ran.

| Identity                | Actual value                                                       |
| ----------------------- | ------------------------------------------------------------------ |
| Source commit           | `8595f55f1d07cac1e2fd47297cfddadad17a09e9`                         |
| Source tree             | `5cab1ba75532259deab527a9c05884571545ee4e`                         |
| Bundle bytes            | 1,532,637                                                          |
| Bundle SHA256           | `c980b9faca30fed9fe696f020834c24ffbe1cf929de185bf794f4b29f7357629` |
| Manifest SHA256         | `358593a066303dbb556f152aa4a69ded890f8e488cee6f41681574cbcd60d7e4` |
| Six-ref summary SHA256  | `43d219db42ac45050cb612e57bfcd0bf42bf0bed6ac91811bae8f526a80109ca` |
| Recovery receipt SHA256 | `93d4917f39a20ea7fc2f4b16b476f80fa97f62cfd86a39d8bdfa0653fb5e9f30` |

The complete receipt was produced at `2026-10-12T17:34:44.073Z` and retained as
`.artifacts/restores/source-0rLnrR/source-recovery.json`. Actual local mirror clone,
full strict object check, bundle verification, exact refs/tree, clean detached
checkout and original preservation passed: six stages, 438 tracked files.
The recovered checkout separately resolves `v0.1.0` to the expected published
source. Recovery uses isolated Git config/hooks, local file protocols only and
no remote lazy fetching. Provider reads/tag fetch occurred before this offline
rehearsal; no provider was disabled or account recovery simulated.

## Use Recovered Source to Recover the Published Artifact

From that recovered checkout, the recovered `release restore` implementation
restaged the independently retained initial `0.1.0` bundle into another exclusive
directory. All 149 files passed original/destination integrity checks. The source
tag and prepared manifest both select `8ce3526`; original manifest SHA256 remains
`afe2c00d0b4d15394ac0b14d7ff762252d521aa77acd111bd3b38cd3a74f66ad`.
No dependencies were installed, provider request made or build performed for this
restaging. Existing prepared packages were not repacked.

Node 24.14.0 then imported the exact restored browser-SDK controller headlessly,
executed legal play, restored an exact dirty checkpoint, exported/reopened SGF
with authored multilingual text/unknown properties and undid a new edit.
The probe explicitly rejects fetch and runs on local files. Its actual receipt
`.artifacts/offline-prepared-consumer-8595f55.json` was produced at
`2026-10-12T17:36:06.785Z`, SHA256
`41bcbb946210fe06a1fee25a1a23b3a3d6b03106cb25a34d16a67deb006d7edf`.
This is execution of restored browser-SDK modules under Node, not a new native
framework install, full offline dependency bootstrap or live deployment.

## Regression Checks and Limits

Root `check` passed 248 tests/3,575 assertions, public/classic packed consumers and
298 installed CLI checks. After the final root-namespace guard, seven focused
source/CI tests passed 162 assertions; lint/typecheck and file signals passed.
Real authored Git fixtures cover history/tag restoration, unchanged original
configuration, no inherited remote/helper, changed/extra/wrongly reviewed inputs,
dirty source and invalid commands. Private-tool changes select existing root
checks without adding browser, publish permissions or jobs.

The local copy is independent of GitHub availability but resides on the same
Windows device. Off-device storage, private recovery-code retention, actual
credential/account recovery, unknown future formats and disk durability remain
unverified. Provider authentication recovery follows official private procedures;
no passwords, codes, credentials, user records or browser profiles were collected.
