import { Route, Switch } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import * as roleApi from 'api/generated/services/role';
import { customRoleResponse } from 'mocks-server/__mockdata__/roles';
import { server } from 'mocks-server/server';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { render, screen } from 'tests/test-utils-full';

import * as useRolePermissionsModule from '../../hooks/useRolePermissions';
import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	CUSTOM_ROLE_ID,
	CUSTOM_ROLE_NAME,
	mockPermissionsData,
} from './testUtils';

vi.mock('api/generated/services/role', { spy: true });
vi.mock('../../hooks/useRolePermissions', { spy: true });

describe('ViewRolePage - Error State', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		vi.restoreAllMocks();
		server.resetHandlers();
	});

	it('displays error component when API has error but role data exists', async () => {
		vi.mocked(roleApi.useGetRole).mockReturnValue({
			data: customRoleResponse,
			isLoading: false,
			isError: true,
			error: new Error('Failed to fetch'),
		} as ReturnType<typeof roleApi.useGetRole>);

		vi.mocked(useRolePermissionsModule.useRolePermissions).mockReturnValue({
			data: mockPermissionsData,
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		await expect(
			screen.findByTestId('role-error-banner'),
		).resolves.toBeInTheDocument();
	});

	it('displays error state when API fails without role data', async () => {
		vi.mocked(roleApi.useGetRole).mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error('Failed to fetch role'),
		} as ReturnType<typeof roleApi.useGetRole>);

		render(<ViewRolePage />, undefined, {
			initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
		});

		// Error shows in content area after authz check passes
		await expect(
			screen.findByTestId('role-error-banner'),
		).resolves.toBeInTheDocument();
	});

	it('shows back button on error state', async () => {
		vi.mocked(roleApi.useGetRole).mockReturnValue({
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

		vi.mocked(roleApi.useGetRole).mockReturnValue({
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
