# Observability

- Status: Local SDK diagnostic contract implemented; host monitoring remains host-owned

## Local Evidence

Enable collection explicitly in the consuming application. Use the public
[diagnostic journal](../sdk/diagnostics.md), record closed operation/status/code
values and display returned IDs beside translated actionable failures. Never log
SGF, names/comments/queries, filenames/paths, raw exceptions/stacks, provider IDs,
URL/referrer, user agent or credentials. Banora provides no global interception,
default remote telemetry, hosted dashboard or alert service. In Studio, open Help,
expand Diagnostics and enable collection before reproducing the operation. Inspect
the summary/events/JSON, then explicitly download if needed. Clear or disable after
support; collection and history are not persisted and reset on reload. Delayed work
from a previous consent epoch cannot repopulate cleared data. See the
[exact consumer scope](../sdk/diagnostics.md#studio-consumer); other demos/modules
are not automatically captured. Already downloaded files remain user-owned.

Inspect a report before sending it. Its summaries describe the recent bounded
window, not lifetime traffic, a benchmark or service SLO. Evicted count means older
evidence is missing. Clear when disabling collection or completing support; delete
downloaded reports separately. Reports still reveal feature usage/timing.

## Reproduce and Escalate

For terminal reproduction, inspect the canonical request privately, then run
`banora diagnose --request request.json --output diagnostics.json` (or the built
local Node executable). This executes once on isolated state and publishes only
safe evidence, including SDK failure reports. No authored output is saved or sent.
Review the report before sharing; its duration covers SDK execution only. Exit 3
identifies SDK failure, 4 publication failure, 2 transport/usage failure. Input aliases
are protected even with `--force`; existing report replacement requires that flag.
See the [terminal contract](../sdk/diagnostics.md#terminal-and-automation-consumer).

1. Record SDK/consumer version, runtime major, operation ID and code. Keep user,
   system and file identifiers out of public tickets.
2. Reproduce using an authored/minimized SGF or request reviewed separately from
   diagnostics. Never attach an original customer's file without explicit approval.
3. Use `bun run doctor` for environment failures, then the narrow fixture named in
   [validation](../../VALIDATION.md). `bun run check` verifies the package baseline;
   `bun run build:examples` followed by a documented focused browser route checks
   UI behavior. Review raw command output for private paths/content before sharing.
4. Use GitHub issue templates for SDK defects. Private security reporting is not
   configured in this checkout; obtain a maintainer-approved private channel before
   disclosing sensitive details, never place them in public tickets. Track this gap
   in the [security baseline](../engineering/04-security-baseline.md).
   The repository maintainer triages SDK defects. The host
   operator owns tenant/auth boundaries, endpoint/secrets, storage retention and
   service incidents; no SDK hosted operations team is implied.

The repository's Issues API was checked on 2026-10-11: Issues is enabled, but the
repository is private. Its feedback/status page currently requires repository
access. Verify a public or otherwise accessible support channel before distributing
an external demo/package; local template updates are not hosted publication evidence.

## Host Monitoring Boundary

Hosts may route reviewed events to their own logs/metrics/traces under consent,
access control, sampling, retention and deletion policies. Scope correlation to a
host request/session; fixed labels avoid per-user/per-record cardinality. Local
operation-N IDs are not global identities or permission to upload records. Define
and rehearse host latency/failure alerts, timeout/rate/retry budgets and incident
ownership before deployment. The journal makes no remote call or retry decision.

## Validation and Limits

`check` covers strict/headless packed consumers and actual SDK failure projection.
Unit fixtures cover bounds, privacy, malformed-input atomicity and immutable
clear/snapshots. Hosted dashboards/alert delivery, long-term retention and physical
device behavior remain unverified. No backend/database/collector is required for
local diagnostics. Broader release/ops readiness remains tracked in the
[active review](../engineering/12-readiness-review.md).
