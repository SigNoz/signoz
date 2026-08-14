import {
	type DashboardtypesQueryDTO,
	Querybuildertypesv5RequestTypeDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	buildQueryRangeRequest,
	extractLegendMap,
	getBarStepIntervalSeconds,
	hasRunnableQueries,
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

// Capability blocks matching what each kind declares, so these tests exercise the
// builder's response to the flags rather than the declarations themselves (those are
// asserted against the registry in Panels/__tests__/capabilities.test.ts).
const TIME_SERIES_CAPS = {
	requestType: Querybuildertypesv5RequestTypeDTO.time_series,
	formatTableResultForUI: false,
	bucketedStepInterval: false,
	orderTiebreaker: false,
	serverPaginated: false,
	listView: false,
	traceOperator: true,
};
const BAR_CAPS = { ...TIME_SERIES_CAPS, bucketedStepInterval: true };
const TABLE_CAPS = {
	...TIME_SERIES_CAPS,
	requestType: Querybuildertypesv5RequestTypeDTO.scalar,
	formatTableResultForUI: true,
};
const LIST_CAPS = {
	...TIME_SERIES_CAPS,
	requestType: Querybuildertypesv5RequestTypeDTO.raw,
	orderTiebreaker: true,
	serverPaginated: true,
	listView: true,
	traceOperator: false,
};

describe('requestType', () => {
	it.each([
		Querybuildertypesv5RequestTypeDTO.time_series,
		Querybuildertypesv5RequestTypeDTO.scalar,
		Querybuildertypesv5RequestTypeDTO.raw,
		Querybuildertypesv5RequestTypeDTO.trace,
	])('passes %s through from the declared capabilities', (requestType) => {
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A', signal: 'metrics' }),
			queryCapabilities: { ...TIME_SERIES_CAPS, requestType },
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
		});
		expect(request.requestType).toBe(requestType);
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
			queryCapabilities: TIME_SERIES_CAPS,
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
			queryCapabilities: TABLE_CAPS,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
		});
		expect(request.formatOptions?.formatTableResultForUI).toBe(true);
	});

	it('passes through fillGaps into formatOptions', () => {
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A' }),
			queryCapabilities: TIME_SERIES_CAPS,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
			fillGaps: true,
		});
		expect(request.formatOptions?.fillGaps).toBe(true);
	});

	it('stamps offset/limit onto builder queries when pagination is given', () => {
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A', signal: 'logs' }),
			queryCapabilities: LIST_CAPS,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
			pagination: { offset: 100, limit: 50 },
		});
		expect(request.compositeQuery?.queries?.[0]?.spec).toStrictEqual({
			name: 'A',
			signal: 'logs',
			offset: 100,
			limit: 50,
			order: [
				{ key: { name: 'timestamp' }, direction: 'desc' },
				{ key: { name: 'id' }, direction: 'desc' },
			],
		});
	});

	it('defaults a logs list with no order to timestamp desc + id tiebreaker', () => {
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A', signal: 'logs' }),
			queryCapabilities: LIST_CAPS,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
		});
		const spec = request.compositeQuery?.queries?.[0]?.spec as {
			order?: { key?: { name?: string }; direction?: string }[];
		};
		expect(spec.order).toStrictEqual([
			{ key: { name: 'timestamp' }, direction: 'desc' },
			{ key: { name: 'id' }, direction: 'desc' },
		]);
	});

	it('appends an id tiebreaker to a logs list order (mirroring the primary direction)', () => {
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({
				name: 'A',
				signal: 'logs',
				order: [{ key: { name: 'timestamp' }, direction: 'desc' }],
			}),
			queryCapabilities: LIST_CAPS,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
		});
		const spec = request.compositeQuery?.queries?.[0]?.spec as {
			order?: { key?: { name?: string }; direction?: string }[];
		};
		expect(spec.order).toStrictEqual([
			{ key: { name: 'timestamp' }, direction: 'desc' },
			{ key: { name: 'id' }, direction: 'desc' },
		]);
	});

	it('does not duplicate an id tiebreaker already present in the order', () => {
		const order = [
			{ key: { name: 'timestamp' }, direction: 'asc' },
			{ key: { name: 'id' }, direction: 'asc' },
		];
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A', signal: 'logs', order }),
			queryCapabilities: LIST_CAPS,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
		});
		const spec = request.compositeQuery?.queries?.[0]?.spec as {
			order?: unknown[];
		};
		expect(spec.order).toStrictEqual(order);
	});

	it('does not add an id tiebreaker for a traces list order (explorer parity)', () => {
		const order = [{ key: { name: 'timestamp' }, direction: 'desc' }];
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A', signal: 'traces', order }),
			queryCapabilities: LIST_CAPS,
			startMs: START_MS,
			endMs: START_MS + HOUR_MS,
		});
		const spec = request.compositeQuery?.queries?.[0]?.spec as {
			order?: unknown[];
		};
		expect(spec.order).toStrictEqual(order);
	});

	it('injects the range-derived stepInterval into BAR builder queries without one', () => {
		const request = buildQueryRangeRequest({
			queries: bareBuilderQuery({ name: 'A', signal: 'metrics' }),
			queryCapabilities: BAR_CAPS,
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
			queryCapabilities: BAR_CAPS,
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
			queryCapabilities: TIME_SERIES_CAPS,
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
