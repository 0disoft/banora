# Host-Controlled Board Consumers

These four pages render the same host-owned plain board data through Vanilla
TypeScript, React 19, Vue 3 and Svelte 5. They use `mountControlledBoard` or the
native `ControlledBoard` component; none creates a `RecordController`.

From the repository, run `bun install` and `bun run dev`, then open
[the Vanilla consumer](http://127.0.0.1:4317/controlled/index.html). Links on the
page open each framework's independently mounted consumer. These are workspace
examples, not independently installed starter projects. See the
[public integration contract](../../docs/sdk/controlled-board.md) for package imports.

## Ownership and Decisions

`host.ts` is a transport-free host simulator. Its stable `getState`/`subscribe`
interface works with ordinary DOM subscribers, React `useSyncExternalStore`, Vue
refs and Svelte effects. Pending intentions remain separate from the board snapshot.
Clicking a point does not put a stone on the board: **Approve intention** checks
the supplied state key and replaces the host snapshot. **Reject intention** keeps
the position unchanged. **Replace snapshot** demonstrates a stale intention that
the host must reject. Switching callbacks and unmounting/remounting retain the
host's state independently of the view.

The simulator checks occupied points only. It does not implement captures, ko,
suicide or any other Go legality rule. Real applications replace its decisions
with their existing rules engine/server. They own authorization, identity/revision
comparison, asynchronous cancellation, error reporting, retries and subscriptions.
Banora imposes no RPC, network, native bridge, store package or serialization format.
Convert incoming state to the documented `BoardSnapshot` display DTO and forward
`BoardIntent` to your host. Only apply a reply if it still belongs to the active
document/revision/request; never treat an opaque state key as authorization.

View bindings are borrowed for SVG/PNG export. Vanilla disposes its own view;
framework components own their mounted view and return null on cleanup. The host
simulator remains alive across component unmounts. No external application is
modified or integrated by these examples.

## Verification

After `bun run build:examples`, run
`bun scripts/browser-smoke.ts --controlled-only`. The production-browser fixture
checks all four consumers: pending/approved/rejected/stale input, callback and
read-only updates, retained host state across remount, actual SVG/PNG downloads
and mobile touch confirmation/replacement/cleanup. React enables Strict Mode and
Vue uses an ordinary ref. Common SDK checks also cover masks, overlays, logical
transforms, keyboard/ink/menu input and atomic update rejection.

`bun run smoke:adapters` separately verifies independently installed artifact
types, SDK peer/subpath imports and actual server host rendering. Browser checks
use Chrome on Windows plus mobile emulation; real devices/native bridges,
hydration, other browser engines and actual server transports remain untested.
