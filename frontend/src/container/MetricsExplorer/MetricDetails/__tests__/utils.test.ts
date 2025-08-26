import { Temporality } from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';

import {
	determineIsMonotonic,
	formatTimestampToReadableDate,
	getMetricDetailsQuery,
} from '../utils';

describe('MetricDetails utils', () => {
	describe('determineIsMonotonic', () => {
		it('should return true for histogram metrics', () => {
			expect(determineIsMonotonic(MetricType.HISTOGRAM)).toBe(true);
		});

		it('should return true for exponential histogram metrics', () => {
			expect(determineIsMonotonic(MetricType.EXPONENTIAL_HISTOGRAM)).toBe(true);
		});

		it('should return false for gauge metrics', () => {
			expect(determineIsMonotonic(MetricType.GAUGE)).toBe(false);
		});

		it('should return false for summary metrics', () => {
			expect(determineIsMonotonic(MetricType.SUMMARY)).toBe(false);
		});

		it('should return true for sum metrics with cumulative temporality', () => {
			expect(determineIsMonotonic(MetricType.SUM, Temporality.CUMULATIVE)).toBe(
				true,
			);
		});

		it('should return false for sum metrics with delta temporality', () => {
			expect(determineIsMonotonic(MetricType.SUM, Temporality.DELTA)).toBe(false);
		});

		it('should return false by default', () => {
			expect(determineIsMonotonic('' as MetricType, '' as Temporality)).toBe(
				false,
			);
		});
	});

	describe('formatTimestampToReadableDate', () => {
		const FEW_SECONDS_AGO = 'Few seconds ago';

		beforeEach(() => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should return "Few seconds ago" for timestamps less than 60 seconds ago', () => {
			const timestamp = '2024-01-15T11:59:30.000Z';
			expect(formatTimestampToReadableDate(timestamp)).toBe(FEW_SECONDS_AGO);
		});

		it('should return "1 minute ago" for exactly 1 minute ago', () => {
			const timestamp = '2024-01-15T11:59:00.000Z';
			expect(formatTimestampToReadableDate(timestamp)).toBe('1 minute ago');
		});

		it('should return "X minutes ago" for multiple minutes ago', () => {
			const timestamp = '2024-01-15T11:55:00.000Z';
			expect(formatTimestampToReadableDate(timestamp)).toBe('5 minutes ago');
		});

		it('should return "1 hour ago" for exactly 1 hour ago', () => {
			const timestamp = '2024-01-15T11:00:00.000Z';
			expect(formatTimestampToReadableDate(timestamp)).toBe('1 hour ago');
		});

		it('should return "X hours ago" for multiple hours ago', () => {
			const timestamp = '2024-01-15T09:00:00.000Z';
			expect(formatTimestampToReadableDate(timestamp)).toBe('3 hours ago');
		});

		it('should return "Yesterday at HH:MM" for exactly 1 day ago', () => {
			const timestamp = '2024-01-14T12:00:00.000Z';
			const expectedTime = new Date(timestamp).toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false,
			});
			expect(formatTimestampToReadableDate(timestamp)).toBe(
				`Yesterday at ${expectedTime}`,
			);
		});

		it('should return "X days ago" for multiple days ago (less than 7 days)', () => {
			const timestamp = '2024-01-12T12:00:00.000Z';
			expect(formatTimestampToReadableDate(timestamp)).toBe('3 days ago');
		});

		it('should return localized date string for dates 7 or more days ago', () => {
			const oldTimestamp = '2024-01-01T12:00:00.000Z';
			const result = formatTimestampToReadableDate(oldTimestamp);
			expect(result).not.toBe(FEW_SECONDS_AGO);
			expect(typeof result).toBe('string');
		});

		it('should handle future timestamps correctly', () => {
			const timestamp = '2024-01-16T12:00:00.000Z';
			const result = formatTimestampToReadableDate(timestamp);
			expect(result).toBe(FEW_SECONDS_AGO);
		});
	});

	describe('getMetricDetailsQuery', () => {
		const TEST_METRIC_NAME = 'test_metric';
		const API_GATEWAY = 'api-gateway';

		it('should create correct query for SUM metric type', () => {
			const query = getMetricDetailsQuery(TEST_METRIC_NAME, MetricType.SUM);

			expect(query.builder.queryData[0]?.aggregateAttribute?.key).toBe(
				TEST_METRIC_NAME,
			);
			expect(query.builder.queryData[0]?.aggregateAttribute?.type).toBe(
				MetricType.SUM,
			);
			expect(query.builder.queryData[0]?.aggregateOperator).toBe('rate');
			expect(query.builder.queryData[0]?.timeAggregation).toBe('rate');
			expect(query.builder.queryData[0]?.spaceAggregation).toBe('sum');
		});

		it('should create correct query for GAUGE metric type', () => {
			const query = getMetricDetailsQuery(TEST_METRIC_NAME, MetricType.GAUGE);

			expect(query.builder.queryData[0]?.aggregateAttribute?.key).toBe(
				TEST_METRIC_NAME,
			);
			expect(query.builder.queryData[0]?.aggregateAttribute?.type).toBe(
				MetricType.GAUGE,
			);
			expect(query.builder.queryData[0]?.aggregateOperator).toBe('avg');
			expect(query.builder.queryData[0]?.timeAggregation).toBe('avg');
			expect(query.builder.queryData[0]?.spaceAggregation).toBe('avg');
		});

		it('should create correct query for SUMMARY metric type', () => {
			const query = getMetricDetailsQuery(TEST_METRIC_NAME, MetricType.SUMMARY);

			expect(query.builder.queryData[0]?.aggregateAttribute?.key).toBe(
				TEST_METRIC_NAME,
			);
			expect(query.builder.queryData[0]?.aggregateAttribute?.type).toBe(
				MetricType.SUMMARY,
			);
			expect(query.builder.queryData[0]?.aggregateOperator).toBe('noop');
			expect(query.builder.queryData[0]?.timeAggregation).toBe('noop');
			expect(query.builder.queryData[0]?.spaceAggregation).toBe('sum');
		});

		it('should create correct query for HISTOGRAM metric type', () => {
			const query = getMetricDetailsQuery(TEST_METRIC_NAME, MetricType.HISTOGRAM);

			expect(query.builder.queryData[0]?.aggregateAttribute?.key).toBe(
				TEST_METRIC_NAME,
			);
			expect(query.builder.queryData[0]?.aggregateAttribute?.type).toBe(
				MetricType.HISTOGRAM,
			);
			expect(query.builder.queryData[0]?.aggregateOperator).toBe('noop');
			expect(query.builder.queryData[0]?.timeAggregation).toBe('noop');
			expect(query.builder.queryData[0]?.spaceAggregation).toBe('p90');
		});

		it('should create correct query for EXPONENTIAL_HISTOGRAM metric type', () => {
			const query = getMetricDetailsQuery(
				TEST_METRIC_NAME,
				MetricType.EXPONENTIAL_HISTOGRAM,
			);

			expect(query.builder.queryData[0]?.aggregateAttribute?.key).toBe(
				TEST_METRIC_NAME,
			);
			expect(query.builder.queryData[0]?.aggregateAttribute?.type).toBe(
				MetricType.EXPONENTIAL_HISTOGRAM,
			);
			expect(query.builder.queryData[0]?.aggregateOperator).toBe('noop');
			expect(query.builder.queryData[0]?.timeAggregation).toBe('noop');
			expect(query.builder.queryData[0]?.spaceAggregation).toBe('p90');
		});

		it('should create query with default values for unknown metric type', () => {
			const query = getMetricDetailsQuery(TEST_METRIC_NAME, undefined);

			expect(query.builder.queryData[0]?.aggregateAttribute?.key).toBe(
				TEST_METRIC_NAME,
			);
			expect(query.builder.queryData[0]?.aggregateAttribute?.type).toBe('');
			expect(query.builder.queryData[0]?.aggregateOperator).toBe('noop');
			expect(query.builder.queryData[0]?.timeAggregation).toBe('noop');
			expect(query.builder.queryData[0]?.spaceAggregation).toBe('noop');
		});

		it('should include filter when provided', () => {
			const filter = { key: 'service', value: API_GATEWAY };
			const query = getMetricDetailsQuery(
				TEST_METRIC_NAME,
				MetricType.SUM,
				filter,
			);

			expect(query.builder.queryData[0]?.filters?.items).toHaveLength(1);
			expect(query.builder.queryData[0]?.filters?.items[0]?.key?.key).toBe(
				'service',
			);
			expect(query.builder.queryData[0]?.filters?.items[0]?.value).toBe(
				API_GATEWAY,
			);
			expect(query.builder.queryData[0]?.filters?.items[0]?.op).toBe('=');
		});

		it('should include groupBy when provided', () => {
			const groupBy = 'service';
			const query = getMetricDetailsQuery(
				TEST_METRIC_NAME,
				MetricType.SUM,
				undefined,
				groupBy,
			);

			expect(query.builder.queryData[0]?.groupBy).toHaveLength(1);
			expect(query.builder.queryData[0]?.groupBy?.[0]?.key).toBe('service');
			expect(query.builder.queryData[0]?.groupBy?.[0]?.type).toBe('tag');
		});

		it('should include both filter and groupBy when provided', () => {
			const filter = { key: 'service', value: API_GATEWAY };
			const groupBy = 'endpoint';
			const query = getMetricDetailsQuery(
				TEST_METRIC_NAME,
				MetricType.SUM,
				filter,
				groupBy,
			);

			expect(query.builder.queryData[0]?.filters?.items).toHaveLength(1);
			expect(query.builder.queryData[0]?.groupBy).toHaveLength(1);
			expect(query.builder.queryData[0]?.filters?.items[0]?.key?.key).toBe(
				'service',
			);
			expect(query.builder.queryData[0]?.groupBy?.[0]?.key).toBe('endpoint');
		});

		it('should not include filters or groupBy when not provided', () => {
			const query = getMetricDetailsQuery(TEST_METRIC_NAME, MetricType.SUM);

			expect(query.builder.queryData[0]?.filters?.items).toHaveLength(0);
			expect(query.builder.queryData[0]?.groupBy).toHaveLength(0);
		});
	});
});
