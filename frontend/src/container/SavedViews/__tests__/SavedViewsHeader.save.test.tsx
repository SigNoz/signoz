import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from '@signozhq/ui/sonner';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { DataSource } from 'types/common/queryBuilder';

import SavedViewsHeader from '../SavedViewsHeader';
import {
	explorerUrl,
	makeView,
	mockSavedViewsApi,
	queryWith,
	renderWithExplorerProviders,
	urlParam,
	viewUrl,
} from './savedViewsTestUtils';

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

const PATH = ROUTES.TRACES_EXPLORER;

function renderHeader(
	url: string,
): ReturnType<typeof renderWithExplorerProviders> {
	return renderWithExplorerProviders(
		<SavedViewsHeader
			source={SavedviewtypesSourceDTO.traces}
			onOpenViews={jest.fn()}
		/>,
		url,
	);
}

const modal = (): HTMLElement => screen.getByTestId('save-view-modal');
const isModalOpen = (): boolean => !!screen.queryByTestId('save-view-modal');

async function openDirtyView(
	view: ReturnType<typeof makeView>,
): Promise<ReturnType<typeof renderWithExplorerProviders>> {
	const rendered = renderHeader(viewUrl(PATH, view));
	await waitFor(() =>
		expect(screen.getByTestId('saved-views-name')).toHaveTextContent(
			view.spec.displayName,
		),
	);
	await waitFor(() =>
		expect(screen.getByTestId('saved-views-clear')).toBeInTheDocument(),
	);
	act(() => {
		rendered.history.push(
			explorerUrl(PATH, {
				query: queryWith(DataSource.TRACES, 'has_error = false'),
				panelType: PANEL_TYPES.LIST,
				viewKey: view.id,
			}),
		);
	});
	await waitFor(() =>
		expect(screen.getByTestId('saved-views-discard')).toBeInTheDocument(),
	);
	return rendered;
}

async function chooseFromSaveMenu(item: string): Promise<void> {
	await userEvent.click(screen.getByTestId('saved-views-save-changes'));
	await userEvent.click(await screen.findByRole('menuitem', { name: item }));
}

async function submitName(name: string): Promise<void> {
	await userEvent.type(screen.getByTestId('save-view-name'), name);
	await userEvent.click(screen.getByTestId('save-view-submit'));
}

describe('SavedViewsHeader saving', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe('create', () => {
		it('saves the current state under a generated name and opens it', async () => {
			const requests = mockSavedViewsApi([], { createdId: 'view-new' });
			const { history } = renderHeader(explorerUrl(PATH, {}));

			await userEvent.click(screen.getByTestId('saved-views-create'));

			expect(within(modal()).getByText('Create new view')).toBeInTheDocument();
			expect(screen.getByTestId('save-view-submit')).toBeDisabled();

			await submitName('Slow checkout');

			await waitFor(() => expect(requests.created).toHaveLength(1));
			expect(requests.created[0]).toStrictEqual(
				expect.objectContaining({
					generateName: true,
					source: SavedviewtypesSourceDTO.traces,
					schemaVersion: 'v2',
					spec: expect.objectContaining({
						displayName: 'Slow checkout',
						panelType: 'list',
					}),
				}),
			);
			await waitFor(() =>
				expect(urlParam(history, QueryParams.viewKey)).toBe(
					JSON.stringify('view-new'),
				),
			);
			expect(toast.success).toHaveBeenCalledWith(
				'You have created a new view.',
				expect.objectContaining({ position: 'top-right' }),
			);
			await waitFor(() => expect(isModalOpen()).toBe(false));
			await waitFor(() =>
				expect(screen.getByTestId('saved-views-name')).toHaveTextContent(
					'Slow checkout',
				),
			);
		});

		it('keeps the modal open and reports a failed save', async () => {
			const requests = mockSavedViewsApi([], { createStatus: 500 });
			const { history } = renderHeader(explorerUrl(PATH, {}));

			await userEvent.click(screen.getByTestId('saved-views-create'));
			await submitName('Slow checkout');

			await waitFor(() => expect(toast.error).toHaveBeenCalled());
			expect(requests.created).toHaveLength(1);
			expect(isModalOpen()).toBe(true);
			expect(screen.getByTestId('save-view-name')).toHaveValue('Slow checkout');
			expect(urlParam(history, QueryParams.viewKey)).toBeNull();
			expect(toast.success).not.toHaveBeenCalled();
		});

		it('cancel closes the modal without saving', async () => {
			const requests = mockSavedViewsApi([]);
			renderHeader(explorerUrl(PATH, {}));

			await userEvent.click(screen.getByTestId('saved-views-create'));
			await userEvent.type(screen.getByTestId('save-view-name'), 'Draft');
			await userEvent.click(screen.getByTestId('save-view-cancel'));

			await waitFor(() => expect(isModalOpen()).toBe(false));
			expect(requests.created).toHaveLength(0);
		});
	});

	it('save as new creates another view from the changed state', async () => {
		const errors = makeView({ id: 'view-1', displayName: 'Errors' });
		const requests = mockSavedViewsApi([errors], { createdId: 'view-copy' });
		const { history } = await openDirtyView(errors);

		await chooseFromSaveMenu('Save as new view');

		expect(within(modal()).getByText('Save as new view')).toBeInTheDocument();
		await submitName('Errors copy');

		await waitFor(() => expect(requests.created).toHaveLength(1));
		const body = requests.created[0] as {
			spec: {
				displayName: string;
				queries: { spec: { filter: { expression: string } } }[];
			};
		};
		expect(body.spec.displayName).toBe('Errors copy');
		expect(body.spec.queries[0].spec.filter.expression).toBe('has_error = false');
		expect(requests.updated).toHaveLength(0);
		await waitFor(() =>
			expect(urlParam(history, QueryParams.viewKey)).toBe(
				JSON.stringify('view-copy'),
			),
		);
	});

	it('update stores the changed state on the open view, keeping its name', async () => {
		const errors = makeView({ id: 'view-1', displayName: 'Errors' });
		const requests = mockSavedViewsApi([errors]);
		await openDirtyView(errors);

		await chooseFromSaveMenu('Update selected view');

		await waitFor(() => expect(requests.updated).toHaveLength(1));
		const { id, body } = requests.updated[0] as {
			id: string;
			body: {
				source: string;
				spec: {
					displayName: string;
					queries: { spec: { filter: { expression: string } } }[];
				};
			};
		};
		expect(id).toBe('view-1');
		expect(body.source).toBe(SavedviewtypesSourceDTO.traces);
		expect(body.spec.displayName).toBe('Errors');
		expect(body.spec.queries[0].spec.filter.expression).toBe('has_error = false');
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				'View updated',
				expect.objectContaining({ position: 'top-right' }),
			),
		);
		expect(requests.created).toHaveLength(0);
	});
});
