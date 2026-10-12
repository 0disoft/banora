# Initial Default-Channel Release Evidence

Status: all five `0.1.0` packages published and independently checked; default
installation/READMEs and retained public release recovery executed.

## Selected Release

[ADR 0025](../adr/0025-initial-default-channel-release.md) selects the initial 0.1
family and default npm channel without extending the executed support matrix.
SDK, CLI, React, Vue and Svelte source versions advanced together. SDK peers now
accept `>=0.1.0-dev.0 <0.2.0`; framework/tool major ranges and resolved dependencies
remain unchanged. A source/lockfile check rejects incompatible future minors and
workspace metadata drift. Bun 1.4.2's lockfile-only install retained the old peer
text, so those workspace fields were synchronized with their source manifests;
frozen setup and both Windows/hosted checks then passed.

The intentional source is `8ce352615329c2b773e36ec281d4e2c732a2d408`, tree
`cd17ebb1206f2ca2e26398eddfe97b31795afe26`. Windows root validation passed 245 tests/
3,528 assertions and 298 installed CLI checks. [Main CI 38277712529](https://github.com/0disoft/banora/actions/runs/38277712529)
passed the existing full affected scope. No SDK runtime or saved-data schema
changed; all 98 retained browser-SDK files are byte-identical to the prior
documentation prerelease.

## Preparation and Actual Publication

[Preparation 38277714049](https://github.com/0disoft/banora/actions/runs/38277714049)
passed all nine gates in 3m55s on hosted Ubuntu. Its prepared manifest contains
149 payload files, Bun 1.4.3/Node 24.21.0 and SHA256
`afe2c00d0b4d15394ac0b14d7ff762252d521aa77acd111bd3b38cd3a74f66ad`.
Artifact `11759448687`, named
`banora-candidate-8ce352615329c2b773e36ec281d4e2c732a2d408-38277714049-1`, has
provider archive digest
`sha256:92b573f020475cd2d7664c25b621c289246e72b37de41ce1c98210331291af33`.
Downloaded contents were independently verified and previewed for `latest`.
The archive digest and manifest hash are distinct identities.

[Publication/health 38278289086](https://github.com/0disoft/banora/actions/runs/38278289086)
passed on its first attempt. The existing main-only required-reviewer environment
was approved under the owner's delegation after review of the successful gates,
source, artifact and hash. Protections, trusted-publisher connections and workflow
permissions were retained. Publication took 7m24s; its receipt records all five
`0.1.0` packages as newly `published`, not retried uploads. The separate 37-second
read-only health job downloaded fresh registry tarballs, verified exact SHA256/
SHA512 bytes, and passed installed SDK/CLI/React/Vue/Svelte consumers and final
`latest` checks.

| Package                  | Reviewed/published archive SHA256                                  |
| ------------------------ | ------------------------------------------------------------------ |
| `@0disoft/banora`        | `56271cd4ae403693e4b9f681cae128bbf4ea67cef172bb0e9d5b8887aa89cd61` |
| `@0disoft/banora-cli`    | `6664aa477d54c9ea5eafc8b64b9d8aa9b4e9106d6b72f2bf85e42c27c7dd29e4` |
| `@0disoft/banora-react`  | `3de36514ce7a989b758a9eae2c559334a1825a5e4db9b2f8501fd1d7e916d84c` |
| `@0disoft/banora-vue`    | `41bd48e8f4cdc78b8a01e9ccb0b38ef628da3986f3ec87220bdae396256cb1b8` |
| `@0disoft/banora-svelte` | `2c12e036f72b42748395f3eeebf850eace027165ea987e0cac4563808e2d210b` |

Publication artifact `11760317964` and health artifact `11760402073` were downloaded
and inspected separately. Their original JSON receipt SHA256 values are
`7f6dfc59f23cd837531cf07adb5e5377cc9f29f092d4e5a4b33d6227c48d9459`
and `b781e40fcfb56f1adcad76b68bf68d5e09fc9996adee471453a7850fe4f3fae6`.
Earlier prerelease artifacts and failed receipts remain preserved.

## Default Onboarding

At `2026-10-12T16:42:50.159Z` (October 13 in Korea), public unversioned npm metadata
selected `0.1.0` for all five names. Every `latest` was `0.1.0`, every `dev` stayed
`0.1.0-dev.1`, and default README text exactly matched the reviewed package README
after newline/outer-whitespace normalization. The exclusive local receipt is
`.artifacts/initial-default-readme-health.json`, SHA256
`dbcd0406e8a98f2f4063912300a17d11986a3cb8ad752fa1dd77ab949f05a098`.
This checks npm's default README data, not a screenshot of its cached website UI.

A separate Windows consumer then ran actual unqualified `npm install` of all five
public names with scripts disabled and isolated empty npm configuration. Installed
identities all matched `0.1.0`. Node 24.14.0 executed headless legal play and the
installed CLI's discovered `create-study` recipe, producing the expected two moves,
dirty record and checkpoint. This uses registry selection, not local tarball or
workspace aliases. Receipt `.artifacts/initial-default-install-health.json` was
recorded at `2026-10-12T16:45:20.041Z`, SHA256
`8780e4db204ff49e5af419a9296c317bb4b5ac74bbdf95cf54d79c3823199e6d`.
Independent native framework/type/SSR behavior belongs to the fresh health checks
above, not this combined-install metadata/SDK/CLI check.

## Public Retention and Recovery

[GitHub Release v0.1.0](https://github.com/0disoft/banora/releases/tag/v0.1.0)
(`410821105`) is public and non-prerelease. Its actual tag resolves to the reviewed
source above. Asset `634371396` is the complete prepared
`banora-0.1.0-prepared.tar.gz`, 629,676 bytes, SHA256
`9135627c742fbceddd9839974d551b72c445a8a9e90f9e0390b30898336e2de9`.
Asset `634371397` is the original 25,533-byte manifest with the prepared hash above.

The locally created archive was first extracted into an exclusive directory and
all 149 payload files reverified. Both actual published assets were subsequently
downloaded, checked against the independently retained hashes, and the downloaded
archive extracted and fully verified again. This executes release-asset recovery,
not just inspection of provider metadata. The complete bundle includes packages,
browser SDK, production examples and original manifest. It can be verified even
after the original Actions artifact expires; no actual expiry/account-loss drill
was performed. Public release assets remain maintainer-editable/deletable and
same-provider storage; preserve an independent reviewed local copy.

## Limits

No live site or consuming host was upgraded by this package release. Existing
lockfiles/data do not change automatically. No dist-tag-only rollback, unknown
future schema conversion, provider/account recovery or disk-durability claim
follows. The executed matrix and owner-waived physical-device/screen-reader
checks remain unchanged. Initial 0.x availability is not a 1.0 API commitment
or a support SLA. Current-source release/docs/compatibility and readiness contracts
must describe this executed result while preserving earlier historical records.
