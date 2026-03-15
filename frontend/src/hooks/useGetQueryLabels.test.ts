import { renderHook } from '@testing-library/react';
import {
	IBuilderFormula,
	IClickHouseQuery,
	IPromQLQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { useGetQueryLabels } from './useGetQueryLabels';

jest.mock('components/QueryBuilderV2/utils', () => ({
	getQueryLabelWithAggregation: jest.fn(() => []),
}));

function buildQuery(overrides: Partial<Query> = {}): Query {
	return {
		id: 'test-id',
		queryType: EQueryType.QUERY_BUILDER,
		builder: {
			queryData: [],
			queryFormulas: [],
			queryTraceOperator: [],
		},
		promql: [],
		clickhouse_sql: [],
		...overrides,
	};
}

describe('useGetQueryLabels', () => {
	describe('QUERY_BUILDER type', () => {
		it('returns empty array when queryFormulas is undefined', () => {
			const query = buildQuery({
				queryType: EQueryType.QUERY_BUILDER,
				builder: {
					queryData: [],
					queryFormulas: (undefined as unknown) as IBuilderFormula[],
					queryTraceOperator: [],
				},
			});

			const { result } = renderHook(() => useGetQueryLabels(query));

			expect(result.current).toEqual([]);
		});

		it('returns formula labels when queryFormulas is populated', () => {
			const query = buildQuery({
				queryType: EQueryType.QUERY_BUILDER,
				builder: {
					queryData: [],
					queryFormulas: [
						({ queryName: 'F1' } as unknown) as IBuilderFormula,
						({ queryName: 'F2' } as unknown) as IBuilderFormula,
					],
					queryTraceOperator: [],
				},
			});

			const { result } = renderHook(() => useGetQueryLabels(query));

			expect(result.current).toEqual([
				{ label: 'F1', value: 'F1' },
				{ label: 'F2', value: 'F2' },
			]);
		});
	});

	describe('CLICKHOUSE type', () => {
		it('returns empty array when clickhouse_sql is undefined', () => {
			const query = buildQuery({
				queryType: EQueryType.CLICKHOUSE,
				clickhouse_sql: (undefined as unknown) as IClickHouseQuery[],
			});

			const { result } = renderHook(() => useGetQueryLabels(query));

			expect(result.current).toEqual([]);
		});

		it('returns labels from clickhouse_sql when populated', () => {
			const query = buildQuery({
				queryType: EQueryType.CLICKHOUSE,
				clickhouse_sql: [
					({ name: 'query_a' } as unknown) as IClickHouseQuery,
					({ name: 'query_b' } as unknown) as IClickHouseQuery,
				],
			});

			const { result } = renderHook(() => useGetQueryLabels(query));

			expect(result.current).toEqual([
				{ label: 'query_a', value: 'query_a' },
				{ label: 'query_b', value: 'query_b' },
			]);
		});
	});

	describe('PROM type (default)', () => {
		it('returns empty array when promql is undefined', () => {
			const query = buildQuery({
				queryType: EQueryType.PROM,
				promql: (undefined as unknown) as IPromQLQuery[],
			});

			const { result } = renderHook(() => useGetQueryLabels(query));

			expect(result.current).toEqual([]);
		});

		it('returns labels from promql when populated', () => {
			const query = buildQuery({
				queryType: EQueryType.PROM,
				promql: [
					({ name: 'prom_1' } as unknown) as IPromQLQuery,
					({ name: 'prom_2' } as unknown) as IPromQLQuery,
				],
			});

			const { result } = renderHook(() => useGetQueryLabels(query));

			expect(result.current).toEqual([
				{ label: 'prom_1', value: 'prom_1' },
				{ label: 'prom_2', value: 'prom_2' },
			]);
		});
	});
});
