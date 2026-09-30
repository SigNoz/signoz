import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { DataSource } from 'types/common/queryBuilder';

import { useActiveSavedView } from '../hooks/useActiveSavedView';
import SavedViewsHeader from '../SavedViewsHeader';
import {
	explorerUrl,
	makeView,
	queryWith,
	renderWithExplorerProviders,
	urlParam,
	viewUrl,
} from './savedViewsTestUtils';
import { mockSavedViewsApi } from './savedViewsApiMock';

const PATH = ROUTES.TRACES_EXPLORER;

const errors = makeView({ id: 'view-1', displayName: 'Errors' });
const slow = makeView({
	id: 'view-2',
	displayName: 'Slow spans',
	expression: 'duration_nano > 1000',
	panelType: PANEL_TYPES.TIME_SERIES,
});

function renderHeader(
	url: string,
	onOpenViews: (() => void) | undefined = jest.fn(),
): ReturnType<typeof renderWithExplorerProviders> {
	return renderWithExplorerProviders(
		<>
			<SavedViewsHeader
				source={SavedviewtypesSourceDTO.traces}
				onOpenViews={onOpenViews}
			/>
			<RenderRecorder />
		</>,
		url,
	);
}

const chip = (): HTMLElement => screen.getByTestId('saved-views-name');
const isDirty = (): boolean => !!screen.queryByTestId('saved-views-discard');
const saveChanges = (): HTMLElement =>
	screen.getByTestId('saved-views-save-changes');

async function waitForView(name: string): Promise<void> {
	await waitFor(() => expect(chip()).toHaveTextContent(name));
	await waitFor(() =>
		expect(screen.getByTestId('saved-views-clear')).toBeInTheDocument(),
	);
}

// Each render's answer from the hook the header reads, so a state that lasts a
// single render is seen too.
interface RenderRecord {
	viewId?: string;
	dirty: boolean;
	// The staged query had not caught up with the url yet.
	isStaging: boolean;
}
let renders: RenderRecord[] = [];
function RenderRecorder(): null {
	const { view, hasUnsavedChanges } = useActiveSavedView(
		SavedviewtypesSourceDTO.traces,
	);
	const { stagedQuery } = useQueryBuilder();
	const compositeQuery = useGetCompositeQueryParam();
	renders.push({
		viewId: view?.id,
		dirty: hasUnsavedChanges,
		isStaging: stagedQuery?.id !== compositeQuery?.id,
	});
	return null;
}

async function recordRenders(change: () => void): Promise<RenderRecord[]> {
	renders = [];
	act(change);
	await waitFor(() =>
		expect(screen.queryByTestId('saved-views-loading')).toBeNull(),
	);
	await act(() => new Promise((resolve) => setTimeout(resolve, 100)));
	return renders;
}

describe('SavedViewsHeader', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('shows My view with create and all views when no view is open', async () => {
		mockSavedViewsApi([errors]);
		renderHeader(explorerUrl(PATH, {}));

		expect(chip()).toHaveTextContent('My view');
		expect(screen.getByTestId('saved-views-create')).toBeInTheDocument();
		expect(screen.getByTestId('saved-views-open')).toBeInTheDocument();
		expect(screen.queryByTestId('saved-views-clear')).toBeNull();
		expect(screen.queryByTestId('saved-views-save-changes')).toBeNull();
		expect(screen.queryByTestId('saved-views-discard')).toBeNull();
	});

	it('shows a skeleton while the view in the url loads', async () => {
		mockSavedViewsApi([errors], { getDelay: 150 });
		renderHeader(viewUrl(PATH, errors));

		expect(screen.getByTestId('saved-views-loading')).toBeInTheDocument();
		await waitForView('Errors');
		expect(screen.queryByTestId('saved-views-loading')).toBeNull();
	});

	it('shows the open view clean, with clear and all views', async () => {
		mockSavedViewsApi([errors]);
		renderHeader(viewUrl(PATH, errors));

		await waitForView('Errors');
		expect(screen.getByTestId('saved-views-open')).toBeInTheDocument();
		expect(screen.queryByTestId('saved-views-create')).toBeNull();
		expect(isDirty()).toBe(false);
	});

	it('marks the view dirty once the query changes, swapping in save and discard', async () => {
		mockSavedViewsApi([errors]);
		const { history } = renderHeader(viewUrl(PATH, errors));
		await waitForView('Errors');

		act(() => {
			history.push(
				explorerUrl(PATH, {
					query: queryWith(DataSource.TRACES, 'has_error = false'),
					panelType: PANEL_TYPES.LIST,
					viewKey: errors.id,
				}),
			);
		});

		await waitFor(() => expect(isDirty()).toBe(true));
		expect(saveChanges()).toBeInTheDocument();
		expect(screen.queryByTestId('saved-views-clear')).toBeNull();
		expect(screen.queryByTestId('saved-views-open')).toBeNull();
	});

	it('marks the view dirty when only the tab changes', async () => {
		mockSavedViewsApi([errors]);
		const { history } = renderHeader(viewUrl(PATH, errors));
		await waitForView('Errors');

		act(() => {
			const params = new URLSearchParams(history.location.search);
			params.set(QueryParams.panelTypes, JSON.stringify(PANEL_TYPES.TABLE));
			history.push(`${PATH}?${params.toString()}`);
		});

		await waitFor(() => expect(isDirty()).toBe(true));
	});

	it('discard puts the saved query and tab back', async () => {
		mockSavedViewsApi([slow]);
		const { history } = renderHeader(viewUrl(PATH, slow));
		await waitForView('Slow spans');

		act(() => {
			history.push(
				explorerUrl(PATH, {
					query: queryWith(DataSource.TRACES, 'has_error = true'),
					panelType: PANEL_TYPES.LIST,
					viewKey: slow.id,
				}),
			);
		});
		await waitFor(() => expect(isDirty()).toBe(true));

		await userEvent.click(screen.getByTestId('saved-views-discard'));

		await waitFor(() => expect(isDirty()).toBe(false));
		expect(urlParam(history, QueryParams.panelTypes)).toBe(
			JSON.stringify(PANEL_TYPES.TIME_SERIES),
		);
		expect(urlParam(history, QueryParams.viewKey)).toBe(JSON.stringify(slow.id));
		expect(urlParam(history, QueryParams.viewName)).toBeNull();
		const query = JSON.parse(
			decodeURIComponent(urlParam(history, QueryParams.compositeQuery) ?? ''),
		);
		expect(query.builder.queryData[0].filter.expression).toBe(
			'duration_nano > 1000',
		);
	});

	it('clear drops the view from the url but keeps the time range', async () => {
		localStorage.setItem(
			LOCALSTORAGE.LAST_USED_SAVED_VIEWS,
			JSON.stringify({ traces: { key: errors.id, value: 'Errors' } }),
		);
		mockSavedViewsApi([errors]);
		const { history } = renderHeader(viewUrl(PATH, errors, '1h'));
		await waitForView('Errors');

		await userEvent.click(screen.getByTestId('saved-views-clear'));

		await waitFor(() => expect(chip()).toHaveTextContent('My view'));
		expect(urlParam(history, QueryParams.viewKey)).toBeNull();
		expect(urlParam(history, QueryParams.panelTypes)).toBeNull();
		expect(urlParam(history, QueryParams.relativeTime)).toBe('1h');
		expect(
			JSON.parse(localStorage.getItem(LOCALSTORAGE.LAST_USED_SAVED_VIEWS) ?? '{}'),
		).toStrictEqual({});
	});

	describe('unsaved changes indicator', () => {
		it('never flashes while switching between views already loaded', async () => {
			mockSavedViewsApi([errors, slow]);
			const { history } = renderHeader(viewUrl(PATH, slow));
			await waitForView('Slow spans');
			act(() => history.push(viewUrl(PATH, errors)));
			await waitForView('Errors');

			const states = await recordRenders(() => history.push(viewUrl(PATH, slow)));

			expect(chip()).toHaveTextContent('Slow spans');
			expect(states.some((render) => render.isStaging)).toBe(true);
			expect(states.filter((render) => render.dirty)).toStrictEqual([]);
		});

		it('holds while the query keeps changing on a dirty view', async () => {
			mockSavedViewsApi([errors]);
			const { history } = renderHeader(viewUrl(PATH, errors));
			await waitForView('Errors');
			act(() => {
				history.push(
					explorerUrl(PATH, {
						query: queryWith(DataSource.TRACES, 'has_error = false'),
						panelType: PANEL_TYPES.LIST,
						viewKey: errors.id,
					}),
				);
			});
			await waitFor(() => expect(isDirty()).toBe(true));

			const states = await recordRenders(() =>
				history.push(
					explorerUrl(PATH, {
						query: queryWith(DataSource.TRACES, 'duration_nano > 5'),
						panelType: PANEL_TYPES.LIST,
						viewKey: errors.id,
					}),
				),
			);

			expect(states.some((render) => render.isStaging)).toBe(true);
			expect(states.filter((render) => !render.dirty)).toStrictEqual([]);
		});
	});

	it('on metrics compares no columns and has no all views button', async () => {
		const cpu = makeView({
			id: 'view-3',
			displayName: 'CPU',
			source: SavedviewtypesSourceDTO.metrics,
			dataSource: DataSource.METRICS,
			expression: '',
			panelType: PANEL_TYPES.TIME_SERIES,
		});
		mockSavedViewsApi([cpu]);
		renderWithExplorerProviders(
			<SavedViewsHeader source={SavedviewtypesSourceDTO.metrics} />,
			viewUrl(ROUTES.METRICS_EXPLORER_EXPLORER, cpu),
			DataSource.METRICS,
		);

		await waitForView('CPU');
		expect(isDirty()).toBe(false);
		expect(screen.queryByTestId('saved-views-open')).toBeNull();
	});
});
