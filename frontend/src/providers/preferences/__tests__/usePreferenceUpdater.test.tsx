import { act, renderHook } from '@testing-library/react';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LogViewMode } from 'container/LogsTable';
import { FontSize } from 'container/OptionsMenu/types';
import {
	FormattingOptions,
	PreferenceMode,
	Preferences,
} from 'providers/preferences/types';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import { usePreferenceUpdater } from '../updater/usePreferenceUpdater';

// Mock the config updaters
const { mockUpdateColumns, mockUpdateFormatting } = vi.hoisted(() => ({
	mockUpdateColumns: vi.fn(),
	mockUpdateFormatting: vi.fn(),
}));

vi.mock('../configs/logsUpdaterConfig', () => ({
	__esModule: true,
	default: vi.fn().mockImplementation(() => ({
		updateColumns: mockUpdateColumns,
		updateFormatting: mockUpdateFormatting,
	})),
}));

vi.mock('../configs/tracesUpdaterConfig', () => ({
	__esModule: true,
	default: vi.fn().mockImplementation(() => ({
		updateColumns: mockUpdateColumns,
		updateFormatting: mockUpdateFormatting,
	})),
}));

// Mock the URL query hook
vi.mock('hooks/useUrlQueryData', () => ({
	__esModule: true,
	default: vi.fn().mockReturnValue({
		redirectWithQuery: vi.fn(),
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
		vi.clearAllMocks();
	});

	it('should return updateColumns and updateFormatting functions', () => {
		const setReSync = vi.fn();
		const setSavedViewPreferences = vi.fn();

		const { result } = renderHook(() =>
			usePreferenceUpdater({
				dataSource: DataSource.LOGS,
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

	it('should call the logs updater for updateColumns with logs dataSource', () => {
		const setReSync = vi.fn();
		const setSavedViewPreferences = vi.fn();
		const newColumns: TelemetryFieldKey[] = [
			{
				name: 'new-column',
				fieldContext: '',
				fieldDataType: DataTypes.String,
			},
		];

		const { result } = renderHook(() =>
			usePreferenceUpdater({
				dataSource: DataSource.LOGS,
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
		expect(mockUpdateColumns).toHaveBeenCalledWith(
			newColumns,
			PreferenceMode.DIRECT,
		);
		expect(setReSync).toHaveBeenCalledWith(true);
	});

	it('should call the logs updater for updateFormatting with logs dataSource', () => {
		const setReSync = vi.fn();
		const setSavedViewPreferences = vi.fn();
		const newFormatting: FormattingOptions = {
			maxLines: 10,
			format: 'table' as LogViewMode,
			fontSize: 'large' as FontSize,
			version: 1,
		};

		const { result } = renderHook(() =>
			usePreferenceUpdater({
				dataSource: DataSource.LOGS,
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
		expect(mockUpdateFormatting).toHaveBeenCalledWith(
			newFormatting,
			PreferenceMode.DIRECT,
		);
		expect(setReSync).toHaveBeenCalledWith(true);
	});

	it('should call the traces updater for updateColumns with traces dataSource', () => {
		const setReSync = vi.fn();
		const setSavedViewPreferences = vi.fn();
		const newColumns: TelemetryFieldKey[] = [
			{
				name: 'new-trace-column',
				fieldContext: '',
				fieldDataType: DataTypes.String,
			},
		];

		const { result } = renderHook(() =>
			usePreferenceUpdater({
				dataSource: DataSource.TRACES,
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
		expect(mockUpdateColumns).toHaveBeenCalledWith(
			newColumns,
			PreferenceMode.DIRECT,
		);
		expect(setReSync).toHaveBeenCalledWith(true);
	});

	it('should call the traces updater for updateFormatting with traces dataSource', () => {
		const setReSync = vi.fn();
		const setSavedViewPreferences = vi.fn();
		const newFormatting: FormattingOptions = {
			maxLines: 10,
			format: 'table' as LogViewMode,
			fontSize: 'large' as FontSize,
			version: 1,
		};

		const { result } = renderHook(() =>
			usePreferenceUpdater({
				dataSource: DataSource.TRACES,
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
		expect(mockUpdateFormatting).toHaveBeenCalledWith(
			newFormatting,
			PreferenceMode.DIRECT,
		);
		expect(setReSync).toHaveBeenCalledWith(true);
	});

	it('should increment reSync counter when updates are called', () => {
		const setReSync = vi.fn();
		const setSavedViewPreferences = vi.fn();

		const { result } = renderHook(() =>
			usePreferenceUpdater({
				dataSource: DataSource.LOGS,
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
