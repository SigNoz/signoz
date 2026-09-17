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
const { mockLocalStorage } = vi.hoisted(() => ({
	mockLocalStorage: {} as Record<string, string>,
}));

vi.mock('api/browser/localstorage/get', () => ({
	__esModule: true,
	default: vi.fn((key: string) => mockLocalStorage[key] || null),
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
	// Save original URL
	const originalUrl = window.location.href;

	beforeEach(() => {
		// Reset the URL query string without redefining window.location
		// (redefining location is refused in browser mode)
		window.history.pushState({}, '', window.location.pathname);

		// Clear mocked localStorage
		Object.keys(mockLocalStorage).forEach((key) => {
			delete mockLocalStorage[key];
		});
	});

	afterEach(() => {
		// Restore original URL
		window.history.pushState({}, '', originalUrl);
	});

	function setUrlOptions(value: unknown): void {
		window.history.pushState(
			{},
			'',
			`?options=${encodeURIComponent(JSON.stringify(value))}`,
		);
	}

	it('should have priority order: local, url, default', () => {
		expect(logsLoaderConfig.priority).toStrictEqual(['local', 'url', 'default']);
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

		const result = logsLoaderConfig.local();

		expect(result).toStrictEqual({
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

		const result = logsLoaderConfig.local();

		expect(result).toStrictEqual({
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
		setUrlOptions({
			selectColumns: mockColumns,
			maxLines: 5,
			format: 'raw',
			fontSize: 'medium',
			version: 1,
		});

		const result = logsLoaderConfig.url();

		expect(result).toStrictEqual({
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
		window.history.pushState({}, '', '?options=invalid-json');

		const result = logsLoaderConfig.url();

		expect(result).toStrictEqual({
			columns: [] as BaseAutocompleteData[],
			formatting: undefined,
		});
	});

	it('should provide default values when no other source is available', async () => {
		const result = logsLoaderConfig.default();

		expect(result).toStrictEqual({
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

			setUrlOptions({
				selectColumns: mixedColumns,
			});

			const result = logsLoaderConfig.url();

			// Should only keep logs columns
			expect(result.columns).toStrictEqual(mockLogsColumns);
		});

		it('should filter out Traces columns from localStorage', async () => {
			const tracesColumns = [...mockTracesColumns];

			mockLocalStorage[LOCALSTORAGE.LOGS_LIST_OPTIONS] = JSON.stringify({
				selectColumns: tracesColumns,
			});

			const result = logsLoaderConfig.local();

			// Should filter out all Traces columns
			expect(result.columns).toStrictEqual([]);
		});

		it('should accept valid Logs columns from URL', async () => {
			const logsColumns = [...mockLogsColumns];

			setUrlOptions({
				selectColumns: logsColumns,
			});

			const result = logsLoaderConfig.url();

			expect(result.columns).toStrictEqual(logsColumns);
		});

		it('should fall back to defaults when all columns are filtered out from URL', async () => {
			const tracesColumns = [...mockTracesColumns];

			setUrlOptions({
				selectColumns: tracesColumns,
			});

			const result = logsLoaderConfig.url();

			// Should return empty array, which triggers fallback to defaults in preferencesLoader
			expect(result.columns).toStrictEqual([]);
		});

		it('should handle columns without signal field (legacy data)', async () => {
			const columnsWithoutSignal = [
				{ name: 'body', fieldContext: 'log' },
				{ name: 'service.name', fieldContext: 'resource' },
			];

			setUrlOptions({
				selectColumns: columnsWithoutSignal,
			});

			const result = logsLoaderConfig.url();

			// Without signal field, columns pass through validation
			// This matches the current implementation behavior where only columns
			// with signal !== 'logs' are filtered out
			expect(result.columns).toStrictEqual(columnsWithoutSignal);
		});
	});
});
