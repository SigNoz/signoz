import { PANEL_TYPES } from 'constants/queryBuilder';
import { TRACE_VIEW_DEFAULT_COLUMNS } from 'container/LLMObservability/Explorer/constants';
import { useGetSavedView } from 'api/generated/services/saved-view';
import {
	SavedviewtypesPanelTypeDTO,
	SavedviewtypesSavedViewDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
	ensureLogsRequiredColumns,
} from 'container/OptionsMenu/constants';
import { renderHook } from 'tests/test-utils';

import { usePreferenceLoader } from '../loader/usePreferenceLoader';
import { usePreferenceSync } from '../sync/usePreferenceSync';
import { PreferenceMode, Preferences } from '../types';
import { usePreferenceUpdater } from '../updater/usePreferenceUpdater';

jest.mock('api/generated/services/saved-view');

jest.mock('../loader/usePreferenceLoader');
jest.mock('../updater/usePreferenceUpdater');

const loaderPreferences: Preferences = { columns: [{ name: 'from-loader' }] };

const mockedUseGetSavedView = jest.mocked(useGetSavedView);

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

// Stable objects, like react-query's cache; a fresh one per render loops the
// sync effect.
function mockViews(views: SavedviewtypesSavedViewDTO[]): void {
	const responses = new Map(
		views.map((view) => [
			view.id,
			{ data: { status: 'success', data: view }, dataUpdatedAt: 0 },
		]),
	);
	const notLoaded = { data: undefined, dataUpdatedAt: 0 };
	mockedUseGetSavedView.mockImplementation(
		({ id }) =>
			(responses.get(id) ?? notLoaded) as unknown as ReturnType<
				typeof useGetSavedView
			>,
	);
}

describe('usePreferenceSync in saved view mode', () => {
	beforeEach(() => {
		mockedUseGetSavedView.mockReset();
		jest.mocked(usePreferenceLoader).mockReturnValue({
			preferences: loaderPreferences,
			loading: false,
			error: null,
		});
		jest.mocked(usePreferenceUpdater).mockReturnValue({
			updateColumns: jest.fn() as jest.MockedFunction<
				ReturnType<typeof usePreferenceUpdater>['updateColumns']
			>,
			updateFormatting: jest.fn() as jest.MockedFunction<
				ReturnType<typeof usePreferenceUpdater>['updateFormatting']
			>,
		});
	});

	it('fetches the view only in saved view mode with a view id', () => {
		mockViews([]);

		renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.DIRECT,
				sourcePage: SavedviewtypesSourceDTO.logs,
				savedViewId: undefined,
			}),
		);

		expect(mockedUseGetSavedView).toHaveBeenCalledWith(
			{ id: '' },
			{ query: { enabled: false } },
		);
	});

	it('returns loader preferences outside saved view mode', () => {
		mockViews([]);

		const { result } = renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.DIRECT,
				sourcePage: SavedviewtypesSourceDTO.logs,
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
				sourcePage: SavedviewtypesSourceDTO.logs,
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
				sourcePage: SavedviewtypesSourceDTO.logs,
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
				sourcePage: SavedviewtypesSourceDTO.traces,
				savedViewId: 'with-fields',
			}),
		);
		const withoutFields = renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.SAVED_VIEW,
				sourcePage: SavedviewtypesSourceDTO.traces,
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

	it('passes AI trace selectedFields through and uses the defaults when absent', () => {
		mockViews([
			makeView('ai-with-fields', SavedviewtypesSourceDTO.ai_observability, {
				panelType: SavedviewtypesPanelTypeDTO.trace,
				selectedFields: [{ name: 'total_tokens' }],
			}),
			makeView('ai-without-fields', SavedviewtypesSourceDTO.ai_observability, {
				panelType: SavedviewtypesPanelTypeDTO.trace,
			}),
		]);

		const withFields = renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.SAVED_VIEW,
				sourcePage: SavedviewtypesSourceDTO.ai_observability,
				savedViewId: 'ai-with-fields',
			}),
		);
		const withoutFields = renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.SAVED_VIEW,
				sourcePage: SavedviewtypesSourceDTO.ai_observability,
				savedViewId: 'ai-without-fields',
			}),
		);

		expect(withFields.result.current.preferences).toStrictEqual({
			columns: [{ name: 'total_tokens' }],
			panelType: PANEL_TYPES.TRACE,
		});
		expect(withoutFields.result.current.preferences).toStrictEqual({
			columns: TRACE_VIEW_DEFAULT_COLUMNS,
			panelType: PANEL_TYPES.TRACE,
		});
	});

	it('gives the open panel its defaults when the AI view was saved on another panel', () => {
		mockViews([
			makeView('ai-graph', SavedviewtypesSourceDTO.ai_observability, {
				panelType: SavedviewtypesPanelTypeDTO.graph,
			}),
		]);

		const { result } = renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.SAVED_VIEW,
				sourcePage: SavedviewtypesSourceDTO.ai_observability,
				panelType: PANEL_TYPES.TRACE,
				savedViewId: 'ai-graph',
			}),
		);

		expect(result.current.preferences).toStrictEqual({
			columns: TRACE_VIEW_DEFAULT_COLUMNS,
			panelType: PANEL_TYPES.TRACE,
		});
	});

	it('uses defaults while the saved view is not loaded', () => {
		mockViews([makeView('other', SavedviewtypesSourceDTO.logs, {})]);

		const { result } = renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.SAVED_VIEW,
				sourcePage: SavedviewtypesSourceDTO.logs,
				savedViewId: 'missing',
			}),
		);

		expect(result.current.preferences?.columns).toStrictEqual(
			ensureLogsRequiredColumns(defaultLogsSelectedColumns),
		);
	});
	it('uses the AI trace defaults while the saved view is not loaded', () => {
		mockViews([]);

		const { result } = renderHook(() =>
			usePreferenceSync({
				mode: PreferenceMode.SAVED_VIEW,
				sourcePage: SavedviewtypesSourceDTO.ai_observability,
				panelType: PANEL_TYPES.TRACE,
				savedViewId: 'missing',
			}),
		);

		expect(result.current.preferences).toStrictEqual({
			columns: TRACE_VIEW_DEFAULT_COLUMNS,
			panelType: PANEL_TYPES.TRACE,
		});
	});
});
