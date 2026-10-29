import {
	act,
	fireEvent,
	screen,
	waitFor,
	within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from '@signozhq/ui/sonner';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { DataSource } from 'types/common/queryBuilder';

import { SavedViewCreatedFrom, SavedViewEvents } from '../events';
import SavedViewsHeader from '../SavedViewsHeader';
import SavedViewsPanel from '../SavedViewsPanel';
import { mockSavedViewsApi } from './savedViewsApiMock';
import {
	expectRowUsable,
	expectUsable,
	explorerUrl,
	makeView,
	MENU_CHECK_TIMEOUT,
	queryWith,
	renderWithExplorerProviders,
	viewUrl,
} from './savedViewsTestUtils';

const logEventMock = jest.fn();
jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: (...args: unknown[]): void => logEventMock(...args),
}));

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

// copy-to-clipboard falls back to window.prompt in jsdom.
jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): [unknown, jest.Mock] => [null, jest.fn()],
}));

const PATH = ROUTES.TRACES_EXPLORER;
const source = SavedviewtypesSourceDTO.traces;

const errors = makeView({ id: 'view-1', displayName: 'Errors' });

function renderAll(
	url = explorerUrl(PATH, {}),
): ReturnType<typeof renderWithExplorerProviders> {
	return renderWithExplorerProviders(
		<>
			<SavedViewsHeader source={source} onOpenViews={jest.fn()} />
			<SavedViewsPanel source={source} onClose={jest.fn()} />
		</>,
		url,
	);
}

const row = (name: string): HTMLElement =>
	screen
		.getAllByTestId('saved-views-row')
		.find((element) => element.textContent?.includes(name)) as HTMLElement;

// Buttons and menu rows ignore clicks until their permission check settles.
async function clickWhenUsable(testId: string): Promise<void> {
	await waitFor(() => expectUsable(screen.getByTestId(testId)));
	await userEvent.click(screen.getByTestId(testId));
}

async function chooseMenuItem(testId: string): Promise<void> {
	const item = await screen.findByTestId(testId);
	await waitFor(() => expectRowUsable(item), MENU_CHECK_TIMEOUT);
	fireEvent.click(item);
}

async function chooseFromRowMenu(viewName: string, key: string): Promise<void> {
	await screen.findByTestId('saved-views-list');
	fireEvent.click(within(row(viewName)).getByTestId('saved-views-row-menu'));
	await chooseMenuItem(`saved-views-row-menu-item-${key}`);
}

async function chooseFromSaveMenu(key: string): Promise<void> {
	await userEvent.click(screen.getByTestId('saved-views-save-changes'));
	await chooseMenuItem(`saved-views-save-changes-item-${key}`);
}

async function submitName(name: string): Promise<void> {
	await userEvent.type(screen.getByTestId('save-view-name'), name);
	await userEvent.click(screen.getByTestId('save-view-submit'));
}

async function waitForView(name: string): Promise<void> {
	await waitFor(() =>
		expect(screen.getByTestId('saved-views-name')).toHaveTextContent(name),
	);
	await waitFor(() =>
		expect(screen.getByTestId('saved-views-clear')).toBeInTheDocument(),
	);
}

const callsOf = (event: SavedViewEvents): unknown[][] =>
	logEventMock.mock.calls.filter(([name]) => name === event);

describe('SavedViews analytics', () => {
	beforeEach(() => {
		localStorage.clear();
		logEventMock.mockClear();
		jest.mocked(toast.error).mockClear();
	});

	it('logs a view created from the header', async () => {
		mockSavedViewsApi([errors], { createdId: 'view-new' });
		renderAll();

		await clickWhenUsable('saved-views-create');
		await submitName('Slow checkout');

		await waitFor(() =>
			expect(logEventMock).toHaveBeenCalledWith(SavedViewEvents.ViewCreated, {
				source,
				viewId: 'view-new',
				from: SavedViewCreatedFrom.Header,
			}),
		);
	});

	it('logs a view created from the empty state', async () => {
		mockSavedViewsApi([], { createdId: 'view-new' });
		renderAll();

		await screen.findByTestId('saved-views-list-create');
		await clickWhenUsable('saved-views-list-create');
		await submitName('Slow checkout');

		await waitFor(() =>
			expect(logEventMock).toHaveBeenCalledWith(SavedViewEvents.ViewCreated, {
				source,
				viewId: 'view-new',
				from: SavedViewCreatedFrom.EmptyState,
			}),
		);
	});

	it('does not log a create that fails', async () => {
		mockSavedViewsApi([errors], { createStatus: 500 });
		renderAll();

		await clickWhenUsable('saved-views-create');
		await submitName('Slow checkout');

		await waitFor(() => expect(toast.error).toHaveBeenCalled());
		expect(callsOf(SavedViewEvents.ViewCreated)).toHaveLength(0);
	});

	describe('on a changed view', () => {
		async function openDirtyView(): Promise<void> {
			const { history } = renderAll(viewUrl(PATH, errors));
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
			await screen.findByTestId('saved-views-discard');
		}

		it('does not log an update that fails', async () => {
			mockSavedViewsApi([errors], { updateStatus: 500 });
			await openDirtyView();

			await chooseFromSaveMenu('update');

			await waitFor(() => expect(toast.error).toHaveBeenCalled());
			expect(callsOf(SavedViewEvents.ViewUpdated)).toHaveLength(0);
		});

		it('logs an update', async () => {
			mockSavedViewsApi([errors]);
			await openDirtyView();

			await chooseFromSaveMenu('update');
			await waitFor(() =>
				expect(logEventMock).toHaveBeenCalledWith(SavedViewEvents.ViewUpdated, {
					source,
					viewId: errors.id,
				}),
			);
		});

		it('logs a view created with save as new', async () => {
			mockSavedViewsApi([errors], { createdId: 'view-copy' });
			await openDirtyView();

			await chooseFromSaveMenu('save-as-new');
			await submitName('Errors copy');
			await waitFor(() =>
				expect(logEventMock).toHaveBeenCalledWith(SavedViewEvents.ViewCreated, {
					source,
					viewId: 'view-copy',
					from: SavedViewCreatedFrom.SaveAsNew,
				}),
			);
		});

		it('logs discarded changes', async () => {
			mockSavedViewsApi([errors]);
			await openDirtyView();
			logEventMock.mockClear();

			await userEvent.click(screen.getByTestId('saved-views-discard'));

			expect(logEventMock).toHaveBeenCalledWith(SavedViewEvents.ChangesDiscarded, {
				source,
				viewId: errors.id,
			});
		});
	});

	it('logs a cleared view', async () => {
		mockSavedViewsApi([errors]);
		renderAll(viewUrl(PATH, errors));
		await waitForView('Errors');

		await userEvent.click(screen.getByTestId('saved-views-clear'));

		expect(logEventMock).toHaveBeenCalledWith(SavedViewEvents.ViewCleared, {
			source,
			viewId: errors.id,
		});
	});

	it('logs a view cleared from its row', async () => {
		mockSavedViewsApi([errors]);
		renderAll(viewUrl(PATH, errors));
		await waitForView('Errors');

		await userEvent.click(await screen.findByTestId('saved-views-row-clear'));

		expect(logEventMock).toHaveBeenCalledWith(SavedViewEvents.ViewCleared, {
			source,
			viewId: errors.id,
		});
	});

	it('logs only the delete when the open view is deleted', async () => {
		mockSavedViewsApi([errors]);
		renderAll(viewUrl(PATH, errors));
		await waitForView('Errors');

		await chooseFromRowMenu('Errors', 'delete');
		await userEvent.click(screen.getByTestId('delete-saved-view-confirm'));

		await waitFor(() =>
			expect(logEventMock).toHaveBeenCalledWith(SavedViewEvents.ViewDeleted, {
				source,
				viewId: errors.id,
			}),
		);
		await waitFor(() =>
			expect(screen.getByTestId('saved-views-name')).toHaveTextContent('My view'),
		);
		expect(callsOf(SavedViewEvents.ViewCleared)).toHaveLength(0);
	});

	it('logs a copied link', async () => {
		mockSavedViewsApi([errors]);
		renderAll();

		await chooseFromRowMenu('Errors', 'copyLink');

		expect(logEventMock).toHaveBeenCalledWith(SavedViewEvents.LinkCopied, {
			source,
			viewId: errors.id,
		});
	});

	it('logs edited view details', async () => {
		mockSavedViewsApi([errors]);
		renderAll();

		await chooseFromRowMenu('Errors', 'editDetails');
		await submitName(' renamed');

		await waitFor(() =>
			expect(logEventMock).toHaveBeenCalledWith(
				SavedViewEvents.ViewDetailsEdited,
				{ source, viewId: errors.id },
			),
		);
	});

	it('does not log edited view details that fail to save', async () => {
		mockSavedViewsApi([errors], { updateStatus: 500 });
		renderAll();

		await chooseFromRowMenu('Errors', 'editDetails');
		await submitName(' renamed');

		await waitFor(() => expect(toast.error).toHaveBeenCalled());
		expect(callsOf(SavedViewEvents.ViewDetailsEdited)).toHaveLength(0);
	});

	it('does not log a delete that fails', async () => {
		mockSavedViewsApi([errors], { deleteStatus: 500 });
		renderAll();

		await chooseFromRowMenu('Errors', 'delete');
		await userEvent.click(screen.getByTestId('delete-saved-view-confirm'));

		await waitFor(() => expect(toast.error).toHaveBeenCalled());
		expect(callsOf(SavedViewEvents.ViewDeleted)).toHaveLength(0);
	});
});
