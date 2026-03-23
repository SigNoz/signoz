---
name: migrate-state-management
description: Migrate Redux or React Context to the correct state option (React Query for server state, nuqs for URL/shareable state, Zustand for global client state). Use when refactoring away from Redux/Context, moving state to the right store, or when the user asks to migrate state management.
---

# Migrate State: Redux/Context → React Query, nuqs, Zustand

Do **not** introduce or recommend Redux or React Context. Migrate existing usage to the stack below.

## 1. Classify the state

Before changing code, classify what the state represents:

| If the state is… | Migrate to | Do not use |
|------------------|------------|------------|
| From API / server (versions, configs, fetched lists, time-series) | **React Query** | Redux, Context |
| Shareable via URL (filters, time range, page, selected ids) | **nuqs** | Redux, Context |
| Global/client UI (dashboard lock, query builder, feature flags, large client objects) | **Zustand** | Redux, Context |
| Local to one component (inputs, toggles, hover) | **useState / useReducer** | Zustand, Redux, Context |

If one slice mixes concerns (e.g. Redux has both API data and pagination), split: API → React Query, pagination → nuqs, rest → Zustand or local state.

## 2. Migrate to React Query (server state)

**When:** State comes from or mirrors an API response (e.g. `currentVersion`, `latestVersion`, `configs`, lists).

**Steps:**

1. Find where the data is fetched (existing `useQuery`/API call) and where it is dispatched or set in Context/Redux.
2. Remove the dispatch/set that writes API results into Redux/Context.
3. Expose a single hook that uses the query and returns the same shape consumers expect (use `useMemo` for derived objects like `configs` to avoid unnecessary re-renders).
4. Replace Redux/Context consumption with the new hook. Prefer generated React Query hooks from `frontend/src/api/generated` when available.
5. Configure cache/refetch (e.g. `refetchOnMount: false`, `staleTime`) so behavior matches previous “single source” expectations.

**Before (Redux mirroring React Query):**

```tsx
if (getUserLatestVersionResponse.isFetched && getUserLatestVersionResponse.isSuccess && getUserLatestVersionResponse.data?.payload) {
  dispatch({ type: UPDATE_LATEST_VERSION, payload: { latestVersion: getUserLatestVersionResponse.data.payload.tag_name } })
}
```

**After (single source in React Query):**

```tsx
export function useAppStateHook() {
  const { data, isError } = useQuery(...)
  const memoizedConfigs = useMemo(() => ({ ... }), [data?.configs])
  return {
    latestVersion: data?.payload?.tag_name,
    configs: memoizedConfigs,
    isError,
  }
}
```

Consumers use `useAppStateHook()` instead of `useSelector` or Context. Do not copy React Query result into Redux or Context.

## 3. Migrate to nuqs (URL / shareable state)

**When:** State should be in the URL: filters, time range, pagination, selected values, view state. Keep payload small (e.g. Chrome ~2k chars); no large datasets or sensitive data.

**Steps:**

1. Identify which Redux/Context fields are shareable or already reflected in the URL (e.g. `currentPage`, `timeRange`, `selectedFilter`).
2. Add nuqs (or use existing): `useQueryState('param', parseAsString.withDefault('…'))` (or `parseAsInteger`, etc.).
3. Replace reads/writes of those fields with nuqs hooks. Use typed parsers; avoid ad-hoc `useSearchParams` encoding/decoding.
4. Remove the same fields from Redux/Context and their reducers/providers.

**Before (Context/Redux):**

```tsx
const { timeRange } = useContext(SomeContext)
const [page, setPage] = useDispatch(...)
```

**After (nuqs):**

```tsx
const [timeRange, setTimeRange] = useQueryState('timeRange', parseAsString.withDefault('1h'))
const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
```

## 4. Migrate to Zustand (global client state)

**When:** State is global or cross-component client state: feature flags, dashboard state, query builder state, complex/large client objects (e.g. up to ~1.5–2MB). Not for server cache or local-only UI.

**Steps:**

1. Create one store per domain (e.g. `DashboardStore`, `QueryBuilderStore`). One `create()` per module; for large state use slice factories and combine.
2. Put state properties first, then actions. Use `set` (or `setState` / `getState()` + `set`) for updates; never mutate state directly.
3. Replace Context/Redux consumption with the store hook **and a selector** so only the used slice triggers re-renders.
4. Remove the old Context provider / Redux slice and related dispatches.

**Selector (required):**

```tsx
const isLocked = useDashboardStore(state => state.isDashboardLocked)
```

Never use `useStore()` with no selector. Never do `state.foo = x` inside actions; use `set(state => ({ ... }))`.

**Before (Context/Redux):**

```tsx
const { isDashboardLocked, setLocked } = useContext(DashboardContext)
```

**After (Zustand):**

```tsx
const isLocked = useDashboardStore(state => state.isDashboardLocked)
const setLocked = useDashboardStore(state => state.setLocked)
```

For large stores (many top-level fields), split into slices and combine:

```tsx
const createBearSlice = set => ({ bears: 0, addBear: () => set(s => ({ bears: s.bears + 1 })) })
const useStore = create(set => ({ ...createBearSlice(set), ...createFishSlice(set) }))
```

Add `eslint-plugin-zustand-rules` with `plugin:zustand-rules/recommended` to enforce selectors and no direct mutation.

## 5. Migrate to local state (useState / useReducer)

**When:** State is used only inside one component or a small subtree (form inputs, toggles, hover, panel selection). No URL sync, no cross-feature sharing.

**Steps:**

1. Move the state into the component that owns it (or the smallest common parent).
2. Use `useState` or `useReducer` (useReducer when multiple related fields change together).
3. Remove from Redux/Context and any provider/slice.

Do not use Zustand, Redux, or Context for purely local UI state.

## 6. Migration checklist

- [ ] Classify each piece of state (server / URL / global client / local).
- [ ] Server state: move to React Query; expose via hook; remove Redux/Context mirroring.
- [ ] URL state: move to nuqs; remove from Redux/Context; keep URL payload small.
- [ ] Global client state: move to Zustand with selectors and immutable updates; one store per domain.
- [ ] Local state: move to useState/useReducer in the owning component.
- [ ] Remove old Redux slices / Context providers and all dispatches/consumers for migrated state.
- [ ] Do not duplicate the same data in multiple places (e.g. React Query + Redux).

## Additional resources

- Project rule: [.cursor/rules/state-management.mdc](../../rules/state-management.mdc)
- Detailed patterns and rationale: [reference.md](reference.md)
