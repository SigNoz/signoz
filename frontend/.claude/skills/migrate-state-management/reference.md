# State migration reference

## Why migrate

- **Context:** Re-renders all consumers on any change; no granular subscriptions; becomes brittle at scale.
- **Redux:** Heavy boilerplate (actions, reducers, selectors, Provider); slower onboarding; often used to mirror React Query or URL state.
- **Goal:** Fewer mechanisms, domain isolation, granular subscriptions, single source of truth per state type.

## React Query migration (server state)

Typical anti-pattern: API is called via React Query, then result is dispatched to Redux. Flow becomes: Component → useQueries → API → dispatch → Reducer → Redux state → useSelector.

Correct flow: Component → useQuery (or custom hook wrapping it) → same component reads from hook. No Redux/Context in between.

- Prefer generated hooks from `frontend/src/api/generated`.
- For “app state” that is just API data (versions, configs), one hook that returns `{ ...data, configs: useMemo(...) }` is enough. No selectors needed for plain data; useMemo only where the value is used as dependency (e.g. in useState).
- Set `staleTime` / `refetchOnMount` etc. so refetch behavior matches previous expectations.

## nuqs migration (URL state)

Redux/Context often hold pagination, filters, time range, selected values that are shareable. Those belong in the URL.

- Use [nuqs](https://nuqs.dev/docs/basic-usage) for typed search params. Avoid ad-hoc `useSearchParams` + manual encoding.
- Browser limits: Chrome ~2k chars practical; keep payload small; no large datasets or secrets in query params.
- If the app uses TanStack Router, search params can be handled there; otherwise nuqs is the standard.

## Zustand migration (client state)

- One store per domain (e.g. DashboardStore, QueryBuilderStore). Multiple `create()` in one file is disallowed; use one store or composed slices.
- Always use a selector: `useStore(s => s.field)` so only that field drives re-renders.
- Never mutate: update only via `set(state => ({ ... }))` or `setState` / `getState()` + `set`.
- State properties first, then actions. For 5–10+ top-level fields, split into slice factories and combine with one `create()`.
- Large client objects: Zustand is for “large” in the ~1.5–2MB range; above that, optimize at API/store design.
- Testing: no Provider; stores are plain functions; easy to reset and mock.

## What not to use

- **Redux / Context** for new or migrated shared/global state.
- **Redux / Context** to store or mirror React Query results.
- **Redux / Context** for state that should live in the URL (use nuqs).
- **Zustand / Redux / Context** for component-local UI (use useState/useReducer).

## Summary table

| State type   | Use                | Avoid           |
|-------------|--------------------|-----------------|
| Server/API  | React Query        | Redux, Context  |
| URL/shareable | nuqs             | Redux, Context  |
| Global client | Zustand          | Redux, Context  |
| Local UI    | useState/useReducer | Zustand, Redux, Context |
