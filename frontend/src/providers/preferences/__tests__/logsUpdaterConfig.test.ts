import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { LogViewMode } from 'container/LogsTable';
import { defaultOptionsQuery } from 'container/OptionsMenu/constants';
import { FontSize } from 'container/OptionsMenu/types';
import {
	FormattingOptions,
	PreferenceMode,
	Preferences,
} from 'providers/preferences/types';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import getLogsUpdaterConfig from '../configs/logsUpdaterConfig';

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};

jest.mock('api/browser/localstorage/set', () => ({
	__esModule: true,
	default: jest.fn((key: string, value: string) => {
		mockLocalStorage[key] = value;
	}),
}));

// Mock localStorage.getItem
Object.defineProperty(window, 'localStorage', {
	value: {
		getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
		setItem: jest.fn((key: string, value: string) => {
			mockLocalStorage[key] = value;
		}),
	},
	writable: true,
});

describe('logsUpdaterConfig', () => {
	// Mock redirectWithOptionsData and setSavedViewPreferences
	const redirectWithOptionsData = jest.fn();
	const setSavedViewPreferences = jest.fn();

	const mockPreferences: Preferences = {
		columns: [],
		formatting: {
			maxLines: 2,
			format: 'table' as LogViewMode,
			fontSize: 'small' as FontSize,
			version: 1,
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();
		// Clear mocked localStorage
		Object.keys(mockLocalStorage).forEach((key) => {
			delete mockLocalStorage[key];
		});
	});

	it('should update columns in localStorage for direct mode', () => {
		const logsUpdater = getLogsUpdaterConfig(
			mockPreferences,
			redirectWithOptionsData,
			setSavedViewPreferences,
		);

		const newColumns: TelemetryFieldKey[] = [
			{
				name: 'new-column',
				fieldContext: '',
				fieldDataType: DataTypes.String,
			},
		];

		// Set initial localStorage data
		mockLocalStorage[LOCALSTORAGE.LOGS_LIST_OPTIONS] = JSON.stringify({
			selectColumns: [
				{
					key: 'old-column',
					type: 'tag',
					dataType: DataTypes.String,
				},
			],
			maxLines: 2,
		});

		logsUpdater.updateColumns(newColumns, PreferenceMode.DIRECT);

		// Should update URL
		expect(redirectWithOptionsData).toHaveBeenCalledWith({
			...defaultOptionsQuery,
			...mockPreferences.formatting,
			selectColumns: newColumns,
		});

		// Should update localStorage
		const storedData = JSON.parse(
			mockLocalStorage[LOCALSTORAGE.LOGS_LIST_OPTIONS],
		);
		expect(storedData.selectColumns).toEqual(newColumns);
		expect(storedData.maxLines).toBe(2); // Should preserve other fields

		// Should not update saved view preferences
		expect(setSavedViewPreferences).not.toHaveBeenCalled();
	});

	it('should update columns in savedViewPreferences for savedView mode', () => {
		const logsUpdater = getLogsUpdaterConfig(
			mockPreferences,
			redirectWithOptionsData,
			setSavedViewPreferences,
		);

		const newColumns: TelemetryFieldKey[] = [
			{
				name: 'new-column',
				fieldContext: '',
				fieldDataType: DataTypes.String,
			},
		];

		logsUpdater.updateColumns(newColumns, PreferenceMode.SAVED_VIEW);

		// Should not update URL in savedView mode
		expect(redirectWithOptionsData).not.toHaveBeenCalled();

		// Should not update localStorage in savedView mode
		expect(mockLocalStorage[LOCALSTORAGE.LOGS_LIST_OPTIONS]).toBeUndefined();

		// Should update saved view preferences
		expect(setSavedViewPreferences).toHaveBeenCalledWith(expect.any(Function));
	});

	it('should update formatting options in localStorage for direct mode', () => {
		const logsUpdater = getLogsUpdaterConfig(
			mockPreferences,
			redirectWithOptionsData,
			setSavedViewPreferences,
		);

		const newFormatting: FormattingOptions = {
			maxLines: 5,
			format: 'json' as LogViewMode,
			fontSize: 'large' as FontSize,
			version: 1,
		};

		// Set initial localStorage data
		mockLocalStorage[LOCALSTORAGE.LOGS_LIST_OPTIONS] = JSON.stringify({
			selectColumns: [
				{
					key: 'column',
					type: 'tag',
					dataType: DataTypes.String,
				},
			],
			maxLines: 2,
			format: 'table',
		});

		logsUpdater.updateFormatting(newFormatting, PreferenceMode.DIRECT);

		// Should always update URL for both modes
		expect(redirectWithOptionsData).toHaveBeenCalledWith({
			...defaultOptionsQuery,
			...mockPreferences.formatting,
			...newFormatting,
		});

		// Should update localStorage in direct mode
		const storedData = JSON.parse(
			mockLocalStorage[LOCALSTORAGE.LOGS_LIST_OPTIONS],
		);
		expect(storedData.maxLines).toBe(5);
		expect(storedData.format).toBe('json');
		expect(storedData.fontSize).toBe('large');
		expect(storedData.version).toBe(1);
		expect(storedData.selectColumns).toEqual([
			{
				key: 'column',
				type: 'tag',
				dataType: DataTypes.String,
			},
		]); // Should preserve columns
	});

	it('should not update localStorage for savedView mode in updateFormatting', () => {
		const logsUpdater = getLogsUpdaterConfig(
			mockPreferences,
			redirectWithOptionsData,
			setSavedViewPreferences,
		);

		const newFormatting: FormattingOptions = {
			maxLines: 5,
			format: 'json' as LogViewMode,
			fontSize: 'large' as FontSize,
			version: 1,
		};

		// Set initial localStorage data
		mockLocalStorage[LOCALSTORAGE.LOGS_LIST_OPTIONS] = JSON.stringify({
			selectColumns: [
				{
					key: 'column',
					type: 'tag',
					dataType: DataTypes.String,
				},
			],
			maxLines: 2,
			format: 'table',
		});

		logsUpdater.updateFormatting(newFormatting, PreferenceMode.SAVED_VIEW);

		// Should not override localStorage in savedView mode
		const storedData = JSON.parse(
			mockLocalStorage[LOCALSTORAGE.LOGS_LIST_OPTIONS],
		);
		expect(storedData.maxLines).toBe(2); // Should remain the same
		expect(storedData.format).toBe('table'); // Should remain the same

		// Should update saved view preferences
		expect(setSavedViewPreferences).toHaveBeenCalledWith(expect.any(Function));
	});

	it('should initialize localStorage if it does not exist', () => {
		const logsUpdater = getLogsUpdaterConfig(
			mockPreferences,
			redirectWithOptionsData,
			setSavedViewPreferences,
		);

		const newFormatting: FormattingOptions = {
			maxLines: 5,
			format: 'json' as LogViewMode,
			fontSize: 'large' as FontSize,
			version: 1,
		};

		// No initial localStorage data

		logsUpdater.updateFormatting(newFormatting, PreferenceMode.DIRECT);

		// Should create localStorage entry
		const storedData = JSON.parse(
			mockLocalStorage[LOCALSTORAGE.LOGS_LIST_OPTIONS],
		);
		expect(storedData.maxLines).toBe(5);
		expect(storedData.format).toBe('json');
		expect(storedData.fontSize).toBe('large');
		expect(storedData.version).toBe(1);
	});
});
