import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultTraceSelectedColumns } from 'container/OptionsMenu/constants';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import tracesLoaderConfig from '../configs/tracesLoaderConfig';

// Mock localStorage
const { mockLocalStorage } = vi.hoisted(() => ({
	mockLocalStorage: {} as Record<string, string>,
}));

vi.mock('api/browser/localstorage/get', () => ({
	__esModule: true,
	default: vi.fn((key: string) => mockLocalStorage[key] || null),
}));

describe('tracesLoaderConfig', () => {
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
		expect(tracesLoaderConfig.priority).toStrictEqual([
			'local',
			'url',
			'default',
		]);
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

		const result = tracesLoaderConfig.local();

		expect(result).toStrictEqual({
			columns: mockColumns,
		});
	});

	it('should handle invalid localStorage data gracefully', async () => {
		// Set up invalid localStorage mock data
		mockLocalStorage[LOCALSTORAGE.TRACES_LIST_OPTIONS] = 'invalid-json';

		const result = tracesLoaderConfig.local();

		expect(result).toStrictEqual({
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
		setUrlOptions({
			selectColumns: mockColumns,
		});

		const result = tracesLoaderConfig.url();

		expect(result).toStrictEqual({
			columns: mockColumns,
		});
	});

	it('should handle invalid URL data gracefully', async () => {
		// Set up invalid URL search params
		window.history.pushState({}, '', '?options=invalid-json');

		const result = tracesLoaderConfig.url();

		expect(result).toStrictEqual({
			columns: [] as BaseAutocompleteData[],
		});
	});

	it('should provide default values when no other source is available', async () => {
		const result = tracesLoaderConfig.default();

		expect(result).toStrictEqual({
			columns: defaultTraceSelectedColumns as TelemetryFieldKey[],
		});
	});

	describe('Column validation - filtering Logs columns', () => {
		it('should filter out Logs columns (body) from URL', async () => {
			const logsColumns = [
				{ name: 'timestamp', signal: 'logs', fieldContext: 'log' },
				{ name: 'body', signal: 'logs', fieldContext: 'log' },
			];

			setUrlOptions({
				selectColumns: logsColumns,
			});

			const result = tracesLoaderConfig.url();

			// Should filter out all Logs columns
			expect(result.columns).toStrictEqual([]);
		});

		it('should filter out Logs columns (timestamp with logs signal) from URL', async () => {
			const mixedColumns = [
				{ name: 'timestamp', signal: 'logs', fieldContext: 'log' },
				{ name: 'service.name', signal: 'traces', fieldContext: 'resource' },
			];

			setUrlOptions({
				selectColumns: mixedColumns,
			});

			const result = tracesLoaderConfig.url();

			// Should only keep trace columns
			expect(result.columns).toStrictEqual([
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

			const result = tracesLoaderConfig.local();

			// Should filter out all Logs columns
			expect(result.columns).toStrictEqual([]);
		});

		it('should accept valid Trace columns from URL', async () => {
			const traceColumns = [
				{ name: 'service.name', signal: 'traces', fieldContext: 'resource' },
				{ name: 'name', signal: 'traces', fieldContext: 'span' },
			];

			setUrlOptions({
				selectColumns: traceColumns,
			});

			const result = tracesLoaderConfig.url();

			expect(result.columns).toStrictEqual(traceColumns);
		});

		it('should fall back to defaults when all columns are filtered out from URL', async () => {
			const logsColumns = [{ name: 'body', signal: 'logs' }];

			setUrlOptions({
				selectColumns: logsColumns,
			});

			const result = tracesLoaderConfig.url();

			// Should return empty array, which triggers fallback to defaults in preferencesLoader
			expect(result.columns).toStrictEqual([]);
		});

		it('should handle columns without signal field (legacy data)', async () => {
			const columnsWithoutSignal = [
				{ name: 'service.name', fieldContext: 'resource' },
				{ name: 'body', fieldContext: 'log' },
			];

			setUrlOptions({
				selectColumns: columnsWithoutSignal,
			});

			const result = tracesLoaderConfig.url();

			// Without signal field, columns pass through validation
			// This matches the current implementation behavior where only columns
			// with signal !== 'traces' are filtered out
			expect(result.columns).toStrictEqual(columnsWithoutSignal);
		});
	});
});
