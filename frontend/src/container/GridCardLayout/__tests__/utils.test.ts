import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { getBarStepIntervalPoints, updateBarStepInterval } from '../utils';

describe('GridCardLayout Utils', () => {
	describe('getBarStepIntervalPoints', () => {
		it('should return 60 points for duration <= 1 hour', () => {
			// 30 minutes in milliseconds
			const start = Date.now();
			const end = start + 30 * 60 * 1000;

			expect(getBarStepIntervalPoints(start, end)).toBe(60);
		});

		it('should return 60 points for exactly 1 hour', () => {
			// 1 hour in milliseconds
			const start = Date.now();
			const end = start + 60 * 60 * 1000;

			expect(getBarStepIntervalPoints(start, end)).toBe(60);
		});

		it('should return 120 points for duration <= 3 hours', () => {
			// 2 hours in milliseconds
			const start = Date.now();
			const end = start + 2 * 60 * 60 * 1000;

			expect(getBarStepIntervalPoints(start, end)).toBe(120);
		});

		it('should return 120 points for exactly 3 hours', () => {
			// 3 hours in milliseconds
			const start = Date.now();
			const end = start + 3 * 60 * 60 * 1000;

			expect(getBarStepIntervalPoints(start, end)).toBe(120);
		});

		it('should return 180 points for duration <= 5 hours', () => {
			// 4 hours in milliseconds
			const start = Date.now();
			const end = start + 4 * 60 * 60 * 1000;

			expect(getBarStepIntervalPoints(start, end)).toBe(180);
		});

		it('should return 180 points for exactly 5 hours', () => {
			// 5 hours in milliseconds
			const start = Date.now();
			const end = start + 5 * 60 * 60 * 1000;

			expect(getBarStepIntervalPoints(start, end)).toBe(180);
		});

		it('should calculate dynamic interval for duration > 5 hours', () => {
			// 10 hours in milliseconds
			const start = Date.now();
			const end = start + 10 * 60 * 60 * 1000;

			const result = getBarStepIntervalPoints(start, end);

			// For 10 hours (600 minutes), interval should be ceil(600/80) = 8, rounded to 10, then * 60 = 600
			expect(result).toBe(600);
		});

		it('should handle very long durations correctly', () => {
			// 7 days in milliseconds
			const start = Date.now();
			const end = start + 7 * 24 * 60 * 60 * 1000;

			const result = getBarStepIntervalPoints(start, end);

			// For 7 days (10080 minutes), interval should be ceil(10080/80) = 126, rounded to 130, then * 60 = 7800
			expect(result).toBe(7800);
		});

		it('should round up to nearest multiple of 5 minutes', () => {
			// 12 hours in milliseconds
			const start = Date.now();
			const end = start + 12 * 60 * 60 * 1000;

			const result = getBarStepIntervalPoints(start, end);

			// For 12 hours (720 minutes), interval should be ceil(720/80) = 9, rounded to 10, then * 60 = 600
			expect(result).toBe(600);
		});

		it('should handle edge case with very small duration', () => {
			// 1 minute in milliseconds
			const start = Date.now();
			const end = start + 1 * 60 * 1000;

			expect(getBarStepIntervalPoints(start, end)).toBe(60);
		});

		it('should handle zero duration', () => {
			const start = Date.now();
			const end = start;

			expect(getBarStepIntervalPoints(start, end)).toBe(60);
		});
	});

	describe('updateBarStepInterval', () => {
		const mockQuery: Query = {
			queryType: EQueryType.QUERY_BUILDER,
			builder: {
				queryData: [
					{
						stepInterval: null,
						aggregateOperator: 'avg',
						dataSource: DataSource.METRICS,
						queryName: 'A',
						aggregateAttribute: { key: 'cpu_usage', type: 'Gauge' },
						timeAggregation: 'avg',
						spaceAggregation: 'avg',
						functions: [],
						filters: { items: [], op: 'AND' },
						expression: 'A',
						disabled: false,
						having: [],
						groupBy: [],
						orderBy: [],
						limit: null,
						offset: 0,
						pageSize: 0,
						reduceTo: 'avg',
						legend: '',
					},
				],
				queryFormulas: [],
				queryTraceOperator: [],
			},
			clickhouse_sql: [],
			promql: [],
			id: 'test-query',
		};

		it('should update stepInterval based on time range', () => {
			// 2 hours duration
			const minTime = Date.now();
			const maxTime = minTime + 2 * 60 * 60 * 1000;

			const result = updateBarStepInterval(mockQuery, minTime, maxTime);

			expect(result.builder.queryData[0].stepInterval).toBe(120);
		});

		it('should preserve other query properties', () => {
			const minTime = Date.now();
			const maxTime = minTime + 1 * 60 * 60 * 1000;

			const result = updateBarStepInterval(mockQuery, minTime, maxTime);

			expect(result.builder.queryData[0].aggregateOperator).toBe('avg');
			expect(result.builder.queryData[0].queryName).toBe('A');
			expect(result.builder.queryData[0].dataSource).toBe('metrics');
		});

		it('should handle multiple queryData items', () => {
			const multiQueryMock: Query = {
				...mockQuery,
				builder: {
					queryData: [
						...mockQuery.builder.queryData,
						{
							...mockQuery.builder.queryData[0],
							queryName: 'B',
							stepInterval: 45,
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
			};

			const minTime = Date.now();
			const maxTime = minTime + 4 * 60 * 60 * 1000;

			const result = updateBarStepInterval(multiQueryMock, minTime, maxTime);

			expect(result.builder.queryData).toHaveLength(2);
			expect(result.builder.queryData[0].stepInterval).toBe(180);
			expect(result.builder.queryData[1].stepInterval).toBe(45); // 45 is the stepInterval of the second query - custom value
		});

		it('should use calculated stepInterval when original is undefined', () => {
			const queryWithUndefinedStep: Query = {
				...mockQuery,
				builder: {
					queryData: [
						{
							...mockQuery.builder.queryData[0],
							stepInterval: undefined as any,
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
			};

			const minTime = Date.now();
			const maxTime = minTime + 1 * 60 * 60 * 1000;

			const result = updateBarStepInterval(
				queryWithUndefinedStep,
				minTime,
				maxTime,
			);

			expect(result.builder.queryData[0].stepInterval).toBe(60);
		});

		it('should fallback to 60 when calculated stepInterval is 0', () => {
			const minTime = Date.now();
			const maxTime = minTime; // Same time = 0 duration

			const result = updateBarStepInterval(mockQuery, minTime, maxTime);

			expect(result.builder.queryData[0].stepInterval).toBe(60);
		});

		it('should handle very large time ranges', () => {
			const minTime = Date.now();
			const maxTime = minTime + 30 * 24 * 60 * 60 * 1000; // 30 days

			const result = updateBarStepInterval(mockQuery, minTime, maxTime);

			// Should calculate appropriate interval for 30 days
			expect(result.builder.queryData[0].stepInterval).toBeGreaterThan(180);
		});

		it('should handle stepInterval as 0', () => {
			const queryWithZeroStep: Query = {
				...mockQuery,
				builder: {
					queryData: [
						{
							...mockQuery.builder.queryData[0],
							stepInterval: 0,
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
			};

			const minTime = Date.now();
			let maxTime = minTime + 1 * 60 * 60 * 1000;

			const result = updateBarStepInterval(queryWithZeroStep, minTime, maxTime);

			expect(result.builder.queryData[0].stepInterval).toBe(60);

			maxTime = minTime + 30 * 24 * 60 * 60 * 1000; // 30 days

			const result1 = updateBarStepInterval(queryWithZeroStep, minTime, maxTime);

			expect(result1.builder.queryData[0].stepInterval).toBe(32400);
		});

		it('should respect user entered inputs', () => {
			const queryWithUserStep: Query = {
				...mockQuery,
				builder: {
					queryData: [
						{
							...mockQuery.builder.queryData[0],
							stepInterval: 120,
						},
					],
					queryFormulas: [],
					queryTraceOperator: [],
				},
			};

			const minTime = Date.now();
			let maxTime = minTime + 1 * 60 * 60 * 1000;

			const result = updateBarStepInterval(queryWithUserStep, minTime, maxTime);

			expect(result.builder.queryData[0].stepInterval).toBe(120); // not 60

			maxTime = minTime + 30 * 24 * 60 * 60 * 1000; // 30 days

			const result1 = updateBarStepInterval(queryWithUserStep, minTime, maxTime);

			expect(result1.builder.queryData[0].stepInterval).toBe(120); // not 32400
		});
	});
});
