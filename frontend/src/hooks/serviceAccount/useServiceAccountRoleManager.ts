import { useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/sonner';
import {
	getGetServiceAccountRolesQueryKey,
	useCreateServiceAccountRole,
	useDeleteServiceAccountRole,
	useGetServiceAccountRoles,
} from 'api/generated/services/serviceaccount';
import type { AuthtypesRoleDTO } from 'api/generated/services/sigNoz.schemas';

interface UseServiceAccountRoleManagerResult {
	currentRoles: AuthtypesRoleDTO[];
	isLoading: boolean;
	applyDiff: (
		localRoleIds: string[],
		availableRoles: AuthtypesRoleDTO[],
	) => Promise<number>;
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
		): Promise<number> => {
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
			let failureCount = 0;
			allSettled.forEach((result, index) => {
				if (result.status === 'rejected') {
					failureCount += 1;
					const roleName = allRoles[index]?.name ?? 'unknown';
					toast.error(`Failed to update role: ${roleName}`, { duration: 6000 });
				}
			});

			await queryClient.invalidateQueries(
				getGetServiceAccountRolesQueryKey({ id: accountId }),
			);

			return failureCount;
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
