import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultOptionsQuery } from 'container/OptionsMenu/constants';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import getTracesUpdaterConfig from '../configs/tracesUpdaterConfig';
import { PreferenceMode } from '../types';

// Mock localStorage via the get/set modules (no window.localStorage stub:
// redefining it breaks in browser mode and `global` does not exist there)
const { mockLocalStorage, mockSetLocalStorageKey } = vi.hoisted(() => ({
	mockLocalStorage: {} as Record<string, string>,
	mockSetLocalStorageKey: vi.fn(),
}));

vi.mock('api/browser/localstorage/get', () => ({
	__esModule: true,
	default: vi.fn((key: string) => mockLocalStorage[key] || null),
}));

// Mock setLocalStorageKey
vi.mock('api/browser/localstorage/set', () => ({
	__esModule: true,
	default: (key: string, value: string): void => {
		mockLocalStorage[key] = value;
		mockSetLocalStorageKey(key, value);
	},
}));

describe('tracesUpdaterConfig', () => {
	// Mock functions
	const mockRedirectWithOptionsData = vi.fn();
	const mockSetSavedViewPreferences = vi.fn();

	// Test data
	const mockColumns: TelemetryFieldKey[] = [
		{
			name: 'test-trace-column',
			fieldContext: '',
			fieldDataType: DataTypes.String,
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mockLocalStorage
		Object.keys(mockLocalStorage).forEach((key) => {
			delete mockLocalStorage[key];
		});
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
				maxLines: 1,
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
