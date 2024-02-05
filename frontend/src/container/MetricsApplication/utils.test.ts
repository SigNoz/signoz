import { getTopOperationList } from './__mocks__/getTopOperation';
import { TopOperationList } from './TopOperationsTable';
import {
	convertedTracesToDownloadData,
	getErrorRate,
	getNearestHighestBucketValue,
} from './utils';

describe('Error Rate', () => {
	test('should return correct error rate', () => {
		const list: TopOperationList = getTopOperationList({
			errorCount: 10,
			numCalls: 100,
		});

		expect(getErrorRate(list)).toBe(10);
	});

	test('should handle no errors gracefully', () => {
		const list = getTopOperationList({ errorCount: 0, numCalls: 100 });
		expect(getErrorRate(list)).toBe(0);
	});

	test('should handle zero calls', () => {
		const list = getTopOperationList({ errorCount: 0, numCalls: 0 });
		expect(getErrorRate(list)).toBe(0);
	});
});

describe('getNearestHighestBucketValue', () => {
	test('should return nearest higher bucket value', () => {
		expect(getNearestHighestBucketValue(50, [10, 20, 30, 40, 60, 70])).toBe('60');
	});

	test('should return +Inf for value higher than any bucket', () => {
		expect(getNearestHighestBucketValue(80, [10, 20, 30, 40, 60, 70])).toBe(
			'+Inf',
		);
	});

	test('should return the first bucket for value lower than all buckets', () => {
		expect(getNearestHighestBucketValue(5, [10, 20, 30, 40, 60, 70])).toBe('10');
	});
});

describe('convertedTracesToDownloadData', () => {
	test('should convert trace data correctly', () => {
		const data = [
			{
				name: 'op1',
				p50: 50000000,
				p95: 95000000,
				p99: 99000000,
				numCalls: 100,
				errorCount: 10,
			},
		];

		expect(convertedTracesToDownloadData(data)).toEqual([
			{
				Name: 'op1',
				'P50 (in ms)': '50.00',
				'P95 (in ms)': '95.00',
				'P99 (in ms)': '99.00',
				'Number of calls': '100',
				'Error Rate (%)': '10.00',
			},
		]);
	});
});
