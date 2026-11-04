import { toast } from '@signozhq/ui/sonner';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import {
	fireEvent,
	screen,
	userEvent,
	waitFor,
	within,
} from 'tests/test-utils';

import SavedViewsPanel from '../SavedViewsPanel';
import { mockSavedViewsApi } from './savedViewsApiMock';
import {
	expectUsable,
	explorerUrl,
	makeView,
	renderWithExplorerProviders,
	urlParam,
	viewUrl,
	withGlobalTime,
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

const rowName = (name: string): HTMLElement =>
	within(row(name)).getByTestId('saved-views-row-name');

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
		await waitFor(() => expectUsable(rowName('Slow spans')));
		await userEvent.click(rowName('Slow spans'));

		await waitFor(() =>
			expect(urlParam(history, QueryParams.viewKey)).toBe(
				JSON.stringify(alsoMine.id),
			),
		);
	});

	it('links each row to its view in the current time range', async () => {
		mockSavedViewsApi([mine, alsoMine]);
		renderWithExplorerProviders(
			withGlobalTime(
				<SavedViewsPanel
					source={SavedviewtypesSourceDTO.traces}
					onClose={jest.fn()}
				/>,
				{ selectedTime: '1h' },
			),
			explorerUrl(PATH, {}),
		);

		await screen.findByTestId('saved-views-list');
		const url = new URL(
			rowName('Slow spans').getAttribute('href') as string,
			window.location.origin,
		);

		expect(url.pathname).toBe(PATH);
		expect(url.searchParams.get(QueryParams.viewKey)).toBe(
			JSON.stringify(alsoMine.id),
		);
		expect(url.searchParams.get(QueryParams.panelTypes)).toBe(
			JSON.stringify(alsoMine.spec.panelType),
		);
		expect(url.searchParams.has(QueryParams.compositeQuery)).toBe(true);
		expect(url.searchParams.get(QueryParams.relativeTime)).toBe('1h');
	});

	it.each([
		['Ctrl', { ctrlKey: true }],
		['Cmd', { metaKey: true }],
		['Shift', { shiftKey: true }],
	])('leaves a %s click on a row to the browser', async (_key, modifiers) => {
		mockSavedViewsApi([mine, alsoMine]);
		const { history } = renderPanel();
		await screen.findByTestId('saved-views-list');
		const before = history.location.search;

		let defaultPrevented: boolean | undefined;
		const recordClick = (event: MouseEvent): void => {
			defaultPrevented = event.defaultPrevented;
			// jsdom cannot open a new tab.
			event.preventDefault();
		};
		document.addEventListener('click', recordClick);
		fireEvent.click(rowName('Slow spans'), modifiers);
		document.removeEventListener('click', recordClick);

		expect(defaultPrevented).toBe(false);
		expect(history.location.search).toBe(before);
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

		expect(rowName('Errors')).toHaveAttribute('aria-current', 'page');
		await userEvent.click(rowName('Errors'));

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

		const create = await screen.findByTestId('saved-views-list-create');
		await waitFor(() => expectUsable(create));
		await userEvent.click(create);
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
