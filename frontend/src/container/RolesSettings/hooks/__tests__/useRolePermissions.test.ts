import {
	AuthtypesRelationDTO,
	AuthtypesTransactionGroupDTO,
	CoretypesKindDTO,
	CoretypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { AuthZResource, AuthZVerb } from 'hooks/useAuthZ/types';

import {
	ActionConfig,
	PermissionScope,
	ResourcePermissions,
} from '../../types';
import {
	createEmptyRolePermissions,
	transformResourcePermissionsToTransactionGroups,
	transformTransactionGroupsToResourcePermissions,
} from '../useRolePermissions';

const ID_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const ID_B = 'bbbbbbbb-0000-0000-0000-000000000002';

function createResourcePermissions(
	resourceKind: AuthZResource,
	resourceType: CoretypesTypeDTO,
	resourceLabel: string,
	actions: Partial<Record<AuthZVerb, ActionConfig>>,
	availableActions: AuthZVerb[],
): ResourcePermissions {
	return {
		resourceId: resourceKind,
		resourceKind,
		resourceType,
		resourceLabel,
		actions,
		availableActions,
	};
}

describe('transformResourcePermissionsToTransactionGroups', () => {
	it('skips actions with NONE scope', () => {
		const resources: ResourcePermissions[] = [
			createResourcePermissions(
				CoretypesKindDTO['factor-api-key'],
				CoretypesTypeDTO.metaresource,
				'API Keys',
				{
					create: { scope: PermissionScope.NONE, selectedIds: [] },
					read: { scope: PermissionScope.NONE, selectedIds: [] },
				},
				['create', 'read'] as AuthZVerb[],
			),
		];

		const result = transformResourcePermissionsToTransactionGroups(resources);

		expect(result).toHaveLength(0);
	});

	it('transforms ALL scope to wildcard selector', () => {
		const resources: ResourcePermissions[] = [
			createResourcePermissions(
				CoretypesKindDTO['factor-api-key'],
				CoretypesTypeDTO.metaresource,
				'API Keys',
				{
					create: { scope: PermissionScope.ALL, selectedIds: [] },
				},
				['create'] as AuthZVerb[],
			),
		];

		const result = transformResourcePermissionsToTransactionGroups(resources);

		expect(result).toHaveLength(1);
		expect(result[0]).toStrictEqual({
			objectGroup: {
				resource: {
					kind: CoretypesKindDTO['factor-api-key'],
					type: CoretypesTypeDTO.metaresource,
				},
				selectors: ['*'],
			},
			relation: AuthtypesRelationDTO.create,
		});
	});

	it('transforms ONLY_SELECTED scope to specific selectors', () => {
		const resources: ResourcePermissions[] = [
			createResourcePermissions(
				CoretypesKindDTO.role,
				CoretypesTypeDTO.role,
				'Roles',
				{
					read: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [ID_A, ID_B] },
				},
				['read'] as AuthZVerb[],
			),
		];

		const result = transformResourcePermissionsToTransactionGroups(resources);

		expect(result).toHaveLength(1);
		expect(result[0]).toStrictEqual({
			objectGroup: {
				resource: {
					kind: CoretypesKindDTO.role,
					type: CoretypesTypeDTO.role,
				},
				selectors: [ID_A, ID_B],
			},
			relation: AuthtypesRelationDTO.read,
		});
	});

	it('creates separate transaction groups per verb', () => {
		const resources: ResourcePermissions[] = [
			createResourcePermissions(
				CoretypesKindDTO.serviceaccount,
				CoretypesTypeDTO.serviceaccount,
				'Service Accounts',
				{
					create: { scope: PermissionScope.ALL, selectedIds: [] },
					read: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [ID_A] },
					update: { scope: PermissionScope.NONE, selectedIds: [] },
				},
				['create', 'read', 'update'] as AuthZVerb[],
			),
		];

		const result = transformResourcePermissionsToTransactionGroups(resources);

		expect(result).toHaveLength(2);
		expect(
			result.find((t) => t.relation === AuthtypesRelationDTO.create),
		).toStrictEqual({
			objectGroup: {
				resource: {
					kind: CoretypesKindDTO.serviceaccount,
					type: CoretypesTypeDTO.serviceaccount,
				},
				selectors: ['*'],
			},
			relation: AuthtypesRelationDTO.create,
		});
		expect(
			result.find((t) => t.relation === AuthtypesRelationDTO.read),
		).toStrictEqual({
			objectGroup: {
				resource: {
					kind: CoretypesKindDTO.serviceaccount,
					type: CoretypesTypeDTO.serviceaccount,
				},
				selectors: [ID_A],
			},
			relation: AuthtypesRelationDTO.read,
		});
	});

	it('handles multiple resources with different configurations', () => {
		const resources: ResourcePermissions[] = [
			createResourcePermissions(
				CoretypesKindDTO['factor-api-key'],
				CoretypesTypeDTO.metaresource,
				'API Keys',
				{
					delete: { scope: PermissionScope.ALL, selectedIds: [] },
				},
				['delete'] as AuthZVerb[],
			),
			createResourcePermissions(
				CoretypesKindDTO.role,
				CoretypesTypeDTO.role,
				'Roles',
				{
					update: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [ID_B] },
				},
				['update'] as AuthZVerb[],
			),
		];

		const result = transformResourcePermissionsToTransactionGroups(resources);

		expect(result).toHaveLength(2);
		expect(result).toContainEqual({
			objectGroup: {
				resource: {
					kind: CoretypesKindDTO['factor-api-key'],
					type: CoretypesTypeDTO.metaresource,
				},
				selectors: ['*'],
			},
			relation: AuthtypesRelationDTO.delete,
		});
		expect(result).toContainEqual({
			objectGroup: {
				resource: {
					kind: CoretypesKindDTO.role,
					type: CoretypesTypeDTO.role,
				},
				selectors: [ID_B],
			},
			relation: AuthtypesRelationDTO.update,
		});
	});

	it('returns empty array when all actions are NONE', () => {
		const resources: ResourcePermissions[] = [
			createResourcePermissions(
				CoretypesKindDTO['factor-api-key'],
				CoretypesTypeDTO.metaresource,
				'API Keys',
				{
					create: { scope: PermissionScope.NONE, selectedIds: [] },
					read: { scope: PermissionScope.NONE, selectedIds: [] },
				},
				['create', 'read'] as AuthZVerb[],
			),
			createResourcePermissions(
				CoretypesKindDTO.role,
				CoretypesTypeDTO.role,
				'Roles',
				{
					create: { scope: PermissionScope.NONE, selectedIds: [] },
				},
				['create'] as AuthZVerb[],
			),
		];

		const result = transformResourcePermissionsToTransactionGroups(resources);

		expect(result).toHaveLength(0);
	});
});

describe('transformTransactionGroupsToResourcePermissions', () => {
	it('maps wildcard selector to ALL scope', () => {
		const transactionGroups: AuthtypesTransactionGroupDTO[] = [
			{
				objectGroup: {
					resource: {
						kind: CoretypesKindDTO['factor-api-key'],
						type: CoretypesTypeDTO.metaresource,
					},
					selectors: ['*'],
				},
				relation: AuthtypesRelationDTO.read,
			},
		];

		const result =
			transformTransactionGroupsToResourcePermissions(transactionGroups);

		const apiKeyResource = result.find(
			(r) => r.resourceKind === 'factor-api-key',
		);
		expect(apiKeyResource?.actions.read).toStrictEqual({
			scope: PermissionScope.ALL,
			selectedIds: [],
		});
	});

	it('maps specific selectors to ONLY_SELECTED scope', () => {
		const transactionGroups: AuthtypesTransactionGroupDTO[] = [
			{
				objectGroup: {
					resource: {
						kind: CoretypesKindDTO.role,
						type: CoretypesTypeDTO.role,
					},
					selectors: [ID_A, ID_B],
				},
				relation: AuthtypesRelationDTO.update,
			},
		];

		const result =
			transformTransactionGroupsToResourcePermissions(transactionGroups);

		const roleResource = result.find((r) => r.resourceKind === 'role');
		expect(roleResource?.actions.update).toStrictEqual({
			scope: PermissionScope.ONLY_SELECTED,
			selectedIds: [ID_A, ID_B],
		});
	});

	it('defaults missing verbs to NONE scope', () => {
		const transactionGroups: AuthtypesTransactionGroupDTO[] = [
			{
				objectGroup: {
					resource: {
						kind: CoretypesKindDTO['factor-api-key'],
						type: CoretypesTypeDTO.metaresource,
					},
					selectors: ['*'],
				},
				relation: AuthtypesRelationDTO.create,
			},
		];

		const result =
			transformTransactionGroupsToResourcePermissions(transactionGroups);

		const apiKeyResource = result.find(
			(r) => r.resourceKind === 'factor-api-key',
		);
		expect(apiKeyResource?.actions.create).toStrictEqual({
			scope: PermissionScope.ALL,
			selectedIds: [],
		});
		expect(apiKeyResource?.actions.read).toStrictEqual({
			scope: PermissionScope.NONE,
			selectedIds: [],
		});
		expect(apiKeyResource?.actions.list).toStrictEqual({
			scope: PermissionScope.NONE,
			selectedIds: [],
		});
		expect(apiKeyResource?.actions.update).toStrictEqual({
			scope: PermissionScope.NONE,
			selectedIds: [],
		});
		expect(apiKeyResource?.actions.delete).toStrictEqual({
			scope: PermissionScope.NONE,
			selectedIds: [],
		});
	});

	it('returns all resources from RESOURCE_ORDER even with empty transaction groups', () => {
		const result = transformTransactionGroupsToResourcePermissions([]);

		expect(result).toHaveLength(3);
		expect(result.map((r) => r.resourceKind)).toStrictEqual([
			'factor-api-key',
			'role',
			'serviceaccount',
		]);
	});

	it('sets correct resource metadata from permissions config', () => {
		const result = transformTransactionGroupsToResourcePermissions([]);

		const apiKeyResource = result.find(
			(r) => r.resourceKind === 'factor-api-key',
		);
		expect(apiKeyResource).toMatchObject({
			resourceId: 'factor-api-key',
			resourceKind: 'factor-api-key',
			resourceType: CoretypesTypeDTO.metaresource,
			resourceLabel: 'API Keys',
			availableActions: ['create', 'delete', 'list', 'read', 'update'],
		});

		const roleResource = result.find(
			(r) => r.resourceKind === CoretypesKindDTO.role,
		);
		expect(roleResource).toMatchObject({
			resourceId: CoretypesKindDTO.role,
			resourceKind: CoretypesKindDTO.role,
			resourceType: CoretypesTypeDTO.role,
			resourceLabel: 'Roles',
			availableActions: [
				'attach',
				'create',
				'delete',
				'detach',
				'list',
				'read',
				'update',
			],
		});
	});

	it('handles multiple transaction groups for same resource', () => {
		const transactionGroups: AuthtypesTransactionGroupDTO[] = [
			{
				objectGroup: {
					resource: {
						kind: CoretypesKindDTO.role,
						type: CoretypesTypeDTO.role,
					},
					selectors: ['*'],
				},
				relation: AuthtypesRelationDTO.read,
			},
			{
				objectGroup: {
					resource: {
						kind: CoretypesKindDTO.role,
						type: CoretypesTypeDTO.role,
					},
					selectors: [ID_A],
				},
				relation: AuthtypesRelationDTO.update,
			},
		];

		const result =
			transformTransactionGroupsToResourcePermissions(transactionGroups);

		const roleResource = result.find((r) => r.resourceKind === 'role');
		expect(roleResource?.actions.read).toStrictEqual({
			scope: PermissionScope.ALL,
			selectedIds: [],
		});
		expect(roleResource?.actions.update).toStrictEqual({
			scope: PermissionScope.ONLY_SELECTED,
			selectedIds: [ID_A],
		});
	});
});

describe('createEmptyRolePermissions', () => {
	it('creates permissions for all resources in RESOURCE_ORDER', () => {
		const result = createEmptyRolePermissions();

		expect(result).toHaveLength(3);
		expect(result.map((r) => r.resourceKind)).toStrictEqual([
			'factor-api-key',
			'role',
			'serviceaccount',
		]);
	});

	it('sets all actions to NONE scope with empty selectedIds', () => {
		const result = createEmptyRolePermissions();

		for (const resource of result) {
			for (const verb of resource.availableActions) {
				expect(resource.actions[verb]).toStrictEqual({
					scope: PermissionScope.NONE,
					selectedIds: [],
				});
			}
		}
	});

	it('includes correct metadata from permissions config', () => {
		const result = createEmptyRolePermissions();

		const apiKeyResource = result.find(
			(r) => r.resourceKind === 'factor-api-key',
		);
		expect(apiKeyResource).toMatchObject({
			resourceId: 'factor-api-key',
			resourceType: CoretypesTypeDTO.metaresource,
			resourceLabel: 'API Keys',
			availableActions: ['create', 'delete', 'list', 'read', 'update'],
		});
	});
});

describe('round-trip transformation', () => {
	it('transforming to transaction groups and back preserves data', () => {
		const original: ResourcePermissions[] = [
			createResourcePermissions(
				CoretypesKindDTO['factor-api-key'],
				CoretypesTypeDTO.metaresource,
				'API Keys',
				{
					create: { scope: PermissionScope.ALL, selectedIds: [] },
					read: { scope: PermissionScope.ONLY_SELECTED, selectedIds: [ID_A] },
					update: { scope: PermissionScope.NONE, selectedIds: [] },
					delete: { scope: PermissionScope.NONE, selectedIds: [] },
				},
				['create', 'read', 'update', 'delete'] as AuthZVerb[],
			),
			createResourcePermissions(
				CoretypesKindDTO.role,
				CoretypesTypeDTO.role,
				'Roles',
				{
					create: { scope: PermissionScope.NONE, selectedIds: [] },
					read: { scope: PermissionScope.ALL, selectedIds: [] },
					update: {
						scope: PermissionScope.ONLY_SELECTED,
						selectedIds: [ID_A, ID_B],
					},
					delete: { scope: PermissionScope.NONE, selectedIds: [] },
				},
				['create', 'read', 'update', 'delete'] as AuthZVerb[],
			),
			createResourcePermissions(
				CoretypesKindDTO.serviceaccount,
				CoretypesTypeDTO.serviceaccount,
				'Service Accounts',
				{
					create: { scope: PermissionScope.NONE, selectedIds: [] },
					read: { scope: PermissionScope.NONE, selectedIds: [] },
					update: { scope: PermissionScope.NONE, selectedIds: [] },
					delete: { scope: PermissionScope.NONE, selectedIds: [] },
				},
				['create', 'read', 'update', 'delete'] as AuthZVerb[],
			),
		];

		const transactionGroups =
			transformResourcePermissionsToTransactionGroups(original);
		const restored =
			transformTransactionGroupsToResourcePermissions(transactionGroups);

		for (const originalResource of original) {
			const restoredResource = restored.find(
				(r) => r.resourceKind === originalResource.resourceKind,
			);
			expect(restoredResource).toBeDefined();

			for (const verb of originalResource.availableActions) {
				expect(restoredResource?.actions[verb]).toStrictEqual(
					originalResource.actions[verb],
				);
			}
		}
	});
});
