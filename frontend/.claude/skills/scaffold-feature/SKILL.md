---
name: scaffold-feature
description: Scaffold the co-located feature structure in frontend/src. Use when creating a new page, feature, view (tab), or component folder, when a feature needs a shell with tabs, or when moving existing code out of src/container into src/pages. Generates the full folder tree (components/hooks/store/types/utils/constants/__tests__/README) with one command.
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

With `--views`, the root becomes a `RouteTab` shell (`index.tsx` + `constants.ts` with the
tab definitions) and each view gets the tree above.

## Examples

```bash
pnpm scaffold page ApiMonitoring                                    # leaf page, no shell
pnpm scaffold page Traces --views Explorer,Funnels,Views            # shell + 3 views
pnpm scaffold page Traces/Explorer                                  # one more view under an existing shell
pnpm scaffold component DataTable                                   # global, src/components/DataTable
pnpm scaffold component QueryBar --parent pages/Traces/Explorer     # feature-local component
```

## After generating

1. **Wire the route** (pages only) — the generator does not touch shared files:
   - add the path to `src/constants/routes.ts`
   - add a `Loadable` lazy import to `src/AppRoutes/pageComponents.ts`
   - add the entry to `src/AppRoutes/routes.ts`
   - for a shell, replace the local `BASE_PATH` strings in `constants.ts` with those `ROUTES` entries
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

## Editing the templates

Templates live in `templates/` — `feature/`, `shell/`, `component/` and
`component-extras/` (the `--full` additions). Every template file ends in `.tmpl`, which
keeps TypeScript, lint and your editor from reading them as source; the generator strips
that suffix on the way out, so `index.tsx.tmpl` becomes `index.tsx`. Tokens are
substituted in both file names and contents: `__Pascal__`, `__kebab__`, `__camel__`,
`__CONST__`, `__Title__`. The shell's `constants.ts` additionally takes
`__VIEW_IMPORTS__` and `__TAB_ENTRIES__`, which the generator builds from `--views`. The
empty folders come from `FEATURE_DIRS` in `scaffold.mjs`. Change these, not the generated
output, when the team's conventions move.
