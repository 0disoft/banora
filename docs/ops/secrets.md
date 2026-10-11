# Secrets and Private Data

Status: local secret boundaries documented; private vulnerability reporting and
publication credentials are not configured by this checkout.

The SDK/local examples require no service token, password or customer credential.
The repository CI uses read-only contents authority, disables persisted checkout
credentials and injects no service secret. A future publishing workflow must scope
its own registry/deployment authority to a reviewed protected release environment;
no token belongs in source, a demo or ordinary pull-request validation.
Integrating operators own external authentication and credential rotation.

`.gitignore` excludes local `.env` files, caches and diagnostic/test output. Ignoring
a filename does not remove an already tracked file or its Git history. `.env.example`
is an allowed public example only, never a storage place for real values. Do not
read/edit a user's `.ssealed`/credential store to bootstrap this SDK. Prefer host
secret storage and runtime injection over a browser build variable or CLI argument.

SGF names/comments/unknown properties, backup filenames and checkpoint working/
baseline SGF are private authored data even without credentials. A checkpoint
retains deleted baseline content. Studio drafts are unencrypted browser-origin
data; shared-device users and site scripts can access that origin. Share links
encode authored data and provide no access control. Tokens must never be placed
in SGF, locators, URLs or metadata. KataGo raw request/response/stderr hooks and
live-test transcripts require review before sharing.

Support diagnostics accept fixed operations/codes and closed environment families.
They exclude raw errors, paths, record text and arbitrary metadata, but usage/timing
may still be sensitive. Inspect and share explicitly, then delete caller-owned
downloaded reports separately. Diagnostics are not backup files.

## Suspected Exposure

1. Stop the affected publication/integration, disable optional transport and preserve
   local work through an approved private export. Do not paste data into public issues.
2. The host credential owner revokes/rotates the exposed credential, audits downstream
   access and replaces runtime injection. Removing a file or closing a browser is not revocation.
3. Identify source/build/log/artifact/history locations privately. Coordinate artifact
   removal/history rewrites with maintainers and preserve restricted evidence.
   Do not automatically delete unrelated user files.
4. Run `bun run security:files` and relevant verification on the corrected checkout;
   use `bun run security:deps` for registry high/critical dependency checks. These
   are bounded signals, not proof that all secrets/vulnerabilities were found.
5. Record sanitized root cause, affected versions and preventive changes. Verify
   actual credential revocation/artifact access, not merely a green source check.

GitHub Issues is enabled but the repository's last verified state is private.
No dedicated private vulnerability channel is established here. Use an existing
maintainer-approved private channel; if none exists, establish one before disclosing
sensitive details or an external release. Never invent an email address, promise
private reporting or use a public bug template for exploit details.
