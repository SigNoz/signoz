/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { act, renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';

import useUrlQueryData from '../useUrlQueryData';

// Mock the useSafeNavigate hook
const mockSafeNavigate = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: () => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

describe('useUrlQueryData', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const renderHookWithRouter = (
		queryKey: string,
		defaultData?: any,
		initialEntries: string[] = ['/test'],
	) => {
		const history = createMemoryHistory({ initialEntries });

		// Mock window.location.search to match the current route
		Object.defineProperty(window, 'location', {
			value: {
				search: history.location.search,
				pathname: history.location.pathname,
				origin: 'http://localhost',
			},
			writable: true,
		});

		return renderHook(() => useUrlQueryData(queryKey, defaultData), {
			wrapper: ({ children }) => <Router history={history}>{children}</Router>,
		});
	};

	describe('query parsing', () => {
		test('should parse valid JSON query parameter', () => {
			const testData = { name: 'test', value: 123 };
			const { result } = renderHookWithRouter('testKey', {}, [
				`/test?testKey=${encodeURIComponent(JSON.stringify(testData))}`,
			]);

			expect(result.current.query).toBe(JSON.stringify(testData));
			expect(result.current.queryData).toEqual(testData);
		});

		test('should return default data when query parameter is not present', () => {
			const defaultData = { default: 'value' };
			const { result } = renderHookWithRouter('testKey', defaultData);

			expect(result.current.query).toBeNull();
			expect(result.current.queryData).toEqual(defaultData);
		});

		test('should return default data when query parameter is empty', () => {
			const defaultData = { default: 'value' };
			const { result } = renderHookWithRouter('testKey', defaultData, [
				'/test?testKey=',
			]);

			expect(result.current.query).toBe('');
			expect(result.current.queryData).toEqual(defaultData);
		});

		test('should handle invalid JSON and return default data', () => {
			const defaultData = { default: 'value' };
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			const { result } = renderHookWithRouter('testKey', defaultData, [
				'/test?testKey=invalid-json',
			]);

			expect(result.current.query).toBe('invalid-json');
			expect(result.current.queryData).toEqual(defaultData);
			expect(consoleSpy).toHaveBeenCalledWith(
				'Failed to parse query as JSON:',
				'invalid-json',
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});

		test('should handle malformed JSON and return default data', () => {
			const defaultData = { default: 'value' };
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			const { result } = renderHookWithRouter(
				'testKey',
				defaultData,
				['/test?testKey={"name":"test",}'], // Missing closing brace
			);

			expect(result.current.query).toBe('{"name":"test",}');
			expect(result.current.queryData).toEqual(defaultData);
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		test('should handle complex nested objects', () => {
			const complexData = {
				users: [
					{ id: 1, name: 'John', settings: { theme: 'dark', notifications: true } },
					{
						id: 2,
						name: 'Jane',
						settings: { theme: 'light', notifications: false },
					},
				],
				metadata: {
					total: 2,
					page: 1,
				},
			};

			const { result } = renderHookWithRouter('complexKey', {}, [
				`/test?complexKey=${encodeURIComponent(JSON.stringify(complexData))}`,
			]);

			expect(result.current.query).toBe(JSON.stringify(complexData));
			expect(result.current.queryData).toEqual(complexData);
		});

		test('should handle primitive values', () => {
			const stringData = 'simple string';
			const { result } = renderHookWithRouter('stringKey', '', [
				`/test?stringKey=${encodeURIComponent(JSON.stringify(stringData))}`,
			]);

			expect(result.current.query).toBe(JSON.stringify(stringData));
			expect(result.current.queryData).toBe(stringData);
		});
	});

	describe('redirectWithQuery', () => {
		test('should navigate with new query data', () => {
			const { result } = renderHookWithRouter('testKey', {});

			const newData = { name: 'new', value: 456 };
			act(() => {
				result.current.redirectWithQuery(newData);
			});

			expect(mockSafeNavigate).toHaveBeenCalledWith(
				expect.stringContaining('testKey='),
			);

			const calledUrl = mockSafeNavigate.mock.calls[0][0];
			const urlParams = new URLSearchParams(calledUrl.split('?')[1]);
			expect(urlParams.get('testKey')).toBe(JSON.stringify(newData));
		});

		test('should preserve existing query parameters when adding new one', () => {
			const { result } = renderHookWithRouter('newKey', {}, [
				'/test?existingKey=existingValue',
			]);

			const newData = { name: 'new' };
			act(() => {
				result.current.redirectWithQuery(newData);
			});

			const calledUrl = mockSafeNavigate.mock.calls[0][0];
			const urlParams = new URLSearchParams(calledUrl.split('?')[1]);

			expect(urlParams.get('existingKey')).toBe('existingValue');
			expect(urlParams.get('newKey')).toBe(JSON.stringify(newData));
		});

		test('should update existing query parameter', () => {
			const initialData = { name: 'old' };
			const { result } = renderHookWithRouter('testKey', {}, [
				`/test?testKey=${encodeURIComponent(JSON.stringify(initialData))}`,
			]);

			const newData = { name: 'new', value: 789 };
			act(() => {
				result.current.redirectWithQuery(newData);
			});

			const calledUrl = mockSafeNavigate.mock.calls[0][0];
			const urlParams = new URLSearchParams(calledUrl.split('?')[1]);
			expect(urlParams.get('testKey')).toBe(JSON.stringify(newData));
		});

		test('should handle complex data in redirectWithQuery', () => {
			const { result } = renderHookWithRouter('complexKey', {});

			const complexData = {
				filters: {
					status: ['active', 'pending'],
					dateRange: { start: '2023-01-01', end: '2023-12-31' },
				},
				sort: { field: 'created_at', direction: 'desc' },
			};

			act(() => {
				result.current.redirectWithQuery(complexData);
			});

			const calledUrl = mockSafeNavigate.mock.calls[0][0];
			const urlParams = new URLSearchParams(calledUrl.split('?')[1]);
			expect(urlParams.get('complexKey')).toBe(JSON.stringify(complexData));
		});

		test('should handle primitive values in redirectWithQuery', () => {
			const { result } = renderHookWithRouter('primitiveKey', '');

			act(() => {
				result.current.redirectWithQuery('simple string');
			});

			const calledUrl = mockSafeNavigate.mock.calls[0][0];
			const urlParams = new URLSearchParams(calledUrl.split('?')[1]);
			expect(urlParams.get('primitiveKey')).toBe(JSON.stringify('simple string'));
		});

		test('should handle null and undefined values', () => {
			const { result } = renderHookWithRouter('nullKey', {});

			act(() => {
				result.current.redirectWithQuery(null);
			});

			const calledUrl = mockSafeNavigate.mock.calls[0][0];
			const urlParams = new URLSearchParams(calledUrl.split('?')[1]);
			expect(urlParams.get('nullKey')).toBe('null');

			act(() => {
				result.current.redirectWithQuery(undefined);
			});

			const secondCalledUrl = mockSafeNavigate.mock.calls[1][0];
			const secondUrlParams = new URLSearchParams(secondCalledUrl.split('?')[1]);
			expect(secondUrlParams.get('nullKey')).toBe('undefined');
		});
	});

	describe('hook interface', () => {
		test('should return correct interface structure', () => {
			const { result } = renderHookWithRouter('testKey', {});

			expect(result.current).toHaveProperty('query');
			expect(result.current).toHaveProperty('queryData');
			expect(result.current).toHaveProperty('redirectWithQuery');
			expect(typeof result.current.redirectWithQuery).toBe('function');
		});

		test('should handle different query keys', () => {
			const { result: result1 } = renderHookWithRouter('key1', {});
			const { result: result2 } = renderHookWithRouter('key2', {});

			expect(result1.current.query).toBeNull();
			expect(result2.current.query).toBeNull();

			const testData = { test: 'data' };
			act(() => {
				result1.current.redirectWithQuery(testData);
			});

			const calledUrl = mockSafeNavigate.mock.calls[0][0];
			const urlParams = new URLSearchParams(calledUrl.split('?')[1]);
			expect(urlParams.get('key1')).toBe(JSON.stringify(testData));
			expect(urlParams.get('key2')).toBeNull();
		});
	});

	describe('URL encoding/decoding', () => {
		test('should handle URL encoded query parameters', () => {
			const testData = { name: 'test with spaces', value: 'special&chars' };
			const encodedData = encodeURIComponent(JSON.stringify(testData));

			const { result } = renderHookWithRouter('testKey', {}, [
				`/test?testKey=${encodedData}`,
			]);

			expect(result.current.queryData).toEqual(testData);
		});

		test('should properly encode data in redirectWithQuery', () => {
			const { result } = renderHookWithRouter('testKey', {});

			const testData = { name: 'test with spaces', value: 'special&chars' };
			act(() => {
				result.current.redirectWithQuery(testData);
			});

			const calledUrl = mockSafeNavigate.mock.calls[0][0];
			const urlParams = new URLSearchParams(calledUrl.split('?')[1]);
			const decodedValue = JSON.parse(
				decodeURIComponent(urlParams.get('testKey') || ''),
			);
			expect(decodedValue).toEqual(testData);
		});
	});
});
