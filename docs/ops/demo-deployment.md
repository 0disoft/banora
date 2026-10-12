# Demo Deployment

Status: public GitHub source and private vulnerability reporting enabled on
October 12, 2026. GitHub Pages uses Actions; the first deployment still needs
an observed successful run and live verification.

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
The separate `github-pages` deployment job receives only the required Pages/OIDC
write permissions. The whole parsed workflow is bound by the repository's security
policy; no npm publication authority is available in this workflow.

Wait for the actual run to finish. Verify the live Studio and nested consumers,
asset response codes, SVG board and import/navigation/export flow before recording
success. A Pages configuration response alone does not prove a deployed site.
Investigate a failed deployment before retrying. To restore a prior site, rebuild
and explicitly deploy reviewed prior source through a separately reviewed recovery
procedure; this document does not claim an exercised remote rollback.

## npm Environment

The separately configured `npm-release` environment requires approval by `0disoft`,
permits self-review for this solo-maintainer repository and selects only `main`.
It is independent of `github-pages`. Each of the five npm packages still needs its
own trusted publisher matching `0disoft/banora`, `publish.yml`, `npm-release` and
direct publication permission. See [release](release.md) for immutable candidates,
the `dev` channel, fresh registry-consumer checks and partial-upload handling.
