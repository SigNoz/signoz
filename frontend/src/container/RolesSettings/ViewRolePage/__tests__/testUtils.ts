import {
	CoretypesKindDTO,
	CoretypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import * as roleApi from 'api/generated/services/role';
import {
	customRoleResponse,
	managedRoleResponse,
} from 'mocks-server/__mockdata__/roles';
import { server } from 'mocks-server/server';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';

import * as useRolePermissionsModule from '../../hooks/useRolePermissions';

// NOTE: no vi.mock() calls here. Every test file that imports this helper
// registers vi.mock('api/generated/services/role', { spy: true }) and
// vi.mock('../../hooks/useRolePermissions', { spy: true }) itself. A second
// spy:true registration from this helper re-creates the automock under
// jsdom (vite-node SSR) and orphans the spies the test files captured,
// so the mockReturnValue below silently stops applying. Browser mode
// tolerates the duplicate; jsdom does not.

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
	server.use(setupAuthzAdmin());

	vi.mocked(roleApi.useGetRole).mockReturnValue({
		data: customRoleResponse,
		isLoading: false,
		isError: false,
		error: null,
	} as ReturnType<typeof roleApi.useGetRole>);

	vi.mocked(useRolePermissionsModule.useRolePermissions).mockReturnValue({
		data: mockPermissionsData,
		isLoading: false,
		isError: false,
		error: null,
	} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);
}

export function mockHooksWithPermissions(permissions: unknown): void {
	server.use(setupAuthzAdmin());

	vi.mocked(roleApi.useGetRole).mockReturnValue({
		data: customRoleResponse,
		isLoading: false,
		isError: false,
		error: null,
	} as ReturnType<typeof roleApi.useGetRole>);

	vi.mocked(useRolePermissionsModule.useRolePermissions).mockReturnValue({
		data: permissions,
		isLoading: false,
		isError: false,
		error: null,
	} as ReturnType<typeof useRolePermissionsModule.useRolePermissions>);
}

export function mockHooksForManagedRole(): void {
	server.use(setupAuthzAdmin());

	vi.mocked(roleApi.useGetRole).mockReturnValue({
		data: managedRoleResponse,
		isLoading: false,
		isError: false,
		error: null,
	} as ReturnType<typeof roleApi.useGetRole>);

	vi.mocked(useRolePermissionsModule.useRolePermissions).mockReturnValue({
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
