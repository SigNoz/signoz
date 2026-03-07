import { LOCALSTORAGE } from 'constants/localStorage';
import { LogViewMode } from 'container/LogsTable';
import { defaultLogsSelectedColumns } from 'container/OptionsMenu/constants';
import { FontSize } from 'container/OptionsMenu/types';
import { FormattingOptions } from 'providers/preferences/types';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

import logsLoaderConfig from '../configs/logsLoaderConfig';

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};

jest.mock('api/browser/localstorage/get', () => ({
	__esModule: true,
	default: jest.fn((key: string) => mockLocalStorage[key] || null),
}));

const mockLogsColumns = [
	{ name: 'timestamp', signal: 'logs', fieldContext: 'log' },
	{ name: 'body', signal: 'logs', fieldContext: 'log' },
];

const mockTracesColumns = [
	{ name: 'service.name', signal: 'traces', fieldContext: 'resource' },
	{ name: 'name', signal: 'traces', fieldContext: 'span' },
];

describe('logsLoaderConfig', () => {
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
		expect(logsLoaderConfig.priority).toEqual(['local', 'url', 'default']);
	});

	it('should load from localStorage when available', async () => {
		const mockColumns: BaseAutocompleteData[] = [
			{
				key: 'test-column',
				type: 'tag',
				dataType: DataTypes.String,
			},
		];

		// Set up localStorage mock data with the correct key from LOCALSTORAGE enum
		mockLocalStorage[LOCALSTORAGE.LOGS_LIST_OPTIONS] = JSON.stringify({
			selectColumns: mockColumns,
			maxLines: 10,
			format: 'json',
			fontSize: 'large',
			version: 2,
		});

		const result = await logsLoaderConfig.local();

		expect(result).toEqual({
			columns: mockColumns,
			formatting: {
				maxLines: 10,
				format: 'json' as LogViewMode,
				fontSize: 'large' as FontSize,
				version: 2,
			} as FormattingOptions,
		});
	});

	it('should handle invalid localStorage data gracefully', async () => {
		// Set up invalid localStorage mock data
		mockLocalStorage[LOCALSTORAGE.LOGS_LIST_OPTIONS] = 'invalid-json';

		const result = await logsLoaderConfig.local();

		expect(result).toEqual({
			columns: [] as BaseAutocompleteData[],
			formatting: undefined,
		});
	});

	it('should load from URL when available', async () => {
		const mockColumns: BaseAutocompleteData[] = [
			{
				key: 'url-column',
				type: 'tag',
				dataType: DataTypes.String,
			},
		];

		// Set up URL search params
		mockedLocation.search = `?options=${encodeURIComponent(
			JSON.stringify({
				selectColumns: mockColumns,
				maxLines: 5,
				format: 'raw',
				fontSize: 'medium',
				version: 1,
			}),
		)}`;

		const result = await logsLoaderConfig.url();

		expect(result).toEqual({
			columns: mockColumns,
			formatting: {
				maxLines: 5,
				format: 'raw' as LogViewMode,
				fontSize: 'medium' as FontSize,
				version: 1,
			} as FormattingOptions,
		});
	});

	it('should handle invalid URL data gracefully', async () => {
		// Set up invalid URL search params
		mockedLocation.search = '?options=invalid-json';

		const result = await logsLoaderConfig.url();

		expect(result).toEqual({
			columns: [] as BaseAutocompleteData[],
			formatting: undefined,
		});
	});

	it('should provide default values when no other source is available', async () => {
		const result = await logsLoaderConfig.default();

		expect(result).toEqual({
			columns: defaultLogsSelectedColumns,
			formatting: {
				maxLines: 1,
				format: 'table' as LogViewMode,
				fontSize: 'small' as FontSize,
				version: 1,
			} as FormattingOptions,
		});
	});

	describe('Column validation - filtering Traces columns', () => {
		it('should filter out Traces columns (name with traces signal) from URL', async () => {
			const mixedColumns = [...mockLogsColumns, ...mockTracesColumns];

			mockedLocation.search = `?options=${encodeURIComponent(
				JSON.stringify({
					selectColumns: mixedColumns,
				}),
			)}`;

			const result = await logsLoaderConfig.url();

			// Should only keep logs columns
			expect(result.columns).toEqual(mockLogsColumns);
		});

		it('should filter out Traces columns from localStorage', async () => {
			const tracesColumns = [...mockTracesColumns];

			mockLocalStorage[LOCALSTORAGE.LOGS_LIST_OPTIONS] = JSON.stringify({
				selectColumns: tracesColumns,
			});

			const result = await logsLoaderConfig.local();

			// Should filter out all Traces columns
			expect(result.columns).toEqual([]);
		});

		it('should accept valid Logs columns from URL', async () => {
			const logsColumns = [...mockLogsColumns];

			mockedLocation.search = `?options=${encodeURIComponent(
				JSON.stringify({
					selectColumns: logsColumns,
				}),
			)}`;

			const result = await logsLoaderConfig.url();

			expect(result.columns).toEqual(logsColumns);
		});

		it('should fall back to defaults when all columns are filtered out from URL', async () => {
			const tracesColumns = [...mockTracesColumns];

			mockedLocation.search = `?options=${encodeURIComponent(
				JSON.stringify({
					selectColumns: tracesColumns,
				}),
			)}`;

			const result = await logsLoaderConfig.url();

			// Should return empty array, which triggers fallback to defaults in preferencesLoader
			expect(result.columns).toEqual([]);
		});

		it('should handle columns without signal field (legacy data)', async () => {
			const columnsWithoutSignal = [
				{ name: 'body', fieldContext: 'log' },
				{ name: 'service.name', fieldContext: 'resource' },
			];

			mockedLocation.search = `?options=${encodeURIComponent(
				JSON.stringify({
					selectColumns: columnsWithoutSignal,
				}),
			)}`;

			const result = await logsLoaderConfig.url();

			// Without signal field, columns pass through validation
			// This matches the current implementation behavior where only columns
			// with signal !== 'logs' are filtered out
			expect(result.columns).toEqual(columnsWithoutSignal);
		});
	});
});
