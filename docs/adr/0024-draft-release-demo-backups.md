# ADR 0024: Draft Release Copies of Original Demo Artifacts

Status: Accepted

## Context

Actions artifacts expire. A successful demo deployment and its current 14-day
receipt do not establish recovery after that retention window. The existing
maintainer account and GitHub repository already own the demo deployment.

## Decision

Keep the exact original `artifact.tar` and a bounded `banora.demo-backup/v1`
manifest as two assets of a maintainer-only GitHub Draft Release. The draft uses
`demo-backup-RUN_ID`, its original full source commit, `prerelease: true` and
`make_latest: false`. It is never published or promoted as an SDK release.
Require the original tar's embedded `banora-build.json` to match that source/run.
Older originals without that receipt retain their existing Actions recovery path;
do not modify their bytes or invent an embedded identity to archive them.

`scripts/demo-backup.ts plan` verifies the tar and produces the independently
reviewable manifest hash offline. `capture` remains a preview unless `--execute`
is supplied in the archive job of the matching public-main manual workflow.
Archive and draft-fetch jobs receive repository Contents write permission;
GitHub requires push access for maintainer-only drafts even when fetching them;
see the [release API access rules](https://docs.github.com/en/rest/releases/releases#list-releases).
The archive job runs after a successful normal deployment and live file-health check, downloads
the exact built artifact ID and refuses existing draft tags or an incomplete
release listing. Capture never deletes, replaces, publishes or retries assets.
An uncertain upload stops and retains the created release ID for inspection.

`restore` uses the reviewed release ID and manifest SHA-256. It reads only
release metadata/assets from `0disoft/banora` on `github.com`; it never requests
the original Actions run or artifact. Require a draft, the matching tag/source,
exactly two uploaded assets, matching provider digests and bounded sizes. Verify
downloaded manifest/tar hashes independently, parse regular tar entries without
filesystem extraction, and check embedded identity. Recheck metadata before and
after isolated exclusive staging. Restoring a verified tar neither rebuilds nor
executes old source, installs dependencies, alters channels or migrates user data.

The existing Pages deployment job publishes the restored bytes. Its independent
read-only health job checks all live files against those original bytes. Conflicting
legacy and draft recovery inputs fail before any deployment. The parsed workflow
permission binding covers the new job and branches as a deliberately reviewed unit.

## Consequences and Limits

Draft assets have a separate lifecycle from expiring Actions artifacts. They
remain editable/deletable by maintainers and are not an immutable vault or a
second-provider disaster backup. Provider/account loss, revoked access or owner
deletion still requires maintainer recovery and an independently retained copy.
Preserve the approved manifest hash outside the mutable draft when relying on it.
Bounded checks cannot establish a storage SLA or claim an observed expiration.

No recurring cron or duplicate recovery backup is added. Capture failure can
fail the workflow after the site is already deployed; inspect the failed phase
and draft before a deliberate fresh build. Retained local copies are not deleted.
This decision changes private operations tooling only, without SDK API, package
version, DB, browser storage schema, dependency or repository hygiene changes.

Alternatives: relying only on longer Actions retention still leaves an expiry;
publishing public backup releases pollutes SDK release discovery; a new storage
provider adds account/secrets/cost obligations without an existing approved host.
