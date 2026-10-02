import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from '@signozhq/ui/sonner';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';

import SavedViewsHeader from '../SavedViewsHeader';
import SavedViewsPanel from '../SavedViewsPanel';
import { mockSavedViewsApi } from './savedViewsApiMock';
import {
	explorerUrl,
	makeView,
	renderWithExplorerProviders,
	urlParam,
	viewUrl,
} from './savedViewsTestUtils';

const mockCopy = jest.fn();

// copy-to-clipboard falls back to window.prompt in jsdom.
jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): [unknown, jest.Mock] => [null, mockCopy],
}));

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

const PATH = ROUTES.TRACES_EXPLORER;

const errors = makeView({ id: 'view-1', displayName: 'Errors' });
const slow = makeView({
	id: 'view-2',
	displayName: 'Slow spans',
	expression: 'duration_nano > 1000',
});

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

async function chooseFromRowMenu(
	viewName: string,
	item: string,
): Promise<void> {
	await screen.findByTestId('saved-views-list');
	await userEvent.click(
		within(row(viewName)).getByTestId('saved-views-row-menu'),
	);
	await userEvent.click(await screen.findByRole('menuitem', { name: item }));
}

const chip = (): HTMLElement => screen.getByTestId('saved-views-name');

describe('SavedViewsPanel row menu', () => {
	beforeEach(() => {
		localStorage.clear();
		mockCopy.mockClear();
		jest.mocked(toast.success).mockClear();
	});

	it('offers copy link, edit details and delete', async () => {
		mockSavedViewsApi([errors]);
		renderPanelWithHeader();
		await screen.findByTestId('saved-views-list');

		await userEvent.click(
			within(row('Errors')).getByTestId('saved-views-row-menu'),
		);

		const items = await screen.findAllByRole('menuitem');
		expect(items.map((item) => item.textContent)).toStrictEqual([
			'Copy link',
			'Edit details',
			'Delete',
		]);
	});

	it('copies a link that opens the view with its query and tab', async () => {
		mockSavedViewsApi([errors, slow]);
		renderPanelWithHeader();

		await chooseFromRowMenu('Slow spans', 'Copy link');

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
		expect(toast.success).toHaveBeenCalledWith('Link copied', expect.anything());
	});

	it('renames a view without touching its query', async () => {
		const requests = mockSavedViewsApi([errors, slow]);
		renderPanelWithHeader();

		await chooseFromRowMenu('Slow spans', 'Edit details');
		const name = screen.getByTestId('save-view-name');
		expect(name).toHaveValue('Slow spans');
		await userEvent.clear(name);
		await userEvent.type(name, 'Slow checkout spans');
		await userEvent.click(screen.getByTestId('save-view-submit'));

		await waitFor(() => expect(requests.updated).toHaveLength(1));
		const [update] = requests.updated;
		expect(update.id).toBe(slow.id);
		expect(update.body).toMatchObject({
			spec: { ...slow.spec, displayName: 'Slow checkout spans' },
		});
		expect(toast.success).toHaveBeenCalledWith('View updated', expect.anything());
		await waitFor(() => expect(row('Slow checkout spans')).toBeInTheDocument());
	});

	it('shows the new name in the header when the open view is renamed', async () => {
		mockSavedViewsApi([errors]);
		renderPanelWithHeader(viewUrl(PATH, errors));
		await waitFor(() => expect(chip()).toHaveTextContent('Errors'));

		await chooseFromRowMenu('Errors', 'Edit details');
		const name = screen.getByTestId('save-view-name');
		await userEvent.clear(name);
		await userEvent.type(name, 'All errors');
		await userEvent.click(screen.getByTestId('save-view-submit'));

		await waitFor(() => expect(chip()).toHaveTextContent('All errors'));
	});

	it('asks before deleting and keeps the view on cancel', async () => {
		const requests = mockSavedViewsApi([errors, slow]);
		renderPanelWithHeader();

		await chooseFromRowMenu('Slow spans', 'Delete');

		expect(screen.getByText('Delete this view')).toBeInTheDocument();
		expect(
			screen.getByText('Deleting this view is irreversible and cannot be undone.'),
		).toBeInTheDocument();
		await userEvent.click(screen.getByTestId('delete-saved-view-cancel'));

		expect(requests.deleted).toHaveLength(0);
		expect(row('Slow spans')).toBeInTheDocument();
	});

	it('deletes a view on confirm', async () => {
		const requests = mockSavedViewsApi([errors, slow]);
		renderPanelWithHeader();

		await chooseFromRowMenu('Slow spans', 'Delete');
		await userEvent.click(screen.getByTestId('delete-saved-view-confirm'));

		await waitFor(() => expect(requests.deleted).toStrictEqual([slow.id]));
		expect(toast.success).toHaveBeenCalledWith('View deleted', expect.anything());
		await waitFor(() => expect(row('Slow spans')).toBeUndefined());
	});

	it('clears the open view when it is deleted', async () => {
		mockSavedViewsApi([errors, slow]);
		const { history } = renderPanelWithHeader(viewUrl(PATH, errors));
		await waitFor(() => expect(chip()).toHaveTextContent('Errors'));

		await chooseFromRowMenu('Errors', 'Delete');
		await userEvent.click(screen.getByTestId('delete-saved-view-confirm'));

		await waitFor(() =>
			expect(urlParam(history, QueryParams.viewKey)).toBeNull(),
		);
		await waitFor(() => expect(chip()).toHaveTextContent('My view'));
	});
});
