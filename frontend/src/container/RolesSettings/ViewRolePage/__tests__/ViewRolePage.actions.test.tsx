import { Route, Switch } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import * as roleApi from 'api/generated/services/role';
import { render, screen, waitFor, within } from 'tests/test-utils';

import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	CUSTOM_ROLE_ID,
	CUSTOM_ROLE_NAME,
	mockHooksForCustomRole,
} from './testUtils';

describe('ViewRolePage - Actions', () => {
	beforeEach(() => {
		mockHooksForCustomRole();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('navigates to roles list when Cancel clicked', async () => {
		const user = userEvent.setup();

		render(
			<Switch>
				<Route path="/settings/roles/:roleId">
					<ViewRolePage />
				</Route>
				<Route path="/settings/roles">
					<div data-testid="roles-list-target" />
				</Route>
			</Switch>,
			undefined,
			{ initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME) },
		);

		const cancelBtn = screen.getByTestId('cancel-button');
		await user.click(cancelBtn);

		await expect(
			screen.findByTestId('roles-list-target'),
		).resolves.toBeInTheDocument();
	});

	it('navigates to edit page when Update clicked', async () => {
		const user = userEvent.setup();

		render(
			<Switch>
				<Route path="/settings/roles/:roleId/edit">
					<div data-testid="edit-page-target" />
				</Route>
				<Route path="/settings/roles/:roleId">
					<ViewRolePage />
				</Route>
			</Switch>,
			undefined,
			{ initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME) },
		);

		const updateBtn = screen.getByTestId('save-button');
		await user.click(updateBtn);

		await expect(
			screen.findByTestId('edit-page-target'),
		).resolves.toBeInTheDocument();
	});

	it('opens delete modal when Delete clicked', async () => {
		const user = userEvent.setup();

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		const deleteBtn = screen.getByTestId('delete-button');
		await user.click(deleteBtn);

		await expect(
			screen.findByText(/Are you sure you want to delete the role/),
		).resolves.toBeInTheDocument();
	});

	it('calls delete API and redirects on successful delete', async () => {
		const user = userEvent.setup();

		const mockDeleteRole = jest.fn().mockResolvedValue({});
		jest.spyOn(roleApi, 'useDeleteRole').mockReturnValue({
			mutateAsync: mockDeleteRole,
		} as unknown as ReturnType<typeof roleApi.useDeleteRole>);

		render(
			<Switch>
				<Route path="/settings/roles/:roleId">
					<ViewRolePage />
				</Route>
				<Route path="/settings/roles">
					<div data-testid="roles-list-target" />
				</Route>
			</Switch>,
			undefined,
			{ initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME) },
		);

		await user.click(screen.getByTestId('delete-button'));

		await expect(
			screen.findByText(/Are you sure you want to delete the role/),
		).resolves.toBeInTheDocument();

		const modal = screen.getByRole('dialog');
		const modalConfirmBtn = within(modal).getByRole('button', {
			name: /Delete Role/i,
		});
		await user.click(modalConfirmBtn);

		await waitFor(() => {
			expect(mockDeleteRole).toHaveBeenCalledWith({
				pathParams: { id: CUSTOM_ROLE_ID },
			});
		});

		await expect(
			screen.findByTestId('roles-list-target'),
		).resolves.toBeInTheDocument();
	});
});
