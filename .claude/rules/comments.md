# Comments

Applies to everything in the repo — code, config, workflows.

- **No unnecessary comments.** Do not comment where the code is self-explanatory; never restate what the code already says.
- **Document only** non-obvious behavior, constraints, formats, and edge cases.
- **Rationale goes in prose, not source.** Why a job exists, how a subsystem fits together: that belongs in the README or the PR. Exception: a config entry that would look like a mistake without its reason (a pinned version, a trust or lint exclusion) keeps a short reason next to it.
- **Never remove pre-existing comments** when editing code. The bar above applies to comments you write, not comments already there. When the code a comment describes changes, update the comment; when that code is deleted, delete the comment with it.
- **Never talk to the reviewer.** No comments about where a change came from, what was changed, or why the change is correct — that belongs in the PR description and is noise the moment it merges. A banner a skill requires (the AI-owned banner on story mocks and `tests/e2e/drivers/`) tells maintainers how the file is made; keep it.
- **Less is more.** When writing something intended for human consumption, (comment, commit message, reply to prompt) use as few words as possible. Pick every word meticulously to reduce the volume to a strict minimum. Be down to the point. Less is more.

Language rules build on this one: [`go-comments`](go-comments.md), [`py-comments`](py-comments.md).
