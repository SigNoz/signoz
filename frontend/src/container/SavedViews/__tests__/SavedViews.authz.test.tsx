import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	AuthtypesTransactionDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import {
	buildSavedViewDeletePermission,
	buildSavedViewReadPermission,
	buildSavedViewUpdatePermission,
	SavedViewCreatePermission,
	SavedViewListPermission,
	SavedViewReadPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';
import {
	AUTHZ_CHECK_URL,
	authzMockResponse,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { DataSource } from 'types/common/queryBuilder';

import { SAVED_VIEW_HOVER_CARD_OPEN_DELAY_MS } from '../constants';
import SavedViewsHeader from '../SavedViewsHeader';
import SavedViewsPanel from '../SavedViewsPanel';
import { API, mockSavedViewsApi } from './savedViewsApiMock';
import {
	expectUsable,
	explorerUrl,
	makeView,
	MENU_CHECK_TIMEOUT,
	queryWith,
	renderWithExplorerProviders,
	urlParam,
	viewUrl,
} from './savedViewsTestUtils';

const PATH = ROUTES.TRACES_EXPLORER;
const HOVER_CARD_TIMEOUT = { timeout: SAVED_VIEW_HOVER_CARD_OPEN_DELAY_MS * 3 };

const errors = makeView({ id: 'view-1', displayName: 'Errors' });
const slow = makeView({ id: 'view-2', displayName: 'Slow spans' });

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

function renderHeader(
	url: string,
): ReturnType<typeof renderWithExplorerProviders> {
	return renderWithExplorerProviders(
		<SavedViewsHeader
			source={SavedviewtypesSourceDTO.traces}
			onOpenViews={jest.fn()}
			onToggleViews={jest.fn()}
		/>,
		url,
	);
}

const rowNamed = (name: string): HTMLElement =>
	screen
		.getAllByTestId('saved-views-row')
		.find((row) => row.textContent?.includes(name)) as HTMLElement;

async function openRowMenu(name: string): Promise<void> {
	await screen.findAllByTestId('saved-views-row');
	fireEvent.click(within(rowNamed(name)).getByTestId('saved-views-row-menu'));
}

// Records every check, answered by `isGranted`.
function recordChecks(
	isGranted: (transaction: AuthtypesTransactionDTO) => boolean = (): boolean =>
		true,
): AuthtypesTransactionDTO[] {
	const checks: AuthtypesTransactionDTO[] = [];
	server.use(
		rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
			const payload = (await req.json()) as AuthtypesTransactionDTO[];
			checks.push(...payload);
			return res(ctx.json(authzMockResponse(payload, payload.map(isGranted))));
		}),
	);
	return checks;
}

const readSelectors = (checks: AuthtypesTransactionDTO[]): string[] =>
	checks
		.filter((transaction) => transaction.relation === 'read')
		.map((transaction) => transaction.object.selector);

async function hoverRow(name: string): Promise<HTMLElement> {
	await screen.findAllByTestId('saved-views-row');
	fireEvent.mouseEnter(rowNamed(name));
	return screen.findByTestId(
		'saved-view-hover-card',
		undefined,
		HOVER_CARD_TIMEOUT,
	);
}

// Resolves once the row's check is back, so its state is final.
async function settledRow(testId: string): Promise<HTMLElement> {
	await waitFor(
		() => expect(screen.getByTestId(testId)).not.toHaveAttribute('data-loading'),
		MENU_CHECK_TIMEOUT,
	);
	return screen.getByTestId(testId);
}

describe('SavedViews - AuthZ', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('shows the denied callout instead of the list without list', async () => {
		mockSavedViewsApi([errors]);
		server.use(setupAuthzDeny(SavedViewListPermission));
		renderPanel();

		await expect(
			screen.findByText(/not authorized/i),
		).resolves.toBeInTheDocument();
		expect(screen.queryByTestId('saved-views-list')).toBeNull();
		expect(screen.queryByTestId('saved-views-search')).toBeNull();
	});

	it('runs no read check per row', async () => {
		mockSavedViewsApi([errors, slow]);
		const checks = recordChecks();
		renderPanel();

		// The menu checks go out after any check the rows made on mount.
		await openRowMenu('Errors');
		await settledRow('saved-views-row-menu-item-delete');
		expect(checks.map((transaction) => transaction.relation)).toContain('delete');
		expect(readSelectors(checks)).toStrictEqual(['*']);
	});

	it('opens a view it cannot read, then the header says no access', async () => {
		mockSavedViewsApi([errors]);
		server.use(setupAuthzDeny(buildSavedViewReadPermission(errors.id)));
		const { history } = renderWithExplorerProviders(
			<>
				<SavedViewsHeader
					source={SavedviewtypesSourceDTO.traces}
					onOpenViews={jest.fn()}
					onToggleViews={jest.fn()}
				/>
				<SavedViewsPanel
					source={SavedviewtypesSourceDTO.traces}
					onClose={jest.fn()}
				/>
			</>,
			explorerUrl(PATH, {}),
		);

		await screen.findAllByTestId('saved-views-row');
		const name = within(rowNamed('Errors')).getByTestId('saved-views-row-name');
		expectUsable(name);
		await userEvent.click(name);

		await waitFor(() =>
			expect(urlParam(history, QueryParams.viewKey)).toBe(
				JSON.stringify(errors.id),
			),
		);
		await waitFor(() =>
			expect(screen.getByTestId('saved-views-name')).toHaveTextContent(
				'No view access',
			),
		);
	});

	it('keeps the row menu on a view it cannot read', async () => {
		mockSavedViewsApi([errors]);
		server.use(setupAuthzDeny(buildSavedViewReadPermission(errors.id)));
		renderPanel();

		await openRowMenu('Errors');

		await expect(
			settledRow('saved-views-row-menu-item-delete'),
		).resolves.not.toHaveAttribute('data-disabled');
		await expect(
			settledRow('saved-views-row-menu-item-editDetails'),
		).resolves.not.toHaveAttribute('data-disabled');
		await expect(
			settledRow('saved-views-row-menu-item-copyLink'),
		).resolves.not.toHaveAttribute('data-disabled');
	});

	it('shows the denied callout in the hover card of a view it cannot read, without fetching it', async () => {
		let fetches = 0;
		mockSavedViewsApi([errors]);
		server.use(
			setupAuthzDeny(
				SavedViewReadPermission,
				buildSavedViewReadPermission(errors.id),
			),
			rest.get(`${API}/:id`, (_req, res, ctx) => {
				fetches += 1;
				return res(ctx.json({ status: 'success', data: errors }));
			}),
		);
		renderPanel();

		const card = await hoverRow('Errors');
		await expect(
			within(card).findByText(/not authorized/i),
		).resolves.toBeInTheDocument();
		expect(within(card).queryByTestId('saved-view-hover-card-query')).toBeNull();
		expect(fetches).toBe(0);
	});

	it('skips the read check of the hovered view with read on every view', async () => {
		mockSavedViewsApi([errors]);
		const checks = recordChecks();
		renderPanel();

		const card = await hoverRow('Errors');

		await expect(
			within(card).findByTestId('saved-view-hover-card-query'),
		).resolves.toHaveTextContent('has_error = true');
		expect(readSelectors(checks)).toStrictEqual(['*']);
	});

	it('checks read on the hovered view without read on every view', async () => {
		mockSavedViewsApi([errors]);
		const checks = recordChecks(
			(transaction) =>
				transaction.relation !== 'read' || transaction.object.selector !== '*',
		);
		renderPanel();

		const card = await hoverRow('Errors');

		await expect(
			within(card).findByTestId('saved-view-hover-card-query'),
		).resolves.toHaveTextContent('has_error = true');
		expect(readSelectors(checks)).toStrictEqual(['*', errors.id]);
	});

	it('disables creating without create', async () => {
		mockSavedViewsApi([]);
		server.use(setupAuthzDeny(SavedViewCreatePermission));
		renderPanel();
		renderHeader(explorerUrl(PATH, {}));

		await waitFor(() =>
			expect(screen.getByTestId('saved-views-list-create')).toHaveAttribute(
				'aria-disabled',
				'true',
			),
		);
		await waitFor(() =>
			expect(screen.getByTestId('saved-views-create')).toHaveAttribute(
				'aria-disabled',
				'true',
			),
		);
	});

	it('keeps create disabled while the check is pending', async () => {
		mockSavedViewsApi([]);
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.delay('infinite'))),
		);
		renderHeader(explorerUrl(PATH, {}));

		const create = screen.getByTestId('saved-views-create');
		expect(create).toHaveAttribute('aria-busy', 'true');
		await userEvent.click(create);
		expect(screen.queryByTestId('save-view-name')).toBeNull();
	});

	it('disables edit details without update and delete without delete', async () => {
		mockSavedViewsApi([errors]);
		server.use(
			setupAuthzDeny(
				buildSavedViewUpdatePermission(errors.id),
				buildSavedViewDeletePermission(errors.id),
			),
		);
		renderPanel();

		await openRowMenu('Errors');

		await expect(
			settledRow('saved-views-row-menu-item-editDetails'),
		).resolves.toHaveAttribute('data-disabled');
		await expect(
			settledRow('saved-views-row-menu-item-delete'),
		).resolves.toHaveAttribute('data-disabled');
		await expect(
			settledRow('saved-views-row-menu-item-copyLink'),
		).resolves.not.toHaveAttribute('data-disabled');
	});

	it('disables updating the open view without update, keeping save as new', async () => {
		mockSavedViewsApi([errors]);
		server.use(setupAuthzDeny(buildSavedViewUpdatePermission(errors.id)));
		const { history } = renderHeader(viewUrl(PATH, errors));
		await waitFor(() =>
			expect(screen.getByTestId('saved-views-name')).toHaveTextContent('Errors'),
		);

		history.push(
			explorerUrl(PATH, {
				query: queryWith(DataSource.TRACES, 'has_error = false'),
				panelType: PANEL_TYPES.LIST,
				viewKey: errors.id,
			}),
		);
		await userEvent.click(await screen.findByTestId('saved-views-save-changes'));

		await expect(
			settledRow('saved-views-save-changes-item-update'),
		).resolves.toHaveAttribute('data-disabled');
		await expect(
			settledRow('saved-views-save-changes-item-save-as-new'),
		).resolves.not.toHaveAttribute('data-disabled');
	});

	it('says no access when the check denies read, even if the server returns the view', async () => {
		mockSavedViewsApi([errors]);
		server.use(setupAuthzDeny(buildSavedViewReadPermission(errors.id)));
		renderHeader(viewUrl(PATH, errors));

		await waitFor(() =>
			expect(screen.getByTestId('saved-views-name')).toHaveTextContent(
				'No view access',
			),
		);
		await waitFor(() =>
			expect(screen.getByTestId('saved-views-name')).toHaveAttribute(
				'data-denied-permissions',
			),
		);
		await userEvent.setup().hover(screen.getByTestId('saved-views-name'));

		await waitFor(() =>
			expect(
				screen.queryAllByText(/is not authorized to perform read:saved-view:view-1/)
					.length,
			).toBeGreaterThan(0),
		);
	});

	it('treats a 403 the check allowed as a failed load, showing the server message', async () => {
		const message = 'saved-view:read is missing, ask an admin for it';
		mockSavedViewsApi([errors]);
		server.use(
			rest.get(`${API}/:id`, (_req, res, ctx) =>
				res(
					ctx.status(403),
					ctx.json({ status: 'error', error: { code: 'forbidden', message } }),
				),
			),
		);
		renderHeader(viewUrl(PATH, errors));

		await waitFor(() =>
			expect(screen.getByTestId('saved-views-name')).toHaveTextContent(
				'View failed to load',
			),
		);
		await userEvent.setup().hover(screen.getByTestId('saved-views-name'));

		await waitFor(() =>
			expect(screen.queryAllByText(message).length).toBeGreaterThan(0),
		);
	});

	describe('view name toggle', () => {
		it('toggles the views from the name when list is allowed', async () => {
			mockSavedViewsApi([]);
			renderHeader(explorerUrl(PATH, {}));

			await expect(
				screen.findByTestId('saved-views-name-toggle'),
			).resolves.toBeInTheDocument();
		});

		it('leaves the name plain without list, the All views button says why', async () => {
			mockSavedViewsApi([]);
			server.use(setupAuthzDeny(SavedViewListPermission));
			renderHeader(explorerUrl(PATH, {}));

			await waitFor(() =>
				expect(screen.getByTestId('saved-views-open')).toHaveAttribute(
					'aria-disabled',
					'true',
				),
			);
			expect(
				screen.queryByTestId('saved-views-name-toggle'),
			).not.toBeInTheDocument();
		});

		it('leaves the name plain on a view it cannot read', async () => {
			mockSavedViewsApi([errors]);
			server.use(setupAuthzDeny(buildSavedViewReadPermission(errors.id)));
			renderHeader(viewUrl(PATH, errors));

			await waitFor(() =>
				expect(screen.getByTestId('saved-views-name')).toHaveTextContent(
					'No view access',
				),
			);
			expect(
				screen.queryByTestId('saved-views-name-toggle'),
			).not.toBeInTheDocument();
		});
	});
});
