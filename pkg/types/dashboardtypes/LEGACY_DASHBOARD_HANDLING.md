# Legacy-dashboard handling in the frontend

Reference for the v1→v2 (Perses) dashboard migration in this package.

The frontend has long coped with **old saved dashboard content** by normalizing it
*by shape* at load / query-build time — it does not trust the `version` /
`schemaVersion` tag. This is the same job the backend converter
(`perses_v1_to_v2_*.go`, especially the `normalizePreV5*` helpers in
`perses_v1_to_v2_queries_malformed.go`) now does on the migration path.

This file catalogs the frontend handlings that exist **specifically to support
legacy content**, so we have a checklist of shapes the backend converter may
also need to normalize. It excludes current-architecture plumbing (v5 API ↔
internal query-builder adapters) and the new v2 Perses / `schemaVersion: v6`
path — those run for every dashboard regardless of age and are not legacy coping.

Line numbers are from a one-time code sweep — treat them as pointers, not gospel.
Legacy-vs-plumbing is a judgment call; verify a specific site before relying on it.

## Query body (old v3/v4 query shapes)

| # | Legacy shape → v5 | Frontend location | Backend converter |
|---|---|---|---|
| 1 | `having` array `[{columnName,op,value}]` → `{expression}` | `convertHavingToExpression` (`QueryBuilderV2/utils.ts`) | ✅ `transition.MigrateQueryDataShapeSafe` (`createHavingExpressionShapeSafe`) |
| 2 | `filters {items:[{key,op,value}]}` → `filter {expression}` | `convertFiltersToExpression` (`prepareQueryRangePayloadV5.ts`) | ✅ `transition.MigrateQueryDataShapeSafe` (`createFilterExpression`) |
| 3 | logs/traces aggregation expression: parse `func(args)`, lift inline `as alias` → `alias`, split multi-part, discard junk (`sum(x) ) )` → `sum(x)`), empty → `count()` | `parseAggregations` / `createAggregation` (`prepareQueryRangePayloadV5.ts`) | ✅ `normalizePreV5LogTraceAggregations` + `parseAggregations` — reshapes an existing malformed `aggregations[]` the migrator skips |
| 4 | old field key `{key,dataType,type}` → `{name,fieldContext,fieldDataType}` (via `name ?? key` fallbacks) | `convertNewToOldQueryBuilder.ts`, `prepareQueryRangePayloadV5.ts` | ✅ `normalizePreV5FieldKeys` (list-panel fields) |
| 5 | `selectColumns` stored v5-shape (`{name,…}`) → readable by the old `{key,…}` mapper; drop empty columns | `name ?? key` read + empty filter (`prepareQueryRangePayloadV5.ts`) | ✅ `normalizePreV5SelectColumns` |
| 6 | deprecated operators remapped (`regex→REGEXP`, `nin→NOT IN`, `nlike`, `nhas`, …) | `DEPRECATED_OPERATORS_MAP` (`constants/antlrQueryConstants.ts`) | ✅ `transition.MigrateQueryDataShapeSafe` (`buildCondition`'s operator switch) |
| 7 | deprecated intrinsic trace fields stripped (`traceID`/`spanID`/`parentSpanID`/`statusCode`…) | `prepareQueryRangePayloadV5.ts` | ❌ not mirrored |
| 8 | `limit ← pageSize` (old field name) | `prepareQueryRangePayloadV5.ts` | ✅ `normalizePreV5PageSize` (list/table panels only) |
| 9 | flat v4 aggregation fields (`aggregateAttribute`/`aggregateOperator`/`timeAggregation`/`spaceAggregation`/`reduceTo`) → `aggregations[]` | `createAggregation`, `adjustQueryForV5` | ✅ `transition.MigrateQueryDataShapeSafe` (`createAggregationsShapeSafe`, metrics + logs/traces) |
| 10 | legacy V3 composite (`builderQueries`/`promQueries`/`chQueries` objects) → v5 `queries[]` | `mapQueryFromV3` (`mapQueryDataFromApi.ts`) | n/a (backend consumes v5-shaped envelopes) |

### Confirmed NOT frontend-repaired (broken source data — fails in the live UI too, so not mirrored)

- **Malformed `filter.expression`** — clauses juxtaposed with no `AND`/`OR` (e.g. `a in $x b in $y`). The frontend passes `filter.expression` verbatim to the query API and its ANTLR path returns the string unchanged on parse error; there is no repair. Manifests as `Found N errors while parsing the search expression`.
- **Dotted variable substitution** (`$k8s.cluster.name`) — handled by the backend `substitute_vars`, not the frontend; not a migration concern.
- **`field not found` (non-empty)** — the referenced metric/attribute genuinely doesn't exist in the query instance; data-dependent, not a shape issue.

## Variables (old saved variable shapes)

| # | Legacy handling | Frontend location | Backend converter |
|---|---|---|---|
| 10 | TEXTBOX `textboxValue` → `defaultValue` (explicit BWC) | `useTransformDashboardVariables.ts` | ✅ `convertV1Variable` reads `textboxValue` into `Value` (variables.go:74) |
| 11 | backfill missing `id` (UUID) / `order` (pre-UUID, unordered legacy variables) | `useTransformDashboardVariables.ts` | ✅ order via sort-by-`order`-then-UUID-key tiebreak (variables.go:44); `id` n/a — v2 keys variables by `Name`, not a UUID |
| 12 | `name`-vs-key duality lookup (legacy mismatched variable name/key) | `useTransformDashboardVariables.ts` | n/a — runtime URL-param lookup, not saved-dashboard shape |
| 13 | `selectedValue` string\|array polymorphic normalization against `multiSelect` | `normalizeUrlValue.ts` | ✅ `mapV1VariableDefault`/`defaultValueFromAny` type-switch |

## Widget / panel (old widget fields)

| # | Legacy handling | Frontend location | Backend converter |
|---|---|---|---|
| 15 | `spanGaps` bool (legacy) — default `true`; polymorphic with newer numeric form | `UPlotSeriesBuilder.ts`, `NewWidget` | ✅ `mapV1SpanGaps` |
| 16 | `fillSpans` (legacy bool) promoted to `spanGaps`/`fillGaps` | `NewWidget/index.tsx` | ✅ `readBool` (panels.go:82) |
| 17 | `decimalPrecision` string (legacy) \| number polymorphic | `NewWidget`, `getDefaultWidgetData` | ✅ `mapV1Precision` |
| 18 | `timePreferance` (misspelled legacy field) → `GLOBAL_TIME` fallback | `GridCard`, `NewWidget` | ✅ `mapV1TimePreference` |
| 19 | `selectedLogFields`/`selectedTracesFields` legacy null-default + `key→name` on list panels | `NewWidget/index.tsx` | ✅ `mapV1SelectFields` + `normalizePreV5FieldKeys` |

## Layouts & sections (old react-grid-layout / section shapes)

| # | Legacy shape | Frontend location | Backend converter |
|---|---|---|---|
| L1 | orphan `layout` entries — `i` for a deleted widget or the `__dropping-elem__`/`'empty'` drag placeholder | `getUpdatedLayout.ts` (filters `i==='empty'`) | ✅ dropped: `layout` id must be a real widget (layouts.go:60) |
| L2 | duplicate `layout` `i` (same widget listed twice) | `getUpdatedLayout.ts` (dedupe, keep first) | ✅ deduped in stored order before sort, first occurrence wins (layouts.go) |
| L3 | undefined `x`/`y`/`w`/`h` on a layout entry | `GridCardLayout/utils.ts` (strip undefined) | ✅ `readInt` defaults missing coords to 0 |
| L4 | unsorted / non-zero-based positions | `providers/Dashboard/util.ts` (`sortLayout`) | ✅ `sortByPosition` + `y` rebased to 0 (layouts.go:132) |
| L5 | `panelMap` missing, or `panelMap[id]` stored as a bare `[]widgetID` | `GridCardLayout/utils.ts`, `useDashboardBootstrap.ts` | ✅ lenient read → "not collapsed" (layouts.go:104) |
| L6 | `layout` entry for a widget that never becomes a panel (unknown/`EMPTY_WIDGET` type, or failed conversion) | frontend only renders panels it holds | ✅ layout pass gates on panel-created, not widget-exists (`panels` map + `panelBackedItems` for collapsed children) |
| S1 | pre-collapsible-sections dashboard (no section metadata) | `useDashboardBootstrap.ts` (`defaultTo({})`) | ✅ positional grouping; unnamed grid for panels above the first row |

The backend converter mirrors nearly all of the above. Query body: the bulk of
the pre-v5 upgrade (items 1, 2, 6, 9, plus orderBy/functions) is **delegated to
the shared migrator** — `transition.MigrateQueryDataShapeSafe`, the shape-safe
(idempotent) entry point added so the converter reuses `pkg/transition`'s v4→v5
logic instead of duplicating it (`perses_v1_to_v2_queries.go` calls it per query
via `normalizePreV5QueryData`). What remains in `perses_v1_to_v2_queries_malformed.go`
are the reshapes the migrator does not do: item 3 (reshaping an already-present
but malformed `aggregations[]`), item 5 (`selectColumns`), item 4 (list-panel
field keys), and item 8 (`pageSize`) — each specific to how this converter
consumes the result. Item 10 is n/a (the converter builds v5 envelopes itself),
and item 7 (deprecated trace-field stripping) stays unmirrored on purpose — a
live-request concern, not a decode blocker, and stripping fields on a persisted
migration would silently drop user-configured columns/group-bys. Variables and
widgets are handled in the structural passes (`perses_v1_to_v2_variables.go` /
`_panels.go`), not the malformed-queries file.

**Open items:** none. L2 (duplicate `layout` ids) and L6 (dangling grid ref) are
now handled; neither surfaced in the 122-dashboard repo run.

## Excluded (not legacy-content handling)

- **`schemaVersion → 'v6'` default**, Perses adapters (`persesQueryAdapters`),
  `titleUntitledSectionOp`, wrapped-vs-bare import — the new v2 Perses (v6) path.
  (Legacy *section/layout* coping is now catalogued above under "Layouts &
  sections" — only the v6 write path is excluded here.)
- **`convertV5ResponseToLegacy`** — adapts a current v5 *response* to the internal
  model; not dashboard JSON.
- **v5 ↔ internal adapter renames** (`signal↔dataSource`, `name↔queryName`,
  `orderBy` flatten, `convertNewToOldQueryBuilder`, `compositeQueryToQueryEnvelope`)
  — run for every dashboard; architecture plumbing.
- **Routine optional-field defaults** (`yAxisUnit`, `opacity`, `legendPosition`, …)
  and react-grid-layout `stripUndefined` / `panelMap` — defaults / UI plumbing.
- **DYNAMIC missing `dynamicVariablesAttribute` → skip** — defensive against
  malformed config of any era (the nvidia-dcgm case), not version-legacy.
