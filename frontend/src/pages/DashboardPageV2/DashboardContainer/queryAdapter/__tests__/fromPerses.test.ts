import {
	Querybuildertypesv5RequestTypeDTO,
	type DashboardtypesQueryDTO,
	type DashboardtypesQueryPluginDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { fromPerses } from '../fromPerses';
import { toPerses } from '../toPerses';

jest.mock('lib/getStartEndRangeTime', () => ({
	__esModule: true,
	default: jest.fn(() => ({ start: '100', end: '200' })),
}));

// ---- helpers ---------------------------------------------------------------

const EMPTY_INFLATED = {
	id: '',
	queryType: EQueryType.QUERY_BUILDER,
	promql: [],
	clickhouse_sql: [],
	builder: {
		queryData: [],
		queryFormulas: [],
		queryTraceOperator: [],
	},
};

function persesBuilderDTO(
	name = 'A',
	signal: 'metrics' | 'logs' | 'traces' = 'metrics',
	extra: Record<string, unknown> = {},
): DashboardtypesQueryDTO {
	return {
		kind: Querybuildertypesv5RequestTypeDTO.time_series,
		spec: {
			plugin: {
				kind: 'signoz/BuilderQuery',
				spec: {
					name,
					signal,
					disabled: false,
					filter: { expression: '' },
					...extra,
				},
			} as unknown as DashboardtypesQueryPluginDTO,
		},
	};
}

function extractPlugin(dto: DashboardtypesQueryDTO): {
	kind: string;
	spec: Record<string, unknown>;
} {
	const plugin = dto.spec?.plugin;
	if (!plugin) {
		throw new Error('missing plugin on perses DTO');
	}
	return plugin as unknown as { kind: string; spec: Record<string, unknown> };
}

// ---- Phase 1: empty / unknown contract -------------------------------------

describe('fromPerses (Phase 1 — empty / unknown-input contract)', () => {
	it('returns the fully-inflated empty composite on empty input', () => {
		expect(fromPerses([])).toStrictEqual(EMPTY_INFLATED);
	});

	it('returns the fully-inflated empty composite when plugin is missing', () => {
		const dto: DashboardtypesQueryDTO = {
			kind: Querybuildertypesv5RequestTypeDTO.time_series,
			spec: {},
		};
		expect(fromPerses([dto])).toStrictEqual(EMPTY_INFLATED);
	});

	it('returns the fully-inflated empty composite on unknown plugin kind', () => {
		const dto: DashboardtypesQueryDTO = {
			kind: Querybuildertypesv5RequestTypeDTO.time_series,
			spec: {
				plugin: {
					kind: 'signoz/NotAThing',
					spec: {},
				} as unknown as DashboardtypesQueryPluginDTO,
			},
		};
		expect(fromPerses([dto])).toStrictEqual(EMPTY_INFLATED);
	});
});

// ---- Phase 2: bare BuilderQuery --------------------------------------------

describe('fromPerses (Phase 2 — bare signoz/BuilderQuery)', () => {
	it('unwraps a bare BuilderQuery into a single inflated queryData entry', () => {
		const result = fromPerses([persesBuilderDTO('A', 'metrics')]);

		expect(result.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(result.builder.queryData).toHaveLength(1);
		expect(result.builder.queryFormulas).toStrictEqual([]);
		expect(result.builder.queryTraceOperator).toStrictEqual([]);
		expect(result.promql).toStrictEqual([]);
		expect(result.clickhouse_sql).toStrictEqual([]);

		const q = result.builder.queryData[0];
		expect(q.queryName).toBe('A');
		expect(q.expression).toBe('A');
	});

	it('maps signal "logs" to DataSource.LOGS', () => {
		const q = fromPerses([persesBuilderDTO('A', 'logs')]).builder.queryData[0];
		expect(q.dataSource).toBe(DataSource.LOGS);
	});

	it('maps signal "traces" to DataSource.TRACES', () => {
		const q = fromPerses([persesBuilderDTO('A', 'traces')]).builder.queryData[0];
		expect(q.dataSource).toBe(DataSource.TRACES);
	});

	it('maps signal "metrics" to DataSource.METRICS', () => {
		const q = fromPerses([persesBuilderDTO('A', 'metrics')]).builder.queryData[0];
		expect(q.dataSource).toBe(DataSource.METRICS);
	});

	it('applies inverse groupBy renames (name->key, fieldDataType->dataType, fieldContext->type)', () => {
		const dto = persesBuilderDTO('A', 'metrics', {
			groupBy: [
				{
					name: 'service.name',
					fieldDataType: 'string',
					fieldContext: 'tag',
				},
			],
		});

		const q = fromPerses([dto]).builder.queryData[0];
		expect(q.groupBy[0]).toMatchObject({
			key: 'service.name',
			dataType: 'string',
			type: 'tag',
		});
	});

	it('applies inverse orderBy renames (key.name->columnName, direction->order)', () => {
		const dto = persesBuilderDTO('A', 'metrics', {
			order: [{ key: { name: 'timestamp' }, direction: 'desc' }],
		});

		const q = fromPerses([dto]).builder.queryData[0];
		expect(q.orderBy).toStrictEqual([{ columnName: 'timestamp', order: 'desc' }]);
	});

	it('preserves filter.expression', () => {
		const dto = persesBuilderDTO('A', 'metrics', {
			filter: { expression: 'service.name = "api"' },
		});
		const q = fromPerses([dto]).builder.queryData[0];
		expect(q.filter).toStrictEqual({ expression: 'service.name = "api"' });
	});

	it('coerces v5 stepInterval string (e.g. "30s") to null without crashing', () => {
		const dto = persesBuilderDTO('A', 'metrics', { stepInterval: '30s' });
		const q = fromPerses([dto]).builder.queryData[0];
		expect(q.stepInterval).toBeNull();
	});

	it('keeps v5 stepInterval as-is when it is already a number', () => {
		const dto = persesBuilderDTO('A', 'metrics', { stepInterval: 60 });
		const q = fromPerses([dto]).builder.queryData[0];
		expect(q.stepInterval).toBe(60);
	});
});

// ---- Phase 2: round-trip ---------------------------------------------------

describe('round-trip (Phase 2 — bare BuilderQuery): perses → fromPerses → toPerses → perses', () => {
	it('preserves a metrics builder with filter + groupBy + order', () => {
		const original = persesBuilderDTO('A', 'metrics', {
			filter: { expression: 'service.name = "api"' },
			groupBy: [
				{ name: 'service.name', fieldDataType: 'string', fieldContext: 'tag' },
			],
			order: [{ key: { name: 'timestamp' }, direction: 'desc' }],
		});

		const v1 = fromPerses([original]);
		const roundTripped = toPerses({
			query: v1,
			graphType: PANEL_TYPES.TIME_SERIES,
		});

		expect(roundTripped).toHaveLength(1);
		expect(roundTripped[0].kind).toBe(Querybuildertypesv5RequestTypeDTO.time_series);

		const origPlugin = extractPlugin(original);
		const rtPlugin = extractPlugin(roundTripped[0]);
		expect(rtPlugin.kind).toBe(origPlugin.kind);
		expect(rtPlugin.spec).toMatchObject({
			name: 'A',
			signal: 'metrics',
			filter: { expression: 'service.name = "api"' },
			groupBy: origPlugin.spec.groupBy,
			order: origPlugin.spec.order,
		});
	});

	it('preserves a logs builder routed to a LIST panel (outer kind raw)', () => {
		const original = persesBuilderDTO('A', 'logs', {
			aggregations: [{ expression: 'count()' }],
		});

		const v1 = fromPerses([original]);
		const roundTripped = toPerses({
			query: v1,
			graphType: PANEL_TYPES.LIST,
		});

		expect(roundTripped[0].kind).toBe(Querybuildertypesv5RequestTypeDTO.raw);
		const rtPlugin = extractPlugin(roundTripped[0]);
		expect(rtPlugin.kind).toBe('signoz/BuilderQuery');
		expect(rtPlugin.spec).toMatchObject({ name: 'A', signal: 'logs' });
	});
});

// ---- Phase 3: CompositeQuery distribution ----------------------------------

function compositeDTO(
	subqueries: Array<{ type: string; spec: Record<string, unknown> }>,
): DashboardtypesQueryDTO {
	return {
		kind: Querybuildertypesv5RequestTypeDTO.time_series,
		spec: {
			plugin: {
				kind: 'signoz/CompositeQuery',
				spec: { queries: subqueries },
			} as unknown as DashboardtypesQueryPluginDTO,
		},
	};
}

describe('fromPerses (Phase 3 — signoz/CompositeQuery)', () => {
	it('distributes multiple builder_query subqueries into builder.queryData', () => {
		const dto = compositeDTO([
			{
				type: 'builder_query',
				spec: { name: 'A', signal: 'metrics', filter: { expression: '' } },
			},
			{
				type: 'builder_query',
				spec: { name: 'B', signal: 'metrics', filter: { expression: '' } },
			},
		]);

		const result = fromPerses([dto]);
		expect(result.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(result.builder.queryData.map((q) => q.queryName)).toStrictEqual([
			'A',
			'B',
		]);
		expect(result.builder.queryFormulas).toStrictEqual([]);
		expect(result.builder.queryTraceOperator).toStrictEqual([]);
	});

	it('handles an empty CompositeQuery (queries: []) by returning the inflated empty shape', () => {
		const dto = compositeDTO([]);
		const result = fromPerses([dto]);
		expect(result.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(result.builder.queryData).toStrictEqual([]);
	});
});

// ---- Phase 3: round-trip ---------------------------------------------------

describe('round-trip (Phase 3 — multi-builder CompositeQuery): perses → fromPerses → toPerses → perses', () => {
	it('preserves a two-builder CompositeQuery (same outer kind, same subquery names)', () => {
		const original = compositeDTO([
			{
				type: 'builder_query',
				spec: { name: 'A', signal: 'metrics', filter: { expression: '' } },
			},
			{
				type: 'builder_query',
				spec: { name: 'B', signal: 'metrics', filter: { expression: '' } },
			},
		]);

		const v1 = fromPerses([original]);
		const roundTripped = toPerses({
			query: v1,
			graphType: PANEL_TYPES.TIME_SERIES,
		});

		expect(roundTripped).toHaveLength(1);
		expect(roundTripped[0].kind).toBe(Querybuildertypesv5RequestTypeDTO.time_series);
		const rtPlugin = extractPlugin(roundTripped[0]);
		expect(rtPlugin.kind).toBe('signoz/CompositeQuery');
		const subqueries = rtPlugin.spec.queries as Array<{
			type: string;
			spec: { name?: string };
		}>;
		expect(subqueries.map((s) => `${s.type}:${s.spec.name}`)).toStrictEqual([
			'builder_query:A',
			'builder_query:B',
		]);
	});
});

// ---- Phase 4: bare Formula + TraceOperator + composite subqueries ----------

function bareDTO(
	pluginKind: string,
	spec: Record<string, unknown>,
): DashboardtypesQueryDTO {
	return {
		kind: Querybuildertypesv5RequestTypeDTO.time_series,
		spec: {
			plugin: {
				kind: pluginKind,
				spec,
			} as unknown as DashboardtypesQueryPluginDTO,
		},
	};
}

describe('fromPerses (Phase 4 — invalid bare Formula / TraceOperator are warned and dropped)', () => {
	let warnSpy: jest.SpyInstance;

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('warns and returns inflated empty composite on top-level signoz/Formula (invalid alone)', () => {
		const dto = bareDTO('signoz/Formula', {
			name: 'F1',
			expression: 'A + 1',
			legend: 'L',
		});
		const result = fromPerses([dto]);
		expect(result.builder.queryFormulas).toStrictEqual([]);
		expect(result.builder.queryData).toStrictEqual([]);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringMatching(/top-level signoz\/Formula is invalid/),
		);
	});

	it('warns and returns inflated empty composite on top-level signoz/TraceOperator (invalid alone)', () => {
		const dto = bareDTO('signoz/TraceOperator', {
			name: 'T1',
			signal: 'traces',
			expression: 'A && B',
			filter: { expression: '' },
		});
		const result = fromPerses([dto]);
		expect(result.builder.queryTraceOperator).toStrictEqual([]);
		expect(result.builder.queryData).toStrictEqual([]);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringMatching(/top-level signoz\/TraceOperator is invalid/),
		);
	});
});

describe('fromPerses (Phase 4 — composite subquery distribution)', () => {
	it('distributes builder_query + builder_formula + builder_trace_operator subqueries into their respective buckets', () => {
		const dto = compositeDTO([
			{
				type: 'builder_query',
				spec: { name: 'A', signal: 'metrics', filter: { expression: '' } },
			},
			{ type: 'builder_formula', spec: { name: 'F1', expression: 'A + 1' } },
			{
				type: 'builder_trace_operator',
				spec: {
					name: 'T1',
					signal: 'traces',
					expression: 'A',
					filter: { expression: '' },
				},
			},
		]);

		const result = fromPerses([dto]);
		expect(result.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(result.builder.queryData.map((q) => q.queryName)).toStrictEqual(['A']);
		expect(result.builder.queryFormulas.map((f) => f.queryName)).toStrictEqual([
			'F1',
		]);
		expect(
			result.builder.queryTraceOperator.map((t) => t.queryName),
		).toStrictEqual(['T1']);
	});
});

// ---- Phase 4: round-trips --------------------------------------------------

describe('round-trip (Phase 4): mixed composite', () => {
	beforeEach(() => {
		jest.spyOn(console, 'warn').mockImplementation(() => undefined);
	});
	afterEach(() => {
		(console.warn as jest.Mock).mockRestore?.();
	});

	it('round-trips a CompositeQuery containing builder + formula + trace operator', () => {
		const original = compositeDTO([
			{
				type: 'builder_query',
				spec: {
					name: 'A',
					signal: 'metrics',
					filter: { expression: '' },
					disabled: false,
				},
			},
			{
				type: 'builder_formula',
				spec: { name: 'F1', expression: 'A + 1', disabled: false },
			},
			{
				type: 'builder_trace_operator',
				spec: {
					name: 'T1',
					signal: 'traces',
					expression: 'A',
					filter: { expression: '' },
					disabled: false,
					aggregations: [{ expression: 'count()' }],
				},
			},
		]);

		const v1 = fromPerses([original]);
		const roundTripped = toPerses({
			query: v1,
			graphType: PANEL_TYPES.TIME_SERIES,
		});

		const rtPlugin = extractPlugin(roundTripped[0]);
		expect(rtPlugin.kind).toBe('signoz/CompositeQuery');
		const subqueries = rtPlugin.spec.queries as Array<{
			type: string;
			spec: { name?: string };
		}>;
		expect(
			subqueries.map((s) => `${s.type}:${s.spec.name}`).sort(),
		).toStrictEqual(
			[
				'builder_query:A',
				'builder_formula:F1',
				'builder_trace_operator:T1',
			].sort(),
		);
	});
});

// ---- Phase 5: PromQL + ClickHouseSQL + composite queryType resolution ------

describe('fromPerses (Phase 5 — bare signoz/PromQLQuery)', () => {
	it('unwraps bare PromQL into promql[0] and sets queryType=PROM', () => {
		const dto = bareDTO('signoz/PromQLQuery', {
			name: 'P1',
			query: 'up',
			disabled: false,
			legend: 'L',
		});

		const result = fromPerses([dto]);
		expect(result.queryType).toBe(EQueryType.PROM);
		expect(result.promql).toStrictEqual([
			{ name: 'P1', query: 'up', disabled: false, legend: 'L' },
		]);
		expect(result.builder.queryData).toStrictEqual([]);
		expect(result.clickhouse_sql).toStrictEqual([]);
	});

	it('defaults disabled to false and legend to empty when absent on wire', () => {
		const dto = bareDTO('signoz/PromQLQuery', { name: 'P1', query: 'up' });
		const result = fromPerses([dto]);
		expect(result.promql[0]).toStrictEqual({
			name: 'P1',
			query: 'up',
			disabled: false,
			legend: '',
		});
	});
});

describe('fromPerses (Phase 5 — bare signoz/ClickHouseSQL)', () => {
	it('unwraps bare ClickHouseSQL into clickhouse_sql[0] and sets queryType=CLICKHOUSE', () => {
		const dto = bareDTO('signoz/ClickHouseSQL', {
			name: 'C1',
			query: 'SELECT 1',
			disabled: false,
			legend: '',
		});

		const result = fromPerses([dto]);
		expect(result.queryType).toBe(EQueryType.CLICKHOUSE);
		expect(result.clickhouse_sql).toStrictEqual([
			{ name: 'C1', query: 'SELECT 1', disabled: false, legend: '' },
		]);
		expect(result.builder.queryData).toStrictEqual([]);
		expect(result.promql).toStrictEqual([]);
	});
});

describe('fromPerses (Phase 4 — composite without builder warns about invalid state)', () => {
	let warnSpy: jest.SpyInstance;

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('warns when CompositeQuery has formulas/trace-ops but no builder_query subquery', () => {
		const dto = compositeDTO([
			{ type: 'builder_formula', spec: { name: 'F1', expression: 'A + 1' } },
		]);
		fromPerses([dto]);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringMatching(
				/CompositeQuery contains formulas\/trace-operators but no builder_query/,
			),
		);
	});

	it('does not warn when CompositeQuery has at least one builder_query alongside the formula', () => {
		const dto = compositeDTO([
			{
				type: 'builder_query',
				spec: { name: 'A', signal: 'metrics', filter: { expression: '' } },
			},
			{ type: 'builder_formula', spec: { name: 'F1', expression: 'A + 1' } },
		]);
		fromPerses([dto]);
		expect(warnSpy).not.toHaveBeenCalled();
	});
});

describe('fromPerses (Phase 5 — composite queryType resolution)', () => {
	it('resolves all-promql composite to queryType=PROM', () => {
		const dto = compositeDTO([
			{ type: 'promql', spec: { name: 'P1', query: 'up' } },
			{ type: 'promql', spec: { name: 'P2', query: 'rate(x[1m])' } },
		]);
		const result = fromPerses([dto]);
		expect(result.queryType).toBe(EQueryType.PROM);
		expect(result.promql.map((p) => p.name)).toStrictEqual(['P1', 'P2']);
	});

	it('resolves all-clickhouse composite to queryType=CLICKHOUSE', () => {
		const dto = compositeDTO([
			{ type: 'clickhouse_sql', spec: { name: 'C1', query: 'SELECT 1' } },
			{ type: 'clickhouse_sql', spec: { name: 'C2', query: 'SELECT 2' } },
		]);
		const result = fromPerses([dto]);
		expect(result.queryType).toBe(EQueryType.CLICKHOUSE);
		expect(result.clickhouse_sql.map((c) => c.name)).toStrictEqual(['C1', 'C2']);
	});

	it('falls back to queryType=QUERY_BUILDER for a mixed-type composite', () => {
		const dto = compositeDTO([
			{
				type: 'builder_query',
				spec: { name: 'A', signal: 'metrics', filter: { expression: '' } },
			},
			{ type: 'promql', spec: { name: 'P1', query: 'up' } },
		]);
		const result = fromPerses([dto]);
		expect(result.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(result.builder.queryData).toHaveLength(1);
		expect(result.promql).toHaveLength(1);
	});
});

// ---- Phase 5: round-trips --------------------------------------------------

describe('round-trip (Phase 5): PromQL / ClickHouseSQL bare + multi', () => {
	it('round-trips bare signoz/PromQLQuery', () => {
		const original = bareDTO('signoz/PromQLQuery', {
			name: 'P1',
			query: 'up',
			disabled: false,
			legend: 'L',
		});
		const v1 = fromPerses([original]);
		const roundTripped = toPerses({
			query: v1,
			graphType: PANEL_TYPES.TIME_SERIES,
		});
		const rtPlugin = extractPlugin(roundTripped[0]);
		expect(rtPlugin.kind).toBe('signoz/PromQLQuery');
		expect(rtPlugin.spec).toMatchObject({
			name: 'P1',
			query: 'up',
			legend: 'L',
		});
	});

	it('round-trips bare signoz/ClickHouseSQL', () => {
		const original = bareDTO('signoz/ClickHouseSQL', {
			name: 'C1',
			query: 'SELECT 1',
			disabled: false,
			legend: 'L',
		});
		const v1 = fromPerses([original]);
		const roundTripped = toPerses({
			query: v1,
			graphType: PANEL_TYPES.TIME_SERIES,
		});
		const rtPlugin = extractPlugin(roundTripped[0]);
		expect(rtPlugin.kind).toBe('signoz/ClickHouseSQL');
		expect(rtPlugin.spec).toMatchObject({
			name: 'C1',
			query: 'SELECT 1',
			legend: 'L',
		});
	});

	it('round-trips an all-promql CompositeQuery (preserves PROM queryType)', () => {
		const original = compositeDTO([
			{ type: 'promql', spec: { name: 'P1', query: 'up' } },
			{ type: 'promql', spec: { name: 'P2', query: 'rate(x[1m])' } },
		]);
		const v1 = fromPerses([original]);
		expect(v1.queryType).toBe(EQueryType.PROM);

		const roundTripped = toPerses({
			query: v1,
			graphType: PANEL_TYPES.TIME_SERIES,
		});
		const rtPlugin = extractPlugin(roundTripped[0]);
		expect(rtPlugin.kind).toBe('signoz/CompositeQuery');
		const subqueries = rtPlugin.spec.queries as Array<{ type: string }>;
		expect(subqueries.map((s) => s.type)).toStrictEqual(['promql', 'promql']);
	});
});

// ---- Phase 6: edge cases ---------------------------------------------------

describe('fromPerses (Phase 6 — edge cases)', () => {
	it('returns inflated empty composite when plugin is present but spec is missing', () => {
		const dto: DashboardtypesQueryDTO = {
			kind: Querybuildertypesv5RequestTypeDTO.time_series,
			spec: {
				plugin: {
					kind: 'signoz/BuilderQuery',
					// spec deliberately omitted
				} as unknown as DashboardtypesQueryPluginDTO,
			},
		};
		expect(fromPerses([dto])).toStrictEqual(EMPTY_INFLATED);
	});

	it('handles CompositeQuery with queries: null without crashing', () => {
		const dto: DashboardtypesQueryDTO = {
			kind: Querybuildertypesv5RequestTypeDTO.time_series,
			spec: {
				plugin: {
					kind: 'signoz/CompositeQuery',
					spec: { queries: null },
				} as unknown as DashboardtypesQueryPluginDTO,
			},
		};
		const result = fromPerses([dto]);
		expect(result.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(result.builder).toStrictEqual({
			queryData: [],
			queryFormulas: [],
			queryTraceOperator: [],
		});
	});

	it('silently ignores composite subqueries with unrecognized types', () => {
		const dto = compositeDTO([
			{
				type: 'builder_query',
				spec: { name: 'A', signal: 'metrics', filter: { expression: '' } },
			},
			{ type: 'future_kind' as never, spec: { foo: 'bar' } },
		]);
		const result = fromPerses([dto]);
		expect(result.builder.queryData.map((q) => q.queryName)).toStrictEqual(['A']);
	});

	it('skips composite subqueries that have no spec without crashing', () => {
		const dto = compositeDTO([
			{
				type: 'builder_query',
				spec: { name: 'A', signal: 'metrics', filter: { expression: '' } },
			},
			{
				type: 'builder_formula',
				spec: undefined as unknown as Record<string, unknown>,
			},
		]);
		expect(() => fromPerses([dto])).not.toThrow();
		const result = fromPerses([dto]);
		expect(result.builder.queryData.map((q) => q.queryName)).toStrictEqual(['A']);
		expect(result.builder.queryFormulas).toStrictEqual([]);
	});

	it('only consumes the first persesQueries entry (defensive against backend invariant violations)', () => {
		const builderDTO = bareDTO('signoz/BuilderQuery', {
			name: 'A',
			signal: 'metrics',
			filter: { expression: '' },
		});
		const promDTO = bareDTO('signoz/PromQLQuery', { name: 'P1', query: 'up' });

		const result = fromPerses([builderDTO, promDTO]);
		expect(result.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(result.builder.queryData.map((q) => q.queryName)).toStrictEqual(['A']);
		expect(result.promql).toStrictEqual([]);
	});

	it('produces a sensible default V1 builder when the v5 spec is minimal (signal only)', () => {
		const dto = bareDTO('signoz/BuilderQuery', { signal: 'metrics' });
		const result = fromPerses([dto]);
		expect(result.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(result.builder.queryData).toHaveLength(1);
		const q = result.builder.queryData[0];
		expect(q.dataSource).toBe(DataSource.METRICS);
		// name is generated from the default builder when v5 spec lacks one
		expect(typeof q.queryName).toBe('string');
		expect(q.queryName.length).toBeGreaterThan(0);
	});
});
