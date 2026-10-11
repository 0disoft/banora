# CI

Status: workflow and local parity configured; hosted Linux default-main execution passed at
`fed716a` in [CI run 38164778251](https://github.com/0disoft/banora/actions/runs/38164778251).
Branch-protection settings and dependency-update PR execution remain separate
evidence requirements.

Subsequent scoped [CI run 38173018558](https://github.com/0disoft/banora/actions/runs/38173018558)
passed at ff9edb7 in 35s: root check with 203 tests/2,831 assertions, 297 installed
CLI checks and 357-file permission signals. The release-only route correctly
skipped browser installation/full browser, additional installed adapters/starter
and dependency audit. Complete current-name browser/installed-consumer evidence
remains at ec13a69; the separate manual candidate route runs all nine release gates.

Actual successful Bun/GitHub Actions Dependabot jobs were also inspected at
fed716a; their checked versions required no update. See the
[dependency policy](../engineering/06-dependency-and-change-policy.md) for exact
job evidence and its limits. No changed-lockfile update PR or auto-merge is claimed.

The October 12 validated push batch put the current SDK/tooling and grouped monthly
Dependabot configuration on the remote default branch. Its single Ubuntu CI job
passed in 3m46s: frozen setup, 198 tests/2,770 assertions, 297 installed CLI checks,
SDK/classic and native adapter types/SSR, file/dependency signals, complete Chrome
155 browser smoke and the independently installed starter browser flow. The
monthly-only step correctly skipped the push event; the ordinary code route
executed both security commands. The default-main Dependabot blob was separately
checked against local source, but no successful bot update is inferred from it.
See [execution evidence](../engineering/16-product-flow-audit.md).

## One Job, Affected Checks

`.github/workflows/ci.yml` runs one Ubuntu job on pull requests, main pushes and
manual dispatch. Superseded runs for the same PR/ref are cancelled. Branch pushes
outside main do not duplicate PR runs. Timeout is 15 minutes; there is no broad
OS/runtime matrix and no engine/model download or service credentials.

Tools follow Bun 1.x and Node 24 from the declared tool policy. Setup installs the
reviewed lockfile. Cache only Bun's package download directory, keyed by OS, Bun
major and lockfile hash; never cache workspace `node_modules` or build output.
Actual tool/dependency versions appear in setup/doctor output.

`scripts/ci.ts` compares verified commit IDs using Git's NUL-separated path output.
Deleted/renamed paths remain visible; unknown or unavailable comparisons select
full checks. The public local routes are:

```sh
bun run ci:plan --base HEAD~1 --head HEAD
bun run ci:run --base HEAD~1 --head HEAD --dry-run
bun run ci:run --base HEAD~1 --head HEAD
```

Run parity against the matching clean worktree. The planner prints its paths,
decision and real commands; the runner executes them serially and stops on the
first failed command, preserving its nonzero status.

| Change                                                                                            | Evidence                                                                                |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Only Markdown/Mermaid                                                                             | Format, docs and file/permission security signals; no builds/browser.                   |
| SDK/CLI code or tests                                                                             | `check` plus file/permission signals; check includes installed SDK/CLI.                 |
| Known optional analysis/puzzle/playback/locale/scoring/share/texture/animation/menu/recovery code | Relevant focused browser scopes, built once; combined changes keep all relevant scopes. |
| Shared/unknown SDK, browser or toolchain code                                                     | Full production browser suite instead of guessing a smaller impact.                     |
| Framework adapter                                                                                 | Installed adapter consumers plus browser consumers.                                     |
| Standalone editor                                                                                 | Independently installed starter and its own browser flow.                               |
| Manifests/lockfile                                                                                | All installed consumers, full browser suite and dependency audit.                       |

The monthly scheduled run performs only file/permission signals and dependency
audit. It does not rerun unchanged browser/build checks. Browser installation is
conditional and uses the same Playwright CLI as local scenarios.

## Manual Release Candidates

The [prepare-release workflow](../../.github/workflows/prepare-release.yml) is a
separate, manual-only one-job route for retained candidates. It is not triggered
by pushes, PRs or schedules, accepts no source/path inputs and only permits this
repository's main ref. It runs the complete nine-gate preparation, then uploads
the verified commit's release directory with a unique name and 14-day retention.
It retains exact reviewed tarballs/examples without registry publication or OIDC
authority. See [release](release.md) for receipts, retrieval and approval limits.

Changes only to this orchestration, release helpers or their tests select root
check and file/permission signals in ordinary CI, without rebuilding unchanged
browser consumers. Mixed SDK/manifest changes still select their broader gates;
other workflow changes still use the complete route. The explicit candidate run
executes all consumer/browser/security gates regardless of ordinary CI selection.

## Permissions and Failures

Workflow token permissions are explicitly `contents: read`; checkout does not
persist credentials. No `pull_request_target`, write token, publish/deploy step,
production environment or secret is available. `security:files` rejects high-signal
credential/private-file patterns and dangerous workflow permission/trigger changes;
new secret injection also requires an intentional policy review.
it prints only paths/reasons. This is a limited signal gate, not a complete secret
or vulnerability scan. `security:deps` uses the registry audit and fails on high/
critical advisories or unavailable service. Review other security risks separately.

Repository maintainers investigate failed checks and keep the affected command's
output as evidence. Missing/unconfigured checks are not passing checks. Add CI as
a required status only after its hosted execution has been observed; the workflow
does not itself configure branch protection. Never merge because a check was
skipped unexpectedly. Publication/hosting uses a separately reviewed release flow.

The monthly grouped [dependency update policy](../engineering/06-dependency-and-change-policy.md)
limits bot PR count and keeps major promotion intentional. See [VALIDATION.md](../../VALIDATION.md)
for exact local coverage and [readiness evidence](../engineering/12-readiness-review.md)
for executed results and remaining work.
