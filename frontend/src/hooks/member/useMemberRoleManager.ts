import { useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import type { AuthtypesGettableRoleDTO } from 'api/generated/services/sigNoz.schemas';
import {
	getGetUserQueryKey,
	useCreateUserRole,
	useDeleteUserRole,
	useGetUser,
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
	currentRoles: AuthtypesGettableRoleDTO[];
	isLoading: boolean;
	applyDiff: (
		localRoleIds: string[],
		availableRoles: AuthtypesGettableRoleDTO[],
	) => Promise<MemberRoleUpdateFailure[]>;
}

export function useMemberRoleManager(
	userId: string,
	enabled: boolean,
): UseMemberRoleManagerResult {
	const queryClient = useQueryClient();

	const { data, isLoading } = useGetUser(
		{ id: userId },
		{ query: { enabled: !!userId && enabled } },
	);

	const userRoles = useMemo(
		() => data?.data?.userRoles ?? [],
		[data?.data?.userRoles],
	);

	const currentRoles = useMemo<AuthtypesGettableRoleDTO[]>(
		() => userRoles.map((userRole) => userRole.role),
		[userRoles],
	);

	// DELETE /api/v2/user_roles/{id} is keyed by the user_role join row, not the role.
	const assignmentIdByRoleId = useMemo(
		() => new Map(userRoles.map((userRole) => [userRole.roleId, userRole.id])),
		[userRoles],
	);

	const { mutateAsync: createUserRole } = useCreateUserRole({
		mutation: { retry: retryOn429 },
	});
	const { mutateAsync: deleteUserRole } = useDeleteUserRole({
		mutation: { retry: retryOn429 },
	});

	const invalidateRoles = useCallback(
		() => queryClient.invalidateQueries(getGetUserQueryKey({ id: userId })),
		[userId, queryClient],
	);

	const applyDiff = useCallback(
		async (
			localRoleIds: string[],
			availableRoles: AuthtypesGettableRoleDTO[],
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
					run: (): ReturnType<typeof createUserRole> =>
						createUserRole({ data: { userId, roleId: role.id ?? '' } }),
				})),
				...removedRoles
					.map((role) => ({
						role,
						assignmentId: assignmentIdByRoleId.get(role.id ?? ''),
					}))
					.filter(
						(
							entry,
						): entry is {
							role: AuthtypesGettableRoleDTO;
							assignmentId: string;
						} => !!entry.assignmentId,
					)
					.map(({ role, assignmentId }) => ({
						role,
						run: (): ReturnType<typeof deleteUserRole> =>
							deleteUserRole({ pathParams: { id: assignmentId } }),
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
		[
			userId,
			currentRoles,
			assignmentIdByRoleId,
			createUserRole,
			deleteUserRole,
			invalidateRoles,
		],
	);

	return { currentRoles, isLoading, applyDiff };
}
