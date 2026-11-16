---
paths:
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.tsx"
---

# Frontend state

Pick the store by what the state is. Never add Redux or React Context for shared state; to move existing Redux or Context state, use the `migrate-state-management` skill ([`frontend/.claude/skills/migrate-state-management/SKILL.md`](../../frontend/.claude/skills/migrate-state-management/SKILL.md)).

| State | Use | Never |
|---|---|---|
| Server / API data | React Query, generated hooks from `src/api/generated` | a copy in Redux, Context or Zustand |
| Shareable: filters, time range, selection, page | nuqs (`useQueryState` with a parser) | Redux, Context, hand-parsed `useSearchParams` |
| Global client state | a small Zustand store per domain | Redux, Context |
| One component's UI state | `useState` / `useReducer` | any store |

## Server state

- Expose a query through a hook that returns its result plus memoized derived values. Never dispatch a response into another store.
- **The query key holds every value the request reads.** A field change that alters the request (name, context, data type) must change the key; a lossy signature serves stale rows.

## URL state

- Keep the URL small (Chrome trims near 2k characters). No large datasets, no sensitive data.
- **A rewrite touches only the params it owns.** Repairing or normalising one param keeps the rest (`activeLogId`, pagination) as they were.
- **Links carry the current time range.** A row link, "open in new tab" and "copy link" land on the same period as an in-app click.
- **A preset read from the URL applies once.** A later user change or reset must not re-apply it.

## Zustand

- One `create()` per module; split a large store into slice factories combined in that one `create()`.
- Always read through a selector: `useDashboardStore((s) => s.isDashboardLocked)`, never `useDashboardStore()`.
- Update only through `set`; never mutate state. State fields before actions in the store object.
- Hooks never call `useStore.getState()` (`signoz/no-zustand-getstate-in-hooks`); export standalone actions instead.

## Local and form state

- **Editable state starts from saved data once.** Initialise the form from the saved value, then let the user own it; never re-derive it from saved data on each render.
- **A mode switch owns its in-flight work.** While a request from one mode runs, disable the switch or drop the result when the mode changes, so it can't close or overwrite the new mode.
