---
name: sbshot-visual-diff
description: Shoot Storybook stories with sbshot at two git refs and produce a diff a reviewer can read. Use when asked for a visual diff, before/after screenshots, a screenshot comparison for a PR, or to prove a change did not alter screens it should not have.
---

# sbshot visual diffs

`npx -y github:SigNoz/sbshot` (the tool from #12971) shoots Storybook stories and
pixel-diffs two runs. Use it. Do not hand-roll a Playwright screenshot loop or a
canvas pixel-compare: sbshot already handles story selection, themes, settling,
retries, diffing, tagging, a viewer and a static export, and its runs are the
format the rest of the team can open.

sbshot is not installed by any package. It is run through `npx` from GitHub, so
nothing it knows travels into this repo on its own. This file is where that
knowledge lives.

## The shape of a run

```
capture <storybook> --name-run <ref>     # once per git ref
diff <baseline> <after>                  # pairs them by relative path
tag <diff> <tag> <story-id>...           # what the reviewer should look at
export <diff> --out <dir>                # a static site, hostable
```

`<storybook>` is a running dev server (`http://localhost:6006`), a build
directory holding `index.json`, or a project directory with `.storybook/`. The
frontend has **no `build-storybook` script**, only `storybook dev -p 6006`, so
point `capture` at a dev server.

## Rules that are not optional

**One freshly started Storybook per ref.** Never start one server and switch git
branches under it. Vite's HMR reloads the page but some modules do not
re-initialise, and the shot differs silently from a clean boot. This has already
produced a diff where the JSON viewer had lost its syntax highlighting on one
side, which read as a real colour change and was not. Settle time was not the
variable: 300 ms and 2500 ms were pixel-identical. Use one worktree and one port
per ref, and stop each server before the next.

**Capture both themes: `--theme dark,light`.** Without it sbshot shoots the
story's own default, everything lands in a single `default/` folder, and every
light-mode regression is invisible. The #12976 review raised four separate
light-mode defects (washed-out screens, text that disappears, an antd textarea
whose background does not match the other inputs); a dark-only diff could not
have surfaced one of them. Themes double the shot count, so scope with
`--stories` or `--title`, never by dropping a theme.

**Baseline is the merge-base, not `origin/main`.** `git merge-base origin/main
<branch>`. Against a moved main, every commit main gained since the branch's base
shows up reversed, as though the branch reverted it.

**Give the diff a noise floor.** Shoot the same tree twice, diff those two runs,
and pass the result as `--noise <diff>`. Pairs that moved there are marked flaky
in the real diff and the viewer's "hide flaky" box removes them. Without it, a
focus ring that rendered in one shot and a scrollbar that appeared in the other
sit in the reviewer's list looking like findings. `--fail-over <px>` then exits
non-zero only on a pair that is not flaky, which is what CI should gate on.

**An unexplained pair is a capture bug until proven otherwise.** Open it and
compare the two sides before calling it noise. Pixel count and a plausible story
("cursor", "toast", "a race") are not evidence; a crop of both sides is. Getting
this wrong twice on the same pair is how a real regression gets waved through.

**Pixel share ranks, it does not judge.** A modal that dims the page scores 37%
for a two-line change while a whole new form section scores 5%. Open the shots
and say what changed per screen. The largest mover is usually the least
informative.

## Making it readable for a reviewer

A reviewer cannot open `localhost`, so `sbshot ui` is for you, not for them.

1. `tag` the pairs that matter, with `--note` saying why. The viewer filters by
   tag, so the reviewer lands on the real changes instead of wading through
   render artefacts ranked above them.
2. `export <diff> --out <dir>`. It writes a static site carrying only the pairs
   that are not identical, converted to WebP, so a 60-story diff is well under a
   megabyte.
3. Host it. A Claude artifact works: publish the export's files and give the
   reviewer the link. `index.html` is reserved for the artifact's own page, so
   publish sbshot's entry as `viewer.html` and link to
   `viewer.html#/job/diff/<diff>`.
4. Put the link in the PR body under **Screenshots / Screen Recordings**.

Say the three numbers plainly: how many screens changed, how many are new, how
many are pixel-identical. "56 screens unchanged" is often the most useful claim
in the whole diff, because it is the one a reviewer cannot check by eye.

## Operational traps

- A full capture is ~900 shots. Scope with `--title "Pages/Alerts/Channels"` or
  `--stories "a,b,c"` (substring match on id or Title/Name, repeatable).
- A fresh worktree cannot build Storybook: `i18n-translations-hash.json` is
  gitignored and generated. Run `node ./i18-generate-hash.cjs` in
  `<worktree>/frontend`, and symlink `node_modules` from the main checkout.
- `pnpm test:storybook` starts its own server on 6006 and will hang silently if
  something already holds that port. Free it first.
- ImageMagick on macOS may have no default font, so `--mode green-parallel` fails
  with ``unable to read font `' ``. Map Helvetica to a real file in
  `~/.config/ImageMagick/type.xml`.
- `sbshot link <dir> <name>` adds a run from elsewhere into the workspace, but it
  symlinks. Keep the source directory alive until you have exported.
- Running the whole Storybook test suite locally fails broadly with
  `page.goto: Timeout` from resource starvation. Scope it; CI is the real signal.

## Done means

- [ ] one capture per ref, each from its own freshly started Storybook
- [ ] `--theme dark,light` on every capture
- [ ] baseline is the merge-base
- [ ] a noise-floor diff passed as `--noise`
- [ ] every non-flaky pair opened and explained, not inferred from its size
- [ ] the pairs that matter tagged, with a note
- [ ] exported and hosted, and the link in the PR body
