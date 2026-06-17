import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';

import {
	buildQueryRangeRequest,
	extractLegendMap,
	getBarStepIntervalSeconds,
	hasRunnableQueries,
	panelTypeToRequestType,
	toQueryEnvelopes,
} from '../buildQueryRangeRequest';

// Test fixtures are cast at the outer boundary; the perses-generated query
// plugin unions are too verbose to construct field-typed inline.

function bareBuilderQuery(
	spec: Record<string, unknown>,
): DashboardtypesQueryDTO[] {
	return [
		{
			kind: 'TimeSeriesQuery',
			spec: { plugin: { kind: 'signoz/BuilderQuery', spec } },
		},
	] as unknown as DashboardtypesQueryDTO[];
}

function compositeQuery(
	envelopes: Record<string, unknown>[],
): DashboardtypesQueryDTO[] {
	return [
		{
			kind: 'TimeSeriesQuery',
			spec: {
				plugin: { kind: 'signoz/CompositeQuery', spec: { queries: envelopes } },
			},
		},
	] as unknown as DashboardtypesQueryDTO[];
}

const HOUR_MS = 60 * 60 * 1000;
const START_MS = 1_700_000_000_000;

describe('panelTypeToRequestType', () => {
	it.each([
		[PANEL_TYPES.TIME_SERIES, 'time_series'],
		// HISTOGRAM and BAR bin client-side from time-series data; sending
		// 'distribution' would return a shape the renderers can't bin.
		[PANEL_TYPES.BAR, 'time_series'],
		[PANEL_TYPES.HISTOGRAM, 'time_series'],
		[PANEL_TYPES.TABLE, 'scalar'],
		[PANEL_TYPES.PIE, 'scalar'],
		[PANEL_TYPES.VALUE, 'scalar'],
		[PANEL_TYPES.LIST, 'raw'],
		[PANEL_TYPES.TRACE, 'trace'],
	])('%s → %s', (panelType, requestType) => {
		expect(panelTypeToRequestType(panelType)).toBe(requestType);
	});
});

describe('toQueryEnvelopes', () => {
	it('wraps a bare BuilderQuery into a single builder_query envelope', () => {
		const envelopes = toQueryEnvelopes(
			bareBuilderQuery({ name: 'A', signal: 'metrics' }),
		);
		expect(envelopes).toStrictEqual([
			{ type: 'builder_query', spec: { name: 'A', signal: 'metrics' } },
		]);
	});

	it('passes a CompositeQuery envelope list through verbatim', () => {
		const subqueries = [
			{ type: 'builder_query', spec: { name: 'A' } },
			{ type: 'builder_formula', spec: { name: 'F1', expression: 'A*2' } },
		];
		expect(toQueryEnvelopes(compositeQuery(subqueries))).toStrictEqual(
			subqueries,
		);
	});

	it('wraps PromQL and ClickHouse plugins with their envelope types', () => {
		const prom = [
			{
				kind: 'PromQuery',
				spec: {
					plugin: { kind: 'signoz/PromQLQuery', spec: { name: 'A', query: 'up' } },
				},
			},
		] as unknown as DashboardtypesQueryDTO[];
		expect(toQueryEnvelopes(prom)).toStrictEqual([
			{ type: 'promql', spec: { name: 'A', query: 'up' } },
		]);

		const ch = [
			{
				kind: 'ClickHouseQuery',
				spec: {
					plugin: {
						kind: 'signoz/ClickHouseSQL',
						spec: { name: 'A', query: 'SELECT 1' },
					},
				},
			},
		] as unknown as DashboardtypesQueryDTO[];
		expect(toQueryEnvelopes(ch)).toStrictEqual([
			{ type: 'clickhouse_sql', spec: { name: 'A', query: 'SELECT 1' } },
		]);
	});

	it('drops invalid top-level Formula with a warning instead of crashing', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
		const formula = [
			{
				kind: 'TimeSeriesQuery',
				spec: {
					plugin: { kind: 'signoz/Formula', spec: { name: 'F1', expression: 'A' } },
				},
			},
		] as unknown as DashboardtypesQueryDTO[];
		expect(toQueryEnvelopes(formula)).toStrictEqual([]);
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});

	it('returns empty for missing plugin or empty queries', () => {
		expect(toQueryEnvelopes([])).toStrictEqual([]);
		expect(
			toQueryEnvelopes([
				{ kind: 'TimeSeriesQuery', spec: {} },
			] as unknown as DashboardtypesQueryDTO[]),
		).toStrictEqual([]);
	});
});

describe('buildQueryRangeRequest', () => {
	it('assembles the full request DTO', () => {
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A', signal: 'metrics' }),
			panelType: PANEL_TYPES.TIME_SERIES,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
		});
		expect(request).toStrictEqual({
			schemaVersion: 'v1',
			start: START_MS,
			end: START_MS + HOUR_MS,
			requestType: 'time_series',
			compositeQuery: {
				queries: [
					{ type: 'builder_query', spec: { name: 'A', signal: 'metrics' } },
				],
			},
			formatOptions: { formatTableResultForUI: false, fillGaps: false },
			variables: {},
		});
	});

	it('sets formatTableResultForUI only for TABLE panels', () => {
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A' }),
			panelType: PANEL_TYPES.TABLE,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
		});
		expect(request.formatOptions?.formatTableResultForUI).toBe(true);
	});

	it('passes through fillGaps into formatOptions', () => {
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A' }),
			panelType: PANEL_TYPES.TIME_SERIES,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
			fillGaps: true,
		});
		expect(request.formatOptions?.fillGaps).toBe(true);
	});

	it('stamps offset/limit onto builder queries when pagination is given', () => {
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A', signal: 'logs' }),
			panelType: PANEL_TYPES.LIST,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
			pagination: { offset: 100, limit: 50 },
		});
		expect(request.compositeQuery?.queries?.[0]?.spec).toStrictEqual({
			name: 'A',
			signal: 'logs',
			offset: 100,
			limit: 50,
		});
	});

	it('injects the range-derived stepInterval into BAR builder queries without one', () => {
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A', signal: 'metrics' }),
			panelType: PANEL_TYPES.BAR,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
		});
		const spec = (request.compositeQuery?.queries?.[0]?.spec ?? {}) as {
			stepInterval?: number;
		};
		expect(spec.stepInterval).toBe(
			getBarStepIntervalSeconds(START_MS, START_MS + HOUR_MS),
		);
	});

	it('preserves a user-set stepInterval on BAR builder queries', () => {
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A', stepInterval: 300 }),
			panelType: PANEL_TYPES.BAR,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
		});
		const spec = (request.compositeQuery?.queries?.[0]?.spec ?? {}) as {
			stepInterval?: number;
		};
		expect(spec.stepInterval).toBe(300);
	});

	it('does not touch stepInterval for non-BAR panels', () => {
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A' }),
			panelType: PANEL_TYPES.TIME_SERIES,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
		});
		const spec = (request.compositeQuery?.queries?.[0]?.spec ?? {}) as {
			stepInterval?: number;
		};
		expect(spec.stepInterval).toBeUndefined();
	});
});

describe('getBarStepIntervalSeconds', () => {
	// V1 parity: getBarStepIntervalPoints in container/GridCardLayout/utils.ts
	it.each([
		[30, 60],
		[60, 60],
		[120, 120],
		[180, 120],
		[300, 180],
	])('%s min range → %s s step', (minutes, step) => {
		expect(getBarStepIntervalSeconds(0, minutes * 60 * 1000)).toBe(step);
	});

	it('caps long ranges at ~80 bars, rounded to 5-minute steps', () => {
		// 24h = 1440 min → 1440/80 = 18 → rounded up to 20 min → 1200 s
		expect(getBarStepIntervalSeconds(0, 24 * HOUR_MS)).toBe(1200);
	});
});

describe('extractLegendMap', () => {
	it('maps query names to legends across composite subqueries', () => {
		const legendMap = extractLegendMap(
			compositeQuery([
				{ type: 'builder_query', spec: { name: 'A', legend: 'CPU {{host}}' } },
				{ type: 'builder_query', spec: { name: 'B' } },
				{ type: 'builder_formula', spec: { name: 'F1', legend: 'sum' } },
			]),
		);
		expect(legendMap).toStrictEqual({ A: 'CPU {{host}}', B: '', F1: 'sum' });
	});
});

describe('hasRunnableQueries', () => {
	it('false when the panel has no queries', () => {
		expect(hasRunnableQueries([])).toBe(false);
	});

	it('true for non-metrics builder queries', () => {
		expect(
			hasRunnableQueries(bareBuilderQuery({ name: 'A', signal: 'logs' })),
		).toBe(true);
	});

	it('false when every metrics query is missing a metric name', () => {
		expect(
			hasRunnableQueries(
				bareBuilderQuery({
					name: 'A',
					signal: 'metrics',
					aggregations: [{ metricName: ' ' }],
				}),
			),
		).toBe(false);
	});

	it('true when at least one metrics query has a metric name', () => {
		expect(
			hasRunnableQueries(
				compositeQuery([
					{
						type: 'builder_query',
						spec: { name: 'A', signal: 'metrics', aggregations: [{}] },
					},
					{
						type: 'builder_query',
						spec: {
							name: 'B',
							signal: 'metrics',
							aggregations: [{ metricName: 'system_cpu' }],
						},
					},
				]),
			),
		).toBe(true);
	});
});
