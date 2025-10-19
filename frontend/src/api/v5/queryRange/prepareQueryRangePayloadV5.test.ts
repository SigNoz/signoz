/* eslint-disable sonarjs/no-duplicate-string, simple-import-sort/imports, @typescript-eslint/indent, no-mixed-spaces-and-tabs */
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import {
	ClickHouseQuery,
	LogAggregation,
	LogBuilderQuery,
	MetricBuilderQuery,
	PromQuery,
	QueryBuilderFormula as V5QueryBuilderFormula,
	QueryEnvelope,
	QueryRangePayloadV5,
} from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { prepareQueryRangePayloadV5 } from './prepareQueryRangePayloadV5';

jest.mock('lib/getStartEndRangeTime', () => ({
	__esModule: true,
	default: jest.fn(() => ({ start: '100', end: '200' })),
}));

describe('prepareQueryRangePayloadV5', () => {
	const start = 1_710_000_000; // seconds
	const end = 1_710_000_600; // seconds

	const baseBuilderQuery = (
		overrides?: Partial<IBuilderQuery>,
	): IBuilderQuery => ({
		queryName: 'A',
		dataSource: DataSource.METRICS,
		aggregations: [
			{
				metricName: 'cpu_usage',
				temporality: '',
				timeAggregation: 'sum',
				spaceAggregation: 'avg',
				reduceTo: 'avg',
			},
		],
		timeAggregation: 'sum',
		spaceAggregation: 'avg',
		temporality: '',
		functions: [
			{
				name: 'timeShift',
				args: [{ value: '5m' }],
			},
		],
		filter: { expression: '' },
		filters: { items: [], op: 'AND' },
		groupBy: [],
		expression: 'A',
		disabled: false,
		having: [],
		limit: null,
		stepInterval: 600,
		orderBy: [],
		reduceTo: 'avg',
		legend: 'Legend A',
		...overrides,
	});

	const baseFormula = (
		overrides?: Partial<IBuilderFormula>,
	): IBuilderFormula => ({
		expression: 'A + 1',
		disabled: false,
		queryName: 'F1',
		legend: 'Formula Legend',
		limit: undefined,
		having: [],
		stepInterval: undefined,
		orderBy: [],
		...overrides,
	});

	it('builds payload for builder queries with formulas and variables', () => {
		const props: GetQueryResultsProps = {
			query: {
				queryType: EQueryType.QUERY_BUILDER,
				id: 'q1',
				unit: undefined,
				promql: [],
				clickhouse_sql: [],
				builder: {
					queryData: [baseBuilderQuery()],
					queryFormulas: [baseFormula()],
					queryTraceOperator: [],
				},
			},
			graphType: PANEL_TYPES.TIME_SERIES,
			selectedTime: 'GLOBAL_TIME',
			start,
			end,
			variables: { svc: 'api', count: 5, flag: true },
			fillGaps: true,
		};

		const result = prepareQueryRangePayloadV5(props);

		expect(result).toEqual(
			expect.objectContaining({
				legendMap: { A: 'Legend A', F1: 'Formula Legend' },
				queryPayload: expect.objectContaining({
					compositeQuery: expect.objectContaining({
						queries: expect.arrayContaining([
							expect.objectContaining({
								type: 'builder_query',
								spec: expect.objectContaining({
									name: 'A',
									signal: 'metrics',
									stepInterval: 600,
									functions: [{ name: 'timeShift', args: [{ value: '5m' }] }],
									aggregations: [
										expect.objectContaining({
											metricName: 'cpu_usage',
											timeAggregation: 'sum',
											spaceAggregation: 'avg',
											reduceTo: undefined,
										}),
									],
								}),
							}),
							expect.objectContaining({
								type: 'builder_formula',
								spec: expect.objectContaining({
									name: 'F1',
									expression: 'A + 1',
									legend: 'Formula Legend',
								}),
							}),
						]),
					}),
					requestType: 'time_series',
					formatOptions: expect.objectContaining({
						formatTableResultForUI: false,
						fillGaps: true,
					}),
					start: start * 1000,
					end: end * 1000,
					variables: expect.objectContaining({
						svc: { value: 'api' },
						count: { value: 5 },
						flag: { value: true },
					}),
				}),
			}),
		);

		// Legend map combines builder and formulas
		expect(result.legendMap).toEqual({ A: 'Legend A', F1: 'Formula Legend' });

		const payload: QueryRangePayloadV5 = result.queryPayload;

		expect(payload.schemaVersion).toBe('v1');
		expect(payload.start).toBe(start * 1000);
		expect(payload.end).toBe(end * 1000);
		expect(payload.requestType).toBe('time_series');
		expect(payload.formatOptions?.formatTableResultForUI).toBe(false);
		expect(payload.formatOptions?.fillGaps).toBe(true);

		// Variables mapped as { key: { value } }
		expect(payload.variables).toEqual({
			svc: { value: 'api' },
			count: { value: 5 },
			flag: { value: true },
		});

		// Queries include one builder_query and one builder_formula
		expect(payload.compositeQuery.queries).toHaveLength(2);

		const builderQuery = payload.compositeQuery.queries.find(
			(q) => q.type === 'builder_query',
		) as QueryEnvelope;
		const builderSpec = builderQuery.spec as MetricBuilderQuery;
		expect(builderSpec.name).toBe('A');
		expect(builderSpec.signal).toBe('metrics');
		expect(builderSpec.aggregations?.[0]).toMatchObject({
			metricName: 'cpu_usage',
			timeAggregation: 'sum',
			spaceAggregation: 'avg',
		});
		// reduceTo should not be present for non-scalar panels
		expect(builderSpec.aggregations?.[0].reduceTo).toBeUndefined();
		// functions should be preserved/normalized
		expect(builderSpec.functions?.[0]?.name).toBe('timeShift');

		const formulaQuery = payload.compositeQuery.queries.find(
			(q) => q.type === 'builder_formula',
		) as QueryEnvelope;
		const formulaSpec = formulaQuery.spec as V5QueryBuilderFormula;
		expect(formulaSpec.name).toBe('F1');
		expect(formulaSpec.expression).toBe('A + 1');
		expect(formulaSpec.legend).toBe('Formula Legend');
	});

	it('builds payload for PromQL queries and respects originalGraphType for formatting', () => {
		const props: GetQueryResultsProps = {
			query: {
				queryType: EQueryType.PROM,
				id: 'q2',
				unit: undefined,
				promql: [
					{
						name: 'A',
						query: 'up',
						disabled: false,
						legend: 'LP',
					},
				],
				clickhouse_sql: [],
				builder: { queryData: [], queryFormulas: [], queryTraceOperator: [] },
			},
			graphType: PANEL_TYPES.TIME_SERIES,
			originalGraphType: PANEL_TYPES.TABLE,
			selectedTime: 'GLOBAL_TIME',
			start,
			end,
		};

		const result = prepareQueryRangePayloadV5(props);

		expect(result).toEqual(
			expect.objectContaining({
				legendMap: { A: 'LP' },
				queryPayload: expect.objectContaining({
					compositeQuery: expect.objectContaining({
						queries: [
							{
								type: 'promql',
								spec: expect.objectContaining({
									name: 'A',
									query: 'up',
									legend: 'LP',
									stats: false,
								}),
							},
						],
					}),
					requestType: 'time_series',
					formatOptions: expect.objectContaining({
						formatTableResultForUI: true,
						fillGaps: false,
					}),
					start: start * 1000,
					end: end * 1000,
					variables: {},
				}),
			}),
		);

		expect(result.legendMap).toEqual({ A: 'LP' });

		const payload: QueryRangePayloadV5 = result.queryPayload;
		expect(payload.requestType).toBe('time_series');
		expect(payload.formatOptions?.formatTableResultForUI).toBe(true);
		expect(payload.compositeQuery.queries).toHaveLength(1);

		const prom = payload.compositeQuery.queries[0];
		expect(prom.type).toBe('promql');
		const promSpec = prom.spec as PromQuery;
		expect(promSpec.name).toBe('A');
		expect(promSpec.query).toBe('up');
		expect(promSpec.legend).toBe('LP');
		expect(promSpec.stats).toBe(false);
	});

	it('builds payload for ClickHouse queries and maps requestType from panel', () => {
		const props: GetQueryResultsProps = {
			query: {
				queryType: EQueryType.CLICKHOUSE,
				id: 'q3',
				unit: undefined,
				promql: [],
				clickhouse_sql: [
					{
						name: 'Q',
						query: 'SELECT 1',
						disabled: false,
						legend: 'LC',
					},
				],
				builder: { queryData: [], queryFormulas: [], queryTraceOperator: [] },
			},
			graphType: PANEL_TYPES.TABLE,
			selectedTime: 'GLOBAL_TIME',
			start,
			end,
		};

		const result = prepareQueryRangePayloadV5(props);

		expect(result).toEqual(
			expect.objectContaining({
				legendMap: { Q: 'LC' },
				queryPayload: expect.objectContaining({
					compositeQuery: expect.objectContaining({
						queries: [
							{
								type: 'clickhouse_sql',
								spec: expect.objectContaining({
									name: 'Q',
									query: 'SELECT 1',
									legend: 'LC',
								}),
							},
						],
					}),
					requestType: 'scalar',
					formatOptions: expect.objectContaining({
						formatTableResultForUI: true,
						fillGaps: false,
					}),
					start: start * 1000,
					end: end * 1000,
					variables: {},
				}),
			}),
		);

		expect(result.legendMap).toEqual({ Q: 'LC' });

		const payload: QueryRangePayloadV5 = result.queryPayload;
		expect(payload.requestType).toBe('scalar');
		expect(payload.compositeQuery.queries).toHaveLength(1);
		const ch = payload.compositeQuery.queries[0];
		expect(ch.type).toBe('clickhouse_sql');
		const chSpec = ch.spec as ClickHouseQuery;
		expect(chSpec.name).toBe('Q');
		expect(chSpec.query).toBe('SELECT 1');
		expect(chSpec.legend).toBe('LC');
	});

	it('uses getStartEndRangeTime when start/end are not provided', () => {
		const props: GetQueryResultsProps = {
			query: {
				queryType: EQueryType.QUERY_BUILDER,
				id: 'q4',
				unit: undefined,
				promql: [],
				clickhouse_sql: [],
				builder: { queryData: [], queryFormulas: [], queryTraceOperator: [] },
			},
			graphType: PANEL_TYPES.TIME_SERIES,
			selectedTime: 'GLOBAL_TIME',
		};

		const result = prepareQueryRangePayloadV5(props);

		expect(result).toEqual(
			expect.objectContaining({
				legendMap: {},
				queryPayload: expect.objectContaining({
					compositeQuery: { queries: [] },
					requestType: 'time_series',
					formatOptions: expect.objectContaining({
						formatTableResultForUI: false,
						fillGaps: false,
					}),
					start: 100 * 1000,
					end: 200 * 1000,
					variables: {},
				}),
			}),
		);

		const payload: QueryRangePayloadV5 = result.queryPayload;
		expect(payload.start).toBe(100 * 1000);
		expect(payload.end).toBe(200 * 1000);
	});

	it('includes reduceTo for metrics in scalar panels (TABLE)', () => {
		const props: GetQueryResultsProps = {
			query: {
				queryType: EQueryType.QUERY_BUILDER,
				id: 'q5',
				unit: undefined,
				promql: [],
				clickhouse_sql: [],
				builder: {
					queryData: [baseBuilderQuery()],
					queryFormulas: [],
					queryTraceOperator: [],
				},
			},
			graphType: PANEL_TYPES.TABLE,
			selectedTime: 'GLOBAL_TIME',
			start,
			end,
		};

		const result = prepareQueryRangePayloadV5(props);

		expect(result).toEqual(
			expect.objectContaining({
				legendMap: { A: 'Legend A' },
				queryPayload: expect.objectContaining({
					compositeQuery: expect.objectContaining({
						queries: [
							{
								type: 'builder_query',
								spec: expect.objectContaining({
									name: 'A',
									signal: 'metrics',
									stepInterval: 600,
									functions: [{ name: 'timeShift', args: [{ value: '5m' }] }],
									aggregations: [
										expect.objectContaining({
											metricName: 'cpu_usage',
											timeAggregation: 'sum',
											spaceAggregation: 'avg',
											reduceTo: 'avg',
											temporality: undefined,
										}),
									],
								}),
							},
						],
					}),
					requestType: 'scalar',
					formatOptions: expect.objectContaining({
						formatTableResultForUI: true,
						fillGaps: false,
					}),
					start: start * 1000,
					end: end * 1000,
					variables: {},
				}),
			}),
		);

		const payload: QueryRangePayloadV5 = result.queryPayload;
		const builderQuery = payload.compositeQuery.queries.find(
			(q) => q.type === 'builder_query',
		) as QueryEnvelope;
		const builderSpec = builderQuery.spec as MetricBuilderQuery;
		expect(builderSpec.aggregations?.[0].reduceTo).toBe('avg');
	});

	it('omits aggregations for raw request type (LIST panel)', () => {
		const logAgg: LogAggregation[] = [{ expression: 'count()' }];
		const logsQuery = baseBuilderQuery({
			dataSource: DataSource.LOGS,
			aggregations: logAgg,
		} as Partial<IBuilderQuery>);

		const props: GetQueryResultsProps = {
			query: {
				queryType: EQueryType.QUERY_BUILDER,
				id: 'q6',
				unit: undefined,
				promql: [],
				clickhouse_sql: [],
				builder: {
					queryData: [logsQuery],
					queryFormulas: [],
					queryTraceOperator: [],
				},
			},
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			start,
			end,
		};

		const result = prepareQueryRangePayloadV5(props);

		expect(result).toEqual(
			expect.objectContaining({
				legendMap: { A: 'Legend A' },
				queryPayload: expect.objectContaining({
					compositeQuery: expect.objectContaining({
						queries: [
							{
								type: 'builder_query',
								spec: expect.objectContaining({
									name: 'A',
									signal: 'logs',
									stepInterval: 600,
									functions: [{ name: 'timeShift', args: [{ value: '5m' }] }],
									aggregations: undefined,
								}),
							},
						],
					}),
					requestType: 'raw',
					formatOptions: expect.objectContaining({
						formatTableResultForUI: false,
						fillGaps: false,
					}),
					start: start * 1000,
					end: end * 1000,
					variables: {},
				}),
			}),
		);

		const payload: QueryRangePayloadV5 = result.queryPayload;
		expect(payload.requestType).toBe('raw');
		const builderQuery = payload.compositeQuery.queries.find(
			(q) => q.type === 'builder_query',
		) as QueryEnvelope;
		// For RAW request type, aggregations should be omitted
		const logSpec = builderQuery.spec as LogBuilderQuery;
		expect(logSpec.aggregations).toBeUndefined();
	});

	it('maps groupBy, order, having, aggregations and filter for logs builder query', () => {
		const getStartEndRangeTime = jest.requireMock('lib/getStartEndRangeTime')
			.default as jest.Mock;
		getStartEndRangeTime.mockReturnValueOnce({
			start: '1754623641',
			end: '1754645241',
		});

		const props: GetQueryResultsProps = {
			query: {
				queryType: EQueryType.QUERY_BUILDER,
				id: 'e643e387-1996-4449-97b6-9ef4498a0573',
				unit: undefined,
				promql: [{ name: 'A', query: '', legend: '', disabled: false }],
				clickhouse_sql: [{ name: 'A', legend: '', disabled: false, query: '' }],
				builder: {
					queryData: [
						{
							dataSource: DataSource.LOGS,
							queryName: 'A',
							aggregateOperator: 'count',
							aggregateAttribute: {
								key: '',
								dataType: DataTypes.EMPTY,
								type: '',
							},
							timeAggregation: 'rate',
							spaceAggregation: 'sum',
							filter: { expression: "service.name = 'adservice'" },
							aggregations: [
								{ expression: 'count() as cnt avg(code.lineno) ' } as LogAggregation,
							],
							functions: [],
							filters: {
								items: [
									{
										id: '14c790ec-54d1-42f0-a889-3b4f0fb79852',
										op: '=',
										key: { id: 'service.name', key: 'service.name', type: '' },
										value: 'adservice',
									},
								],
								op: 'AND',
							},
							expression: 'A',
							disabled: false,
							stepInterval: 80,
							having: { expression: 'count() > 0' },
							limit: 600,
							orderBy: [{ columnName: 'service.name', order: 'desc' }],
							groupBy: [
								{
									key: 'service.name',
									type: '',
								},
							],
							legend: '{{service.name}}',
							reduceTo: 'avg',
							offset: 0,
							pageSize: 100,
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
			},
			graphType: PANEL_TYPES.TIME_SERIES,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: 'custom' as never,
			variables: {},
		};

		const result = prepareQueryRangePayloadV5(props);

		expect(result).toEqual(
			expect.objectContaining({
				legendMap: { A: '{{service.name}}' },
				queryPayload: expect.objectContaining({
					schemaVersion: 'v1',
					start: 1754623641000,
					end: 1754645241000,
					requestType: 'time_series',
					compositeQuery: expect.objectContaining({
						queries: [
							{
								type: 'builder_query',
								spec: expect.objectContaining({
									name: 'A',
									signal: 'logs',
									stepInterval: 80,
									disabled: false,
									filter: { expression: "service.name = 'adservice'" },
									groupBy: [
										{
											name: 'service.name',
											fieldDataType: '',
											fieldContext: '',
										},
									],
									limit: 600,
									order: [
										{
											key: { name: 'service.name' },
											direction: 'desc',
										},
									],
									legend: '{{service.name}}',
									having: { expression: 'count() > 0' },
									aggregations: [
										{ expression: 'count()', alias: 'cnt' },
										{ expression: 'avg(code.lineno)' },
									],
								}),
							},
						],
					}),
					formatOptions: { formatTableResultForUI: false, fillGaps: false },
					variables: {},
				}),
			}),
		);
	});

	it('builds payload for builder queries with filters array but no filter expression', () => {
		const props: GetQueryResultsProps = {
			query: {
				queryType: EQueryType.QUERY_BUILDER,
				id: 'q8',
				unit: undefined,
				promql: [],
				clickhouse_sql: [],
				builder: {
					queryData: [
						baseBuilderQuery({
							dataSource: DataSource.LOGS,
							filter: { expression: '' },
							filters: {
								items: [
									{
										id: '1',
										key: { key: 'service.name', type: 'string' },
										op: '=',
										value: 'payment-service',
									},
									{
										id: '2',
										key: { key: 'http.status_code', type: 'number' },
										op: '>=',
										value: 400,
									},
									{
										id: '3',
										key: { key: 'message', type: 'string' },
										op: 'contains',
										value: 'error',
									},
								],
								op: 'AND',
							},
						}),
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
			},
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			start,
			end,
		};

		const result = prepareQueryRangePayloadV5(props);

		expect(result.legendMap).toEqual({ A: 'Legend A' });
		expect(result.queryPayload.compositeQuery.queries).toHaveLength(1);

		const builderQuery = result.queryPayload.compositeQuery.queries.find(
			(q) => q.type === 'builder_query',
		) as QueryEnvelope;
		const logSpec = builderQuery.spec as LogBuilderQuery;

		expect(logSpec.name).toBe('A');
		expect(logSpec.signal).toBe('logs');
		expect(logSpec.filter).toEqual({
			expression:
				"service.name = 'payment-service' AND http.status_code >= 400 AND message contains 'error'",
		});
	});

	it('uses filter.expression when only expression is provided', () => {
		const props: GetQueryResultsProps = {
			query: {
				queryType: EQueryType.QUERY_BUILDER,
				id: 'q9',
				unit: undefined,
				promql: [],
				clickhouse_sql: [],
				builder: {
					queryData: [
						baseBuilderQuery({
							dataSource: DataSource.LOGS,
							filter: { expression: 'http.status_code >= 500' },
							filters: (undefined as unknown) as IBuilderQuery['filters'],
						}),
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
			},
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			start,
			end,
		};

		const result = prepareQueryRangePayloadV5(props);
		const builderQuery = result.queryPayload.compositeQuery.queries.find(
			(q) => q.type === 'builder_query',
		) as QueryEnvelope;
		const logSpec = builderQuery.spec as LogBuilderQuery;
		expect(logSpec.filter).toEqual({ expression: 'http.status_code >= 500' });
	});

	it('derives expression from filters when filter is undefined', () => {
		const props: GetQueryResultsProps = {
			query: {
				queryType: EQueryType.QUERY_BUILDER,
				id: 'q10',
				unit: undefined,
				promql: [],
				clickhouse_sql: [],
				builder: {
					queryData: [
						baseBuilderQuery({
							dataSource: DataSource.LOGS,
							filter: (undefined as unknown) as IBuilderQuery['filter'],
							filters: {
								items: [
									{
										id: '1',
										key: { key: 'service.name', type: 'string' },
										op: '=',
										value: 'checkout',
									},
								],
								op: 'AND',
							},
						}),
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
			},
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			start,
			end,
		};

		const result = prepareQueryRangePayloadV5(props);
		const builderQuery = result.queryPayload.compositeQuery.queries.find(
			(q) => q.type === 'builder_query',
		) as QueryEnvelope;
		const logSpec = builderQuery.spec as LogBuilderQuery;
		expect(logSpec.filter).toEqual({ expression: "service.name = 'checkout'" });
	});

	it('prefers filter.expression over filters when both are present', () => {
		const props: GetQueryResultsProps = {
			query: {
				queryType: EQueryType.QUERY_BUILDER,
				id: 'q11',
				unit: undefined,
				promql: [],
				clickhouse_sql: [],
				builder: {
					queryData: [
						baseBuilderQuery({
							dataSource: DataSource.LOGS,
							filter: { expression: "service.name = 'frontend'" },
							filters: {
								items: [
									{
										id: '1',
										key: { key: 'service.name', type: 'string' },
										op: '=',
										value: 'backend',
									},
								],
								op: 'AND',
							},
						}),
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
			},
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			start,
			end,
		};

		const result = prepareQueryRangePayloadV5(props);
		const builderQuery = result.queryPayload.compositeQuery.queries.find(
			(q) => q.type === 'builder_query',
		) as QueryEnvelope;
		const logSpec = builderQuery.spec as LogBuilderQuery;
		expect(logSpec.filter).toEqual({ expression: "service.name = 'frontend'" });
	});

	it('returns empty expression when neither filter nor filters provided', () => {
		const props: GetQueryResultsProps = {
			query: {
				queryType: EQueryType.QUERY_BUILDER,
				id: 'q12',
				unit: undefined,
				promql: [],
				clickhouse_sql: [],
				builder: {
					queryData: [
						baseBuilderQuery({
							dataSource: DataSource.LOGS,
							filter: (undefined as unknown) as IBuilderQuery['filter'],
							filters: (undefined as unknown) as IBuilderQuery['filters'],
						}),
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
			},
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			start,
			end,
		};

		const result = prepareQueryRangePayloadV5(props);
		const builderQuery = result.queryPayload.compositeQuery.queries.find(
			(q) => q.type === 'builder_query',
		) as QueryEnvelope;
		const logSpec = builderQuery.spec as LogBuilderQuery;
		expect(logSpec.filter).toEqual({ expression: '' });
	});

	it('returns empty expression when filters provided with empty items', () => {
		const props: GetQueryResultsProps = {
			query: {
				queryType: EQueryType.QUERY_BUILDER,
				id: 'q13',
				unit: undefined,
				promql: [],
				clickhouse_sql: [],
				builder: {
					queryData: [
						baseBuilderQuery({
							dataSource: DataSource.LOGS,
							filter: { expression: '' },
							filters: { items: [], op: 'AND' },
						}),
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
			},
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			start,
			end,
		};

		const result = prepareQueryRangePayloadV5(props);
		const builderQuery = result.queryPayload.compositeQuery.queries.find(
			(q) => q.type === 'builder_query',
		) as QueryEnvelope;
		const logSpec = builderQuery.spec as LogBuilderQuery;
		expect(logSpec.filter).toEqual({ expression: '' });
	});
});
