# Demo Deployment

Status: public GitHub source and private vulnerability reporting enabled on
October 12, 2026. GitHub Pages deployment and live browser verification passed
at source `9c35e23`; npm publication remains a separate operation.

## Ownership and Destination

The maintainer owns [0disoft/banora](https://github.com/0disoft/banora) and its
static demo at `https://0disoft.github.io/banora/`. The site opens Studio and also
serves read-only, viewer, framework and other consumer examples. Static hosting
does not run KataGo, store uploaded records or provide a collaboration server.
Browser-origin drafts belong to this demo's origin; localhost drafts are separate.

The owner approved public source, GitHub Pages, GitHub private vulnerability
reporting and package-specific npm OIDC publication. Known credential/path signals
were checked across 1,925 historical Git blobs before changing visibility, with
no matching findings. This bounded check is not a complete secret or security audit.
Private reports use [GitHub reporting](https://github.com/0disoft/banora/security/advisories/new);
ordinary bugs use Issues. Do not submit fictional reports to test the channel.

## Deployment

[pages.yml](../../.github/workflows/pages.yml) is manual-only on public `main`:

```sh
gh workflow run pages.yml --ref main
```

The build job installs the frozen graph, checks file/workflow permission signals,
and builds the SDK, native adapters and production examples. Only `dist/examples`
is uploaded. Relative Vite asset URLs support the `/banora/` project path.
Source files, dependency directories and local credentials are not site artifacts.
New builds add `banora-build.json` with public source commit/run identity and
retain the Pages artifact for 14 days. Optional recovery inputs instead select
an independently reviewed original tar without installing or rebuilding it;
see [the exact recovery procedure](rollback.md#recover-the-public-demo-without-rebuilding).
The separate `github-pages` deployment job receives only the required Pages/OIDC
write permissions. The whole parsed workflow is bound by the repository's security
policy; no npm publication authority is available in this workflow.

Wait for the actual run to finish. Verify the live Studio and nested consumers,
asset response codes, SVG board and import/navigation/export flow before recording
success. A Pages configuration response alone does not prove a deployed site.
The separate read-only `health` job downloads the exact newly deployed artifact
ID, verifies its builder/recovery tar hash and checks all live file bytes. Both
normal deployment and recovery use it; no dependency installation, build, OIDC
or deployment write permission is present in that job. A success or failure JSON
receipt is retained as `banora-demo-health` for 14 days when the checker executes.
If health fails, the site may already be deployed: preserve the receipt and
inspect the previous known-good candidate. No deployment retry or rollback is
automatic. File-byte health does not replace a browser flow or data recovery.
Investigate a failed deployment before retrying. The reviewed manual recovery
path redeploys exact retained original bytes. Actual recovery and live file/Studio
health passed in the [execution record](../engineering/19-demo-recovery-execution-evidence.md);
this does not extend SDK host/data recovery guarantees.

Successful normal deployments also run a separate `archive` job. Its narrowly
reviewed Contents write permission creates a maintainer-only Draft Release with
the exact original tar and bounded manifest. It has no Pages/OIDC/npm write
authority and never publishes or promotes the draft. Recovery skips archive. Its isolated draft-fetch job needs Contents write for
private draft access and performs only release GET requests. Build/health remain
read-only, and draft-fetch has no Pages/OIDC permission. The two draft-recovery inputs select
verified original bytes without requesting the original Actions run/artifact.
See [draft recovery](rollback.md#restore-a-draft-demo-backup-without-original-actions-retention)
and [ADR 0024](../adr/0024-draft-release-demo-backups.md). A failed archive may
leave an already healthy deployed site and an incomplete draft; preserve its
receipt and inspect before another deliberate build. Drafts can be edited/deleted
and do not protect against provider/account loss. Actual normal capture and
older-draft recovery passed with independent 47-file health and exact original
tar hashes in the [draft execution record](../engineering/20-draft-demo-backup-execution-evidence.md).
The live build receipt selects source `8d9c213` / original run `38250495418`;
the recovery workflow checkout is separately recorded as `aa98362`.

The first [deployment run 38204372917](https://github.com/0disoft/banora/actions/runs/38204372917)
completed successfully. Live Chrome verification imported an authored SGF, edited
its comment, navigated both moves, downloaded the actual SGF and reopened it with
the unknown property retained. Twelve additional consumer routes returned HTTP
200 and rendered their SVG boards, without failed site-asset responses or page
errors. These checks cover the deployed project path, not every browser/device.

## npm Environment

The separately configured `npm-release` environment requires approval by `0disoft`,
permits self-review for this solo-maintainer repository and selects only `main`.
It is independent of `github-pages`. All five npm packages have trusted publishers
matching `0disoft/banora`, `publish.yml`, `npm-release` and direct publication
permission. Actual development publication and fresh-registry installed-consumer
checks passed in [run 38212158941](https://github.com/0disoft/banora/actions/runs/38212158941).
See [release](release.md) for immutable candidates,
the `dev` channel, fresh registry-consumer checks and partial-upload handling.
