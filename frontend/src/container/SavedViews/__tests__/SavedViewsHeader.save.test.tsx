import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@signozhq/ui/button';
import { toast } from '@signozhq/ui/sonner';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { DataSource } from 'types/common/queryBuilder';

import SavedViewsHeader from '../SavedViewsHeader';
import {
	expectRowUsable,
	expectUsable,
	explorerUrl,
	makeView,
	MENU_CHECK_TIMEOUT,
	queryWith,
	renderWithExplorerProviders,
	urlParam,
	viewUrl,
} from './savedViewsTestUtils';
import { API, mockSavedViewsApi } from './savedViewsApiMock';

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

const PATH = ROUTES.TRACES_EXPLORER;

function renderHeader(
	url: string,
	isViewsOpen = false,
): ReturnType<typeof renderWithExplorerProviders> {
	return renderWithExplorerProviders(
		<SavedViewsHeader
			source={SavedviewtypesSourceDTO.traces}
			onOpenViews={jest.fn()}
			isViewsOpen={isViewsOpen}
			onToggleViews={jest.fn()}
		/>,
		url,
	);
}

// Edits the current query without running it, so it is not the staged one.
function EditCurrentQuery(): JSX.Element {
	const { currentQuery, handleSetQueryData } = useQueryBuilder();
	return (
		<Button
			size="md"
			variant="solid"
			color="primary"
			testId="edit-current-query"
			onClick={(): void =>
				handleSetQueryData(0, {
					...currentQuery.builder.queryData[0],
					filter: { expression: 'unstaged = true' },
				})
			}
		>
			Edit query
		</Button>
	);
}

const modal = (): HTMLElement => screen.getByTestId('save-view-modal');
const isModalOpen = (): boolean => !!screen.queryByTestId('save-view-modal');

async function openDirtyView(
	view: ReturnType<typeof makeView>,
	isViewsOpen = false,
): Promise<ReturnType<typeof renderWithExplorerProviders>> {
	const rendered = renderHeader(viewUrl(PATH, view), isViewsOpen);
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

const SAVE_MENU_ITEM_TEST_IDS: Record<string, string> = {
	'Save as new view': 'saved-views-save-changes-item-save-as-new',
	'Update selected view': 'saved-views-save-changes-item-update',
};

async function chooseFromSaveMenu(item: string): Promise<void> {
	await userEvent.click(screen.getByTestId('saved-views-save-changes'));
	const menuItem = await screen.findByTestId(SAVE_MENU_ITEM_TEST_IDS[item]);
	await waitFor(() => expectRowUsable(menuItem), MENU_CHECK_TIMEOUT);
	await userEvent.click(menuItem);
}

async function clickCreate(): Promise<void> {
	await waitFor(() => expectUsable(screen.getByTestId('saved-views-create')));
	await userEvent.click(screen.getByTestId('saved-views-create'));
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

			await clickCreate();

			expect(within(modal()).getByText('Create new view')).toBeInTheDocument();
			expect(screen.getByTestId('save-view-submit')).toHaveAttribute(
				'aria-disabled',
				'true',
			);

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
				'View created',
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

			await clickCreate();
			await submitName('Slow checkout');

			await waitFor(() => expect(toast.error).toHaveBeenCalled());
			expect(requests.created).toHaveLength(1);
			expect(isModalOpen()).toBe(true);
			expect(screen.getByTestId('save-view-name')).toHaveValue('Slow checkout');
			expect(urlParam(history, QueryParams.viewKey)).toBeNull();
			expect(toast.success).not.toHaveBeenCalled();
		});

		it('does not create a view from a blank name submitted with Enter', async () => {
			const requests = mockSavedViewsApi([]);
			renderHeader(explorerUrl(PATH, {}));

			await clickCreate();
			await userEvent.type(screen.getByTestId('save-view-name'), '   {enter}');
			await act(() => new Promise((resolve) => setTimeout(resolve, 200)));

			expect(requests.created).toHaveLength(0);
			expect(isModalOpen()).toBe(true);
		});

		it('ignores Enter while the view is being saved', async () => {
			let creates = 0;
			mockSavedViewsApi([]);
			server.use(
				rest.post(API, (_req, res, ctx) => {
					creates += 1;
					return res(
						ctx.delay(400),
						ctx.status(201),
						ctx.json({ status: 'success', data: { id: 'view-new' } }),
					);
				}),
			);
			renderHeader(explorerUrl(PATH, {}));

			await clickCreate();
			await submitName('Slow checkout');
			await waitFor(() => expect(creates).toBe(1));
			await userEvent.type(screen.getByTestId('save-view-name'), '{enter}');

			await waitFor(() => expect(isModalOpen()).toBe(false));
			expect(creates).toBe(1);
		});

		it('saves the query that was run, not edits made since', async () => {
			const requests = mockSavedViewsApi([], { createdId: 'view-new' });
			const { history } = renderWithExplorerProviders(
				<>
					<SavedViewsHeader
						source={SavedviewtypesSourceDTO.traces}
						onOpenViews={jest.fn()}
					/>
					<EditCurrentQuery />
				</>,
				explorerUrl(PATH, {}),
			);

			await userEvent.click(screen.getByTestId('edit-current-query'));
			await clickCreate();
			await submitName('Slow checkout');

			await waitFor(() => expect(requests.created).toHaveLength(1));
			const body = requests.created[0] as {
				spec: { queries: { spec: { filter?: { expression?: string } } }[] };
			};
			expect(body.spec.queries[0].spec.filter?.expression ?? '').not.toContain(
				'unstaged',
			);
			await waitFor(() =>
				expect(urlParam(history, QueryParams.viewKey)).toBe(
					JSON.stringify('view-new'),
				),
			);
			expect(
				decodeURIComponent(urlParam(history, QueryParams.compositeQuery) ?? ''),
			).not.toContain('unstaged');
		});

		it('cancel closes the modal without saving', async () => {
			const requests = mockSavedViewsApi([]);
			renderHeader(explorerUrl(PATH, {}));

			await clickCreate();
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

	it('update that fails reports the error and never says the view was updated', async () => {
		const errors = makeView({ id: 'view-1', displayName: 'Errors' });
		const requests = mockSavedViewsApi([errors], { updateStatus: 500 });
		await openDirtyView(errors);

		await chooseFromSaveMenu('Update selected view');

		await waitFor(() => expect(toast.error).toHaveBeenCalled());
		await act(() => new Promise((resolve) => setTimeout(resolve, 100)));
		expect(requests.updated).toHaveLength(1);
		expect(toast.success).not.toHaveBeenCalled();
	});

	it('update keeps the color of the open view', async () => {
		const base = makeView({ id: 'view-1', displayName: 'Errors' });
		const colored = {
			...base,
			spec: { ...base.spec, display: { color: '#e5484d' } },
		};
		const requests = mockSavedViewsApi([colored]);
		await openDirtyView(colored);

		await chooseFromSaveMenu('Update selected view');

		await waitFor(() => expect(requests.updated).toHaveLength(1));
		const { body } = requests.updated[0] as {
			body: { spec: { display?: { color?: string } } };
		};
		expect(body.spec.display?.color).toBe('#e5484d');
	});

	describe('view name toggle with unsaved changes', () => {
		const errors = makeView({ id: 'view-1', displayName: 'Errors' });

		it('stops opening the views from the name once the view changes', async () => {
			mockSavedViewsApi([errors]);
			const { history } = renderHeader(viewUrl(PATH, errors));
			await screen.findByTestId('saved-views-name-toggle');

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

			expect(
				screen.queryByTestId('saved-views-name-toggle'),
			).not.toBeInTheDocument();
		});

		it('still closes open views from the name', async () => {
			mockSavedViewsApi([errors]);
			await openDirtyView(errors, true);

			expect(screen.getByTestId('saved-views-name-toggle')).toBeInTheDocument();
		});
	});
});
