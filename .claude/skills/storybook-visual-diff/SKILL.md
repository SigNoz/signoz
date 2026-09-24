---
name: storybook-visual-diff
description: Screenshot a set of SigNoz Storybook stories, then pixel-diff two runs to see what a CSS or component change did, with the changes tinted over the new shot. Use when asked to take story screenshots, capture a visual baseline, compare before/after of a style change, or find which pages a change affects.
---

# Storybook visual diff

Two scripts under `frontend/scripts`:

- `story-shots.mjs` — screenshots stories off a running Storybook dev server.
- `story-shots-diff.mjs` — pixel-diffs two runs and paints what moved.

Output goes to `frontend/.story-shots/` (gitignored), one directory per run.

## 0. Settle what is being compared, first

A diff is only worth taking when the two runs straddle something. Run twice over
the same tree and the answer is zero, or the noise floor: true, and useless.
So before starting a server, pin down four things. Whatever the prompt already
says, take it and do not ask again; ask only for what is genuinely missing, in
**one** `AskUserQuestion` call.

| To settle | Ask | Options |
| --- | --- | --- |
| Job | "What should this run produce?" | shoot only · baseline for a change you are about to make · compare against a change already in the working tree · compare this branch against another (`main` by default, or one the user names) · compare two configurations of the same story (`--args`, clock, width) · noise floor (same tree twice) |
| Scope | "Which stories?" | offer 2-3 concrete selections read off `index.json` (a page, a `--title` prefix, everything), never open-ended |
| Themes | "Which themes?" | dark · dark + light |
| Read-out | "How should the diff read?" | `green` (changed pixels over the after shot) · `green-parallel` (before \| after \| diff, side by side) · `red` · `red-parallel` · `none` (keep both runs, do not diff) |

Skip a row when the prompt answers it, and skip the whole call when the prompt
answers all of it ("shoot the pods tooltips in both themes" needs no question).
Skip Read-out too whenever the job is *shoot only*, and take `none` for what it
says: shoot both sides, report both paths, run no comparison. When the prompt
says nothing at all, ask; a silent guess here burns ~6 min per sweep on the
wrong stories.

The job decides which loop below to run:

| Job | Loop |
| --- | --- |
| **shoot only** | §1, §2, stop. Report the paths. No diff, no second run. |
| **baseline first** | the full loop, stopping after step 2 to hand the change back. The user makes it, then continue at step 4. |
| **change already in the tree** | the tree *is* the after state. `git stash` (or check out the base commit) to shoot the before, restore, shoot the after. Confirm the working tree is clean enough to stash before touching it, and restore it even if a capture fails. |
| **branch vs branch** | shoot the current branch, then `git switch <base>` in place (stash first if the tree is dirty), restart the dev server, shoot again, switch back and unstash. Restart matters: HMR does not survive a whole-branch swap cleanly. Get the tree back to where it started even if a capture fails. |
| **noise floor** | two runs, same tree, diff. The number is the harness's floor, not a finding. |
| **config vs config** | same tree, two runs that differ only in flags: `--args`, `--clock`, `--width`, `--theme`, `--motion`. Filenames stay identical, so the pairs line up and the caption names what changed. |

## The loop

1. Capture the baseline **before touching anything**.
2. Capture it a second time and diff the two. That is the noise floor: anything
   it reports is what the harness cannot hold still, and no conclusion about the
   change may rest on those stories. Cheap on a handful of stories, ~6 min per
   32, so on a wide sweep run it over the two or three stories the change is
   aimed at instead of all of them.
3. Make the change.
4. Capture again into a third directory.
5. Diff, then read the tinted shot of the largest movers to judge the change.

## 1. One dev server, on a free port

`storybook dev` keys its Vite dep cache off the config dir, so two servers on the
same `-c` serve mismatched prebundles and every story dies with `Invalid hook
call`. Check what is already up first — port 6006 is often another repo's
Storybook, and its `index.json` then indexes the wrong stories:

```bash
for port in 6006 6007; do
  curl -s -m 2 "http://localhost:$port/index.json" | head -c 60 && echo "  <- $port"
done
```

Start the SigNoz one on a free port, from the repo's own binary so no package
manager shim is in the way:

```bash
cd frontend
nohup ./node_modules/.bin/storybook dev -p 6007 --no-open --quiet \
  > "${TMPDIR:-/tmp}/signoz-storybook.log" 2>&1 &
```

It is ready when `curl -s localhost:6007/index.json` returns JSON whose
`entries` hold SigNoz story ids.

## 2. Capture

Playwright is not a frontend dependency. The script finds it in `tests/e2e`
(`pnpm -C tests/e2e install`, `@playwright/test` is enough) or in a global
install, and launches Playwright's own chromium, falling back to an installed
Chrome. Two escape hatches when that is not what a machine has:

```bash
export PLAYWRIGHT_MODULE=/path/to/playwright   # a different install
export CHROME_PATH=/path/to/chrome             # a specific browser binary
```

Then pick the stories. `--list` prints the selection without shooting anything:

```bash
# every tooltip story of every page
node scripts/story-shots.mjs .story-shots/baseline \
  --port 6007 --title Pages/ --name tooltip --theme dark

# a handful of stories by id or by title/name substring, both themes
node scripts/story-shots.mjs .story-shots/baseline \
  --port 6007 --stories pages-noz,dashboards/detail --theme dark,light
```

| Flag | Meaning |
| --- | --- |
| `--stories <match>` | id or `Title/Name` substring, repeatable or comma-separated. Omit for every story. |
| `--title <prefix>` | only titles starting with the prefix (`Pages/`, `Components/`) |
| `--name <match>` | only story names containing the match |
| `--theme dark,light` | one pass per theme; omit for the story's own default (dark) |
| `--args <k:v;k2:v2>` | arg overrides, Storybook's own `?args=` syntax, repeatable. A dotted value is dropped by Storybook itself, so map it to a slug inside the story's mocks |
| `--port` | dev server port, or `$SB_PORT` |
| `--width <px>` | the only fixed dimension, default 1680 |
| `--height <px>` | shortest the viewport may be, default 1200 |
| `--max-height <px>` | tallest it may grow to, default 8000 |
| `--grow <what>` | `scrollers` (default) grows the viewport until the page's own scrollers fit, `document` only follows the document height, `none` keeps `--height` |
| `--settle <ms>` | wait after the page goes quiet, default 1500 |
| `--clock <iso\|live>` | wall clock the page reads, passed to the preview as `?storyClock`; `live` unfreezes it |
| `--motion` | keep animations and transitions running (sets the `motion` global to `live`) |
| `--ignore <selector>` | hide matching elements, on top of `[data-shot-ignore]` and `[data-chromatic="ignore"]` |
| `--flat` | write `<out>/<id>.png`, no theme directory |
| `--no-caption` | leave the caption band off the shots |
| `--list` | print the matched stories and exit |

Files land at `<out>/<theme>/<story-id>.png`, next to a `shots.json` recording
what each shot is (id, title, name, theme, `ok`/`busy`, the caption's height in
rows) and how the run was configured (args, clock, width, height, grow, motion,
settle, ignore). Keep the flags identical between the two runs or the diff pairs
nothing.

Every shot carries the caption band described below, so a single screenshot says
what it is on its own. `--no-caption` leaves it off, and so does a machine
without ImageMagick (with a warning). The band never changes the shot's width
(long text wraps rather than widening the canvas) and its height is recorded, so
the diff crops it back off and never reports one caption against another. Two
runs whose captions are different heights still diff to zero. A story that never held still for two
identical frames is logged `busy` instead of `ok` — treat its diff as suspect.

Dark alone is enough while iterating on the harness; add `light` for the run you
report.

## 3. Diff

```bash
node scripts/story-shots-diff.mjs .story-shots/baseline .story-shots/capped .story-shots/diff
```

Prints `<changed pixels>  <theme>/<story>.png`, largest first, and writes one
image per pair. Needs ImageMagick for PNG encode/decode (7's `magick`, or 6's
`convert`/`identify`/`montage`); the comparison itself is in the script.

| Flag | Meaning |
| --- | --- |
| `--mode green` | default. The after shot with the changed pixels painted over it, exactly the pixels that changed. What Chromatic shows. |
| `--mode green-parallel` | `previous \| current \| diff` in one image, each tile labelled above it, on a gutter inverted from the theme. The diff tile is the `green` one, so the after shot stays readable underneath. |
| `--mode red` | the after shot faded to 10%, changed pixels in red. A pixelmatch-style diff, easiest to read when the change is a thin edge. |
| `--mode red-parallel` | the same three tiles, with the `red` diff. Best when the change is a thin edge that the unfaded shot would swallow. |
| `--threshold <0..1>` | how far a pixel must move to count. Default 0.063, Chromatic's `diffThreshold`. |
| `--include-aa` | count antialiasing changes too. Off by default, as in Chromatic. |
| `--tint <#rrggbb>` | override the mode's colour. |
| `--no-caption` | drop the caption band. |

### The caption

Both scripts stamp a band on top of what they write: `story-shots.mjs` on each
shot, from the story and the run's own settings; `story-shots-diff.mjs` on each
diff, read out of the two runs' `shots.json`. It carries the story's
`Title/Name`, then its id, theme and `busy` flag, then the settings both runs
shared, each reading `key:value`. Whatever the two runs did **differently** goes
on the side it belongs to: under `previous` and `current` on the parallel tiles,
on two lines of the band otherwise. So a pair that differs only in `--args` says
so on its face, which is what makes several shots of one story tellable apart.

The shots' own bands are cropped off before comparing and before going into the
tiles, so nothing in the output is a diff of a caption. Type size follows the
image width, so it stays readable with the whole image viewed at fit-to-width;
the heading is set in an installed sans and the detail lines in a mono, falling
back to ImageMagick's default when neither is on the machine. Without a manifest
the band falls back to the file path, and a directory of captioned shots whose
`shots.json` is missing has nothing to crop by, so its captions do land in the
diff. Keep `shots.json` next to the shots.

### How the comparison works

Chromatic's own capture and diff run server-side — `chromatic-cli` uploads a
built Storybook and contains no capture or comparison code at all. What is public
is the parameter contract, and the numbers in it say what the comparison is:
`diffThreshold` defaults to `0.063` on a 0-1 scale, which is pixelmatch's
`threshold`, and `diffIncludeAntiAliasing` defaults to false, which is
pixelmatch's `includeAA: false`. So the script implements that comparison:

1. Both PNGs are read as raw RGBA through `magick … RGBA:-`.
2. Per pixel, the squared YIQ distance between the two colours (weights
   `0.5053 / 0.299 / 0.1957`), compared against `35215 * threshold²` — 35215 is
   the largest distance two 8-bit colours can have. Chroma is included, so a
   colour swap at equal brightness still counts.
3. A pixel over the threshold is dropped when it is only antialiasing: it is the
   darkest or lightest of its eight neighbours, and the other image has a pixel
   around there doing the same job. This is what keeps a subpixel glyph edge from
   reading as a change.
4. What survives is painted at full opacity, one output pixel per changed input
   pixel. No dilation, no blobs — a one-pixel shift shows as a one-pixel line.

A pair whose shots are different sizes is compared over the overlap, and every
row and column that exists in only one of them counts as changed.

Pairing is by `<theme>/<story-id>.png`, so a story that exists on only one side
(new on the feature branch, renamed, retitled) has nothing to pair with and is
skipped silently. On a branch-vs-branch run, compare the two runs' file lists
before reading the numbers.

## What makes a shot reproducible

Most of it is in the preview, not in the script, so a Chromatic build in the
cloud shoots the same page: `.storybook/preview-head.html` freezes the clock,
and `settleForCapture` (the preview's `afterEach`, which runs after `play`)
parks the animations and snaps the bottom-pinned lists. The script drives the
rest:

- **Storybook's own render phase is the readiness signal.** It waits for
  `window.__STORYBOOK_PREVIEW__.storyRenders[].phase === 'finished'`, which is
  reached only after the loaders, the decorators and the story's `play` are done.
  A DOM check cannot see a `play` still running. (Storybook 10 spells the final
  phase `finished`, not `completed`.)
- **Network quiescence, not `networkidle`.** react-query retries and msw keep
  requests going after load, and a few stories hang a request by design, so the
  wait is "no request for 600ms", capped at 15s.
- **The clock is frozen** (`2026-06-15T12:00:00Z`), by the preview itself. Chart windows, `4 mins ago`
  labels and trial countdowns all derive from `now`; a live clock alone moved
  8000 pixels on the dashboards list and redrew every chart axis.
- **Animations are parked on their last frame** by `html.sb-still`, a
  zero-length single iteration with `forwards` fill, plus `prefers-reduced-
  motion`. The Motion toolbar item (`still` by default) turns it off. An infinite
  spinner is otherwise caught at a random angle.
- **`document.fonts.ready`**, because text reflows when a face lands late.
- **Lists pinned to their bottom are snapped onto it**, once by the preview and
  again by the script after the page goes quiet. A virtuoso list settles a
  few pixels short of the end depending on the order its items were measured in.
- **Two identical frames in a row**, because what a page is still waiting on is
  often not observable from outside it.
- **`[data-shot-ignore]`, `[data-chromatic="ignore"]` and `--ignore <selector>`**
  hide a region that cannot be held still; Chromatic excludes the same attribute
  from its comparison.
- **The width is the only fixed dimension.** Chromatic's `viewports` are widths;
  the height follows the page. `src/styles.scss` pins `html, body, #root` to
  `height: 100%; overflow: hidden`, so the document never outgrows the viewport
  and its height says nothing: what overflows are the shell's inner scrollers.
  `--grow scrollers`, the default, grows the viewport until the tallest in-flow
  scroller fits, so nothing is cut off and no scrollbar is left in the shot (the
  dashboards list goes to 2226px in one round). Popups are skipped — they are out
  of the flow, and a tall dropdown would otherwise drag the shot to a height
  nothing on the page needs. A page that sizes a panel in `vh` grows its own
  content as the viewport grows, so no height ever fits it and the rounds only
  chase — `.alert-chart-container` is `57vh`, which puts Create Alert's fixed
  point at 4344px with an empty band on top. Those pages are shot at `--height`
  with their own scrollbar, which is what they look like in a browser, and the
  log says `(viewport-sized content, stopped chasing Npx)`.

With all of that, 29 of the 32 page tooltip stories are byte-identical across
runs. The three that are not, and why:

| Story | Residual | Cause |
| --- | --- | --- |
| `kubernetes-pods--tooltips-in-options-panel` | ~13k px | 24 tooltips held open in an overlapping cluster; they portal to `body` in mount order, and the drawer's own tooltips mount before or after the list's depending on when their data lands, so overlapping tooltips stack differently. Panel geometry itself is stable. |
| `settings-role-editor--tooltips-in-json-editor` | ~2.5k px | monaco re-measures and lands one pixel off. |
| `traces-trace-details--tooltips` | ~800 px | same class, one row of the waterfall. |

Each is bimodal — two stable arrangements — so the same number reappears run
after run. Diff a story against itself before believing its number, and reach
for `--ignore` when a region cannot be settled.

## Gotchas

- **Zero pixels is a real answer.** A story whose tooltips are all short is
  unaffected by a tooltip rule; it is not a broken capture.
- **The selector matters more than the rule.** A global rule on
  `[data-slot='…']` only reaches design-system components. antd's own tooltips
  (`.ant-tooltip-inner`, e.g. the Create Alert help popups) are untouched, which
  is why some stories show no diff at all.
- **Global style overrides need `!important`.** `src/styles.scss` loads before
  the design system injects its CSS-module styles at runtime, so a plain rule on
  a `[data-slot='…']` element loses. A component-level `!important` of the same
  specificity still wins over it — `PanelStatusPopover.module.scss` keeps its own
  `max-width: 520px !important`.
- **A fresh context per story** is why a full sweep takes ~6 min for 32 stories.
  Reusing one page loses the msw service worker re-registration race and stories
  start failing after a few navigations.
- **Stories behind a hover, drawer or modal** only render what their `play`
  reaches. If a state is missing from the shot, the story needs the `play`, not
  the script.
