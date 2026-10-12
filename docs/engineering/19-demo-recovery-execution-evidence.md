# Public Demo Recovery Execution Evidence

Status: actual retained-artifact Pages recovery passed on October 12, 2026.
This does not certify npm channel rollback, consuming-host deployments, database
recovery, physical devices or an operational response SLA.

## Implemented Boundary

Commits `ea3aa2c` and `1173a1a` added the private candidate/archive inspection tool
and optional recovery inputs to the existing manual Pages workflow. The tool
requires the reviewed original public main run, successful build/deploy and
static-build step, immutable artifact ID, provider ZIP digest and unexpired
retention. Tar verification independently checks the approved SHA256 without
extracting or executing it. Failed metadata, corrupt/extra/linked files and
partial selections stop before live deployment. Recovery does not install or
rebuild old source. Only the existing Pages deployment job has write authority.

Focused local regressions passed 7 tests / 134 assertions, plus types, lint,
format, documentation, file/permission signals and source boundaries.
[Main CI 38244006188](https://github.com/0disoft/banora/actions/runs/38244006188)
passed 223 tests / 3,128 assertions, installed SDK/classic consumers and 297
installed CLI checks. Mixed SDK changes retain their broader browser routing;
this private release-tool change did not repeat unrelated browser suites.

## Original Artifact and New Deployment

Original [Pages run 38204372917](https://github.com/0disoft/banora/actions/runs/38204372917)
successfully built and deployed source
`9c35e23cd153701932cf2df934f1baffbf878a15`.
Its immutable `github-pages` artifact ID is `11726298470`, provider ZIP digest
`sha256:c761517366d7a9e905b2d000eeb821bb349e9fc60564745ecd62690ba8ed763b`.
The actual downloaded original tar is 942,080 bytes with SHA256
`afb710eb48030294ed66c146385e1fbfb14282463e15383406e97261a7a6b6f2`.
Live metadata and the inspection commands verified those exact bindings before
recovery. The original provider retention expires on October 13; its local copy
was preserved independently of the new upload.

New [deployment 38244096173](https://github.com/0disoft/banora/actions/runs/38244096173)
built source `1173a1a1645c54e99e4744b6311a0f0e716f8a56` and successfully deployed.
The live `banora-build.json` returned that exact commit/run ID. Its original
artifact `11744417351` has provider digest
`sha256:00f34176eee04bae97890f2ec05f5519c910ef3e601ddbbd41eed31b94ddf055`
and retention through October 26. Runtime implementation was unchanged; the new
public receipt made deployment identity observable.

## Actual Recovery and Live Health

[Recovery run 38244314862](https://github.com/0disoft/banora/actions/runs/38244314862)
used the five independently reviewed original bindings above. Candidate metadata
and tar inspection passed; setup, static build and new receipt generation were
skipped. It reuploaded the unchanged original tar and successfully deployed it.
The recovery upload ID is `11743649296`, provider ZIP digest
`sha256:cb709045657ba668b9f1bad95ca4a18e9cdaf685b2267bb60819dac19db85273`,
retained through October 26. A ZIP can differ while containing the same original
tar; an independent download of the recovery artifact matched the original tar
length and SHA256 exactly.

GitHub deployment metadata describes the current recovery workflow checkout,
`1173a1a`, not the source of the restored static bytes, `9c35e23`. Do not use that
metadata SHA as a substitute for artifact-content verification.
Credential-free live HTTPS checks compared every original file with its exact
tar entry: 46 files, including 14 HTML pages and their assets, all returned 200
and matching SHA256. The new build receipt returned 404 after recovery, as the
selected original tar predates it. Original local bytes remained unchanged.

Actual Chrome on the restored public Studio imported an authored two-move SGF,
replayed both moves, edited the position comment and downloaded the real export.
The export retained `XG[retained marker]`, both moves and the authored comment.
A fresh browser session reopened that downloaded file and verified Move 2,
the comment and rendered SVG. Its console reported zero errors/warnings.
The isolated browser sessions were closed; no user browser profile or authored
record was overwritten. The live site remains on the restored original bytes.

## Remaining Recovery Limits

This is one real demo deployment transition, not a different SDK runtime version
or an exercised npm-channel rollback. No npm package, version or tag was changed.
The workflow's deploy action waits for provider completion; live hash checks and
the consumer flow were executed separately and are not an automatic health job.
Retention can expire or be deleted. The tool deliberately selects original builds,
not recursively recovered runs; retaining a recovery upload does not extend the
original candidate's eligibility. Keep original candidates and an independent
reviewed copy, and do not rebuild or substitute a different archive silently.
Off-device retention, consuming-host state and notification/device certification
remain separate. See the [recovery procedure](../ops/rollback.md).
