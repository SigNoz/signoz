import { useCallback, useMemo } from 'react';
import type { AuthtypesRoleDTO } from 'api/generated/services/sigNoz.schemas';
import { useGetUser, useSetRoleByUserID } from 'api/generated/services/users';
import { retryOn429 } from 'utils/errorUtils';

export interface MemberRoleUpdateFailure {
	roleName: string;
	error: unknown;
	onRetry: () => Promise<void>;
}

interface UseMemberRoleManagerResult {
	fetchedRoleIds: string[];
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
	const { data: fetchedUser, isLoading } = useGetUser(
		{ id: userId },
		{ query: { enabled: !!userId && enabled } },
	);

	const currentUserRoles = useMemo(
		() => fetchedUser?.data?.userRoles ?? [],
		[fetchedUser],
	);

	const fetchedRoleIds = useMemo(
		() =>
			currentUserRoles
				.map((ur) => ur.role?.id ?? ur.roleId)
				.filter((id): id is string => Boolean(id)),
		[currentUserRoles],
	);

	const { mutateAsync: setRole } = useSetRoleByUserID({
		mutation: { retry: retryOn429 },
	});

	const applyDiff = useCallback(
		async (
			localRoleIds: string[],
			availableRoles: AuthtypesRoleDTO[],
		): Promise<MemberRoleUpdateFailure[]> => {
			const currentRoleIdSet = new Set(fetchedRoleIds);
			const desiredRoleIdSet = new Set(localRoleIds.filter(Boolean));

			const toAdd = availableRoles.filter(
				(r) => r.id && desiredRoleIdSet.has(r.id) && !currentRoleIdSet.has(r.id),
			);

			/// TODO: re-enable deletes once BE for this is streamlined
			const allOps = [
				...toAdd.map((role) => ({
					roleName: role.name ?? 'unknown',
					run: (): ReturnType<typeof setRole> =>
						setRole({
							pathParams: { id: userId },
							data: { name: role.name ?? '' },
						}),
				})),
			];

			const results = await Promise.allSettled(allOps.map((op) => op.run()));

			const failures: MemberRoleUpdateFailure[] = [];
			results.forEach((result, i) => {
				if (result.status === 'rejected') {
					const { roleName, run } = allOps[i];
					failures.push({ roleName, error: result.reason, onRetry: run });
				}
			});

			return failures;
		},
		[userId, fetchedRoleIds, setRole],
	);

	return { fetchedRoleIds, isLoading, applyDiff };
}
