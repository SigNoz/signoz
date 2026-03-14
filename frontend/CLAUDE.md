# Frontend

React 18 SPA for SigNoz — an open-source observability platform.

## Dev Setup

```bash
yarn install
yarn dev              # webpack dev server
yarn build            # production build
yarn lint             # ESLint check
yarn lint:fix         # ESLint auto-fix
yarn fmt              # Prettier format
yarn jest             # unit tests
yarn jest:watch       # unit tests in watch mode
yarn jest:coverage    # coverage report
yarn generate:api     # regenerate API types from OpenAPI spec (via orval)
```

## Stack

- **React 18** + **TypeScript**
- **React Router v5** — use `useHistory` / `<Switch>` / `<Route>`. Do NOT use v6 APIs (`useNavigate`, `<Routes>`)
- **Redux + redux-thunk** — global cross-cutting state (user, org, feature flags)
- **React Query** — all server state and data fetching
- **Ant Design v5** — primary component library
- **webpack** — bundler (not Vite, not CRA)
- **Jest + React Testing Library** — unit tests
- **Playwright** — e2e tests (`e2e/`)
- **react-i18next** — internationalisation

## Project Structure

```
src/
  api/          # API call functions and React Query hooks (shared/generic)
  AppRoutes/    # Route definitions
  assets/       # Static assets
  components/   # Shared reusable components
  constants/    # App-wide constants and enums
  container/    # Redux-connected container components
  hooks/        # Shared custom hooks
  lib/          # Utility/helper libraries
  modules/      # Feature modules — self-contained, co-locate API + components + hooks
  pages/        # Route-level page components
  providers/    # React context providers
  ReactI18/     # i18n translation keys
```

## Key Conventions

- **Functional components only** — no class components
- **React Query for server state** — do not add new Redux reducers for data that comes from an API
- **Ant Design first** — use AntD components before writing custom UI
- **i18n always** — use `useTranslation()` hook; add keys in `src/ReactI18/`
- **No `any`** — TypeScript strict mode is enforced; find or create the right type
<!-- Add new conventions here. Ask: "Would Claude make a wrong assumption without this?" If yes, add it. -->
<!-- Example: - **Error boundaries** — wrap all page-level components in `<ErrorBoundary>` -->

## API Type Generation

Types are auto-generated from the OpenAPI spec via orval:

```bash
yarn generate:api
```

Generated files have a `.gen.ts` suffix — **never edit them manually**.

## What NOT to Do

- Do not use `npm` — use `yarn`
- Do not edit `*.gen.ts` files
- Do not use React Router v6 APIs
- Do not fetch data with raw `useEffect` + `fetch` — use React Query
- Do not add Redux state for server data
- Do not use `fireEvent` in tests. Use `userEvent` with `setup()` instead
<!-- Add "don't do X" rules here for libraries, patterns, or APIs you want to steer away from. -->
<!-- Example: - Do not use `moment.js` — use `dayjs` instead -->
