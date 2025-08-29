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
				maxLines: 2,
				format: 'table' as LogViewMode,
				fontSize: 'small' as FontSize,
				version: 1,
			} as FormattingOptions,
		});
	});
});
