import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import { initialQueryBuilderFormValuesMap } from 'constants/queryBuilder';
import type { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type {
	IBuilderFormula,
	IBuilderQuery,
	IBuilderTraceOperator,
	IClickHouseQuery,
	IPromQLQuery,
	OrderByPayload,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import type {
	BuilderQuery,
	ClickHouseQuery,
	CompositeQuery,
	GroupByKey,
	OrderBy,
	PromQuery,
	QueryBuilderFormula,
	QueryEnvelope,
} from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';

import { makeEmptyV1Query, signalToDataSource } from './shared';

// IPromQLQuery and IClickHouseQuery are structurally identical
// ({name, query, disabled, legend}). Both v5 PromQuery and ClickHouseQuery
// carry the same four required-on-wire fields. One helper covers both.
type NamedQueryV5 = Pick<PromQuery, 'name' | 'query' | 'disabled' | 'legend'>;

/**
 * Converts the perses on-wire envelope to the V1 in-memory `Query` shape that
 * QueryBuilderContext consumes.
 *
 * Always returns a fully-inflated `{queryData, queryFormulas, queryTraceOperator}`
 * shape so the QB UI never branches on "is the builder hydrated yet."
 *
 * Phase 5: all six perses plugin kinds (BuilderQuery, CompositeQuery, Formula,
 * TraceOperator, PromQLQuery, ClickHouseSQL) handled both at top level and
 * inside CompositeQuery. Composite queryType resolution: all-promql → PROM,
 * all-clickhouse → CLICKHOUSE, otherwise QUERY_BUILDER.
 */
export function fromPerses(persesQueries: DashboardtypesQueryDTO[]): Query {
	// Backend invariant: panel.queries.length === 1. We trust that here and
	// only consume the first entry — extras (a malformed payload) are ignored.
	const plugin = persesQueries[0]?.spec?.plugin;
	const result = makeEmptyV1Query();

	// Defensive: skip if plugin is missing or its spec is absent. v5BuilderToV1
	// and friends assume a non-undefined spec, so a missing one would otherwise
	// crash inside a helper.
	if (!plugin?.spec) {
		return result;
	}

	switch (plugin.kind) {
		case 'signoz/BuilderQuery':
			result.builder.queryData.push(v5BuilderToV1(plugin.spec as BuilderQuery));
			break;
		// Top-level Formula and TraceOperator are invalid — they reference
		// builder queries by name and can only appear *inside* a CompositeQuery
		// that also contains the referenced builder query. Defensive read: warn
		// and drop, don't crash dashboard load.
		case 'signoz/Formula':
		case 'signoz/TraceOperator':
			// eslint-disable-next-line no-console
			console.warn(
				`fromPerses: top-level ${plugin.kind} is invalid (formulas and ` +
					'trace operators must travel inside a CompositeQuery alongside ' +
					'the builder query they reference). Dropping.',
			);
			break;
		case 'signoz/PromQLQuery':
			result.promql.push(v5NamedQueryToV1(plugin.spec as PromQuery));
			result.queryType = EQueryType.PROM;
			break;
		case 'signoz/ClickHouseSQL':
			result.clickhouse_sql.push(v5NamedQueryToV1(plugin.spec as ClickHouseQuery));
			result.queryType = EQueryType.CLICKHOUSE;
			break;
		case 'signoz/CompositeQuery': {
			const composite = plugin.spec as CompositeQuery;
			const subqueries = composite.queries ?? [];
			subqueries.forEach((sub) => dispatchSubquery(sub, result));
			warnIfFormulaOrTraceOperatorWithoutBuilder(subqueries);
			result.queryType = resolveCompositeQueryType(subqueries);
			break;
		}
		default:
			break;
	}

	return result;
}

// Mirrors the toPerses save-time invariant: formulas and trace operators
// inside a CompositeQuery must be accompanied by at least one builder_query
// subquery. On read we warn rather than throw — existing (legacy or manually-
// edited) dashboards keep loading; the diagnostic surfaces the bad state.
function warnIfFormulaOrTraceOperatorWithoutBuilder(
	subqueries: QueryEnvelope[],
): void {
	const hasBuilder = subqueries.some((s) => s.type === 'builder_query');
	if (hasBuilder) {
		return;
	}
	const hasFormulaOrOp = subqueries.some(
		(s) => s.type === 'builder_formula' || s.type === 'builder_trace_operator',
	);
	if (hasFormulaOrOp) {
		// eslint-disable-next-line no-console
		console.warn(
			'fromPerses: CompositeQuery contains formulas/trace-operators but no ' +
				'builder_query subquery to reference. The saved panel is in an ' +
				'invalid state.',
		);
	}
}

// Composite queryType resolution: all-promql → PROM, all-clickhouse →
// CLICKHOUSE, otherwise QUERY_BUILDER. V1's queryType is a single value
// (the QB UI picks which sub-list is "active") so mixed-type composites
// default to QUERY_BUILDER and the QB shows the builder tab.
function resolveCompositeQueryType(subqueries: QueryEnvelope[]): EQueryType {
	if (subqueries.length === 0) {
		return EQueryType.QUERY_BUILDER;
	}
	const types = new Set(subqueries.map((s) => s.type));
	if (types.size === 1 && types.has('promql')) {
		return EQueryType.PROM;
	}
	if (types.size === 1 && types.has('clickhouse_sql')) {
		return EQueryType.CLICKHOUSE;
	}
	return EQueryType.QUERY_BUILDER;
}

// Distributes a CompositeQuery subquery into the right V1 bucket on `result`,
// based on its v5 envelope `type`. Each phase adds another branch.
function dispatchSubquery(sub: QueryEnvelope, result: Query): void {
	// Defensive: a malformed subquery without a spec is skipped — converting an
	// undefined spec would crash inside a helper. The well-formed siblings in
	// the same composite still flow through.
	if (!sub.spec) {
		return;
	}
	switch (sub.type) {
		case 'builder_query':
			result.builder.queryData.push(v5BuilderToV1(sub.spec as BuilderQuery));
			break;
		case 'builder_formula':
			result.builder.queryFormulas.push(
				v5FormulaToV1(sub.spec as QueryBuilderFormula & { disabled?: boolean }),
			);
			break;
		case 'builder_trace_operator':
			result.builder.queryTraceOperator.push(
				v5TraceOperatorToV1(sub.spec as BuilderQuery),
			);
			break;
		case 'promql':
			result.promql.push(v5NamedQueryToV1(sub.spec as PromQuery));
			break;
		case 'clickhouse_sql':
			result.clickhouse_sql.push(v5NamedQueryToV1(sub.spec as ClickHouseQuery));
			break;
		default:
			break;
	}
}

// Maps a v5 BuilderQuery (the union of Log/Metric/Trace/Meter variants) back to
// the V1 in-memory IBuilderQuery shape. Fields the v5 spec doesn't carry come
// from the signal-specific default in `initialQueryBuilderFormValuesMap`.
function v5BuilderToV1(spec: BuilderQuery): IBuilderQuery {
	const dataSource = signalToDataSource(spec.signal);
	const base = initialQueryBuilderFormValuesMap[dataSource];
	const name = spec.name ?? base.queryName;

	return {
		...base,
		queryName: name,
		expression: name,
		dataSource,
		aggregations: spec.aggregations ?? base.aggregations,
		filter: spec.filter ?? { expression: '' },
		// V1's `filters` is the legacy V4 tag-filter input. The v5 spec doesn't
		// carry it; the QB UI reconstructs items from `filter.expression` when
		// parsing the saved query.
		filters: { items: [], op: 'AND' },
		groupBy: (spec.groupBy ?? []).map(v5GroupByToV1),
		orderBy: (spec.order ?? []).map(v5OrderByToV1),
		// v5 Step = string | number; V1 stepInterval = number | null. Strings
		// like "30s" can't be coerced losslessly here — drop to null and let
		// the UI re-derive.
		stepInterval:
			typeof spec.stepInterval === 'number' ? spec.stepInterval : null,
		limit: spec.limit ?? null,
		legend: spec.legend ?? '',
		disabled: spec.disabled ?? false,
		having: spec.having ?? [],
		functions: spec.functions ?? [],
		selectColumns: spec.selectFields,
		offset: spec.offset,
		// Only the MeterBuilderQuery variant has `source`; the discriminator
		// check keeps TS happy and produces `''` for non-meter variants.
		source: 'source' in spec ? spec.source : '',
	};
}

// v5 GroupByKey uses the v5 TelemetryFieldKey field names. V1 BaseAutocompleteData
// uses the legacy {key, dataType, type} names.
function v5GroupByToV1(g: GroupByKey): BaseAutocompleteData {
	return {
		key: g.name,
		dataType: g.fieldDataType as BaseAutocompleteData['dataType'],
		type: (g.fieldContext as BaseAutocompleteData['type']) ?? '',
		id: '',
	};
}

// v5 OrderBy uses {key:{name}, direction}; V1 OrderByPayload uses {columnName, order}.
function v5OrderByToV1(o: OrderBy): OrderByPayload {
	return {
		columnName: o.key?.name ?? '',
		order: o.direction,
	};
}

// v5 QueryBuilderFormula: {name, expression, functions?, order?, limit?, having?, legend?}.
// The on-wire shape also carries `disabled` (emitted by prepareQueryRangePayloadV5)
// even though the local v5 interface omits it — the intersection on the
// parameter type makes this explicit at the helper signature.
// V1 IBuilderFormula uses {queryName, expression, disabled, legend, limit, having[], orderBy}.
function v5FormulaToV1(
	spec: QueryBuilderFormula & { disabled?: boolean },
): IBuilderFormula {
	return {
		queryName: spec.name,
		expression: spec.expression,
		disabled: spec.disabled ?? false,
		legend: spec.legend ?? '',
		limit: spec.limit,
		// v5 having is {expression: string}; V1 having on formula is Having[].
		// They're not structurally compatible — drop to empty array.
		having: [],
		stepInterval: undefined,
		orderBy: (spec.order ?? []).map(v5OrderByToV1),
	};
}

// A v5 trace operator spec is structurally a BuilderQuery (BaseBuilderQuery
// + signal-specific aggregations) carrying the trace-operator `expression`
// field. V1 IBuilderTraceOperator is an alias for IBuilderQuery, so we delegate
// the bulk of the mapping to v5BuilderToV1 and override `expression`.
function v5TraceOperatorToV1(spec: BuilderQuery): IBuilderTraceOperator {
	const base = v5BuilderToV1(spec);
	return {
		...base,
		expression: spec.expression ?? base.expression,
	};
}

// v5 PromQuery / ClickHouseQuery carry an identical {name, query, disabled?,
// legend?} core; V1 IPromQLQuery and IClickHouseQuery are also structurally
// identical {name, query, disabled, legend}. The intersection return type lets
// callers push the result into either V1 list.
function v5NamedQueryToV1(spec: NamedQueryV5): IPromQLQuery & IClickHouseQuery {
	return {
		name: spec.name,
		query: spec.query,
		disabled: spec.disabled ?? false,
		legend: spec.legend ?? '',
	};
}
