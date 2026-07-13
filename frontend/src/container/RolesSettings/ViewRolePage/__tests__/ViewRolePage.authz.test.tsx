import { TooltipProvider } from '@signozhq/ui/tooltip';
import userEvent from '@testing-library/user-event';
import * as roleApi from 'api/generated/services/role';
import {
	customRoleResponse,
	managedRoleResponse,
} from 'mocks-server/__mockdata__/roles';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzDenyAll,
	setupAuthzGrantByPrefix,
} from 'lib/authz/utils/authz-test-utils';
import { render, screen, waitFor } from 'tests/test-utils';

import * as useRolePermissionsModule from '../../hooks/useRolePermissions';
import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	CUSTOM_ROLE_ID,
	CUSTOM_ROLE_NAME,
	MANAGED_ROLE_ID,
	MANAGED_ROLE_NAME,
	mockPermissionsData,
} from './testUtils';

describe('ViewRolePage - AuthZ', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	describe('permission denied', () => {
		it('shows permission denied page when read permission denied', async () => {
			server.use(setupAuthzDenyAll());

			jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
				data: undefined,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof roleApi.useGetRole>);

			render(<ViewRolePage />, undefined, {
				initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
			});

			await expect(
				screen.findByText(/You are not authorized/i),
			).resolves.toBeInTheDocument();
		});
	});

	describe('update button visibility', () => {
		it('enables Update button when update permission granted', async () => {
			server.use(setupAuthzAdmin());

			jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
				data: customRoleResponse,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof roleApi.useGetRole>);

			jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
				data: mockPermissionsData,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

			render(
				<TooltipProvider>
					<ViewRolePage />
				</TooltipProvider>,
				undefined,
				{
					initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
				},
			);

			await expect(
				screen.findByTestId('save-button'),
			).resolves.toBeInTheDocument();
		});

		it('disables Update button when update permission denied', async () => {
			server.use(setupAuthzGrantByPrefix('read', 'delete'));

			jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
				data: customRoleResponse,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof roleApi.useGetRole>);

			jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
				data: mockPermissionsData,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

			render(
				<TooltipProvider>
					<ViewRolePage />
				</TooltipProvider>,
				undefined,
				{
					initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
				},
			);

			await waitFor(() => {
				expect(screen.getByTestId('save-button')).toBeDisabled();
			});
		});

		it('disables Update button when role is managed', async () => {
			server.use(setupAuthzAdmin());

			jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
				data: managedRoleResponse,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof roleApi.useGetRole>);

			jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
				data: {
					...mockPermissionsData,
					roleId: MANAGED_ROLE_ID,
					roleName: MANAGED_ROLE_NAME,
				},
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

			render(
				<TooltipProvider>
					<ViewRolePage />
				</TooltipProvider>,
				undefined,
				{
					initialRoute: buildViewRoleRoute(MANAGED_ROLE_ID, MANAGED_ROLE_NAME),
				},
			);

			await waitFor(() => {
				expect(screen.getByTestId('save-button')).toBeDisabled();
			});
		});

		it('shows managed role tooltip when update button hovered on managed role', async () => {
			const user = userEvent.setup();

			server.use(setupAuthzAdmin());

			jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
				data: managedRoleResponse,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof roleApi.useGetRole>);

			jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
				data: {
					...mockPermissionsData,
					roleId: MANAGED_ROLE_ID,
					roleName: MANAGED_ROLE_NAME,
				},
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

			render(
				<TooltipProvider>
					<ViewRolePage />
				</TooltipProvider>,
				undefined,
				{
					initialRoute: buildViewRoleRoute(MANAGED_ROLE_ID, MANAGED_ROLE_NAME),
				},
			);

			const updateButton = await screen.findByTestId('save-button');
			await user.hover(updateButton);

			await waitFor(() => {
				expect(screen.getByRole('tooltip')).toHaveTextContent(
					'Managed roles cannot be updated',
				);
			});
		});

		it('disables and shows denial attribute when update permission denied', async () => {
			server.use(setupAuthzGrantByPrefix('read', 'delete'));

			jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
				data: customRoleResponse,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof roleApi.useGetRole>);

			jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
				data: mockPermissionsData,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

			render(
				<TooltipProvider>
					<ViewRolePage />
				</TooltipProvider>,
				undefined,
				{
					initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
				},
			);

			await waitFor(() => {
				const updateButton = screen.getByTestId('save-button');
				expect(updateButton).toBeDisabled();
				expect(updateButton).toHaveAttribute('data-denied-permissions');
			});
		});
	});

	describe('delete button visibility', () => {
		it('disables Delete button when delete permission denied', async () => {
			server.use(setupAuthzGrantByPrefix('read', 'update'));

			jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
				data: customRoleResponse,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof roleApi.useGetRole>);

			jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
				data: mockPermissionsData,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

			render(
				<TooltipProvider>
					<ViewRolePage />
				</TooltipProvider>,
				undefined,
				{
					initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
				},
			);

			await waitFor(() => {
				expect(screen.getByTestId('delete-button')).toBeDisabled();
			});
		});

		it('enables Delete button when delete permission granted', async () => {
			server.use(setupAuthzAdmin());

			jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
				data: customRoleResponse,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof roleApi.useGetRole>);

			jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
				data: mockPermissionsData,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

			render(
				<TooltipProvider>
					<ViewRolePage />
				</TooltipProvider>,
				undefined,
				{
					initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
				},
			);

			await waitFor(() => {
				expect(screen.getByTestId('delete-button')).not.toBeDisabled();
			});
		});

		it('disables and shows denial attribute when delete permission denied', async () => {
			server.use(setupAuthzGrantByPrefix('read', 'update'));

			jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
				data: customRoleResponse,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof roleApi.useGetRole>);

			jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
				data: mockPermissionsData,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

			render(
				<TooltipProvider>
					<ViewRolePage />
				</TooltipProvider>,
				undefined,
				{
					initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
				},
			);

			await waitFor(() => {
				const deleteButton = screen.getByTestId('delete-button');
				expect(deleteButton).toBeDisabled();
				expect(deleteButton).toHaveAttribute('data-denied-permissions');
			});
		});

		it('shows managed role tooltip when role is managed', async () => {
			const user = userEvent.setup();

			server.use(setupAuthzAdmin());

			jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
				data: managedRoleResponse,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof roleApi.useGetRole>);

			jest.spyOn(useRolePermissionsModule, 'useRolePermissions').mockReturnValue({
				data: {
					...mockPermissionsData,
					roleId: MANAGED_ROLE_ID,
					roleName: MANAGED_ROLE_NAME,
				},
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);

			render(
				<TooltipProvider>
					<ViewRolePage />
				</TooltipProvider>,
				undefined,
				{
					initialRoute: buildViewRoleRoute(MANAGED_ROLE_ID, MANAGED_ROLE_NAME),
				},
			);

			const deleteButton = await screen.findByTestId('delete-button');
			await user.hover(deleteButton);

			await waitFor(() => {
				expect(screen.getByRole('tooltip')).toHaveTextContent(
					'Managed roles cannot be deleted',
				);
			});
		});
	});

	describe('loading state', () => {
		it('shows skeleton while checking permissions', () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.delay('infinite'))),
			);

			jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
				data: undefined,
				isLoading: false,
				isError: false,
				error: null,
			} as ReturnType<typeof roleApi.useGetRole>);

			render(<ViewRolePage />, undefined, {
				initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
			});

			expect(document.querySelector('.ant-skeleton')).toBeInTheDocument();
		});
	});
});
