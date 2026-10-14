import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from '@signozhq/ui/sonner';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';

import SavedViewsPanel from '../SavedViewsPanel';
import { mockSavedViewsApi } from './savedViewsApiMock';
import {
	explorerUrl,
	makeView,
	renderWithExplorerProviders,
	urlParam,
	viewUrl,
} from './savedViewsTestUtils';

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

const PATH = ROUTES.TRACES_EXPLORER;

const mine = makeView({ id: 'view-1', displayName: 'Errors' });
const alsoMine = makeView({ id: 'view-2', displayName: 'Slow spans' });
const theirs = makeView({
	id: 'view-3',
	displayName: 'Checkout errors',
	createdBy: 'someone@signoz.io',
});

function renderPanel(
	url = explorerUrl(PATH, {}),
): ReturnType<typeof renderWithExplorerProviders> {
	return renderWithExplorerProviders(
		<SavedViewsPanel
			source={SavedviewtypesSourceDTO.traces}
			onClose={jest.fn()}
		/>,
		url,
	);
}

const rowNames = (sectionTestId: string): string[] =>
	within(screen.getByTestId(sectionTestId))
		.getAllByTestId('saved-views-row-name')
		.map((row) => row.textContent ?? '');

const row = (name: string): HTMLElement =>
	screen
		.getAllByTestId('saved-views-row')
		.find((element) => element.textContent?.includes(name)) as HTMLElement;

describe('SavedViewsPanel list', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('splits the views into created by me and created by others', async () => {
		mockSavedViewsApi([mine, alsoMine, theirs]);
		renderPanel();

		await screen.findByTestId('saved-views-list');
		expect(rowNames('saved-views-created-by-me')).toStrictEqual([
			'Errors',
			'Slow spans',
		]);
		expect(rowNames('saved-views-created-by-others')).toStrictEqual([
			'Checkout errors',
		]);
	});

	it('hides a section with no views', async () => {
		mockSavedViewsApi([mine]);
		renderPanel();

		await screen.findByTestId('saved-views-created-by-me');
		expect(screen.queryByTestId('saved-views-created-by-others')).toBeNull();
	});

	it('opens a view from its row', async () => {
		mockSavedViewsApi([mine, alsoMine]);
		const { history } = renderPanel();

		await screen.findByTestId('saved-views-list');
		await userEvent.click(
			within(row('Slow spans')).getByTestId('saved-views-row-name'),
		);

		await waitFor(() =>
			expect(urlParam(history, QueryParams.viewKey)).toBe(
				JSON.stringify(alsoMine.id),
			),
		);
	});

	it('marks the open view and clears it from its row', async () => {
		mockSavedViewsApi([mine, alsoMine]);
		const { history } = renderPanel(viewUrl(PATH, mine));

		await screen.findByTestId('saved-views-list');
		const activeRow = row('Errors');
		expect(within(activeRow).getByTestId('saved-views-row-clear')).toBeVisible();
		expect(
			within(row('Slow spans')).queryByTestId('saved-views-row-clear'),
		).toBeNull();

		await userEvent.click(within(activeRow).getByTestId('saved-views-row-clear'));

		await waitFor(() =>
			expect(urlParam(history, QueryParams.viewKey)).toBeNull(),
		);
	});

	it('leaves the url alone when the open view is clicked again', async () => {
		mockSavedViewsApi([mine]);
		const { history } = renderPanel(viewUrl(PATH, mine));
		await screen.findByTestId('saved-views-list');
		const before = history.location.search;

		await userEvent.click(
			within(row('Errors')).getByTestId('saved-views-row-name'),
		);

		expect(history.location.search).toBe(before);
	});

	describe('search', () => {
		it('filters both sections by name, ignoring case', async () => {
			mockSavedViewsApi([mine, alsoMine, theirs]);
			renderPanel();
			await screen.findByTestId('saved-views-list');

			await userEvent.type(screen.getByTestId('saved-views-search'), 'ERRORS');

			expect(rowNames('saved-views-created-by-me')).toStrictEqual(['Errors']);
			expect(rowNames('saved-views-created-by-others')).toStrictEqual([
				'Checkout errors',
			]);
		});

		it('says so when nothing matches, and recovers when cleared', async () => {
			mockSavedViewsApi([mine]);
			renderPanel();
			await screen.findByTestId('saved-views-list');
			const search = screen.getByTestId('saved-views-search');

			await userEvent.type(search, 'nothing like this');
			expect(
				screen.getByTestId('saved-views-list-no-results'),
			).toBeInTheDocument();
			expect(screen.queryByTestId('saved-views-list-create')).toBeNull();

			await userEvent.clear(search);
			expect(rowNames('saved-views-created-by-me')).toStrictEqual(['Errors']);
		});
	});

	it('offers to create a view when there are none, and opens it', async () => {
		const requests = mockSavedViewsApi([], { createdId: 'view-new' });
		const { history } = renderPanel();

		await userEvent.click(await screen.findByTestId('saved-views-list-create'));
		await userEvent.type(screen.getByTestId('save-view-name'), 'First view');
		await userEvent.click(screen.getByTestId('save-view-submit'));

		await waitFor(() => expect(requests.created).toHaveLength(1));
		expect(toast.success).toHaveBeenCalledWith('View created', expect.anything());
		await waitFor(() =>
			expect(urlParam(history, QueryParams.viewKey)).toBe(
				JSON.stringify('view-new'),
			),
		);
		await expect(
			screen.findByTestId('saved-views-created-by-me'),
		).resolves.toHaveTextContent('First view');
	});

	it('shows the list error and loads the list on retry', async () => {
		mockSavedViewsApi([mine], { listFailures: 1 });
		renderPanel();

		await userEvent.click(await screen.findByTestId('saved-views-list-retry'));

		await expect(
			screen.findByTestId('saved-views-created-by-me'),
		).resolves.toHaveTextContent('Errors');
	});
});
