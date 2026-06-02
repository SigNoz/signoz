import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';

import { toPerses } from '../toPerses';

jest.mock('lib/getStartEndRangeTime', () => ({
	__esModule: true,
	default: jest.fn(() => ({ start: '100', end: '200' })),
}));

// ---- helpers ---------------------------------------------------------------

function emptyQuery(): Query {
	return {
		id: 'q-empty',
		queryType: EQueryType.QUERY_BUILDER,
		promql: [],
		clickhouse_sql: [],
		builder: {
			queryData: [],
			queryFormulas: [],
			queryTraceOperator: [],
		},
	};
}

function metricsBuilderQuery(
	overrides?: Partial<IBuilderQuery>,
): IBuilderQuery {
	return {
		queryName: 'A',
		dataSource: DataSource.METRICS,
		aggregations: [
			{
				metricName: 'cpu_usage',
				temporality: '',
				timeAggregation: 'sum',
				spaceAggregation: 'avg',
				reduceTo: ReduceOperators.AVG,
			},
		],
		timeAggregation: 'sum',
		spaceAggregation: 'avg',
		temporality: '',
		functions: [],
		filter: { expression: '' },
		filters: { items: [], op: 'AND' },
		groupBy: [],
		expression: 'A',
		disabled: false,
		having: [],
		limit: null,
		stepInterval: 60,
		orderBy: [],
		reduceTo: ReduceOperators.AVG,
		legend: '',
		...overrides,
	} as IBuilderQuery;
}

function builderShell(builderQueries: IBuilderQuery[]): Query {
	return {
		id: 'q-test',
		queryType: EQueryType.QUERY_BUILDER,
		promql: [],
		clickhouse_sql: [],
		builder: {
			queryData: builderQueries,
			queryFormulas: [],
			queryTraceOperator: [],
		},
	};
}

type PluginShape = { kind: string; spec: Record<string, unknown> };
function getPlugin(result: DashboardtypesQueryDTO[]): PluginShape {
	const plugin = result[0]?.spec?.plugin;
	if (!plugin) {
		throw new Error('toPerses returned no plugin');
	}
	return plugin as unknown as PluginShape;
}

// ---- Phase 1: empty contract -----------------------------------------------

describe('toPerses (Phase 1 — empty input contract)', () => {
	it('returns empty array when the V1 query has no queries of any kind', () => {
		const result = toPerses({
			query: emptyQuery(),
			graphType: PANEL_TYPES.TIME_SERIES,
		});
		expect(result).toStrictEqual([]);
	});
});

// ---- Phase 2: bare BuilderQuery --------------------------------------------

describe('toPerses (Phase 2 — bare signoz/BuilderQuery)', () => {
	it('wraps a single metrics builder query as bare signoz/BuilderQuery on a TimeSeries panel', () => {
		const result = toPerses({
			query: builderShell([metricsBuilderQuery()]),
			graphType: PANEL_TYPES.TIME_SERIES,
		});

		expect(result).toHaveLength(1);
		expect(result[0].kind).toBe('TimeSeriesQuery');
		const plugin = getPlugin(result);
		expect(plugin.kind).toBe('signoz/BuilderQuery');
		expect(plugin.spec).toMatchObject({ name: 'A', signal: 'metrics' });
	});

	it('emits signal "logs" for a logs-source builder query', () => {
		const aggregations = [
			{ expression: 'count()' },
		] as unknown as IBuilderQuery['aggregations'];
		const result = toPerses({
			query: builderShell([
				metricsBuilderQuery({ dataSource: DataSource.LOGS, aggregations }),
			]),
			graphType: PANEL_TYPES.TIME_SERIES,
		});
		expect(getPlugin(result).spec).toMatchObject({ signal: 'logs' });
	});

	it('emits signal "traces" for a traces-source builder query', () => {
		const aggregations = [
			{ expression: 'count()' },
		] as unknown as IBuilderQuery['aggregations'];
		const result = toPerses({
			query: builderShell([
				metricsBuilderQuery({ dataSource: DataSource.TRACES, aggregations }),
			]),
			graphType: PANEL_TYPES.TIME_SERIES,
		});
		expect(getPlugin(result).spec).toMatchObject({ signal: 'traces' });
	});

	it('applies groupBy field renames (key->name, dataType->fieldDataType, type->fieldContext)', () => {
		const result = toPerses({
			query: builderShell([
				metricsBuilderQuery({
					groupBy: [
						{
							key: 'service.name',
							dataType: DataTypes.String,
							type: 'tag',
							id: 'service.name--string--tag--false',
						},
					],
				}),
			]),
			graphType: PANEL_TYPES.TIME_SERIES,
		});

		const groupBy = getPlugin(result).spec.groupBy as Array<{
			name: string;
			fieldDataType?: string;
			fieldContext?: string;
		}>;
		expect(groupBy[0]).toMatchObject({
			name: 'service.name',
			fieldDataType: 'string',
			fieldContext: 'tag',
		});
	});

	it('applies orderBy field renames (columnName/order -> key.name/direction)', () => {
		const result = toPerses({
			query: builderShell([
				metricsBuilderQuery({
					orderBy: [{ columnName: 'timestamp', order: 'desc' }],
				}),
			]),
			graphType: PANEL_TYPES.TIME_SERIES,
		});

		const order = getPlugin(result).spec.order as Array<{
			key: { name: string };
			direction: string;
		}>;
		expect(order[0]).toStrictEqual({
			key: { name: 'timestamp' },
			direction: 'desc',
		});
	});

	it('preserves filter.expression', () => {
		const result = toPerses({
			query: builderShell([
				metricsBuilderQuery({
					filter: { expression: 'service.name = "api"' },
				}),
			]),
			graphType: PANEL_TYPES.TIME_SERIES,
		});

		expect(getPlugin(result).spec.filter).toStrictEqual({
			expression: 'service.name = "api"',
		});
	});

	it('derives outer kind "LogQuery" for a LIST panel', () => {
		const aggregations = [
			{ expression: 'count()' },
		] as unknown as IBuilderQuery['aggregations'];
		const result = toPerses({
			query: builderShell([
				metricsBuilderQuery({ dataSource: DataSource.LOGS, aggregations }),
			]),
			graphType: PANEL_TYPES.LIST,
		});
		expect(result[0].kind).toBe('LogQuery');
		expect(getPlugin(result).kind).toBe('signoz/BuilderQuery');
	});
});

// ---- Phase 3: CompositeQuery wrapping --------------------------------------

describe('toPerses (Phase 3 — signoz/CompositeQuery)', () => {
	it('wraps two builder queries as signoz/CompositeQuery with two builder_query subqueries', () => {
		const result = toPerses({
			query: builderShell([
				metricsBuilderQuery({ queryName: 'A' }),
				metricsBuilderQuery({ queryName: 'B' }),
			]),
			graphType: PANEL_TYPES.TIME_SERIES,
		});

		expect(result).toHaveLength(1);
		expect(result[0].kind).toBe('TimeSeriesQuery');
		const plugin = getPlugin(result);
		expect(plugin.kind).toBe('signoz/CompositeQuery');

		const subqueries = plugin.spec.queries as Array<{
			type: string;
			spec: { name?: string };
		}>;
		expect(subqueries).toHaveLength(2);
		expect(subqueries.map((s) => s.type)).toStrictEqual([
			'builder_query',
			'builder_query',
		]);
		expect(subqueries.map((s) => s.spec.name)).toStrictEqual(['A', 'B']);
	});

	it('still respects backend invariant: returns exactly one envelope for any non-empty input', () => {
		const result = toPerses({
			query: builderShell([
				metricsBuilderQuery({ queryName: 'A' }),
				metricsBuilderQuery({ queryName: 'B' }),
				metricsBuilderQuery({ queryName: 'C' }),
			]),
			graphType: PANEL_TYPES.TIME_SERIES,
		});
		expect(result).toHaveLength(1);
	});

	it('wraps builder + formula as signoz/CompositeQuery (mixed content)', () => {
		const formula = {
			queryName: 'F1',
			expression: 'A + 1',
			disabled: false,
			legend: '',
			having: [],
			orderBy: [],
		};

		const result = toPerses({
			query: {
				id: 'q-mixed',
				queryType: EQueryType.QUERY_BUILDER,
				promql: [],
				clickhouse_sql: [],
				builder: {
					queryData: [metricsBuilderQuery()],
					queryFormulas: [formula],
					queryTraceOperator: [],
				},
			},
			graphType: PANEL_TYPES.TIME_SERIES,
		});

		expect(getPlugin(result).kind).toBe('signoz/CompositeQuery');
		const subqueries = getPlugin(result).spec.queries as Array<{
			type: string;
		}>;
		expect(subqueries.map((s) => s.type).sort()).toStrictEqual(
			['builder_formula', 'builder_query'].sort(),
		);
	});
});

// ---- Phase 4: formula + trace-operator invariant guard --------------------
//
// Formulas (`A + 1`) and trace operators (`A && B`) reference builder queries
// by name. They are invalid in isolation — the wrapper must always be
// CompositeQuery alongside at least one builder query. toPerses throws on
// save-time violation; fromPerses warns on read.

describe('toPerses (Phase 4 — formula/trace-op invariant guard)', () => {
	it('throws when V1 has a formula but no builder queries', () => {
		const formula = {
			queryName: 'F1',
			expression: 'A + 1',
			disabled: false,
			legend: '',
			having: [],
			orderBy: [],
		};

		expect(() =>
			toPerses({
				query: {
					id: 'q-bad-formula',
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					clickhouse_sql: [],
					builder: {
						queryData: [],
						queryFormulas: [formula],
						queryTraceOperator: [],
					},
				},
				graphType: PANEL_TYPES.TIME_SERIES,
			}),
		).toThrow(/Formulas and trace operators reference builder queries/);
	});

	it('throws when V1 has a trace operator but no builder queries', () => {
		const traceOperator = {
			queryName: 'T1',
			dataSource: DataSource.TRACES,
			expression: 'A && B',
			aggregations: [{ expression: 'count()' }],
			functions: [],
			filter: { expression: '' },
			filters: { items: [], op: 'AND' },
			groupBy: [],
			disabled: false,
			having: [],
			limit: null,
			stepInterval: 60,
			orderBy: [],
			legend: '',
		} as unknown as IBuilderQuery;

		expect(() =>
			toPerses({
				query: {
					id: 'q-bad-traceop',
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					clickhouse_sql: [],
					builder: {
						queryData: [],
						queryFormulas: [],
						queryTraceOperator: [traceOperator],
					},
				},
				graphType: PANEL_TYPES.TIME_SERIES,
			}),
		).toThrow(/Formulas and trace operators reference builder queries/);
	});

	it('does not throw when builder is present alongside formula/trace-op', () => {
		const formula = {
			queryName: 'F1',
			expression: 'A + 1',
			disabled: false,
			legend: '',
			having: [],
			orderBy: [],
		};

		expect(() =>
			toPerses({
				query: {
					id: 'q-mixed-ok',
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					clickhouse_sql: [],
					builder: {
						queryData: [metricsBuilderQuery()],
						queryFormulas: [formula],
						queryTraceOperator: [],
					},
				},
				graphType: PANEL_TYPES.TIME_SERIES,
			}),
		).not.toThrow();
	});
});

// ---- Phase 5: PromQL + ClickHouseSQL ---------------------------------------

function promQuery(name: string, query = 'up'): Query {
	return {
		id: `q-prom-${name}`,
		queryType: EQueryType.PROM,
		clickhouse_sql: [],
		promql: [{ name, query, disabled: false, legend: '' }],
		builder: { queryData: [], queryFormulas: [], queryTraceOperator: [] },
	};
}

function clickhouseQuery(name: string, query = 'SELECT 1'): Query {
	return {
		id: `q-ch-${name}`,
		queryType: EQueryType.CLICKHOUSE,
		promql: [],
		clickhouse_sql: [{ name, query, disabled: false, legend: '' }],
		builder: { queryData: [], queryFormulas: [], queryTraceOperator: [] },
	};
}

describe('toPerses (Phase 5 — PromQL)', () => {
	it('wraps a single PromQL query as bare signoz/PromQLQuery', () => {
		const result = toPerses({
			query: promQuery('P1'),
			graphType: PANEL_TYPES.TIME_SERIES,
		});

		expect(result).toHaveLength(1);
		expect(result[0].kind).toBe('TimeSeriesQuery');
		expect(getPlugin(result).kind).toBe('signoz/PromQLQuery');
		expect(getPlugin(result).spec).toMatchObject({ name: 'P1', query: 'up' });
	});

	it('wraps multiple PromQL queries as signoz/CompositeQuery', () => {
		const result = toPerses({
			query: {
				id: 'q-prom-multi',
				queryType: EQueryType.PROM,
				clickhouse_sql: [],
				promql: [
					{ name: 'P1', query: 'up', disabled: false, legend: '' },
					{ name: 'P2', query: 'rate(x[1m])', disabled: false, legend: '' },
				],
				builder: { queryData: [], queryFormulas: [], queryTraceOperator: [] },
			},
			graphType: PANEL_TYPES.TIME_SERIES,
		});

		const plugin = getPlugin(result);
		expect(plugin.kind).toBe('signoz/CompositeQuery');
		const subqueries = plugin.spec.queries as Array<{ type: string }>;
		expect(subqueries.map((s) => s.type)).toStrictEqual(['promql', 'promql']);
	});
});

describe('toPerses (Phase 5 — ClickHouseSQL)', () => {
	it('wraps a single ClickHouse query as bare signoz/ClickHouseSQL', () => {
		const result = toPerses({
			query: clickhouseQuery('C1', 'SELECT count(*)'),
			graphType: PANEL_TYPES.TIME_SERIES,
		});

		expect(result).toHaveLength(1);
		expect(getPlugin(result).kind).toBe('signoz/ClickHouseSQL');
		expect(getPlugin(result).spec).toMatchObject({
			name: 'C1',
			query: 'SELECT count(*)',
		});
	});

	it('wraps multiple ClickHouse queries as signoz/CompositeQuery', () => {
		const result = toPerses({
			query: {
				id: 'q-ch-multi',
				queryType: EQueryType.CLICKHOUSE,
				promql: [],
				clickhouse_sql: [
					{ name: 'C1', query: 'SELECT 1', disabled: false, legend: '' },
					{ name: 'C2', query: 'SELECT 2', disabled: false, legend: '' },
				],
				builder: { queryData: [], queryFormulas: [], queryTraceOperator: [] },
			},
			graphType: PANEL_TYPES.TIME_SERIES,
		});

		const plugin = getPlugin(result);
		expect(plugin.kind).toBe('signoz/CompositeQuery');
		const subqueries = plugin.spec.queries as Array<{ type: string }>;
		expect(subqueries.map((s) => s.type)).toStrictEqual([
			'clickhouse_sql',
			'clickhouse_sql',
		]);
	});
});

// ---- Phase 6: edge cases ---------------------------------------------------

describe('toPerses (Phase 6 — edge cases)', () => {
	it('returns [] when queryType is unrecognized', () => {
		const result = toPerses({
			query: {
				id: 'q-bogus',
				queryType: 'WHATEVER' as EQueryType,
				promql: [{ name: 'P1', query: 'up', disabled: false, legend: '' }],
				clickhouse_sql: [],
				builder: { queryData: [], queryFormulas: [], queryTraceOperator: [] },
			} as unknown as Query,
			graphType: PANEL_TYPES.TIME_SERIES,
		});
		expect(result).toStrictEqual([]);
	});
});
