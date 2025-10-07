# JSON Typed Column Integration Plan for SigNoz Telemetry Logs

## Current State Analysis

### Existing JSON Infrastructure
- **JSON Columns**: `body_v2`, `promoted`, and `resource` are already defined as `schema.JSONColumnType{}` in ClickHouse
- **String JSON Support**: Current `body.field` queries use string-based JSON functions (`JSON_VALUE`, `JSONExtract`, `JSON_EXISTS`) on the legacy `body` column
- **Resource JSON**: Already supports JSON typed columns for resource context fields
- **BodyConditionBuilder**: Exists but unused - has CTE building logic for complex JSON array traversal

### Current Limitations
1. **Field Mapper Restriction**: JSON columns only allowed for `resource` context, not `body` or `attribute` contexts
2. **Hardcoded Blocks**: `CollisionHandledFinalExpr` explicitly blocks body JSON fields from GROUP BY/aggregations (line 108-110)
3. **String-Only Path**: All `body.field` queries route through string JSON functions, ignoring `body_v2`
4. **No CTE Integration**: Complex JSON array traversal CTEs aren't integrated into main query pipeline
5. **Limited Type Inference**: Basic type inference exists but not fully utilized

## Architecture Overview

The query building pipeline has these key components:
- **FieldMapper**: Maps field keys to column names/expressions
- **ConditionBuilder**: Builds WHERE clause conditions
- **StatementBuilder**: Builds complete SQL queries (SELECT, FROM, WHERE, GROUP BY, ORDER BY)
- **AggExprRewriter**: Handles aggregation function rewriting
- **CTE Management**: Combines CTE fragments for complex queries

## Implementation Plan

### Phase 1: Core JSON Field Support (Minimal Viable Integration)

#### 1.1 Extend Field Mapper for Body JSON Fields
**File**: `pkg/telemetrylogs/field_mapper.go`

**Changes**:
- Remove the restriction that limits JSON columns to `resource` context only
- Add support for `body.field` → `body_v2.field` mapping
- Generate `dynamicElement(body_v2.field, 'Type')` expressions for JSON fields

**Key Changes**:
```go
// In FieldFor method, change:
if key.FieldContext != telemetrytypes.FieldContextResource {
    return "", errors.Newf(...) // REMOVE THIS RESTRICTION
}

// Add body JSON field handling:
if strings.HasPrefix(key.Name, BodyJSONStringSearchPrefix) {
    // Use body_v2 for JSON typed queries
    return fmt.Sprintf("dynamicElement(body_v2.%s, '%s')", 
        strings.TrimPrefix(key.Name, BodyJSONStringSearchPrefix),
        getJSONTypeForField(key)), nil
}
```

#### 1.2 Update Condition Builder
**File**: `pkg/telemetrylogs/condition_builder.go`

**Changes**:
- Modify `conditionFor` to use JSON typed expressions for `body.field` queries
- Integrate with existing `BodyConditionBuilder` for complex array traversal
- Maintain backward compatibility with string JSON fallback

#### 1.3 Remove GROUP BY Restrictions
**File**: `pkg/querybuilder/fallback_expr.go`

**Changes**:
- Remove the hardcoded block that prevents body JSON fields from GROUP BY
- Enable `jsonKeyToKey` function for body JSON fields in aggregations

### Phase 2: Advanced JSON Features

#### 2.1 CTE Integration for Complex JSON
**Files**: `pkg/telemetrylogs/body_condition_builder.go`, `pkg/querybuilder/cte.go`

**Changes**:
- Integrate `BodyConditionBuilder` CTE logic into main query pipeline
- Add CTE fragment management for array-of-JSON traversal
- Update statement builders to handle CTE fragments from JSON conditions

#### 2.2 Enhanced Type Inference
**File**: `pkg/telemetrylogs/json_string.go`

**Changes**:
- Improve type inference for JSON fields
- Add support for nested JSON type detection
- Better handling of array types in JSON

#### 2.3 Aggregation Support
**File**: `pkg/querybuilder/agg_rewrite.go`

**Changes**:
- Enable aggregation functions on JSON fields
- Add proper type casting for JSON values in aggregations
- Handle JSON field extraction in complex aggregation expressions

### Phase 3: Performance and Optimization

#### 3.1 Index Optimization
- Ensure proper indexing for `body_v2` JSON column
- Add materialized columns for frequently accessed JSON paths
- Optimize CTE queries for complex JSON traversal

#### 3.2 Query Optimization
- Minimize CTE overhead for simple JSON queries
- Optimize type inference to avoid unnecessary casts
- Add query plan analysis for JSON-heavy queries

## Implementation Decisions (Confirmed)

### 1. Backward Compatibility
**Decision**: Use feature flag `BODY_JSON_QUERY = true` to enable JSON typed column support
- When enabled: Use `body_v2` with `dynamicElement` expressions
- When disabled: Fall back to existing string JSON approach
- Maintains full backward compatibility

### 2. CTE Management Strategy
**Decision**: Integrate JSON CTEs with existing CTE management system
- JSON CTEs will be automatically stitched together with other CTEs
- No separate JSON CTE manager needed
- Leverage existing `CombineCTEs` and `PrependArgs` functions

### 3. Type Inference Scope
**Decision**: Use `signoz_logs.distributed_path_types` table for sophisticated type inference
- Query the path_types table to get actual types for JSON paths
- Support all query types based on the path passed for querying
- Runtime type detection from metadata store

### 4. Error Handling
**Decision**: Fail fast with clear error messages
- No graceful degradation or automatic type coercion
- Clear error messages for JSON path errors and type mismatches
- Maintains data integrity and prevents silent failures

### 5. Performance vs Features
**Decision**: Support all types of queries for JSON based on the path
- Full feature set from the start
- No performance-based feature limitations
- All query types (SELECT, WHERE, GROUP BY, ORDER BY, aggregations) supported

## Testing Strategy

### Unit Tests
- Field mapper JSON expression generation
- Condition builder JSON condition building
- Type inference accuracy
- CTE fragment generation

### Integration Tests
- End-to-end query building with JSON fields
- GROUP BY and aggregation with JSON fields
- Complex JSON array traversal queries
- Performance regression tests

### Migration Tests
- Backward compatibility with existing queries
- Data consistency between `body` and `body_v2` columns
- Query result validation

## Risk Assessment

### High Risk
- **Breaking Changes**: Modifying core field mapper could break existing functionality
- **Performance Impact**: CTE-heavy JSON queries could impact query performance
- **Data Consistency**: Ensuring `body` and `body_v2` contain equivalent data

### Medium Risk
- **Complex Queries**: Array-of-JSON traversal queries are inherently complex
- **Type Safety**: JSON type inference could lead to runtime errors
- **Memory Usage**: CTE fragments could increase memory usage for complex queries

### Low Risk
- **Backward Compatibility**: String JSON fallback provides safety net
- **Incremental Rollout**: Can be enabled feature-by-feature
- **Testing Coverage**: Existing test infrastructure can be extended

## Success Metrics

1. **Functionality**: All existing `body.field` queries work with JSON typed columns
2. **Performance**: No significant performance regression for JSON queries
3. **Features**: GROUP BY and aggregations work with JSON fields
4. **Compatibility**: Existing dashboards and queries continue to work
5. **Maintainability**: Code is clean, well-tested, and documented

## Implementation Status

### Completed ✅
- [x] Feature flag `BODY_JSON_QUERY` added to licensing system
- [x] JSON field resolver with path_types table integration
- [x] **Multi-type support** - handles multiple types per JSON path (scalar + array)
- [x] **Context-aware expressions** - different expressions based on filter operator
- [x] Field mapper extended to support body JSON fields
- [x] Condition builder updated for JSON typed expressions
- [x] GROUP BY restrictions removed for JSON fields
- [x] CTE management integrated for complex JSON queries
- [x] Comprehensive test coverage added
- [x] Provider updated to use JSON resolver
- [x] All linting errors resolved

### Ready for Testing 🧪
- [ ] Performance testing and optimization
- [ ] Integration testing with real ClickHouse data
- [ ] End-to-end testing with feature flag enabled

### Pending ⏳
- [ ] Frontend integration
- [ ] Migration scripts for existing data
- [ ] Monitoring and alerting setup
- [ ] Documentation updates

---

## Logs JSON Typed Columns - Final Design (Option A)

### Goals
- Introduce ClickHouse JSON typed columns for logs with minimal surface-area changes.
- Centralize query-shaping (WITH/ARRAY JOIN/rewrites) in one place for maintainability and concurrency-safety.
- Support multi-typed JSON paths, including Array(JSON) and Array(Dynamic), without any casts.

### Feature Flag
- `BODY_JSON_QUERY` controls enabling JSON typed behavior.
- When disabled: legacy string JSON path handling stays intact.

### Ownership Boundaries
- `BodyConditionBuilder`: WHERE-only. No CTEs, no ARRAY JOINs, no context side-effects.
- `statement_builder` (logs): single orchestration point for:
  - WITH CTE stitching (including existing resource filter CTE).
  - ARRAY JOIN planning and emission into the FROM clause.
  - Group By/Order By expression rewrites to reference joined aliases.
- `FieldMapper.ColumnExpressionFor`:
  - Plain SELECT projections stay raw (`body_v2.path`).
  - If future filters/aggregations demand typed narrowing, we may selectively return `dynamicElement(...)` here based on hints (not required now).

### JSON Path Semantics
- `:` denotes array hops (nesting through arrays), e.g., `body.a:b:c.d` means two array traversals before scalar/terminal key.
- Type resolution source: ClickHouse table `signoz_logs.distributed_path_types` queried per path hop.
- No casts. Rely on ClickHouse dynamic/JSON semantics and array functions.

### Type-Aware ARRAY JOIN Planning (deterministic)
Per array hop, resolve types for the hop base (the segment prior to hop):
- If Array(JSON) exists: emit ARRAY JOIN directly on that array.
- If Array(Dynamic) exists: filter to JSON and then ARRAY JOIN:
  - `arrayFilter(x -> dynamicType(x) = 'JSON', dynamicElement(base, 'Array(Dynamic)'))`
  - then `ARRAY JOIN dynamicElement(dynamic_item_i, 'JSON') AS json_item_i`
- If both Array(JSON) and Array(Dynamic) exist:
  - Plan both branches and UNION ALL (no casts/coalesce). Order is deterministic: Array(JSON) branch first, then Array(Dynamic) branch.

### GROUP BY Rewrites With ARRAY JOINs
- For each Group By key that contains one or more `:` hops:
  - Build an ARRAY JOIN chain with stable aliases per hop:
    - `dynamic_item_0`, `json_item_0`, then `dynamic_item_1`, `json_item_1`, ...
  - Rewrite the Group By expression to use the last JSON alias:
    - `dynamicElement(json_item_k.<rest_of_path>, 'T')`
  - ORDER BY on the same keys follows the rewritten expressions.

### SELECT Projections
- For vanilla selects, return raw `body_v2.path` to include all types.
- No typed narrowing in SELECT unless strictly required later by aggregations (out of scope now).

### WHERE Behavior (recap)
- `BodyConditionBuilder` stays responsible for WHERE predicates only.
- No planning/side-effects; condition building is independent of ARRAY JOINs.

### UNION ALL Strategy (no casts, no coalesce)
- When a hop has both Array(JSON) and Array(Dynamic), we construct two logical branches and `UNION ALL` them.
- Each branch performs exactly one ARRAY JOIN per hop chain, and downstream grouping happens on the unioned stream.
- This avoids `ifNull/arrayConcat` and preserves correctness without casts.

### Concurrency & Determinism
- All planning is per-request and performed inside `statement_builder`.
- No global mutable state or context-carried collectors.
- Deduplicate joins by path; preserve deterministic alias naming per request.

### Testing Plan (follow-up)
- Unit tests: planner resolves types and emits joins correctly for:
  - Only Array(JSON)
  - Only Array(Dynamic)
  - Both present (UNION ALL)
  - Multi-hop (`a:b:c`) with mixed types per hop
- Integration tests: end-to-end GROUP BY queries over JSON arrays with/without filters.

### Rollout Notes
- Start behind `BODY_JSON_QUERY`.
- Monitor ClickHouse query plans and latency for ARRAY JOIN + UNION ALL patterns.


## Next Steps

1. **Get approval** for the overall approach and answer the implementation questions
2. **Start with Phase 1** - core JSON field support
3. **Implement incrementally** with thorough testing at each step
4. **Monitor performance** and adjust approach as needed
5. **Plan migration strategy** for existing users

---

**Estimated Timeline**: 2-3 weeks for Phase 1, 4-6 weeks for full implementation
**Priority**: High - this addresses a core limitation in the current architecture
**Dependencies**: ClickHouse JSON column support, existing CTE infrastructure
