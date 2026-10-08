import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import {
	buildSavedViewDeletePermission,
	buildSavedViewUpdatePermission,
	SavedViewCreatePermission,
	SavedViewListPermission,
	SavedViewReadPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';
import { setupAuthzDeny } from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { DataSource } from 'types/common/queryBuilder';

import SavedViewsHeader from '../SavedViewsHeader';
import SavedViewsPanel from '../SavedViewsPanel';
import { API, mockSavedViewsApi } from './savedViewsApiMock';
import {
	explorerUrl,
	makeView,
	queryWith,
	renderWithExplorerProviders,
	viewUrl,
} from './savedViewsTestUtils';

const PATH = ROUTES.TRACES_EXPLORER;

const errors = makeView({ id: 'view-1', displayName: 'Errors' });

function renderPanel(url = explorerUrl(PATH, {})): void {
	renderWithExplorerProviders(
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
		/>,
		url,
	);
}

async function openRowMenu(): Promise<void> {
	const row = await screen.findByTestId('saved-views-row');
	await userEvent.click(within(row).getByTestId('saved-views-row-menu'));
}

const menuItem = (name: string): Promise<HTMLElement> =>
	screen.findByRole('menuitem', { name });

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

	it('lists views it cannot read but disables them, with no row menu', async () => {
		mockSavedViewsApi([errors]);
		server.use(setupAuthzDeny(SavedViewReadPermission));
		renderPanel();

		const row = await screen.findByTestId('saved-views-row');
		await waitFor(() =>
			expect(within(row).getByTestId('saved-views-row-name')).toBeDisabled(),
		);
		expect(within(row).queryByTestId('saved-views-row-menu')).toBeNull();
	});

	it('disables creating without create', async () => {
		mockSavedViewsApi([]);
		server.use(setupAuthzDeny(SavedViewCreatePermission));
		renderPanel();
		renderHeader(explorerUrl(PATH, {}));

		await waitFor(() =>
			expect(screen.getByTestId('saved-views-list-create')).toBeDisabled(),
		);
		await waitFor(() =>
			expect(screen.getByTestId('saved-views-create')).toBeDisabled(),
		);
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

		await openRowMenu();

		await waitFor(
			async () =>
				await expect(menuItem('Edit details')).resolves.toHaveAttribute(
					'data-disabled',
				),
		);
		await expect(menuItem('Delete')).resolves.toHaveAttribute('data-disabled');
		await expect(menuItem('Copy link')).resolves.not.toHaveAttribute(
			'data-disabled',
		);
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

		await waitFor(
			async () =>
				await expect(menuItem('Update selected view')).resolves.toHaveAttribute(
					'data-disabled',
				),
		);
		await expect(menuItem('Save as new view')).resolves.not.toHaveAttribute(
			'data-disabled',
		);
	});

	it('says so when the open view cannot be read', async () => {
		mockSavedViewsApi([errors]);
		server.use(
			rest.get(`${API}/:id`, (_req, res, ctx) =>
				res(ctx.status(403), ctx.json({ status: 'error' })),
			),
		);
		renderHeader(viewUrl(PATH, errors));

		await waitFor(() =>
			expect(screen.getByTestId('saved-views-name')).toHaveTextContent(
				'No access to this view',
			),
		);
	});
});
