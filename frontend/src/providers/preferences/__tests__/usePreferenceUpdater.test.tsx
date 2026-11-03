import { Dispatch, SetStateAction } from 'react';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LogViewMode, FontSize } from 'container/OptionsMenu/types';
import useUrlQueryData from 'hooks/useUrlQueryData';
import {
	FormattingOptions,
	PreferenceMode,
	Preferences,
} from 'providers/preferences/types';
import { act, renderHook } from 'tests/test-utils';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import getLogsUpdaterConfig from '../configs/logsUpdaterConfig';
import getTracesUpdaterConfig from '../configs/tracesUpdaterConfig';
import { usePreferenceUpdater } from '../updater/usePreferenceUpdater';

jest.mock('../configs/logsUpdaterConfig');
jest.mock('../configs/tracesUpdaterConfig');
jest.mock('hooks/useUrlQueryData');

type LogsUpdater = ReturnType<typeof getLogsUpdaterConfig>;
type TracesUpdater = ReturnType<typeof getTracesUpdaterConfig>;

const mockLogsUpdateColumns = jest.fn() as jest.MockedFunction<
	LogsUpdater['updateColumns']
>;
const mockLogsUpdateFormatting = jest.fn() as jest.MockedFunction<
	LogsUpdater['updateFormatting']
>;
const mockTracesUpdateColumns = jest.fn() as jest.MockedFunction<
	TracesUpdater['updateColumns']
>;
const mockTracesUpdateFormatting = jest.fn() as jest.MockedFunction<
	TracesUpdater['updateFormatting']
>;

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
	const setReSync = jest.fn() as jest.MockedFunction<
		Dispatch<SetStateAction<boolean>>
	>;
	const setSavedViewPreferences = jest.fn() as jest.MockedFunction<
		Dispatch<SetStateAction<Preferences | null>>
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(getLogsUpdaterConfig).mockReturnValue({
			updateColumns: mockLogsUpdateColumns,
			updateFormatting: mockLogsUpdateFormatting,
		});
		jest.mocked(getTracesUpdaterConfig).mockReturnValue({
			updateColumns: mockTracesUpdateColumns,
			updateFormatting: mockTracesUpdateFormatting,
		});
		jest.mocked(useUrlQueryData).mockReturnValue({
			query: null,
			queryData: undefined,
			redirectWithQuery: jest.fn() as jest.MockedFunction<
				(newQueryData: unknown) => void
			>,
		});
	});

	it('should return updateColumns and updateFormatting functions', () => {
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
