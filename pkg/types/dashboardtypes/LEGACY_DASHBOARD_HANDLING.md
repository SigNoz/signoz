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
| 1 | `having` array `[{columnName,op,value}]` → `{expression}` | `convertHavingToExpression` (`QueryBuilderV2/utils.ts`) | ✅ `normalizePreV5Having` |
| 2 | `filters {items:[{key,op,value}]}` → `filter {expression}` | `convertFiltersToExpression` (`prepareQueryRangePayloadV5.ts`) | ❌ not mirrored |
| 3 | flat v4 aggregation fields (`aggregateAttribute`/`aggregateOperator`/`timeAggregation`/`spaceAggregation`/`reduceTo`) → `aggregations[]`; empty → `count()` | `prepareQueryRangePayloadV5.ts` `createAggregation` | ✅ `normalizePreV5LogTraceAggregations` (logs/traces only) |
| 4 | old field key `{key,dataType,type}` → `{name,fieldContext,fieldDataType}` (via `name ?? key` fallbacks) | `convertNewToOldQueryBuilder.ts`, `prepareQueryRangePayloadV5.ts` | ✅ `normalizePreV5FieldKeys` |
| 5 | deprecated operators remapped (`regex→REGEXP`, `nin→NOT IN`, `nlike`, `nhas`, …) | `DEPRECATED_OPERATORS_MAP` (`constants/antlrQueryConstants.ts`) | ❌ not mirrored |
| 6 | deprecated intrinsic trace fields stripped (`traceID`/`spanID`/`parentSpanID`/`statusCode`…) | `prepareQueryRangePayloadV5.ts` | ❌ not mirrored |
| 7 | `limit ← pageSize` (old field name) | `prepareQueryRangePayloadV5.ts` | ❌ not mirrored |
| 8 | `adjustQueryForV5` — strip leftover v4 fields off the query root, re-hang on the aggregation | `QueryBuilderV2/utils.ts` | partial (via 3) |
| 9 | legacy V3 composite (`builderQueries`/`promQueries`/`chQueries` objects) → v5 `queries[]` | `mapQueryFromV3` (`mapQueryDataFromApi.ts`) | n/a (backend consumes v5-shaped envelopes) |

## Variables (old saved variable shapes)

| # | Legacy handling | Frontend location |
|---|---|---|
| 10 | TEXTBOX `textboxValue` → `defaultValue` (explicit BWC) | `useTransformDashboardVariables.ts` |
| 11 | backfill missing `id` (UUID) / `order` (pre-UUID, unordered legacy variables) | `useTransformDashboardVariables.ts` |
| 12 | `name`-vs-key duality lookup (legacy mismatched variable name/key) | `useTransformDashboardVariables.ts` |
| 13 | `selectedValue` string\|array polymorphic normalization against `multiSelect` | `normalizeUrlValue.ts` |
| 14 | CUSTOM `"label : value"` comma parsing (legacy value syntax) | `customCommaValuesParser.ts` |

## Widget / panel (old widget fields)

| # | Legacy handling | Frontend location |
|---|---|---|
| 15 | `spanGaps` bool (legacy) — default `true`; polymorphic with newer numeric form | `UPlotSeriesBuilder.ts`, `NewWidget` |
| 16 | `fillSpans` (legacy bool) promoted to `spanGaps`/`fillGaps` | `NewWidget/index.tsx` |
| 17 | `decimalPrecision` string (legacy) \| number polymorphic | `NewWidget`, `getDefaultWidgetData` |
| 18 | `timePreferance` (misspelled legacy field) → `GLOBAL_TIME` fallback | `GridCard`, `NewWidget` |
| 19 | `selectedLogFields`/`selectedTracesFields` legacy null-default + `key→name` on list panels | `NewWidget/index.tsx` |

Items **1, 3, 4** are the ones the backend converter implements today. Items **2,
5, 6** are legacy handlings the backend does **not** yet mirror — none surfaced in
the 122-dashboard repo run, but they are the same class of shape and could affect
other dashboards.

## Excluded (not legacy-content handling)

- **`schemaVersion → 'v6'` default**, Perses adapters (`persesQueryAdapters`),
  `titleUntitledSectionOp` / sections, wrapped-vs-bare import — the new v2 Perses
  (v6) path.
- **`convertV5ResponseToLegacy`** — adapts a current v5 *response* to the internal
  model; not dashboard JSON.
- **v5 ↔ internal adapter renames** (`signal↔dataSource`, `name↔queryName`,
  `orderBy` flatten, `convertNewToOldQueryBuilder`, `compositeQueryToQueryEnvelope`)
  — run for every dashboard; architecture plumbing.
- **Routine optional-field defaults** (`yAxisUnit`, `opacity`, `legendPosition`, …)
  and react-grid-layout `stripUndefined` / `panelMap` — defaults / UI plumbing.
- **DYNAMIC missing `dynamicVariablesAttribute` → skip** — defensive against
  malformed config of any era (the nvidia-dcgm case), not version-legacy.
