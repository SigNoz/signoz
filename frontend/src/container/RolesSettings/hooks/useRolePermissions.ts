import { useMutation, useQueryClient } from 'react-query';
import { ErrorType } from 'api/generatedAPIInstance';
import type {
	AuthtypesPostableRoleDTO,
	AuthtypesRoleDTO,
	AuthtypesTransactionGroupDTO,
	AuthtypesUpdatableRoleDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	AuthtypesRelationDTO,
	CoretypesKindDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	invalidateGetRole,
	invalidateListRoles,
	useCreateRole,
	useGetRole,
	useUpdateRole,
} from 'api/generated/services/role';
import type { AuthZResource, AuthZVerb } from 'lib/authz/hooks/useAuthZ/types';

import {
	getResourcePanel,
	getResourceType,
	getResourceVerbs,
	RESOURCE_ORDER,
} from '../permissions.config';
import {
	ActionConfig,
	PermissionScope,
	ResourcePermissions,
	RolePermissionsData,
} from '../types';

const WILDCARD_SELECTOR = '*';

/**
 * Converts internal ResourcePermissions[] to API transactionGroups format.
 */
export function transformResourcePermissionsToTransactionGroups(
	resources: ResourcePermissions[],
): AuthtypesTransactionGroupDTO[] {
	const transactionGroups: AuthtypesTransactionGroupDTO[] = [];

	for (const resource of resources) {
		for (const [verbKey, config] of Object.entries(resource.actions)) {
			const verb = verbKey as AuthZVerb;
			const action = config as ActionConfig;

			if (action.scope === PermissionScope.NONE) {
				continue;
			}

			const selectors =
				action.scope === PermissionScope.ALL
					? [WILDCARD_SELECTOR]
					: action.selectedIds;

			transactionGroups.push({
				objectGroup: {
					resource: {
						kind: resource.resourceKind as CoretypesKindDTO,
						type: resource.resourceType,
					},
					selectors,
				},
				relation: verb as unknown as AuthtypesRelationDTO,
			});
		}
	}

	return transactionGroups;
}

/**
 * Converts API transactionGroups format back to internal ResourcePermissions[].
 */
export function transformTransactionGroupsToResourcePermissions(
	transactionGroups: AuthtypesTransactionGroupDTO[],
): ResourcePermissions[] {
	const transactionsByResource = new Map<
		string,
		Map<AuthZVerb, { selectors: string[] }>
	>();

	for (const txnGroup of transactionGroups) {
		const resourceKind = txnGroup.objectGroup.resource.kind as AuthZResource;
		const verb = txnGroup.relation as AuthZVerb;
		const selectors = txnGroup.objectGroup.selectors ?? [];

		let resourceMap = transactionsByResource.get(resourceKind);
		if (!resourceMap) {
			resourceMap = new Map();
			transactionsByResource.set(resourceKind, resourceMap);
		}

		resourceMap.set(verb, { selectors });
	}

	return RESOURCE_ORDER.map((resource) => {
		const verbs = getResourceVerbs(resource);
		const resourceTxns = transactionsByResource.get(resource);
		const actions: Partial<Record<AuthZVerb, ActionConfig>> = {};

		verbs.forEach((verb) => {
			const txn = resourceTxns?.get(verb);

			if (!txn) {
				actions[verb] = { scope: PermissionScope.NONE, selectedIds: [] };
			} else if (
				txn.selectors.length === 1 &&
				txn.selectors[0] === WILDCARD_SELECTOR
			) {
				actions[verb] = { scope: PermissionScope.ALL, selectedIds: [] };
			} else {
				actions[verb] = {
					scope: PermissionScope.ONLY_SELECTED,
					selectedIds: txn.selectors,
				};
			}
		});

		return {
			resourceId: resource,
			resourceKind: resource,
			resourceType: getResourceType(resource),
			resourceLabel: getResourcePanel(resource).label,
			actions,
			availableActions: [...verbs],
		};
	});
}

export function transformApiToRolePermissions(
	role: AuthtypesRoleDTO,
): RolePermissionsData {
	return {
		roleId: role.id,
		roleName: role.name,
		roleDescription: role.description,
		resources: transformTransactionGroupsToResourcePermissions(
			role.transactionGroups ?? [],
		),
	};
}

export function createEmptyRolePermissions(): ResourcePermissions[] {
	return RESOURCE_ORDER.map((resource) => {
		const verbs = getResourceVerbs(resource);
		const actions: Partial<Record<AuthZVerb, ActionConfig>> = {};

		verbs.forEach((verb) => {
			actions[verb] = { scope: PermissionScope.NONE, selectedIds: [] };
		});

		return {
			resourceId: resource,
			resourceKind: resource,
			resourceType: getResourceType(resource),
			resourceLabel: getResourcePanel(resource).label,
			actions,
			availableActions: [...verbs],
		};
	});
}

export function useRolePermissions(
	roleId: string,
	options?: { enabled?: boolean },
): {
	data: RolePermissionsData | undefined;
	isLoading: boolean;
	isError: boolean;
	error: ErrorType<RenderErrorResponseDTO> | null;
} {
	const { data, isLoading, isError, error } = useGetRole(
		{ id: roleId },
		{
			query: {
				enabled: options?.enabled !== false && !!roleId,
				select: (response) => transformApiToRolePermissions(response.data),
			},
		},
	);

	return {
		data,
		isLoading,
		isError,
		error,
	};
}

export interface CreateRolePayload {
	name: string;
	description: string;
	resources: ResourcePermissions[];
}

export function useCreateRolePermissions(): ReturnType<
	typeof useMutation<void, unknown, CreateRolePayload>
> {
	const queryClient = useQueryClient();
	const { mutateAsync: createRoleMutation } = useCreateRole();

	return useMutation(
		async (payload: CreateRolePayload) => {
			const apiPayload: AuthtypesPostableRoleDTO = {
				name: payload.name,
				description: payload.description,
				transactionGroups: transformResourcePermissionsToTransactionGroups(
					payload.resources,
				),
			};

			await createRoleMutation({ data: apiPayload });
		},
		{
			onSuccess: async () => {
				await invalidateListRoles(queryClient);
			},
		},
	);
}

export interface UpdateRolePermissionsPayload {
	roleId: string;
	description: string;
	resources: ResourcePermissions[];
}

export function useUpdateRolePermissions(): ReturnType<
	typeof useMutation<void, unknown, UpdateRolePermissionsPayload>
> {
	const queryClient = useQueryClient();
	const { mutateAsync: updateRoleMutation } = useUpdateRole();

	return useMutation(
		async (payload: UpdateRolePermissionsPayload) => {
			const apiPayload: AuthtypesUpdatableRoleDTO = {
				description: payload.description,
				transactionGroups: transformResourcePermissionsToTransactionGroups(
					payload.resources,
				),
			};

			await updateRoleMutation({
				pathParams: { id: payload.roleId },
				data: apiPayload,
			});
		},
		{
			onSuccess: async (_, variables) => {
				await invalidateGetRole(queryClient, { id: variables.roleId });
				await invalidateListRoles(queryClient);
			},
		},
	);
}
