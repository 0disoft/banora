# Contributing

Banora is an unpublished modular SDK. Keep public code and documentation in English.
See the [development guide](DEVELOPMENT.md) for setup and [product specification](docs/product/02-spec.md)
for scope. No account, engine/model or service credentials are needed to develop
the board, rules, SGF, controller or Studio.

## First Change

1. Install the tool majors in `mise.toml`, then run `bun run setup` (or
   `mise exec -- bun run setup`). Run `bun run doctor` if setup fails.
2. Run `bun run check` to establish a baseline. Start `bun run dev` and open
   Studio, edit the sample record, save SGF and reopen it.
3. Read the owning API/spec/ADR and keep the change cohesive. Consumers import
   public SDK exports; core/headless modules cannot depend on browser/frameworks.
4. Add a regression case for an actual bug or contract boundary. Use the narrowest
   relevant [validation](VALIDATION.md); browser scenarios and packed adapters are
   needed when their behavior changes.
5. Update the owning docs and submit a PR describing behavior, executed checks and
   remaining limitations. Record an ADR when selecting a new architectural policy.

Use `bun run commands` to discover actual commands. Format with `bun run format:write`,
review the diff, then validate with read-only `lint`/`format`/`boundaries` checks.
Files over 40 KB are refactoring candidates; preserve responsibility boundaries
rather than splitting solely to satisfy a number. Test helpers should not duplicate
the implementation they supposedly verify.

## Reporting Problems

Use the repository's [issues](https://github.com/0disoft/banora/issues) and existing
bug/design templates. Include runtime versions, the action that failed, expected
and observed behavior, and a minimal SGF or automation request when safe. Remove
private player names/comments, credentials and unrelated local paths first.
Do not upload private records by default. Ordinary public issues are not a channel
for publishing undisclosed vulnerabilities or secrets.
See the [security policy](SECURITY.md) for security boundaries and reporting limits.

## Updates and Releases

Setup never updates dependency ranges or the lockfile. Supported-major dependency
updates are separate reviewed changes; major promotions need the affected installed
consumers and browser flows. Package publication, credentials, live demo hosting and
branch protection are distinct operations and are not established by a local check.
The original SDK/docs are MIT-licensed; do not copy reference-project code/assets
without checking their actual provenance and terms.
