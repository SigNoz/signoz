import { useCallback, useMemo } from 'react';
import {
	useCreateServiceAccountRole,
	useDeleteServiceAccountRole,
	useGetServiceAccount,
} from 'api/generated/services/serviceaccount';
import type {
	AuthtypesGettableRoleDTO,
	ServiceaccounttypesServiceAccountRoleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { retryOn429 } from 'utils/errorUtils';

const enum PromiseStatus {
	Rejected = 'rejected',
}

// Stable identity so the memos below do not recompute on every render.
const EMPTY_SERVICE_ACCOUNT_ROLES: ServiceaccounttypesServiceAccountRoleDTO[] =
	[];

export interface RoleUpdateFailure {
	roleName: string;
	error: unknown;
	onRetry: () => Promise<void>;
}

interface UseServiceAccountRoleManagerResult {
	currentRoles: AuthtypesGettableRoleDTO[];
	isLoading: boolean;
	applyDiff: (
		localRoleIds: string[],
		availableRoles: AuthtypesGettableRoleDTO[],
	) => Promise<RoleUpdateFailure[]>;
}

export function useServiceAccountRoleManager(
	accountId: string,
	options?: { enabled?: boolean },
): UseServiceAccountRoleManagerResult {
	const { data, isLoading } = useGetServiceAccount(
		{ id: accountId },
		{ query: { enabled: options?.enabled ?? true } },
	);

	const serviceAccountRoles =
		data?.data?.serviceAccountRoles ?? EMPTY_SERVICE_ACCOUNT_ROLES;

	const currentRoles = useMemo<AuthtypesGettableRoleDTO[]>(
		() =>
			serviceAccountRoles.map((serviceAccountRole) => serviceAccountRole.role),
		[serviceAccountRoles],
	);

	// DELETE /api/v1/service_account_roles/{id} is keyed by the join row, not the role.
	const assignmentIdByRoleId = useMemo(
		() =>
			new Map(
				serviceAccountRoles.map((serviceAccountRole) => [
					serviceAccountRole.roleId,
					serviceAccountRole.id,
				]),
			),
		[serviceAccountRoles],
	);

	// the retry for these mutations is safe due to being idempotent on backend
	const { mutateAsync: createRole } = useCreateServiceAccountRole({
		mutation: { retry: retryOn429 },
	});
	const { mutateAsync: deleteRole } = useDeleteServiceAccountRole({
		mutation: { retry: retryOn429 },
	});

	const applyDiff = useCallback(
		async (
			localRoleIds: string[],
			availableRoles: AuthtypesGettableRoleDTO[],
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
						createRole({
							data: { serviceAccountId: accountId, roleId: role.id ?? '' },
						}),
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
						run: (): ReturnType<typeof deleteRole> =>
							deleteRole({ pathParams: { id: assignmentId } }),
					})),
			];

			const results = await Promise.allSettled(
				allOperations.map((op) => op.run()),
			);

			const failures: RoleUpdateFailure[] = [];
			results.forEach((result, index) => {
				if (result.status === PromiseStatus.Rejected) {
					const { role, run } = allOperations[index];
					failures.push({
						roleName: role.name ?? 'unknown',
						error: result.reason,
						onRetry: async (): Promise<void> => {
							await run();
						},
					});
				}
			});

			return failures;
		},
		[accountId, currentRoles, assignmentIdByRoleId, createRole, deleteRole],
	);

	return {
		currentRoles,
		isLoading,
		applyDiff,
	};
}
