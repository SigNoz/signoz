import { renderHook } from '@testing-library/react';
import { useListSavedViews } from 'api/generated/services/saved-view';
import {
	SavedviewtypesSavedViewDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
	ensureLogsRequiredColumns,
} from 'container/OptionsMenu/constants';
import { DataSource } from 'types/common/queryBuilder';

import { usePreferenceSync } from '../sync/usePreferenceSync';
import { PreferenceMode } from '../types';

jest.mock('api/generated/services/saved-view');

const loaderPreferences = { columns: [{ name: 'from-loader' }] };
jest.mock('../loader/usePreferenceLoader', () => ({
	usePreferenceLoader: jest.fn(() => ({
		preferences: loaderPreferences,
		loading: false,
		error: null,
	})),
}));

jest.mock('../updater/usePreferenceUpdater', () => ({
	usePreferenceUpdater: jest.fn(() => ({
		updateColumns: jest.fn(),
		updateFormatting: jest.fn(),
	})),
}));

const mockedUseListSavedViews = useListSavedViews as jest.MockedFunction<
	typeof useListSavedViews
>;

function makeView(
	id: string,
	source: SavedviewtypesSourceDTO,
	spec: Partial<SavedviewtypesSavedViewDTO['spec']>,
): SavedviewtypesSavedViewDTO {
	return {
		id,
		source,
		schemaVersion: 'v2',
		spec: {
			displayName: id,
			panelType: 'list',
			requestType: 'raw',
			queries: [],
			...spec,
		},
	} as unknown as SavedviewtypesSavedViewDTO;
}

function mockViews(views: SavedviewtypesSavedViewDTO[]): void {
	mockedUseListSavedViews.mockReturnValue({
		data: { status: 'success', data: views },
	} as unknown as ReturnType<typeof useListSavedViews>);
}

describe('usePreferenceSync in saved view mode', () => {
	beforeEach(() => {
		mockedUseListSavedViews.mockReset();
	});

	it('fetches the list for the data source only in saved view mode', () => {
		mockViews([]);

		renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.DIRECT,
				dataSource: DataSource.LOGS,
				savedViewId: undefined,
			}),
		);

		expect(mockedUseListSavedViews).toHaveBeenCalledWith(
			{ source: 'logs' },
			{ query: { enabled: false } },
		);
	});

	it('returns loader preferences outside saved view mode', () => {
		mockViews([]);

		const { result } = renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.DIRECT,
				dataSource: DataSource.LOGS,
				savedViewId: undefined,
			}),
		);

		expect(result.current.preferences).toBe(loaderPreferences);
	});

	it('applies selectedFields and display of the active logs view', () => {
		mockViews([
			makeView('view-1', SavedviewtypesSourceDTO.logs, {
				selectedFields: [{ name: 'service.name' }, { name: 'body' }],
				display: { maxLines: 3, format: 'raw', fontSize: 'large', color: 'red' },
			}),
		]);

		const { result } = renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.SAVED_VIEW,
				dataSource: DataSource.LOGS,
				savedViewId: 'view-1',
			}),
		);

		expect(result.current.preferences?.columns).toStrictEqual(
			ensureLogsRequiredColumns([{ name: 'service.name' }, { name: 'body' }]),
		);
		expect(result.current.preferences?.formatting).toStrictEqual({
			maxLines: 3,
			format: 'raw',
			fontSize: 'large',
			version: 1,
		});
	});

	it('falls back to defaults when the view has zero-valued display and no fields', () => {
		mockViews([
			makeView('view-1', SavedviewtypesSourceDTO.logs, {
				selectedFields: undefined,
				display: { maxLines: 0, format: '', fontSize: '', color: '' },
			}),
		]);

		const { result } = renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.SAVED_VIEW,
				dataSource: DataSource.LOGS,
				savedViewId: 'view-1',
			}),
		);

		expect(result.current.preferences?.columns).toStrictEqual(
			ensureLogsRequiredColumns(defaultLogsSelectedColumns),
		);
		expect(result.current.preferences?.formatting).toStrictEqual({
			maxLines: 1,
			format: 'table',
			fontSize: 'small',
			version: 1,
		});
	});

	it('passes trace selectedFields through and defaults when absent', () => {
		mockViews([
			makeView('with-fields', SavedviewtypesSourceDTO.traces, {
				selectedFields: [{ name: 'name' }, { name: 'durationNano' }],
			}),
			makeView('without-fields', SavedviewtypesSourceDTO.traces, {}),
		]);

		const withFields = renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.SAVED_VIEW,
				dataSource: DataSource.TRACES,
				savedViewId: 'with-fields',
			}),
		);
		const withoutFields = renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.SAVED_VIEW,
				dataSource: DataSource.TRACES,
				savedViewId: 'without-fields',
			}),
		);

		expect(withFields.result.current.preferences?.columns).toStrictEqual([
			{ name: 'name' },
			{ name: 'durationNano' },
		]);
		expect(withFields.result.current.preferences?.formatting).toBeUndefined();
		expect(withoutFields.result.current.preferences?.columns).toBe(
			defaultTraceSelectedColumns,
		);
	});

	it('uses defaults when the saved view id is not in the list', () => {
		mockViews([makeView('other', SavedviewtypesSourceDTO.logs, {})]);

		const { result } = renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.SAVED_VIEW,
				dataSource: DataSource.LOGS,
				savedViewId: 'missing',
			}),
		);

		expect(result.current.preferences?.columns).toStrictEqual(
			ensureLogsRequiredColumns(defaultLogsSelectedColumns),
		);
	});
});
