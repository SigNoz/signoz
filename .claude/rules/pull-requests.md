# Pull requests

- **Follow the template** (`.github/pull_request_template.md`): fill in its headings (Description / Issues closed by this PR / Screenshots / Additional Information). Don't add sections the template doesn't have.
- **Keep only the headings that apply.** Delete every heading that has nothing under it, along with its `<!--...-->` placeholder comment. The body must never contain an empty heading — if only Description applies, the body has exactly that one heading.
- **Keep the description concise and human-readable.** A few non repetitive bullets saying what changed and why, for a reviewer skimming it — not a wall of text, not a restatement of the diff, not generated boilerplate and not the user agent conversation details.
- **Reference issues with `Closes #issue-number`** under "Issues closed by this PR" so they auto-close on merge. This goes in the PR description only — never in commit messages.
- **Breaking changes can be added in additional information section** if any.
- **AI assistance in commits may optionally be disclosed with an `Assisted-by:` trailer** naming the model (e.g. `Assisted-by: Claude Opus 4.5`) — do NOT use a `Co-authored-by:` trailer for this.
- **Keep the commit body short and human readable** focused on decision made if any. Commit body must not re-iterate the changes done, skip if title is sufficient in conveying the change.
- **Use convensional commit format** for commits and PR title.
- **Do not amend the commits once pushed.** Always create a new commit once changes are pushed to remote.
- **Review fixes are new commits too.** A force push hides what changed from human reviewers and makes Greptile post its findings again. Bring in `main` with a merge; only a stacked branch (`gh stack`) rebases, since the stack moves as a unit.
- **Answer every review thread.** Reply with the commit that fixes it (`Fixed in 4df6f3198d: <what changed>`) or the reason it stays, then resolve. Never resolve a thread with neither: Greptile withdraws a finding, and remembers it, only when told why.
