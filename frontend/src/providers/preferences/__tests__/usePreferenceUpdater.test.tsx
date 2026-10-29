import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { act } from 'react-dom/test-utils';
import { renderHook } from '@testing-library/react';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LogViewMode, FontSize } from 'container/OptionsMenu/types';
import {
	FormattingOptions,
	PreferenceMode,
	Preferences,
} from 'providers/preferences/types';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { usePreferenceUpdater } from '../updater/usePreferenceUpdater';

// Mock the config updaters
const mockLogsUpdateColumns = jest.fn();
const mockLogsUpdateFormatting = jest.fn();
const mockTracesUpdateColumns = jest.fn();
const mockTracesUpdateFormatting = jest.fn();

jest.mock('../configs/logsUpdaterConfig', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		updateColumns: mockLogsUpdateColumns,
		updateFormatting: mockLogsUpdateFormatting,
	})),
}));

jest.mock('../configs/tracesUpdaterConfig', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		updateColumns: mockTracesUpdateColumns,
		updateFormatting: mockTracesUpdateFormatting,
	})),
}));

// Mock the URL query hook
jest.mock('hooks/useUrlQueryData', () => ({
	__esModule: true,
	default: jest.fn().mockReturnValue({
		redirectWithQuery: jest.fn(),
	}),
}));

describe('usePreferenceUpdater', () => {
	const mockPreferences: Preferences = {
		columns: [],
		formatting: {
			maxLines: 1,
			format: 'table' as LogViewMode,
			fontSize: 'small' as FontSize,
			version: 1,
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return updateColumns and updateFormatting functions', () => {
		const setReSync = jest.fn();
		const setSavedViewPreferences = jest.fn();

		const { result } = renderHook(() =>
			usePreferenceUpdater({
				sourcePage: SavedviewtypesSourceDTO.logs,
				mode: PreferenceMode.DIRECT,
				preferences: mockPreferences,
				setReSync,
				setSavedViewPreferences,
			}),
		);

		// Should return the update functions
		expect(typeof result.current.updateColumns).toBe('function');
		expect(typeof result.current.updateFormatting).toBe('function');
	});

	it('should call the logs updater for updateColumns with the logs list key', () => {
		const setReSync = jest.fn();
		const setSavedViewPreferences = jest.fn();
		const newColumns: TelemetryFieldKey[] = [
			{
				name: 'new-column',
				fieldContext: '',
				fieldDataType: DataTypes.String,
			},
		];

		const { result } = renderHook(() =>
			usePreferenceUpdater({
				sourcePage: SavedviewtypesSourceDTO.logs,
				mode: PreferenceMode.DIRECT,
				preferences: mockPreferences,
				setReSync,
				setSavedViewPreferences,
			}),
		);

		act(() => {
			result.current.updateColumns(newColumns);
		});

		// Should call the logs updater
		expect(mockLogsUpdateColumns).toHaveBeenCalledWith(
			newColumns,
			PreferenceMode.DIRECT,
		);
		expect(mockTracesUpdateColumns).not.toHaveBeenCalled();
		expect(setReSync).toHaveBeenCalledWith(true);
	});

	it('should call the logs updater for updateFormatting with the logs list key', () => {
		const setReSync = jest.fn();
		const setSavedViewPreferences = jest.fn();
		const newFormatting: FormattingOptions = {
			maxLines: 10,
			format: 'table' as LogViewMode,
			fontSize: 'large' as FontSize,
			version: 1,
		};

		const { result } = renderHook(() =>
			usePreferenceUpdater({
				sourcePage: SavedviewtypesSourceDTO.logs,
				mode: PreferenceMode.DIRECT,
				preferences: mockPreferences,
				setReSync,
				setSavedViewPreferences,
			}),
		);

		act(() => {
			result.current.updateFormatting(newFormatting);
		});

		// Should call the logs updater
		expect(mockLogsUpdateFormatting).toHaveBeenCalledWith(
			newFormatting,
			PreferenceMode.DIRECT,
		);
		expect(mockTracesUpdateFormatting).not.toHaveBeenCalled();
		expect(setReSync).toHaveBeenCalledWith(true);
	});

	it('should call the traces updater for updateColumns with the traces list key', () => {
		const setReSync = jest.fn();
		const setSavedViewPreferences = jest.fn();
		const newColumns: TelemetryFieldKey[] = [
			{
				name: 'new-trace-column',
				fieldContext: '',
				fieldDataType: DataTypes.String,
			},
		];

		const { result } = renderHook(() =>
			usePreferenceUpdater({
				sourcePage: SavedviewtypesSourceDTO.traces,
				mode: PreferenceMode.DIRECT,
				preferences: mockPreferences,
				setReSync,
				setSavedViewPreferences,
			}),
		);

		act(() => {
			result.current.updateColumns(newColumns);
		});

		// Should call the traces updater
		expect(mockTracesUpdateColumns).toHaveBeenCalledWith(
			newColumns,
			PreferenceMode.DIRECT,
		);
		expect(mockLogsUpdateColumns).not.toHaveBeenCalled();
		expect(setReSync).toHaveBeenCalledWith(true);
	});

	it('should call the traces updater for updateFormatting with the traces list key', () => {
		const setReSync = jest.fn();
		const setSavedViewPreferences = jest.fn();
		const newFormatting: FormattingOptions = {
			maxLines: 10,
			format: 'table' as LogViewMode,
			fontSize: 'large' as FontSize,
			version: 1,
		};

		const { result } = renderHook(() =>
			usePreferenceUpdater({
				sourcePage: SavedviewtypesSourceDTO.traces,
				mode: PreferenceMode.DIRECT,
				preferences: mockPreferences,
				setReSync,
				setSavedViewPreferences,
			}),
		);

		act(() => {
			result.current.updateFormatting(newFormatting);
		});

		// Should call the traces updater
		expect(mockTracesUpdateFormatting).toHaveBeenCalledWith(
			newFormatting,
			PreferenceMode.DIRECT,
		);
		expect(mockLogsUpdateFormatting).not.toHaveBeenCalled();
		expect(setReSync).toHaveBeenCalledWith(true);
	});

	it('should increment reSync counter when updates are called', () => {
		const setReSync = jest.fn();
		const setSavedViewPreferences = jest.fn();

		const { result } = renderHook(() =>
			usePreferenceUpdater({
				sourcePage: SavedviewtypesSourceDTO.logs,
				mode: PreferenceMode.DIRECT,
				preferences: mockPreferences,
				setReSync,
				setSavedViewPreferences,
			}),
		);

		act(() => {
			result.current.updateColumns([
				{
					name: 'column',
					fieldContext: '',
					fieldDataType: DataTypes.String,
				},
			]);
		});

		expect(setReSync).toHaveBeenCalledWith(true);
	});
});
