import { act, renderHook } from '@testing-library/react';
import { LOCALSTORAGE } from 'constants/localStorage';

import type { OrderedColumn } from '../types';
import { useColumnSizingPersistence } from '../useColumnSizingPersistence';

const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock('api/browser/localstorage/get', () => ({
	__esModule: true,
	default: (key: string): string | null => mockGet(key),
}));

jest.mock('api/browser/localstorage/set', () => ({
	__esModule: true,
	default: (key: string, value: string): void => {
		mockSet(key, value);
	},
}));

const col = (key: string): OrderedColumn =>
	({ key, title: key } as OrderedColumn);

describe('useColumnSizingPersistence', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGet.mockReturnValue(null);
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});

	it('initializes with empty sizing when localStorage is empty', () => {
		const { result } = renderHook(() =>
			useColumnSizingPersistence([col('body'), col('timestamp')]),
		);

		expect(result.current.columnSizing).toEqual({});
	});

	it('parses flat ColumnSizingState from localStorage', () => {
		mockGet.mockReturnValue(JSON.stringify({ body: 400, timestamp: 180 }));

		const { result } = renderHook(() =>
			useColumnSizingPersistence([col('body'), col('timestamp')]),
		);

		expect(result.current.columnSizing).toEqual({ body: 400, timestamp: 180 });
	});

	it('parses PersistedColumnSizing wrapper with sizing + columnIdsSignature', () => {
		mockGet.mockReturnValue(
			JSON.stringify({
				version: 1,
				columnIdsSignature: 'body|timestamp',
				sizing: { body: 300 },
			}),
		);

		const { result } = renderHook(() =>
			useColumnSizingPersistence([col('body'), col('timestamp')]),
		);

		expect(result.current.columnSizing).toEqual({ body: 300 });
	});

	it('drops invalid numeric entries when reading from localStorage', () => {
		mockGet.mockReturnValue(
			JSON.stringify({
				body: 200,
				bad: NaN,
				zero: 0,
				neg: -1,
				str: 'wide',
			}),
		);

		const { result } = renderHook(() =>
			useColumnSizingPersistence([col('body'), col('bad'), col('zero')]),
		);

		expect(result.current.columnSizing).toEqual({ body: 200 });
	});

	it('returns empty sizing when JSON is invalid', () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
		mockGet.mockReturnValue('not-json');

		const { result } = renderHook(() =>
			useColumnSizingPersistence([col('body')]),
		);

		expect(result.current.columnSizing).toEqual({});
		spy.mockRestore();
	});

	it('prunes sizing for columns not in orderedColumns and strips fixed columns', () => {
		mockGet.mockReturnValue(JSON.stringify({ body: 400, expand: 32, gone: 100 }));

		const { result, rerender } = renderHook(
			({ columns }: { columns: OrderedColumn[] }) =>
				useColumnSizingPersistence(columns),
			{
				initialProps: {
					columns: [
						col('body'),
						col('expand'),
						col('state-indicator'),
					] as OrderedColumn[],
				},
			},
		);

		expect(result.current.columnSizing).toEqual({ body: 400 });

		act(() => {
			rerender({
				columns: [col('body'), col('expand'), col('state-indicator')],
			});
		});

		expect(result.current.columnSizing).toEqual({ body: 400 });
	});

	it('updates setColumnSizing manually', () => {
		const { result } = renderHook(() =>
			useColumnSizingPersistence([col('body')]),
		);

		act(() => {
			result.current.setColumnSizing({ body: 500 });
		});

		expect(result.current.columnSizing).toEqual({ body: 500 });
	});

	it('debounces writes to localStorage', () => {
		const { result } = renderHook(() =>
			useColumnSizingPersistence([col('body')]),
		);

		act(() => {
			result.current.setColumnSizing({ body: 600 });
		});

		expect(mockSet).not.toHaveBeenCalled();

		act(() => {
			jest.advanceTimersByTime(250);
		});

		expect(mockSet).toHaveBeenCalledWith(
			LOCALSTORAGE.LOGS_LIST_COLUMN_SIZING,
			expect.stringContaining('"body":600'),
		);
	});

	it('does not persist when ordered columns signature effect runs with empty ids early — still debounces empty sizing', () => {
		const { result } = renderHook(() => useColumnSizingPersistence([]));

		expect(result.current.columnSizing).toEqual({});

		act(() => {
			jest.advanceTimersByTime(250);
		});

		expect(mockSet).toHaveBeenCalled();
	});
});
