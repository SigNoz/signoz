---
name: scaffold-feature
description: Scaffold the co-located feature structure in frontend/src. Use when creating a new page, feature, view (tab), or component folder, when a feature needs a shell with tabs, or when moving existing code out of src/container into src/pages. Generates the full folder tree (components/hooks/store/types/utils/constants/__tests__/README) and registers the page's routes with one command.
---

# Scaffold a feature

The frontend is moving to a co-located layout (Bulletproof React / FSD): everything a
feature owns lives in the feature's folder. Read `references/layout.md` for the full
target structure and the rules about what may live where.

**Never hand-create these folders.** Run the generator so every feature comes out
identical, then fill it in.

## Command

```bash
pnpm scaffold page <Name> [options]        # a page/feature under src/pages
pnpm scaffold component <Name> [options]   # a component folder
```

| Option | Applies to | Effect |
| --- | --- | --- |
| `--views A,B,C` | `page` | Makes the page a shell with tab switching and generates one view folder per name. |
| `--parent <path>` | `component` | Parent, relative to `src` (default `components`). A feature path like `pages/Traces/Explorer` nests the component under that feature's `components/`. |
| `--full` | `component` | Also adds `components/`, `hooks/`, `store/`, `types.ts`, `utils.ts`, `constants.ts`, `README.md` for a component that owns children. |
| `--no-tests` | both | Skips `__tests__/`. |
| `--dry-run` | both | Prints what would be written, writes nothing. |
| `--force` | both | Overwrites files that already exist (off by default; existing entries are reported as skipped). |

Folder names keep the casing you type, with the first letter forced up, so
`LLMObservability` stays `LLMObservability` rather than being re-cased. Separated names
collapse to PascalCase: `api-monitoring` and `api monitoring` both give
`pages/ApiMonitoring`. Test ids, headings, tab paths and constants are all derived from
that folder name — `TracesFunnels` gives `traces-funnels-page`, `Traces Funnels` and
`TRACES_FUNNELS_TABS`.

## What you get

```
pages/ApiMonitoring/
  index.tsx                       # the page component
  ApiMonitoring.module.scss
  components/  hooks/  store/     # empty, ready for the first file
  types.ts  utils.ts  constants.ts
  __tests__/ApiMonitoring.test.tsx
  README.md
```

With `--views`, the root becomes a `RouteTab` shell and each view gets the tree above. The
shell mirrors the Logs and Traces root pages: `constants.tsx` exports one `TabRoutes` per
view (icon from `@signozhq/icons`, label, `ROUTES` key, view component), `index.tsx` composes
them into the tab bar, the SCSS module carries the tab-bar overrides, and the test asserts one
tab per view plus the active view. Tab icons come from a small name map in `scaffold.mjs`
(`Explorer`, `Funnels`, `Pipelines`, `Views`, `SavedViews`); other names get a neutral icon
to replace.

## Examples

```bash
pnpm scaffold page ApiMonitoring                                    # leaf page, no shell
pnpm scaffold page Traces --views Explorer,Funnels,Views            # shell + 3 views
pnpm scaffold page Traces/Explorer                                  # one more view under an existing shell
pnpm scaffold component DataTable                                   # global, src/components/DataTable
pnpm scaffold component QueryBar --parent pages/Traces/Explorer     # feature-local component
```

## Route registration

`page` also registers the routes, so the page is reachable as soon as it is generated:

| File | What is added |
| --- | --- |
| `src/constants/routes.ts` | One key per path: `API_MONITORING: '/api-monitoring'` for a leaf page; `TRACES_BASE` plus `TRACES_EXPLORER`, `TRACES_FUNNELS`, … for a shell. |
| `src/utils/permission/index.ts` | A `routePermission` entry per new key, open to `ADMIN`, `EDITOR` and `VIEWER`. Tighten it if the page is admin-only. |
| `src/AppRoutes/pageComponents.ts` | A `Loadable` export named `<Page>Page` pointing at `pages/<Page>`. |
| `src/AppRoutes/routes.ts` | The import plus one private, exact route per path. For a shell the base path and every tab path render the shell; the shell redirects the base path to its first tab and `RouteTab` picks the tab otherwise. |
| `src/container/TopNav/DateTimeSelectionV2/constants.ts` | Every new path in `routesToSkip`, so the global time-range picker stays hidden until the page opts in. |

Existing keys, exports and entries are left alone, so re-running is safe. An existing key or
export that points somewhere else is a naming collision and the run stops before writing
anything. `--dry-run` lists
the edits without making them. `page Traces/Explorer` registers `TRACES_EXPLORER` pointing
at the `Traces` shell; wiring the new tab into the shell's `constants.tsx` and `index.tsx`
is still by hand. The generator never adds a SideNav item; do that in
`src/container/SideNav/menuItems.tsx` when the page needs one.

## After generating

1. **Review the route registration** (pages only) and add the SideNav entry if the page
   needs one. For a view added under an existing shell, add its `TabRoutes` export to the
   shell's `constants.tsx` and include it in the `routes` array in the shell's `index.tsx`.
2. **Delete the placeholders you don't need** — empty `types.ts` / `utils.ts` /
   `constants.ts`, and any of `components/`, `hooks/`, `store/` the feature won't use.
   Those three folders are created empty; git only picks them up once they hold a file.
3. **Fill the README** — the generated file has the prompts; a feature folder without a
   filled-in README is not done.
4. **Follow the repo rules while filling it in**: `@signozhq/ui` + `@signozhq/icons` only,
   CSS Modules (`docs/css-modules-guide.md`), React Query for server state (prefer
   `api/generated` hooks), nuqs for URL state, Zustand for client state, `data-testid` on
   every interactive element.
5. **Verify** before reporting done:
   ```bash
   pnpm tsgo --noEmit
   pnpm oxlint src/pages/<Feature>
   pnpm jest src/pages/<Feature>
   ```
   `pnpm tsgo --noEmit` is the authority. A running dev server can show errors such as
   `Property 'X_BASE' does not exist` or `has no exported member 'XPage'` right after
   generation. Its type-checker notices new files but, on some machines, not in-place edits
   to existing ones, and the generator edits the shared files in place. If tsgo is clean,
   restart `pnpm dev`.

## Editing the templates

Templates live in `templates/` — `feature/`, `shell/`, `component/` and
`component-extras/` (the `--full` additions). Every template file ends in `.tmpl`, which
keeps TypeScript, lint and your editor from reading them as source; the generator strips
that suffix on the way out, so `index.tsx.tmpl` becomes `index.tsx`. Tokens are
substituted in both file names and contents: `__Pascal__`, `__kebab__`, `__camel__`,
`__CONST__`, `__Title__`. The shell templates additionally take tokens the generator builds
from `--views`: `__ICON_IMPORTS__`, `__VIEW_IMPORTS__`, `__TAB_EXPORTS__`, `__TAB_NAMES__`,
`__BASE_ROUTE__`, `__FIRST_TAB__`, `__FIRST_VIEW_TESTID__` and `__TAB_ASSERTIONS__`. Tab icons come from
`TAB_ICONS` and the empty folders from `FEATURE_DIRS`, both in `scaffold.mjs`. Name and
route derivations live in `lib.mjs`; run `node --test .claude/skills/scaffold-feature/scaffold.test.mjs`
after changing them. Change these, not the generated
output, when the team's conventions move.
