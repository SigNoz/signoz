import { initialQueryAIWithType, PANEL_TYPES } from 'constants/queryBuilder';
import { aiTraceAlertDefaults } from 'container/CreateAlertRule/defaults';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	BuilderQuery,
	QueryEnvelope,
	TraceAggregation,
} from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { mapQueryDataFromApi } from '../lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';

jest.mock('uuid', () => ({
	v4: (): string => 'b5f4b7db-799c-47d2-bf32-090340995e20',
}));

describe('mapQueryDataFromApi', (): void => {
	it('maps V5 compositeQuery builder_query into Query builder data using base query', () => {
		const builderSpec: BuilderQuery = {
			name: 'A',
			stepInterval: 60,
			signal: 'traces',
			// fields below align to V5 builder query spec
			filter: { expression: "service.name = 'adservice'" },
			groupBy: [
				{
					name: 'service.name',
					signal: undefined,
					fieldContext: 'resource',
					fieldDataType: 'string',
				},
			],
			order: [
				{
					key: {
						name: 'avg(app.ads.count)',
						signal: undefined,
						fieldContext: '',
						fieldDataType: '',
					},
					direction: 'asc',
				},
			],
			having: { expression: 'avg(app.ads.count) != 0' },
			disabled: false,
			legend: '',
			functions: [],
			selectFields: undefined,
			limit: undefined,
			limitBy: undefined,
			offset: undefined,
			cursor: undefined,
			secondaryAggregations: undefined,
			aggregations: [
				{ expression: 'count()' } as TraceAggregation,
				{ expression: 'avg(app.ads.count)', alias: 'avtv' } as TraceAggregation,
			],
		};

		const compositeQuery: ICompositeMetricQuery = {
			queryType: EQueryType.QUERY_BUILDER,
			panelType: PANEL_TYPES.TIME_SERIES,
			unit: undefined,
			queries: [
				{
					type: 'builder_query',
					spec: builderSpec,
				} as QueryEnvelope,
			],
		};

		const result = mapQueryDataFromApi(compositeQuery);

		expect(result.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(result.promql).toStrictEqual([]);
		expect(result.clickhouse_sql).toStrictEqual([]);

		// Expect one builder query mapped and merged using base query fields
		expect(result.builder.queryData).toHaveLength(1);
		const q = result.builder.queryData[0];

		expect(q.queryName).toBe('A');
		expect(q.dataSource).toBe(DataSource.TRACES);
		expect(q.stepInterval).toBe(60);
		// filter overridden from V5 spec (no trailing space)
		expect(q.filter).toStrictEqual({ expression: "service.name = 'adservice'" });
		// having overridden from V5 spec
		expect((q.having as unknown as { expression: string }).expression).toBe(
			'avg(app.ads.count) != 0',
		);
		// orderBy preserved from base
		expect(q.orderBy).toStrictEqual([
			{ columnName: 'avg(app.ads.count)', order: 'asc' },
		]);
		// groupBy converted from V5 spec
		expect(q.groupBy).toStrictEqual([
			{
				key: 'service.name',
				dataType: DataTypes.String,
				type: 'resource',
				id: 'service.name--string--resource',
			},
		]);
		// aggregations replaced with array from V5 spec
		expect(q.aggregations).toStrictEqual<TraceAggregation[]>([
			{ expression: 'count()' },
			{ expression: 'avg(app.ads.count)', alias: 'avtv' },
		]);
	});

	it('returns expected equality shape for mapped result', () => {
		const builderSpec: BuilderQuery = {
			name: 'A',
			stepInterval: 60,
			signal: 'traces',
			filter: { expression: "service.name = 'adservice'" },
			groupBy: [
				{
					name: 'service.name',
					fieldContext: 'resource',
					fieldDataType: 'string',
				},
			],
			order: [
				{
					key: { name: 'avg(app.ads.count)', fieldContext: '', fieldDataType: '' },
					direction: 'asc',
				},
			],
			having: { expression: 'avg(app.ads.count) != 0' },
			disabled: false,
			legend: '',
			functions: [],
			aggregations: [
				{ expression: 'count()' } as TraceAggregation,
				{ expression: 'avg(app.ads.count)', alias: 'avtv' } as TraceAggregation,
			],
		};

		const compositeQuery: ICompositeMetricQuery = {
			queryType: EQueryType.QUERY_BUILDER,
			panelType: PANEL_TYPES.TIME_SERIES,
			unit: undefined,
			queries: [{ type: 'builder_query', spec: builderSpec } as QueryEnvelope],
		};

		const result = mapQueryDataFromApi(compositeQuery);

		const projected = {
			builder: {
				queryData: [
					{
						aggregations: result.builder.queryData[0].aggregations,
						dataSource: result.builder.queryData[0].dataSource,
						disabled: result.builder.queryData[0].disabled,
						expression: result.builder.queryData[0].expression,
						filter: result.builder.queryData[0].filter,
						functions: result.builder.queryData[0].functions,
						groupBy: result.builder.queryData[0].groupBy,
						having: result.builder.queryData[0].having,
						legend: result.builder.queryData[0].legend,
						limit: result.builder.queryData[0].limit,
						orderBy: result.builder.queryData[0].orderBy,
						queryName: result.builder.queryData[0].queryName,
						stepInterval: result.builder.queryData[0].stepInterval,
					},
				],
				queryFormulas: [],
			},
			promql: [],
			clickhouse_sql: [],
			id: 'b5f4b7db-799c-47d2-bf32-090340995e20',
		};

		expect(projected).toStrictEqual({
			builder: {
				queryData: [
					{
						aggregations: [
							{ expression: 'count()' },
							{ expression: 'avg(app.ads.count)', alias: 'avtv' },
						],
						dataSource: 'traces',
						disabled: false,
						expression: 'A',
						filter: { expression: "service.name = 'adservice'" },
						functions: [],
						groupBy: [
							{
								dataType: 'string',
								id: 'service.name--string--resource',
								key: 'service.name',
								type: 'resource',
							},
						],
						having: { expression: 'avg(app.ads.count) != 0' },
						legend: '',
						limit: null,
						orderBy: [{ columnName: 'avg(app.ads.count)', order: 'asc' }],
						queryName: 'A',
						stepInterval: 60,
					},
				],
				queryFormulas: [],
			},
			promql: [],
			clickhouse_sql: [],
			id: 'b5f4b7db-799c-47d2-bf32-090340995e20',
		});
	});

	it('keeps builder_ai_query on the mapped builder query', () => {
		const compositeQuery: ICompositeMetricQuery = {
			queryType: EQueryType.QUERY_BUILDER,
			panelType: PANEL_TYPES.TIME_SERIES,
			unit: undefined,
			queries: [
				{
					type: 'builder_ai_query',
					spec: {
						name: 'A',
						signal: 'traces',
						filter: { expression: "service.name = 'adservice'" },
						aggregations: [{ expression: 'count()' }],
					},
				} as QueryEnvelope,
			],
		};

		const result = mapQueryDataFromApi(compositeQuery);

		expect(result.builder.queryData[0].builderQueryType).toBe('builder_ai_query');
		expect(result.builder.queryData[0].queryName).toBe('A');
		expect(result.builder.queryData[0].dataSource).toBe(DataSource.TRACES);
	});

	it('puts an AI-typed composite in the AI slot, leaving builder empty', () => {
		const compositeQuery: ICompositeMetricQuery = {
			queryType: EQueryType.AI_QUERY_BUILDER,
			panelType: PANEL_TYPES.TIME_SERIES,
			unit: undefined,
			queries: [
				{
					type: 'builder_ai_query',
					spec: {
						name: 'A',
						signal: 'traces',
						aggregations: [{ expression: 'count()' }],
					},
				} as QueryEnvelope,
				{
					type: 'builder_formula',
					spec: { name: 'F1', expression: 'A * 2' },
				} as QueryEnvelope,
			],
		};

		const result = mapQueryDataFromApi(compositeQuery);

		expect(result.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		expect(result.builder).toStrictEqual({
			queryData: [],
			queryFormulas: [],
			queryTraceOperator: [],
		});
		expect(result.builder_ai_query?.queryData[0]).toMatchObject({
			queryName: 'A',
			builderQueryType: 'builder_ai_query',
		});
		expect(result.builder_ai_query?.queryFormulas[0].queryName).toBe('F1');
	});

	it('puts an AI-typed V3 composite in the AI slot, leaving builder empty', () => {
		const compositeQuery: ICompositeMetricQuery = {
			queryType: EQueryType.AI_QUERY_BUILDER,
			panelType: PANEL_TYPES.TIME_SERIES,
			unit: undefined,
			builderQueries: { A: initialQueryAIWithType.builder.queryData[0] },
		};

		const result = mapQueryDataFromApi(compositeQuery);

		expect(result.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		expect(result.builder).toStrictEqual({
			queryData: [],
			queryFormulas: [],
			queryTraceOperator: [],
		});
		expect(result.builder_ai_query?.queryData[0]).toMatchObject({
			queryName: 'A',
			dataSource: DataSource.TRACES,
			builderQueryType: 'builder_ai_query',
		});
	});

	it('keeps AI-tagged queries of a builder-typed V3 composite in builder', () => {
		const compositeQuery: ICompositeMetricQuery = {
			queryType: EQueryType.QUERY_BUILDER,
			panelType: PANEL_TYPES.TIME_SERIES,
			unit: undefined,
			builderQueries: { A: initialQueryAIWithType.builder.queryData[0] },
		};

		const result = mapQueryDataFromApi(compositeQuery);

		expect(result.builder_ai_query).toBeUndefined();
		expect(result.builder.queryData[0].builderQueryType).toBe('builder_ai_query');
	});

	it('loads the AI traces alert default into the AI slot', () => {
		const result = mapQueryDataFromApi(
			aiTraceAlertDefaults.condition.compositeQuery,
		);

		expect(result.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		expect(result.builder.queryData).toHaveLength(0);
		expect(result.builder_ai_query?.queryData).toHaveLength(1);
		expect(result.builder_ai_query?.queryData[0]).toMatchObject({
			dataSource: DataSource.TRACES,
			builderQueryType: 'builder_ai_query',
		});
	});
});
