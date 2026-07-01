import { TooltipProvider } from '@signozhq/ui/tooltip';
import userEvent from '@testing-library/user-event';
import * as roleApi from 'api/generated/services/role';
import * as useAuthZModule from 'hooks/useAuthZ/useAuthZ';
import {
	customRoleResponse,
	managedRoleResponse,
} from 'mocks-server/__mockdata__/roles';
import {
	mockUseAuthZDenyAll,
	mockUseAuthZGrantAll,
	mockUseAuthZGrantByPrefix,
} from 'tests/authz-test-utils';
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

const mockUseAuthZGrantReadDeleteDenied = mockUseAuthZGrantByPrefix(
	'read',
	'update',
);
const mockUseAuthZGrantReadUpdateDenied = mockUseAuthZGrantByPrefix(
	'read',
	'delete',
);

describe('ViewRolePage - AuthZ', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('permission denied', () => {
		it('shows permission denied page when read permission denied', async () => {
			jest
				.spyOn(useAuthZModule, 'useAuthZ')
				.mockImplementation(mockUseAuthZDenyAll);

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
		it('enables Update button when update permission granted', () => {
			jest
				.spyOn(useAuthZModule, 'useAuthZ')
				.mockImplementation(mockUseAuthZGrantAll);

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

			expect(screen.getByTestId('save-button')).toBeInTheDocument();
		});

		it('disables Update button when update permission denied', () => {
			jest
				.spyOn(useAuthZModule, 'useAuthZ')
				.mockImplementation(mockUseAuthZGrantReadUpdateDenied);

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

			expect(screen.getByTestId('save-button')).toBeDisabled();
		});

		it('disables Update button when role is managed', () => {
			jest
				.spyOn(useAuthZModule, 'useAuthZ')
				.mockImplementation(mockUseAuthZGrantAll);

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

			expect(screen.getByTestId('save-button')).toBeDisabled();
		});

		it('shows managed role tooltip when update button hovered on managed role', async () => {
			const user = userEvent.setup();

			jest
				.spyOn(useAuthZModule, 'useAuthZ')
				.mockImplementation(mockUseAuthZGrantAll);

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

			const updateButton = screen.getByTestId('save-button');
			await user.hover(updateButton);

			await waitFor(() => {
				expect(screen.getByRole('tooltip')).toHaveTextContent(
					'Managed roles cannot be updated',
				);
			});
		});

		it('shows authorization tooltip when update permission denied', async () => {
			const user = userEvent.setup();

			jest
				.spyOn(useAuthZModule, 'useAuthZ')
				.mockImplementation(mockUseAuthZGrantReadUpdateDenied);

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

			const updateButton = screen.getByTestId('save-button');
			await user.hover(updateButton);

			await waitFor(() => {
				expect(screen.getByRole('tooltip')).toHaveTextContent(
					/You are not authorized to perform/,
				);
			});
		});
	});

	describe('delete button visibility', () => {
		it('disables Delete button when delete permission denied', () => {
			jest
				.spyOn(useAuthZModule, 'useAuthZ')
				.mockImplementation(mockUseAuthZGrantReadDeleteDenied);

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

			expect(screen.getByTestId('delete-button')).toBeDisabled();
		});

		it('enables Delete button when delete permission granted', () => {
			jest
				.spyOn(useAuthZModule, 'useAuthZ')
				.mockImplementation(mockUseAuthZGrantAll);

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

			expect(screen.getByTestId('delete-button')).not.toBeDisabled();
		});

		it('shows permission denied tooltip when delete permission denied', async () => {
			const user = userEvent.setup();

			jest
				.spyOn(useAuthZModule, 'useAuthZ')
				.mockImplementation(mockUseAuthZGrantReadDeleteDenied);

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

			const deleteButton = screen.getByTestId('delete-button');
			await user.hover(deleteButton);

			await waitFor(() => {
				expect(screen.getByRole('tooltip')).toHaveTextContent(
					'You do not have permission to delete this role',
				);
			});
		});

		it('shows managed role tooltip when role is managed', async () => {
			const user = userEvent.setup();

			jest
				.spyOn(useAuthZModule, 'useAuthZ')
				.mockImplementation(mockUseAuthZGrantAll);

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

			const deleteButton = screen.getByTestId('delete-button');
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
			jest.spyOn(useAuthZModule, 'useAuthZ').mockReturnValue({
				isLoading: true,
				isFetching: true,
				error: null,
				permissions: null,
				refetchPermissions: jest.fn(),
			});

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
