# Banora SDK

- Status: Initial 0.1 SDK/CLI/framework family published on the default npm channel
- Technical owner: 0disoft (primary maintainer)

## Sources of Truth

- [Product specification](../product/02-spec.md): feature requirements and milestone scope.
- [Public API](public-api.md): consumer contract direction and failure/lifecycle behavior.
- [Record recovery](recovery.md): checkpoints, export baselines and host-owned persistence.
- [Local diagnostics](diagnostics.md): explicit safe operation evidence and bounded support reports.
- [Compatibility](compatibility.md): packaging, runtime support and migration policy.
- [ADR 0001](../adr/0001-initial-architecture-boundaries.md): technology and module boundaries.
- [ADR 0003](../adr/0003-studio-first-consumer.md): Studio and the first consumer workflows.
- [ADR 0004](../adr/0004-framework-independent-adapters.md): official React, Vue, and Svelte targets.
- [ADR 0005](../adr/0005-initial-api-record-and-package-contracts.md): initial API, editing/export and package contracts.
- [Validation](../../VALIDATION.md): stable validation names and reporting.

## Consumption Modes

1. Embed a complete viewer in a plain web page.
2. Compose board/rules, records, renderer and controls in an application.
3. Mount an optional React, Vue, or Svelte component bound to the same controller/model.
4. Use the headless core and records in Node.js without browser globals.
5. Attach scoring, puzzles or analysis adapters when their milestones ship.

## Consumer Examples

The [standalone record editor](../../examples/standalone/README.md) is a copyable
plain TypeScript/Vite application with its own manifest, configuration, styles
and original sample. It imports selective public SDK exports and owns file
selection, replacement approval and SGF download. `bun run smoke:starter` installs
the SDK tarball and tools into a separate npm consumer and checks its own strict
types, production build and actual browser editing/download/reopen flow, including
replacement guards and keyboard/emulated touch. Actual registry availability is
recorded in the [release guide](../ops/release.md); physical-device coverage remains separate.

Start with Banora Studio at `examples/studio`: an SGF review/basic editing
application and [public demo](https://0disoft.github.io/banora/studio/), consuming only built public SDK exports. Verify the
load/navigate/create-variation/comment/mark/download/reopen workflow against the
built package. Studio-specific private hooks and internal SDK source imports are
not acceptable consumer validation.

The read-only example at `examples/readonly` and an isolated tarball/headless consumer
are implemented. Browser flows have production-build evidence on Chrome 154.
`examples/viewer` demonstrates the complete viewer, optional editing and ownership
preservation across unmount/remount.
`examples/browser` embeds the same viewer from the built classic global script.
Official examples at `examples/react`, `examples/vue` and `examples/svelte` each
consume their built public package/native components. Isolated tarball consumers
also check dependency isolation, declarations and real SSR. `examples/puzzle`
consumes the common headless session and complete puzzle view, including borrowed
ownership across remount. `examples/analysis` consumes provider-neutral sessions,
the KataGo JSON adapter and isolated PV/ownership view. Its offline data is explicitly
illustrative, while manual mode accepts actual host-pasted engine output; no connection
is automatic. See the [consumer guide](../../examples/analysis/README.md). These
browser workflows prevent the SDK API from becoming editor-specific.

All framework adapters are optional. Plain browser consumers require no framework;
framework consumers share the same state/actions and rendering behavior. Each adapter
handles only host lifecycle, configuration and event/state bindings. Supported peer
versions, component packaging and SSR behavior require framework-specific evidence.

## Release Boundary

Use one common SDK package and three separate optional adapter packages in this
repository. Initial targets are Node 24 LTS, React 19, Vue 3 and Svelte 5; tested
support outside the recorded evidence is pending. The initial `0.1.0` SDK, optional
CLI and three adapters are published; actual peers/artifacts and
tested versions are listed in compatibility. Broader browser floors remain pending.
The [release record](../engineering/27-initial-default-channel-release-evidence.md)
documents fresh registry installation and default npm onboarding. Published packages include type declarations, license files,
asset notices, documented exports and actual consumer validation.
