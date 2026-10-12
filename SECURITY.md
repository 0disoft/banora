# Security Policy

Status: development source policy. Banora is a development SDK/reference consumer,
not a hosted account service. No verified supported registry release, external private
reporting channel, response SLA or bounty is established by this document.

## System and Scope

Cover the shared SDK, CLI, framework adapters, reference consumers and repository
build/release tooling. Maintainers own these implementations. Integrating operators
own their authentication, live-game authority, storage, credentials and deployment.
The SDK can be embedded in public websites; local/private development alone is
not a reason to reduce a reachable finding's impact.

Important assets include authored SGF and unknown properties, selected positions,
checkpoints and export baselines, local drafts, user-selected files, host state,
provider credentials, diagnostic reports and reviewed package artifacts.
Vendored dependencies and generated files are not design-policy authorities;
dependency exposure still matters where it reaches a supported runtime path.

## Threat Model and Trust Boundaries

Treat SGF/JSON/share fragments, checkpoints, image selections, provider responses
and external snapshots as untrusted input. Host callbacks can throw arbitrary
values. UI rendering and error reporting must not turn authored data into script
execution or unnecessary disclosure. A host's read-only board option is not
authorization: external intentions must be checked by that host before mutation.

CLI request/operation JSON is data, not shell/code. Input file reads and explicitly
requested outputs are separate authorities. Discovery and recipes must not execute,
upload, look up arbitrary names as files, or control an existing application.
Analysis transports/processes are explicit and host-owned; the common SDK must
not spawn processes, fetch providers or expose credentials by default.

Repository source, build scripts and explicitly installed executable packages need
maintainer-reviewed provenance. Release manifests are unsigned: matching hashes
detect changed bytes but do not authenticate an unknown author or prove checks ran.
Do not assess unreviewed package execution as if schema validation made it safe.

Actions run/artifact metadata, npm metadata and downloaded tarballs are external
inputs. An offline preview, matching hashes, a workflow digest, policy-file presence
or a simulated provider result does not establish owner approval, package-specific
publication authority or an accessible private reporting route. Verify those
operational requirements separately before publishing.

## Security Invariants

- Validate shape, bounds and semantic coordinates/locators before applying input.
  Reject unknown wire/storage versions without rewriting the original.
- Keep failed imports, edits, batch approval and recovery atomic with respect to
  authored state, baselines, selection and history; stale previews cannot apply.
- Preserve input files and aliases. Publish complete requested outputs exclusively
  unless explicit replacement is supplied; replacement still cannot overwrite input.
- Keep browser rendering inert, share data bounded and resource/object-URL ownership
  explicit. Do not manufacture permission or encryption guarantees for share links.
- Bound retained work/evidence, cancel owned analysis and reject stale results across
  changed contexts, disposal and diagnostic consent epochs.
- Exclude authored text, raw host exceptions/stacks, paths, tokens and arbitrary
  metadata from support diagnostics. Authored export/checkpoint output deliberately
  contains user data and must remain separate from redacted support reports.
- Keep drafts scoped to browser origin and explicit user controls. Unencrypted origin
  storage is not confidential from other authorized origin scripts or shared devices.
- Keep ordinary validation CI read-only and publication authority separate. Do not
  commit credentials or claim signal-only file checks are a complete secret scan.
- Bind publication to the approved main-branch source, reviewed artifact manifest
  and explicit channel. Keep hosted OIDC authority confined to the named protected
  publish job, with verified per-package trusted publishers and a fixed registry.
  Metadata failures, including missing-package responses, do not prove availability
  or authorization. Do not fall back to static credentials.
- Isolate npm user/global configuration and inherited npm configuration variables,
  force the intended working prefix and reject local package configuration that can
  change the publication target. Use regular, repository-owned temporary parents
  and keep credentials and raw provider responses out of receipts.
- For release health checks, accept only bounded canonical HTTPS tarball downloads
  without redirects. Match reviewed lengths, SHA256 and SHA512 before executing
  the downloaded release packages in independent installed-consumer checks.
  This is not a claim that every transitive or development dependency is verified
  by the same procedure.
- Preserve reviewed source artifacts and confirmed publication progress. Stop on
  uncertain upload results without automatic retries or tag changes. Keep registry
  health checks independent and read-only; neither upload confirmation nor installed
  consumer checks prove a consuming application's deployment rollback.

## Findings and Severity

Report actual broken controls with a reachable input/operation, affected component,
impact and reproducible evidence. Consider hostile file/share content, DOM injection,
unexpected filesystem writes, failed-state mutation, meaningful resource exhaustion,
provider/host boundary failures and private-data exposure. Check source and runtime:
a passing test, stated invariant or configured gate alone does not prove safety.

Severity depends on realistic consuming-app exposure, required authority and impact.
Do not dismiss a supported-path failure solely because the SDK has no accounts or
the checkout is private. No broad exclusion, accepted vulnerability or automatic
severity downgrade is introduced by this policy. Unresolved host assumptions must
be stated, not converted into suppression authority.

## Reporting and Current Access

As checked on October 12, 2026, the GitHub repository is private with Issues enabled.
An accessible external private security-report address/channel has not been
established. Do not send exploit details, authored records or credentials to normal
issues. Existing contributors should use an owner-approved private channel; this
document does not invent one or claim that outsiders can reach it.

Before publication, the owner must designate and verify a real private reporting
channel, the primary maintainer, account/artifact recovery and disclosure procedure.
A solo maintainer is valid; record a backup maintainer or escalation contact only
when one actually exists. Do not invent availability, contacts or reporting access. GitHub repository
advisories/private reporting are available for public repositories, as described in
[GitHub's documentation](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/repository-security-advisories).
Do not change repository visibility merely to enable that feature.

Collect only the minimum reproduction and actual affected source/version. Keep
private reports restricted, coordinate remediation and release notes, and do not
publish a report or contact others without the owner's authorization. Current gaps
are release gates, not claims of an operational support service. See
[secrets](docs/ops/secrets.md), [diagnostics](docs/sdk/diagnostics.md),
[release](docs/ops/release.md) and [recovery](docs/ops/data-migrations.md).
