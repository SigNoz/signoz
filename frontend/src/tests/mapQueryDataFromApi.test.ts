/* eslint-disable sonarjs/no-duplicate-string */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
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
					isColumn: true,
					isJSON: false,
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

		const baseQuery: Query = {
			id: '139dbe9d-0e5a-40b1-88c5-9bad700f1db0',
			queryType: EQueryType.QUERY_BUILDER,
			unit: undefined,
			promql: [
				{
					name: 'A',
					query: '',
					legend: '',
					disabled: false,
				},
			],
			clickhouse_sql: [
				{
					name: 'A',
					legend: '',
					disabled: false,
					query: '',
				},
			],
			builder: {
				queryData: [
					{
						dataSource: DataSource.TRACES,
						queryName: 'A',
						aggregateOperator: 'count',
						aggregateAttribute: {
							id: '------false',
							dataType: DataTypes.EMPTY,
							key: '',
							isColumn: false,
							type: '',
							isJSON: false,
						},
						timeAggregation: 'rate',
						spaceAggregation: 'sum',
						filter: { expression: "service.name = 'adservice' " },
						aggregations: [
							{ expression: 'count() avg(app.ads.count) as avtv' } as TraceAggregation,
						],
						functions: [],
						filters: {
							items: [
								{
									id: '8012d11b-50b7-4183-88c7-4c4438d04de8',
									op: '=',
									key: { id: 'service.name', key: 'service.name', type: '' },
									value: 'adservice',
								},
							],
							op: 'AND',
						},
						expression: 'A',
						disabled: false,
						stepInterval: 60,
						having: { expression: 'avg(app.ads.count) != 0' },
						limit: null,
						orderBy: [{ columnName: 'avg(app.ads.count)', order: 'asc' }],
						groupBy: [
							{
								dataType: DataTypes.String,
								isColumn: true,
								isJSON: false,
								key: 'service.name',
								type: 'resource',
								id: 'service.name--string--resource--true',
							},
						],
						legend: '',
						reduceTo: 'avg',
					},
				],
				queryFormulas: [],
			},
		};

		const result = mapQueryDataFromApi(compositeQuery, baseQuery);

		expect(result.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(result.promql).toEqual([]);
		expect(result.clickhouse_sql).toEqual([]);

		// Expect one builder query mapped and merged using base query fields
		expect(result.builder.queryData).toHaveLength(1);
		const q = result.builder.queryData[0];

		expect(q.queryName).toBe('A');
		expect(q.dataSource).toBe(DataSource.TRACES);
		expect(q.stepInterval).toBe(60);
		// filter overridden from V5 spec (no trailing space)
		expect(q.filter).toEqual({ expression: "service.name = 'adservice'" });
		// having overridden from V5 spec
		expect(((q.having as unknown) as { expression: string }).expression).toBe(
			'avg(app.ads.count) != 0',
		);
		// orderBy preserved from base
		expect(q.orderBy).toEqual([
			{ columnName: 'avg(app.ads.count)', order: 'asc' },
		]);
		// groupBy converted from V5 spec
		expect(q.groupBy).toEqual([
			{
				key: 'service.name',
				dataType: DataTypes.String,
				type: 'resource',
				isColumn: true,
				isJSON: false,
				id: 'service.name--string--resource--true',
			},
		]);
		// aggregations replaced with array from V5 spec
		expect(q.aggregations).toEqual<TraceAggregation[]>([
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

		const baseQuery: Query = {
			id: 'seed-id',
			queryType: EQueryType.QUERY_BUILDER,
			unit: undefined,
			promql: [],
			clickhouse_sql: [],
			builder: {
				queryData: [
					{
						dataSource: DataSource.TRACES,
						queryName: 'A',
						aggregateOperator: 'count',
						aggregateAttribute: {
							id: '------false',
							dataType: DataTypes.EMPTY,
							key: '',
							isColumn: false,
							type: '',
							isJSON: false,
						},
						timeAggregation: 'rate',
						spaceAggregation: 'sum',
						filter: { expression: "service.name = 'adservice' " },
						aggregations: [
							{ expression: 'count() avg(app.ads.count) as avtv' } as TraceAggregation,
						],
						functions: [],
						expression: 'A',
						disabled: false,
						stepInterval: 60,
						limit: null,
						orderBy: [{ columnName: 'avg(app.ads.count)', order: 'asc' }],
						groupBy: [
							{
								dataType: DataTypes.String,
								isColumn: true,
								isJSON: false,
								key: 'service.name',
								type: 'resource',
								id: 'service.name--string--resource--true',
							},
						],
						legend: '',
						having: { expression: 'avg(app.ads.count) != 0' },
					},
				],
				queryFormulas: [],
			},
		};

		const result = mapQueryDataFromApi(compositeQuery, baseQuery);

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
								id: 'service.name--string--resource--true',
								isColumn: true,
								isJSON: false,
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
});
