import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultOptionsQuery } from 'container/OptionsMenu/constants';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import getTracesUpdaterConfig from '../configs/tracesUpdaterConfig';
import { PreferenceMode } from '../types';

// Mock setLocalStorageKey
const mockSetLocalStorageKey = jest.fn();
jest.mock('api/browser/localstorage/set', () => ({
	__esModule: true,
	default: (key: string, value: string): void =>
		mockSetLocalStorageKey(key, value),
}));

// Mock localStorage
let mockLocalStorage: Record<string, string> = {};
Object.defineProperty(global, 'localStorage', {
	value: {
		getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
		setItem: jest.fn((key: string, value: string) => {
			mockLocalStorage[key] = value;
		}),
	},
	writable: true,
});

describe('tracesUpdaterConfig', () => {
	// Mock functions
	const mockRedirectWithOptionsData = jest.fn();
	const mockSetSavedViewPreferences = jest.fn();

	// Test data
	const mockColumns: TelemetryFieldKey[] = [
		{
			name: 'test-trace-column',
			fieldContext: '',
			fieldDataType: DataTypes.String,
		},
	];

	beforeEach(() => {
		jest.clearAllMocks();
		// Reset mockLocalStorage
		mockLocalStorage = {};
	});

	it('should update columns in localStorage and redirect with options in direct mode', () => {
		const tracesUpdaterConfig = getTracesUpdaterConfig(
			mockRedirectWithOptionsData,
			mockSetSavedViewPreferences,
		);

		tracesUpdaterConfig.updateColumns(mockColumns, PreferenceMode.DIRECT);

		// Should redirect with the updated columns
		expect(mockRedirectWithOptionsData).toHaveBeenCalledWith({
			...defaultOptionsQuery,
			selectColumns: mockColumns,
		});

		// Should set localStorage with the updated columns
		expect(mockSetLocalStorageKey).toHaveBeenCalledWith(
			LOCALSTORAGE.TRACES_LIST_OPTIONS,
			JSON.stringify({ selectColumns: mockColumns }),
		);
	});

	it('should merge with existing localStorage data in direct mode', () => {
		// Setup existing localStorage data
		mockLocalStorage[LOCALSTORAGE.TRACES_LIST_OPTIONS] = JSON.stringify({
			selectColumns: [
				{
					key: 'existing-column',
					type: 'tag',
					dataType: DataTypes.String,
				},
			],
			otherProp: 'value',
		});

		const tracesUpdaterConfig = getTracesUpdaterConfig(
			mockRedirectWithOptionsData,
			mockSetSavedViewPreferences,
		);

		tracesUpdaterConfig.updateColumns(mockColumns, PreferenceMode.DIRECT);

		// Should set localStorage with the updated columns while preserving other props
		expect(mockSetLocalStorageKey).toHaveBeenCalledWith(
			LOCALSTORAGE.TRACES_LIST_OPTIONS,
			JSON.stringify({
				selectColumns: mockColumns,
				otherProp: 'value',
			}),
		);
	});

	it('should update savedViewPreferences in savedView mode', () => {
		const tracesUpdaterConfig = getTracesUpdaterConfig(
			mockRedirectWithOptionsData,
			mockSetSavedViewPreferences,
		);

		tracesUpdaterConfig.updateColumns(mockColumns, PreferenceMode.SAVED_VIEW);

		// Should not redirect or modify localStorage in savedView mode
		expect(mockRedirectWithOptionsData).not.toHaveBeenCalled();
		expect(mockSetLocalStorageKey).not.toHaveBeenCalled();

		// Should update savedViewPreferences
		expect(mockSetSavedViewPreferences).toHaveBeenCalledWith({
			columns: mockColumns,
			formatting: {
				maxLines: 2,
				format: 'table',
				fontSize: 'small',
				version: 1,
			},
		});
	});

	it('should have a no-op updateFormatting method', () => {
		const tracesUpdaterConfig = getTracesUpdaterConfig(
			mockRedirectWithOptionsData,
			mockSetSavedViewPreferences,
		);

		// Call updateFormatting and verify it does nothing
		tracesUpdaterConfig.updateFormatting();

		// No API calls should be made
		expect(mockRedirectWithOptionsData).not.toHaveBeenCalled();
		expect(mockSetLocalStorageKey).not.toHaveBeenCalled();
		expect(mockSetSavedViewPreferences).not.toHaveBeenCalled();
	});
});
