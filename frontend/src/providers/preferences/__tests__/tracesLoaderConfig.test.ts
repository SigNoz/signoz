/* eslint-disable sonarjs/no-duplicate-string */
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultTraceSelectedColumns } from 'container/OptionsMenu/constants';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import tracesLoaderConfig from '../configs/tracesLoaderConfig';

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};

jest.mock('api/browser/localstorage/get', () => ({
	__esModule: true,
	default: jest.fn((key: string) => mockLocalStorage[key] || null),
}));

describe('tracesLoaderConfig', () => {
	// Save original location object
	const originalWindowLocation = window.location;
	let mockedLocation: Partial<Location>;

	beforeEach(() => {
		// Setup a mocked location object
		mockedLocation = {
			...originalWindowLocation,
			search: '',
		};

		// Mock the window.location property
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: mockedLocation,
			writable: true,
		});

		// Clear mocked localStorage
		Object.keys(mockLocalStorage).forEach((key) => {
			delete mockLocalStorage[key];
		});
	});

	afterEach(() => {
		// Restore original location
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: originalWindowLocation,
			writable: true,
		});
	});

	it('should have priority order: local, url, default', () => {
		expect(tracesLoaderConfig.priority).toEqual(['local', 'url', 'default']);
	});

	it('should load from localStorage when available', async () => {
		const mockColumns: BaseAutocompleteData[] = [
			{
				key: 'test-trace-column',
				type: 'tag',
			},
		];

		// Set up localStorage mock data with the correct key from LOCALSTORAGE enum
		mockLocalStorage[LOCALSTORAGE.TRACES_LIST_OPTIONS] = JSON.stringify({
			selectColumns: mockColumns,
		});

		const result = await tracesLoaderConfig.local();

		expect(result).toEqual({
			columns: mockColumns,
		});
	});

	it('should handle invalid localStorage data gracefully', async () => {
		// Set up invalid localStorage mock data
		mockLocalStorage[LOCALSTORAGE.TRACES_LIST_OPTIONS] = 'invalid-json';

		const result = await tracesLoaderConfig.local();

		expect(result).toEqual({
			columns: [] as BaseAutocompleteData[],
		});
	});

	it('should load from URL when available', async () => {
		const mockColumns: BaseAutocompleteData[] = [
			{
				key: 'url-trace-column',
				type: 'tag',
				dataType: DataTypes.String,
			},
		];

		// Set up URL search params
		mockedLocation.search = `?options=${encodeURIComponent(
			JSON.stringify({
				selectColumns: mockColumns,
			}),
		)}`;

		const result = await tracesLoaderConfig.url();

		expect(result).toEqual({
			columns: mockColumns,
		});
	});

	it('should handle invalid URL data gracefully', async () => {
		// Set up invalid URL search params
		mockedLocation.search = '?options=invalid-json';

		const result = await tracesLoaderConfig.url();

		expect(result).toEqual({
			columns: [] as BaseAutocompleteData[],
		});
	});

	it('should provide default values when no other source is available', async () => {
		const result = await tracesLoaderConfig.default();

		expect(result).toEqual({
			columns: defaultTraceSelectedColumns as TelemetryFieldKey[],
		});
	});

	describe('Column validation - filtering Logs columns', () => {
		it('should filter out Logs columns (body) from URL', async () => {
			const logsColumns = [
				{ name: 'timestamp', signal: 'logs', fieldContext: 'log' },
				{ name: 'body', signal: 'logs', fieldContext: 'log' },
			];

			mockedLocation.search = `?options=${encodeURIComponent(
				JSON.stringify({
					selectColumns: logsColumns,
				}),
			)}`;

			const result = await tracesLoaderConfig.url();

			// Should filter out all Logs columns
			expect(result.columns).toEqual([]);
		});

		it('should filter out Logs columns (timestamp with logs signal) from URL', async () => {
			const mixedColumns = [
				{ name: 'timestamp', signal: 'logs', fieldContext: 'log' },
				{ name: 'service.name', signal: 'traces', fieldContext: 'resource' },
			];

			mockedLocation.search = `?options=${encodeURIComponent(
				JSON.stringify({
					selectColumns: mixedColumns,
				}),
			)}`;

			const result = await tracesLoaderConfig.url();

			// Should only keep trace columns
			expect(result.columns).toEqual([
				{ name: 'service.name', signal: 'traces', fieldContext: 'resource' },
			]);
		});

		it('should filter out Logs columns from localStorage', async () => {
			const logsColumns = [
				{ name: 'body', signal: 'logs', fieldContext: 'log' },
				{ name: 'timestamp', signal: 'logs', fieldContext: 'log' },
			];

			mockLocalStorage[LOCALSTORAGE.TRACES_LIST_OPTIONS] = JSON.stringify({
				selectColumns: logsColumns,
			});

			const result = await tracesLoaderConfig.local();

			// Should filter out all Logs columns
			expect(result.columns).toEqual([]);
		});

		it('should accept valid Trace columns from URL', async () => {
			const traceColumns = [
				{ name: 'service.name', signal: 'traces', fieldContext: 'resource' },
				{ name: 'name', signal: 'traces', fieldContext: 'span' },
			];

			mockedLocation.search = `?options=${encodeURIComponent(
				JSON.stringify({
					selectColumns: traceColumns,
				}),
			)}`;

			const result = await tracesLoaderConfig.url();

			expect(result.columns).toEqual(traceColumns);
		});

		it('should fall back to defaults when all columns are filtered out from URL', async () => {
			const logsColumns = [{ name: 'body', signal: 'logs' }];

			mockedLocation.search = `?options=${encodeURIComponent(
				JSON.stringify({
					selectColumns: logsColumns,
				}),
			)}`;

			const result = await tracesLoaderConfig.url();

			// Should return empty array, which triggers fallback to defaults in preferencesLoader
			expect(result.columns).toEqual([]);
		});

		it('should handle columns without signal field (legacy data)', async () => {
			const columnsWithoutSignal = [
				{ name: 'service.name', fieldContext: 'resource' },
				{ name: 'body', fieldContext: 'log' },
			];

			mockedLocation.search = `?options=${encodeURIComponent(
				JSON.stringify({
					selectColumns: columnsWithoutSignal,
				}),
			)}`;

			const result = await tracesLoaderConfig.url();

			// Without signal field, columns pass through validation
			// This matches the current implementation behavior where only columns
			// with signal !== 'traces' are filtered out
			expect(result.columns).toEqual(columnsWithoutSignal);
		});
	});
});
