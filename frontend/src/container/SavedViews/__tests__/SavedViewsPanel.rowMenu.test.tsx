import { toast } from '@signozhq/ui/toast';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime';
import { holdResponse } from 'tests/holdResponse';
import { screen, userEvent, waitFor, within } from 'tests/test-utils';

import SavedViewsHeader from '../SavedViewsHeader';
import SavedViewsPanel from '../SavedViewsPanel';
import { API, mockSavedViewsApi } from './savedViewsApiMock';
import {
	expectRowUsable,
	explorerUrl,
	makeView,
	MENU_CHECK_TIMEOUT,
	renderWithExplorerProviders,
	urlParam,
	viewUrl,
	withGlobalTime,
} from './savedViewsTestUtils';

const mockCopy = jest.fn() as jest.MockedFunction<(text: string) => void>;

// copy-to-clipboard falls back to window.prompt in jsdom.
jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): [unknown, typeof mockCopy] => [null, mockCopy],
}));

jest.mock('@signozhq/ui/toast', () => ({
	...jest.requireActual('@signozhq/ui/toast'),
	toast: { success: jest.fn(), danger: jest.fn() },
}));

const PATH = ROUTES.TRACES_EXPLORER;
const START_MS = 1700000000000;
const END_MS = 1700003600000;

const errors = makeView({ id: 'view-1', displayName: 'Errors' });
const slow = makeView({
	id: 'view-2',
	displayName: 'Slow spans',
	expression: 'duration_nano > 1000',
});

function renderPanel(): ReturnType<typeof renderWithExplorerProviders> {
	return renderWithExplorerProviders(
		<SavedViewsPanel
			source={SavedviewtypesSourceDTO.traces}
			onClose={jest.fn()}
		/>,
		explorerUrl(PATH, {}),
	);
}

function renderPanelWithHeader(
	url = explorerUrl(PATH, {}),
): ReturnType<typeof renderWithExplorerProviders> {
	return renderWithExplorerProviders(
		<>
			<SavedViewsHeader source={SavedviewtypesSourceDTO.traces} />
			<SavedViewsPanel
				source={SavedviewtypesSourceDTO.traces}
				onClose={jest.fn()}
			/>
		</>,
		url,
	);
}

const row = (name: string): HTMLElement =>
	screen
		.getAllByTestId('saved-views-row')
		.find((element) => element.textContent?.includes(name)) as HTMLElement;

const ROW_MENU_ITEM_TEST_IDS: Record<string, string> = {
	'Copy link': 'saved-views-row-menu-item-copyLink',
	'Copy ID': 'saved-views-row-menu-item-copyId',
	'Edit details': 'saved-views-row-menu-item-editDetails',
	Delete: 'saved-views-row-menu-item-delete',
};

async function chooseFromRowMenu(
	user: ReturnType<typeof userEvent.setup>,
	viewName: string,
	item: string,
): Promise<void> {
	await screen.findByTestId('saved-views-list');
	await user.click(within(row(viewName)).getByTestId('saved-views-row-menu'));
	const menuItem = await screen.findByTestId(ROW_MENU_ITEM_TEST_IDS[item]);
	await waitFor(() => expectRowUsable(menuItem), MENU_CHECK_TIMEOUT);
	await user.click(menuItem);
}

const chip = (): HTMLElement => screen.getByTestId('saved-views-name');

describe('SavedViewsPanel row menu', () => {
	beforeEach(() => {
		localStorage.clear();
		mockCopy.mockClear();
		jest.mocked(toast.success).mockClear();
	});

	it('offers copy link, copy id, edit details and delete', async () => {
		const user = userEvent.setup();
		mockSavedViewsApi([errors]);
		renderPanel();
		await screen.findByTestId('saved-views-list');

		await user.click(within(row('Errors')).getByTestId('saved-views-row-menu'));

		await screen.findByTestId(ROW_MENU_ITEM_TEST_IDS['Copy link']);
		const items = Object.values(ROW_MENU_ITEM_TEST_IDS).map(
			(testId) => screen.getByTestId(testId).textContent,
		);
		expect(items).toStrictEqual([
			'Copy link',
			'Copy ID',
			'Edit details',
			'Delete',
		]);
	});

	it('copies the view id', async () => {
		const user = userEvent.setup();
		mockSavedViewsApi([errors, slow]);
		renderPanel();

		await chooseFromRowMenu(user, 'Slow spans', 'Copy ID');

		expect(mockCopy).toHaveBeenCalledWith(slow.id);
		expect(toast.success).toHaveBeenCalledWith(
			'View ID copied',
			expect.anything(),
		);
	});

	it('copies a link that opens the view with its query, tab and time range', async () => {
		const user = userEvent.setup();
		mockSavedViewsApi([errors, slow]);
		renderWithExplorerProviders(
			withGlobalTime(
				<SavedViewsPanel
					source={SavedviewtypesSourceDTO.traces}
					onClose={jest.fn()}
				/>,
				{
					selectedTime: 'custom',
					minTime: START_MS * NANO_SECOND_MULTIPLIER,
					maxTime: END_MS * NANO_SECOND_MULTIPLIER,
				},
			),
			explorerUrl(PATH, {}),
		);

		await chooseFromRowMenu(user, 'Slow spans', 'Copy link');

		expect(mockCopy).toHaveBeenCalledTimes(1);
		const link = new URL(mockCopy.mock.calls[0][0]);
		expect(link.pathname).toBe(PATH);
		expect(link.searchParams.get(QueryParams.viewKey)).toBe(
			JSON.stringify(slow.id),
		);
		expect(link.searchParams.get(QueryParams.panelTypes)).toBe(
			JSON.stringify(slow.spec.panelType),
		);
		expect(
			decodeURIComponent(link.searchParams.get(QueryParams.compositeQuery) ?? ''),
		).toContain('duration_nano > 1000');
		expect(link.searchParams.get(QueryParams.startTime)).toBe(String(START_MS));
		expect(link.searchParams.get(QueryParams.endTime)).toBe(String(END_MS));
		expect(link.searchParams.has(QueryParams.relativeTime)).toBe(false);
		expect(toast.success).toHaveBeenCalledWith('Link copied', expect.anything());
	});

	it('renames a view without touching its query', async () => {
		const user = userEvent.setup();
		const requests = mockSavedViewsApi([errors, slow]);
		renderPanel();

		await chooseFromRowMenu(user, 'Slow spans', 'Edit details');
		const name = screen.getByTestId('save-view-name-field');
		expect(name).toHaveValue('Slow spans');
		await user.clear(name);
		await user.paste('Slow checkout spans');
		await user.click(screen.getByTestId('save-view-submit'));

		await waitFor(() => expect(requests.updated).toHaveLength(1));
		const [update] = requests.updated;
		expect(update.id).toBe(slow.id);
		expect(update.body).toMatchObject({
			spec: { ...slow.spec, displayName: 'Slow checkout spans' },
		});
		expect(toast.success).toHaveBeenCalledWith('View updated', expect.anything());
		await waitFor(() => expect(row('Slow checkout spans')).toBeInTheDocument());
	});

	it('renames from the stored view, not a stale list row', async () => {
		const user = userEvent.setup();
		const views = [errors, slow];
		const requests = mockSavedViewsApi(views);
		renderPanel();
		await screen.findByTestId('saved-views-list');
		const stored = makeView({
			id: slow.id,
			displayName: 'Slow spans',
			expression: 'duration_nano > 5000',
		});
		views[1] = stored;

		await chooseFromRowMenu(user, 'Slow spans', 'Edit details');
		const name = screen.getByTestId('save-view-name-field');
		await user.clear(name);
		await user.paste('Slow checkout spans');
		await user.click(screen.getByTestId('save-view-submit'));

		await waitFor(() => expect(requests.updated).toHaveLength(1));
		expect(requests.updated[0].body).toMatchObject({
			spec: { ...stored.spec, displayName: 'Slow checkout spans' },
		});
	});

	it('renames from the list row when the view cannot be read', async () => {
		const user = userEvent.setup();
		const requests = mockSavedViewsApi([errors, slow]);
		server.use(
			rest.get(`${API}/:id`, (_req, res, ctx) =>
				res(ctx.status(403), ctx.json({ status: 'error' })),
			),
		);
		renderPanel();

		await chooseFromRowMenu(user, 'Slow spans', 'Edit details');
		const name = screen.getByTestId('save-view-name-field');
		await user.clear(name);
		await user.paste('Slow checkout spans');
		await user.click(screen.getByTestId('save-view-submit'));

		await waitFor(() => expect(requests.updated).toHaveLength(1));
		expect(requests.updated[0].body).toMatchObject({
			spec: { ...slow.spec, displayName: 'Slow checkout spans' },
		});
	});

	it('does not rename when the stored view fails to load', async () => {
		const user = userEvent.setup();
		const requests = mockSavedViewsApi([errors, slow]);
		server.use(
			rest.get(`${API}/:id`, (_req, res, ctx) =>
				res(ctx.status(500), ctx.json({ status: 'error' })),
			),
		);
		renderPanel();

		await chooseFromRowMenu(user, 'Slow spans', 'Edit details');
		const name = screen.getByTestId('save-view-name-field');
		await user.type(name, ' 2');
		await user.click(screen.getByTestId('save-view-submit'));

		await waitFor(() => expect(toast.danger).toHaveBeenCalled());
		expect(requests.updated).toHaveLength(0);
	});

	it('ignores Enter while the stored view loads', async () => {
		const user = userEvent.setup();
		const storedView = holdResponse();
		const requests = mockSavedViewsApi([errors, slow], {
			getHeld: storedView.held,
		});
		renderPanel();

		await chooseFromRowMenu(user, 'Slow spans', 'Edit details');
		const name = screen.getByTestId('save-view-name-field');
		await user.type(name, ' 2{enter}');
		await waitFor(() =>
			expect(screen.getByTestId('save-view-submit')).toHaveAttribute(
				'aria-busy',
				'true',
			),
		);
		await user.keyboard('{Enter}');
		storedView.release();

		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				'View updated',
				expect.anything(),
			),
		);
		expect(requests.updated).toHaveLength(1);
	});

	it('shows the new name in the header when the open view is renamed', async () => {
		const user = userEvent.setup();
		mockSavedViewsApi([errors]);
		renderPanelWithHeader(viewUrl(PATH, errors));
		await waitFor(() => expect(chip()).toHaveTextContent('Errors'));

		await chooseFromRowMenu(user, 'Errors', 'Edit details');
		const name = screen.getByTestId('save-view-name-field');
		await user.clear(name);
		await user.paste('All errors');
		await user.click(screen.getByTestId('save-view-submit'));

		await waitFor(() => expect(chip()).toHaveTextContent('All errors'));
	});

	it('asks before deleting and keeps the view on cancel', async () => {
		const user = userEvent.setup();
		const requests = mockSavedViewsApi([errors, slow]);
		renderPanel();

		await chooseFromRowMenu(user, 'Slow spans', 'Delete');

		expect(screen.getByText('Delete this view')).toBeInTheDocument();
		expect(
			screen.getByText('Deleting this view is irreversible and cannot be undone.'),
		).toBeInTheDocument();
		await user.click(screen.getByTestId('delete-saved-view-cancel'));

		expect(requests.deleted).toHaveLength(0);
		expect(row('Slow spans')).toBeInTheDocument();
	});

	it('deletes a view on confirm', async () => {
		const user = userEvent.setup();
		const requests = mockSavedViewsApi([errors, slow]);
		renderPanel();

		await chooseFromRowMenu(user, 'Slow spans', 'Delete');
		await user.click(screen.getByTestId('delete-saved-view-confirm'));

		await waitFor(() => expect(requests.deleted).toStrictEqual([slow.id]));
		expect(toast.success).toHaveBeenCalledWith('View deleted', expect.anything());
		await waitFor(() => expect(row('Slow spans')).toBeUndefined());
	});

	it('clears the open view when it is deleted', async () => {
		const user = userEvent.setup();
		mockSavedViewsApi([errors, slow]);
		const { history } = renderPanelWithHeader(viewUrl(PATH, errors));
		await waitFor(() => expect(chip()).toHaveTextContent('Errors'));

		await chooseFromRowMenu(user, 'Errors', 'Delete');
		await user.click(screen.getByTestId('delete-saved-view-confirm'));

		await waitFor(() =>
			expect(urlParam(history, QueryParams.viewKey)).toBeNull(),
		);
		await waitFor(() => expect(chip()).toHaveTextContent('My view'));
	});

	it('keeps the open view when another view is deleted', async () => {
		const user = userEvent.setup();
		mockSavedViewsApi([errors, slow]);
		const { history } = renderPanelWithHeader(viewUrl(PATH, errors));
		await waitFor(() => expect(chip()).toHaveTextContent('Errors'));

		await chooseFromRowMenu(user, 'Slow spans', 'Delete');
		await user.click(screen.getByTestId('delete-saved-view-confirm'));

		await waitFor(() => expect(row('Slow spans')).toBeUndefined());
		expect(urlParam(history, QueryParams.viewKey)).toBe(
			JSON.stringify(errors.id),
		);
		expect(chip()).toHaveTextContent('Errors');
	});
});
