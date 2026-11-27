import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { getTopOperationList } from './__mocks__/getTopOperation';
import { TopOperationList } from './TopOperationsTable';
import {
	convertedTracesToDownloadData,
	getErrorRate,
	getNearestHighestBucketValue,
	navigateToTrace,
} from './utils';

describe('Error Rate', () => {
	it('should return correct error rate', () => {
		const list: TopOperationList = getTopOperationList({
			errorCount: 10,
			numCalls: 100,
		});

		expect(getErrorRate(list)).toBe(10);
	});

	it('should handle no errors gracefully', () => {
		const list = getTopOperationList({ errorCount: 0, numCalls: 100 });
		expect(getErrorRate(list)).toBe(0);
	});

	it('should handle zero calls', () => {
		const list = getTopOperationList({ errorCount: 0, numCalls: 0 });
		expect(getErrorRate(list)).toBe(0);
	});
});

describe('getNearestHighestBucketValue', () => {
	it('should return nearest higher bucket value', () => {
		expect(getNearestHighestBucketValue(50, [10, 20, 30, 40, 60, 70])).toBe('60');
	});

	it('should return +Inf for value higher than any bucket', () => {
		expect(getNearestHighestBucketValue(80, [10, 20, 30, 40, 60, 70])).toBe(
			'+Inf',
		);
	});

	it('should return the first bucket for value lower than all buckets', () => {
		expect(getNearestHighestBucketValue(5, [10, 20, 30, 40, 60, 70])).toBe('10');
	});
});

describe('convertedTracesToDownloadData', () => {
	it('should convert trace data correctly', () => {
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

		expect(convertedTracesToDownloadData(data)).toStrictEqual([
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

describe('navigateToTrace', () => {
	const apmToTraceQuery = {
		builder: { queryData: [{ dataSource: 'traces' }] },
	} as unknown as Query;

	const getUrl = (operation: string, servicename = 'branch-pay-dev'): URL => {
		const safeNavigate = jest.fn();

		navigateToTrace({
			servicename,
			operation,
			minTime: 1_000_000_000_000_000,
			maxTime: 2_000_000_000_000_000,
			selectedTraceTags: '[]',
			apmToTraceQuery,
			safeNavigate,
			openInNewTab: false,
		});

		expect(safeNavigate).toHaveBeenCalledTimes(1);
		return new URL(safeNavigate.mock.calls[0][0], 'https://signoz.example.com');
	};

	it('keeps compositeQuery when the operation name contains a "#"', () => {
		const url = getUrl('AccountResource#getAccount');

		expect(url.hash).toBe('');
		expect(url.searchParams.get('compositeQuery')).toBe(
			JSON.stringify(apmToTraceQuery),
		);
	});

	it('round-trips the operation name through the selected param', () => {
		const url = getUrl('AccountResource#getAccount');

		expect(
			JSON.parse(url.searchParams.get('selected') as string).operation[0],
		).toBe('AccountResource#getAccount');
	});

	it('keeps compositeQuery when the service name contains a "#"', () => {
		const url = getUrl('op', 'weird#service');

		expect(url.hash).toBe('');
		expect(url.searchParams.get('compositeQuery')).toBe(
			JSON.stringify(apmToTraceQuery),
		);
	});

	it('leaves plain operation names and the time range unchanged', () => {
		const url = getUrl('HTTP GET /cart');

		expect(url.searchParams.get('compositeQuery')).toBe(
			JSON.stringify(apmToTraceQuery),
		);
		expect(url.searchParams.get('startTime')).toBe('1000000000');
		expect(url.searchParams.get('endTime')).toBe('2000000000');
	});
});
