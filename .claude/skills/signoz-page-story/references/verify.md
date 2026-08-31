# Verifying a page story

A story is not done because it compiles. It is done when each control has been
seen changing the page and the console is silent.

## Run it

```bash
cd frontend && pnpm storybook --ci --quiet   # :6006, background it
```

A newly added `.stories.tsx` takes a few seconds to appear in `index.json` on an
already-running server; an empty first poll is not a broken `stories` glob.

Story ids come from the meta title: `Pages/Services/List` →
`pages-services-list`, plus the story export in kebab-case. Render one story on
its own:

```
http://localhost:6006/iframe.html?id=pages-services-list--default&viewMode=story
```

## Flip controls from the URL

Args are settable in the iframe URL, so a whole sweep runs headless without
touching the panel. Booleans go as `!true` / `!false`, numbers bare, arrays
indexed, several separated by `;`, and the theme through `globals`:

```
&args=services:0;apdex:poor;access:viewer;dataState:loading
&args=signals[0]:logs;signals[1]:traces
&globals=theme:light
```

That is the cheap way to check a control does something: load with and without
it, diff the page text.

## Drive it

Playwright lives in the repo's e2e workspace, so a scratch script can use it
directly:

```js
import pw from '<repo>/tests/e2e/node_modules/playwright/index.js';
const { chromium } = pw;

const browser = await chromium.launch();
const page = await browser.newPage();
const problems = [];
page.on('console', (m) => {
	if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text());
});
page.on('pageerror', (e) => problems.push(e.message));

await page.goto(`${story}&args=services:0`, { waitUntil: 'networkidle' });
await page.locator('body').waitFor();
console.log((await page.locator('body').innerText()).slice(0, 1500), problems);
await browser.close();
```

Screenshots are worth taking for `Default` in both themes
(`&globals=theme:light`): text extraction does not catch an unstyled page.

## Gates

- **Console silent.** `[storybook] no msw handler`, a 501 from the catch-all, an
  msw unhandled-request warning, a React key or state warning: assume the story
  is wrong first. A warning that survives is sometimes the app's. Prove it by
  turning off the control that renders the widget and watching the warning go
  with it, and by finding the same component elsewhere doing it right. Then
  report the app bug in the PR. Never invent a field the API does not return to
  silence a warning.
- **No navigation overlay on mount.** "Navigation blocked in Storybook" on load
  means the page is trying to leave: wrong `route`, or a guard denying on a
  permission the controls did not grant.
- **Every control moves something.** Sweep them one at a time from the URL and
  diff the page text. A control with no diff is either wired to nothing or aimed
  at a widget that is not rendering. Some only show their effect after an
  interaction, such as a tab that has to be clicked or a select that has to be
  opened. Drive that interaction rather than calling the control unobservable.
- **Both themes render styled.** An unstyled page means the story is not inside
  the provider decorator, or `<body data-theme>` was lost.
- **Roles agree.** `<body data-signoz-story-role>` and
  `<body data-signoz-context-role>` disagreeing means the page reads a different
  `AppContext` than the story config fills.
- **The page's own navigation works.** Tabs, filters and pagination that write
  query params should re-render the page in place; only leaving the page belongs
  in the overlay.

## Then the usual

```bash
pnpm tsgo --noEmit
pnpm exec oxlint <changed files>
pnpm exec oxfmt --check <changed files>
```

There is no prettier in this repo. `pnpm exec prettier --check` fetches something
else, prints `Prettier: All files formatted correctly` and exits 254: a pass that is
not one.

## Common failures

| Symptom | Cause |
| --- | --- |
| endless spinner with Data on `loaded` | handler URL does not match the call; handlers answer on `http://localhost` |
| page renders but empty | response shape wrong; compare against the api module's type, not a guess |
| 501 in the console | endpoint nobody mocked; the catch-all is answering |
| new control missing from the panel | project-level control added; the tab needs a reload |
| control flips but nothing changes | the widget is gated by something else: a permission, a flag, a preference |
| shell disappears in `loading` | an endpoint the shell needs went through `response.json`; give it a plain resolver |
