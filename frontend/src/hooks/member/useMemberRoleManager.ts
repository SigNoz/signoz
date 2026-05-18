import { useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import type { AuthtypesRoleDTO } from 'api/generated/services/sigNoz.schemas';
import {
	getGetRolesByUserIDQueryKey,
	useGetRolesByUserID,
	useRemoveUserRoleByUserIDAndRoleID,
	useSetRoleByUserID,
} from 'api/generated/services/users';
import { retryOn429 } from 'utils/errorUtils';

const enum PromiseStatus {
	Fulfilled = 'fulfilled',
	Rejected = 'rejected',
}

export interface MemberRoleUpdateFailure {
	roleName: string;
	error: unknown;
	onRetry: () => Promise<void>;
}

interface UseMemberRoleManagerResult {
	currentRoles: AuthtypesRoleDTO[];
	isLoading: boolean;
	applyDiff: (
		localRoleIds: string[],
		availableRoles: AuthtypesRoleDTO[],
	) => Promise<MemberRoleUpdateFailure[]>;
}

export function useMemberRoleManager(
	userId: string,
	enabled: boolean,
): UseMemberRoleManagerResult {
	const queryClient = useQueryClient();

	const { data, isLoading } = useGetRolesByUserID(
		{ id: userId },
		{ query: { enabled: !!userId && enabled } },
	);

	const currentRoles = useMemo<AuthtypesRoleDTO[]>(
		() => data?.data ?? [],
		[data?.data],
	);

	const { mutateAsync: setRole } = useSetRoleByUserID({
		mutation: { retry: retryOn429 },
	});
	const { mutateAsync: removeRole } = useRemoveUserRoleByUserIDAndRoleID({
		mutation: { retry: retryOn429 },
	});

	const invalidateRoles = useCallback(
		() =>
			queryClient.invalidateQueries(getGetRolesByUserIDQueryKey({ id: userId })),
		[userId, queryClient],
	);

	const applyDiff = useCallback(
		async (
			localRoleIds: string[],
			availableRoles: AuthtypesRoleDTO[],
		): Promise<MemberRoleUpdateFailure[]> => {
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
					run: (): ReturnType<typeof setRole> =>
						setRole({
							pathParams: { id: userId },
							data: { name: role.name ?? '' },
						}),
				})),
				...removedRoles.map((role) => ({
					role,
					run: (): ReturnType<typeof removeRole> =>
						removeRole({ pathParams: { id: userId, roleId: role.id ?? '' } }),
				})),
			];

			const results = await Promise.allSettled(
				allOperations.map((op) => op.run()),
			);

			const successCount = results.filter(
				(r) => r.status === PromiseStatus.Fulfilled,
			).length;
			if (successCount > 0) {
				await invalidateRoles();
			}

			const failures: MemberRoleUpdateFailure[] = [];
			results.forEach((result, index) => {
				if (result.status === PromiseStatus.Rejected) {
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
		[userId, currentRoles, setRole, removeRole, invalidateRoles],
	);

	return { currentRoles, isLoading, applyDiff };
}
