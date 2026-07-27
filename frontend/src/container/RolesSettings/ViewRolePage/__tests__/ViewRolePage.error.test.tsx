import { Route, Switch } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import * as roleApi from 'api/generated/services/role';
import { customRoleResponse } from 'mocks-server/__mockdata__/roles';
import { server } from 'mocks-server/server';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { render, screen, waitFor } from 'tests/test-utils';

import * as useRolePermissionsModule from '../../hooks/useRolePermissions';
import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	CUSTOM_ROLE_ID,
	CUSTOM_ROLE_NAME,
	mockPermissionsData,
} from './testUtils';

describe('ViewRolePage - Error State', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	it('displays error component when API has error but role data exists', async () => {
		jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
			data: customRoleResponse,
			isLoading: false,
			isError: true,
			error: new Error('Failed to fetch'),
		} as ReturnType<typeof roleApi.useGetRole>);

		jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
			data: mockPermissionsData,
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await waitFor(() => {
			expect(document.querySelector('.error-in-place')).toBeInTheDocument();
		});
	});

	it('displays error state with title when API fails without role data', async () => {
		jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error('Failed to fetch role'),
		} as ReturnType<typeof roleApi.useGetRole>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expect(
			screen.findByText('Failed to load role'),
		).resolves.toBeInTheDocument();
		await waitFor(() => {
			expect(document.querySelector('.error-in-place')).toBeInTheDocument();
		});
	});

	it('shows back button on error state', async () => {
		jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error('Failed to fetch role'),
		} as ReturnType<typeof roleApi.useGetRole>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expect(
			screen.findByTestId('cancel-button'),
		).resolves.toBeInTheDocument();
	});

	it('navigates to roles list when back button clicked on error state', async () => {
		const user = userEvent.setup();

		jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error('Failed to fetch role'),
		} as ReturnType<typeof roleApi.useGetRole>);

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

		const cancelButton = await screen.findByTestId('cancel-button');
		await user.click(cancelButton);

		await expect(
			screen.findByTestId('roles-list-target'),
		).resolves.toBeInTheDocument();
	});
});
