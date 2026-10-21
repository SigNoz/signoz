---
name: sbshot-visual-diff
description: Shoot Storybook stories with sbshot at two git refs and produce a diff a reviewer can read. Use when asked for a visual diff, before/after screenshots, a screenshot comparison for a PR, or to prove a change did not alter screens it should not have.
---

# sbshot visual diffs

`npx -y github:SigNoz/sbshot` shoots Storybook stories and pixel-diffs two runs.
Use it. Do not hand-roll a Playwright screenshot loop or a canvas pixel-compare:
sbshot already handles story selection, themes, settling, retries, diffing,
tagging, a viewer and a static export, and its runs are the format the rest of
the team can open.

sbshot is not installed by any package. It is run through `npx`, so nothing it
knows travels into this repo on its own. This file is where that knowledge
lives.

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

## Cover the change with stories first

**A diff can only show what a story renders.** A screen, state or variant with no
story is invisible to sbshot: it produces no pair, so it reads as "nothing
changed" rather than "never looked at". This is the failure mode that makes a
clean-looking diff worthless.

Before capturing, list the screens and states the change touches and check each
has a story. For anything missing, write it first — the `signoz-page-story`
skill covers how. New states reached only by an interaction need a `play`
function, or the capture shoots the page at rest and the state never appears.

Then confirm it worked: the two runs' story counts should differ by exactly the
stories the change adds. A new screen that produced no new story id is a screen
nobody is reviewing. Say the count in the summary, so a reader can tell coverage
from silence.

## Rules that are not optional

**One freshly started Storybook per ref.** Never start one server and switch git
branches under it. Vite's HMR reloads the page, but some modules do not
re-initialise, so the shot differs silently from a clean boot and the difference
looks like a real change. Settle time does not fix this and is not the variable.
Use one worktree and one port per ref, and stop each server before the next.

**Capture both themes: `--theme dark,light`.** Without it sbshot shoots the
story's own default and everything lands in a single `default/` folder, so every
regression in the other theme is invisible. Themes double the shot count, so
scope with `--stories` or `--title`, never by dropping a theme.

**Baseline is the merge-base, not `origin/main`.** `git merge-base origin/main
<branch>`. Against a moved main, every commit main gained since the branch's base
shows up reversed, as though the branch reverted it.

**The percentage sorts the list, it does not tell you what matters.** A dialog
that dims the page scores high for a one-line change, and a whole new form
section can score low. Open the shots and say what changed on each screen. The
biggest number is usually the least interesting one.

**If you cannot explain a pair, assume the capture is at fault, not the code.**
Open it, crop both sides and compare them before calling it noise. A pixel count
and a good guess are not evidence.

## Noise, and the floor that proves it

The same story does not always render identically twice. Pairs often move for
reasons that have nothing to do with the change:

- a focus ring left on whatever a `play` function clicked last
- a scrollbar appearing, or its thumb resting a few pixels off
- a toast, tooltip or dialog caught mid-fade
- a text caret blinking, or a selection highlight
- an animation or spinner at a different frame
- relative timestamps ("2 days ago") crossing a boundary
- hover or active styling from where the pointer happened to rest
- a late-loading font or image shifting a line of text

Do not argue about these one at a time. **Measure them**: shoot the same commit
twice and diff those two runs against each other. Anything that moves there moved
for no reason, so it is noise.

```
capture <storybook> --name-run noise-a
capture <storybook> --name-run noise-b     # same tree, its own fresh server
diff noise-a noise-b --name-diff noise
diff <baseline> <after> --noise noise      # marks the movers flaky
```

**The noise run has to cover the same stories as the real diff.** Do not scope it
down to the few pairs that moved, however tempting that is. `--noise` marks a
pair flaky when the noise diff does not show it as unchanged, so every story the
noise run leaves out is marked flaky too, including the new screens the reviewer
is there to look at. Shooting two narrow runs and diffing those against each
other has the same problem. Either shoot the full set twice, or skip `--noise`
and explain the few movers by hand.

That is the trade: a second full capture costs about as long as the first, so on
a small diff it is often quicker to crop the two or three movers and say what
each one is. Use `--noise` when the diff is large, or when wiring `--fail-over`
into CI, where something has to decide without a person looking.

If a pair is flaky every run and the state it captures matters, fix the story
rather than living with it: blur what the `play` clicked, freeze the clock, or
assert the state instead of shooting it.

## Making it readable for a reviewer

A reviewer cannot open `localhost`, so `sbshot ui` is for you, not for them.

1. `tag` the pairs that matter, with `--note` saying why. The viewer filters by
   tag, so the reviewer lands on the real changes instead of scrolling past
   noise that scored higher.
2. `export <diff> --out <dir>`. It writes a static site carrying only the pairs
   that are not identical, converted to WebP, so a large diff stays small.
3. Host it. A Claude artifact works: publish the export's files and give the
   reviewer the link. `index.html` is reserved for the artifact's own page, so
   publish sbshot's entry as `viewer.html` and link to
   `viewer.html#/job/diff/<diff>`.
4. Put the link in the PR body under **Screenshots / Screen Recordings**.

Say the numbers plainly: how many screens changed, how many are new, how many are
pixel-identical, how many are flaky. The count of unchanged screens is often the
most useful claim in the diff, because it is the one a reviewer cannot check by
eye.

## Operational traps

- A full capture is hundreds of shots. Scope with `--title "Pages/Alerts"` or
  `--stories "a,b,c"` (substring match on id or Title/Name, repeatable).
- A fresh worktree cannot build Storybook: `i18n-translations-hash.json` is
  gitignored and generated. Run `node ./i18-generate-hash.cjs` in
  `<worktree>/frontend`, and symlink `node_modules` from the main checkout.
- `pnpm test:storybook` starts its own server on 6006 and hangs silently if
  something already holds that port. Free it first.
- ImageMagick on macOS may have no default font, so `--mode green-parallel` fails
  with ``unable to read font `' ``. Map Helvetica to a real file in
  `~/.config/ImageMagick/type.xml`.
- `sbshot link <dir> <name>` adds a run from elsewhere into the workspace, but it
  symlinks. Keep the source directory alive until you have exported.
- The export directory is build output. Delete it when done, or gitignore it.
- Running the whole Storybook test suite locally fails broadly with
  `page.goto: Timeout` from resource starvation. Scope it; CI is the real signal.

## Done means

- [ ] every screen and state the change touches has a story, written before capturing
- [ ] one capture per ref, each from its own freshly started Storybook
- [ ] `--theme dark,light` on every capture
- [ ] baseline is the merge-base
- [ ] noise either measured with a full second capture, or each mover explained by hand
- [ ] every non-flaky pair opened and explained, not inferred from its size
- [ ] the pairs that matter tagged, with a note
- [ ] exported and hosted, and the link in the PR body
