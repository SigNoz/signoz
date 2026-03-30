import { useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import {
	getGetServiceAccountRolesQueryKey,
	useCreateServiceAccountRole,
	useDeleteServiceAccountRole,
	useGetServiceAccountRoles,
} from 'api/generated/services/serviceaccount';
import type { AuthtypesRoleDTO } from 'api/generated/services/sigNoz.schemas';

export interface RoleUpdateFailure {
	roleName: string;
	error: unknown;
}

interface UseServiceAccountRoleManagerResult {
	currentRoles: AuthtypesRoleDTO[];
	isLoading: boolean;
	applyDiff: (
		localRoleIds: string[],
		availableRoles: AuthtypesRoleDTO[],
	) => Promise<RoleUpdateFailure[]>;
}

export function useServiceAccountRoleManager(
	accountId: string,
): UseServiceAccountRoleManagerResult {
	const queryClient = useQueryClient();

	const { data, isLoading } = useGetServiceAccountRoles({ id: accountId });

	const currentRoles = useMemo<AuthtypesRoleDTO[]>(() => data?.data ?? [], [
		data?.data,
	]);

	const { mutateAsync: createRole } = useCreateServiceAccountRole();
	const { mutateAsync: deleteRole } = useDeleteServiceAccountRole();

	const applyDiff = useCallback(
		async (
			localRoleIds: string[],
			availableRoles: AuthtypesRoleDTO[],
		): Promise<RoleUpdateFailure[]> => {
			const currentRoleIds = new Set(
				currentRoles.map((r) => r.id).filter(Boolean),
			);
			const desiredRoleIds = new Set(
				localRoleIds.filter((id) => id != null && id !== ''),
			);

			const addedRoles = availableRoles.filter(
				(r) => r.id && desiredRoleIds.has(r.id) && !currentRoleIds.has(r.id),
			);

			const removedRoles = currentRoles.filter(
				(r) => r.id && !desiredRoleIds.has(r.id),
			);

			const addedPromises = addedRoles.map((role) =>
				createRole({
					pathParams: { id: accountId },
					data: { id: role.id },
				}),
			);

			const removedPromises = removedRoles.map((role) =>
				deleteRole({
					pathParams: { id: accountId, rid: role.id },
				}),
			);

			const allSettled = await Promise.allSettled([
				...addedPromises,
				...removedPromises,
			]);

			const allRoles = [...addedRoles, ...removedRoles];
			const failures: RoleUpdateFailure[] = [];
			allSettled.forEach((result, index) => {
				if (result.status === 'rejected') {
					failures.push({
						roleName: allRoles[index]?.name ?? 'unknown',
						error: result.reason,
					});
				}
			});

			await queryClient.invalidateQueries(
				getGetServiceAccountRolesQueryKey({ id: accountId }),
			);

			return failures;
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[accountId, currentRoles, createRole, deleteRole, queryClient],
	);

	return {
		currentRoles,
		isLoading,
		applyDiff,
	};
}
