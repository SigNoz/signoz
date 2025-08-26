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
});
