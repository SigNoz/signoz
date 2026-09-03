# Frontend layout

Target structure for `frontend/src`. Inspired by Bulletproof React and Feature-Sliced
Design: a feature owns its components, hooks, state, types and tests, and nothing outside
the feature folder reaches into it.

```
src/
  app/                    # bootstrap: routing, global styles/theme
  pages/
    Traces/               # has a shell
      index.tsx           # shell — tab switching only
      constants.ts        # tab definitions
      Explorer/           # a view
        index.tsx         # view entry — composition, no business logic
        components/
          QueryBar/       # same shape as a global component, nests further as needed
            QueryBar.tsx
            QueryBar.module.scss
            components/
            hooks/
            __tests__/
        hooks/            # feature hooks + React Query wrappers over api/generated
        store/            # Zustand stores for feature-local client state
        types.ts
        utils.ts
        constants.ts
        __tests__/
        README.md
      Funnels/
      Views/
    ApiMonitoring/        # no shell — same shape, one level up
      index.tsx
      components/
      hooks/
      store/
      types.ts
      utils.ts
      constants.ts
      __tests__/
      README.md
  components/             # cross-feature components, same internal shape as above
    DataTable/
      DataTable.tsx
      DataTable.module.scss
      components/
      hooks/
      store/
      types.ts
      utils.ts
      constants.ts
      __tests__/
      README.md
  lib/
  utils/
  types/
  constants/
  store/                  # app-wide client state only
  i18n/
  api/
    generated/            # Orval output — never edited by hand
    client/               # axios instances, interceptors, error handlers
  index.tsx
```

## Rules

- **Folder names are PascalCase**, spelled the way the feature is spelled in the product
  (`ApiMonitoring`, `LLMObservability`). This holds for shells, views and components alike.
- **A page folder is the unit of ownership.** Anything used by exactly one feature lives
  inside it, however deeply nested. Promote to `src/components` / `src/utils` / `src/hooks`
  only when a second feature needs it.
- **`index.tsx` is the entry**, and it composes. Business logic goes to `hooks/`, data
  shaping to `utils.ts`, state to `store/`.
- **Nested components repeat the same shape.** A component folder may hold its own
  `components/`, `hooks/`, `store/`, `types.ts`, `utils.ts`, `constants.ts`, `__tests__/`.
  Nest as deep as ownership actually goes; don't flatten a component that owns children.
- **Shell vs no shell.** A page with tabs gets a shell `index.tsx` whose only job is tab
  switching, plus one folder per view. A page without tabs is just the feature folder.
- **Tests.** Feature-root tests in `__tests__/`; a component's tests next to the component
  (its own `__tests__/`). Never reach across features in a test.
- **No barrel files.** A page's `index.tsx` is the route entry (a component), not a
  re-export hub. Import components by their own path.
- **File size.** Split past ~300 LOC: extract components, and behaviour into
  `use<Component>Callbacks`-style hooks. More than ~3 type declarations in a file means a
  `types.ts`, and more than ~3 in `types.ts` means a `types/` folder.
- **Styling.** CSS Modules (`<Name>.module.scss`) next to the component — see
  `docs/css-modules-guide.md`. Semantic tokens only.
- **State.** Server → React Query (prefer `api/generated` hooks); URL → nuqs; client →
  Zustand, one store per file, always with a selector. No Redux or Context for new code.

## Migrating existing code

Most feature code still lives in `src/container` and `src/modules`, with a thin wrapper in
`src/pages`. When touching one of those features:

1. Scaffold the target with `pnpm scaffold page <Name>` (see `../SKILL.md`).
2. Move files in, one concern per commit — components, then hooks, then state.
3. Update importers; keep `src/container/<Feature>` deleted, not re-exported. A shim
   directory is how the old layout survives.
4. Do the dead-code pass first: unused props, exports, imports and debug logs go before the
   move, in their own commit.
