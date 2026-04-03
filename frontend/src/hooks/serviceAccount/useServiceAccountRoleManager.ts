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
	onRetry: () => Promise<void>;
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

	// the retry for these mutations is safe due to being idempotent on backend
	const { mutateAsync: createRole } = useCreateServiceAccountRole();
	const { mutateAsync: deleteRole } = useDeleteServiceAccountRole();

	const invalidateRoles = useCallback(
		() =>
			queryClient.invalidateQueries(
				getGetServiceAccountRolesQueryKey({ id: accountId }),
			),
		[accountId, queryClient],
	);

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

			const allOperations = [
				...addedRoles.map((role) => ({
					role,
					run: (): ReturnType<typeof createRole> =>
						createRole({ pathParams: { id: accountId }, data: { id: role.id } }),
				})),
				...removedRoles.map((role) => ({
					role,
					run: (): ReturnType<typeof deleteRole> =>
						deleteRole({ pathParams: { id: accountId, rid: role.id } }),
				})),
			];

			const results = await Promise.allSettled(
				allOperations.map((op) => op.run()),
			);

			await invalidateRoles();

			const failures: RoleUpdateFailure[] = [];
			results.forEach((result, index) => {
				if (result.status === 'rejected') {
					const { role, run } = allOperations[index];
					failures.push({
						roleName: role.name ?? 'unknown',
						error: result.reason,
						onRetry: async (): Promise<void> => {
							await run();
							await invalidateRoles();
						},
					});
				}
			});

			return failures;
		},
		[accountId, currentRoles, createRole, deleteRole, invalidateRoles],
	);

	return {
		currentRoles,
		isLoading,
		applyDiff,
	};
}
