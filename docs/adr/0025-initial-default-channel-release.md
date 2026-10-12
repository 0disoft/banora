# ADR 0025: Initial Default-Channel Release

- Status: Accepted; source preparation selected, publication requires executed evidence
- Date: 2026-10-13
- Technical owner: 0disoft (primary maintainer)
- Contract owners: [Compatibility](../sdk/compatibility.md), [release](../ops/release.md), [roadmap](../product/01-roadmap.md)

## Context

The five development packages are published with actual registry and installed
consumer health. Their corrected READMEs require explicit `@dev` selection,
while ordinary npm installation and package pages still select `dev.0` and its
obsolete unpublished instructions. The SDK's declared M1-M4 implementation,
public artifacts, framework consumers and portable-data recovery have execution
evidence. The maintainer delegated implementation and release decisions.

## Decision

Prepare the first non-prerelease family as `0.1.0` and publish the exact reviewed
SDK/CLI/React/Vue/Svelte archives through the existing protected OIDC workflow
using `latest`. Advance the five source versions together. Ordinary installation
instructions select unqualified package names; consumers may retain exact versions
and lockfiles. Preserve development tags, previous versions and retained receipts.
No separate dist-tag mutation, package deletion or republishing is required.

The 0.1 line is an initial public SDK release within the executed compatibility
matrix. It does not establish a 1.0 API commitment, support SLA, physical-device
certification or CommonJS support. Compatible fixes and additions use 0.1 patch
releases; intentionally incompatible consumer/API changes use a new 0.x minor,
with migration notes and fresh consumer evidence. Data-schema versions remain
independent: never reinterpret or delete unknown saved records during an update.

Adapters and CLI must not advertise compatibility with every untested 0.x SDK
minor. Set their SDK peer range to `>=0.1.0-dev.0 <0.2.0`, preserving tested
development consumers and following compatible 0.1 stable patches. React 19,
Vue 3, Svelte 5, Node 24 and build-tool major policies remain unchanged. Reassess
SDK peer bounds deliberately for a later breaking minor.

Source selection is not publication evidence. A clean committed candidate must
pass the existing nine gates, and its immutable artifact/source/manifest must be
reviewed before protected execution. Independently download and install all five
registry packages after publication, verify `latest`, and check default package
README/onboarding before calling this release available. Stop on uncertain or
partial publication and preserve progress; never upload the same version again
without confirmed existing-version/hash checks.

## Alternatives

Keeping `@dev` as the only usable installation leaves normal npm discovery broken.
Moving `latest` to another prerelease retains that ambiguity and conflicts with
the publisher's prerelease-channel guard. A 1.0 version would overstate the API
commitment. Broad `<1` SDK peers would silently accept a future incompatible 0.x
minor. A new publisher or authentication scheme is unnecessary because all five
existing OIDC connections have actually published the reviewed family.

## Consequences

Default installation becomes usable after verified publication. Existing
lockfiles and installed hosts do not update automatically. Hosts continue to own
authorization, deployment, storage and recovery. A rollback drill must bind the
exact selected previous family and data contract; an initial release does not
prove live channel or arbitrary host rollback.
