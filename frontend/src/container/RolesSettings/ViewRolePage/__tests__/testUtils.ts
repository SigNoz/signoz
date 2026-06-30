import {
	CoretypesKindDTO,
	CoretypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import * as roleApi from 'api/generated/services/role';
import * as useAuthZModule from 'hooks/useAuthZ/useAuthZ';
import {
	customRoleResponse,
	managedRoleResponse,
} from 'mocks-server/__mockdata__/roles';
import { mockUseAuthZGrantAll } from 'tests/authz-test-utils';

import * as useRolePermissionsModule from '../../hooks/useRolePermissions';

export const CUSTOM_ROLE_ID = '019c24aa-3333-0001-aaaa-111111111111';
export const CUSTOM_ROLE_NAME = 'billing-manager';
export const MANAGED_ROLE_ID = '019c24aa-2248-756f-9833-984f1ab63819';
export const MANAGED_ROLE_NAME = 'signoz-admin';

export function buildViewRoleRoute(roleId: string, roleName: string): string {
	return `/settings/roles/${roleId}?name=${encodeURIComponent(roleName)}`;
}

export const mockPermissionsData = {
	roleId: CUSTOM_ROLE_ID,
	roleName: 'billing-manager',
	roleDescription: 'Custom role for managing billing and invoices.',
	resources: [
		{
			resourceId: 'factor-api-key',
			resourceKind: CoretypesKindDTO['factor-api-key'],
			resourceType: CoretypesTypeDTO.metaresource,
			resourceLabel: 'API Keys',
			actions: {
				create: { scope: 'none', selectedIds: [] },
				read: { scope: 'all', selectedIds: [] },
			},
			availableActions: ['create', 'read', 'update', 'delete', 'list'],
		},
		{
			resourceId: 'role',
			resourceKind: CoretypesKindDTO.role,
			resourceType: CoretypesTypeDTO.role,
			resourceLabel: 'Roles',
			actions: {
				create: { scope: 'none', selectedIds: [] },
				read: { scope: 'none', selectedIds: [] },
			},
			availableActions: [
				'create',
				'read',
				'update',
				'delete',
				'list',
				'attach',
				'detach',
			],
		},
		{
			resourceId: 'serviceaccount',
			resourceKind: CoretypesKindDTO.serviceaccount,
			resourceType: CoretypesTypeDTO.serviceaccount,
			resourceLabel: 'Service Accounts',
			actions: {
				create: { scope: 'none', selectedIds: [] },
				read: { scope: 'none', selectedIds: [] },
			},
			availableActions: [
				'create',
				'read',
				'update',
				'delete',
				'list',
				'attach',
				'detach',
			],
		},
	],
};

export function mockHooksForCustomRole(): void {
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
}

export function mockHooksWithPermissions(permissions: unknown): void {
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
		data: permissions,
		isLoading: false,
		isError: false,
		error: null,
	} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);
}

export function mockHooksForManagedRole(): void {
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
			roleName: 'signoz-admin',
		},
		isLoading: false,
		isError: false,
		error: null,
	} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);
}
