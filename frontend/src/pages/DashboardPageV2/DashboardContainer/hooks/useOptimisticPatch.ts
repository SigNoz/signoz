import { useMutation, useQueryClient } from 'react-query';
import {
	getGetDashboardV2QueryKey,
	patchDashboardV2,
} from 'api/generated/services/dashboard';
import type {
	DashboardtypesJSONPatchOperationDTO,
	GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';
import APIError from 'types/api/error';

import { applyJsonPatch } from '../optimistic/applyJsonPatch';
import { useDashboardStore } from '../store/useDashboardStore';

/** Cached dashboard snapshot, kept for rollback on error. */
interface OptimisticPatchContext {
	previous?: GetDashboardV2200;
}

export interface UseOptimisticPatch {
	patchAsync: (ops: DashboardtypesJSONPatchOperationDTO[]) => Promise<unknown>;
	isPatching: boolean;
	error: Error | null;
}

/**
 * Central optimistic mutation for V2 dashboard spec edits: writes the ops to the
 * cached dashboard immediately, rolls back on error, reconciles on settle.
 * `dashboardId` defaults to the edit-context store; the panel editor passes its own.
 */
export function useOptimisticPatch(
	dashboardIdOverride?: string,
): UseOptimisticPatch {
	const storeDashboardId = useDashboardStore((s) => s.dashboardId);
	const dashboardId = dashboardIdOverride ?? storeDashboardId;
	const queryClient = useQueryClient();
	const queryKey = getGetDashboardV2QueryKey({ id: dashboardId });

	const mutation = useMutation<
		Awaited<ReturnType<typeof patchDashboardV2>>,
		APIError,
		DashboardtypesJSONPatchOperationDTO[],
		OptimisticPatchContext
	>((ops) => patchDashboardV2({ id: dashboardId }, ops), {
		onMutate: async (ops) => {
			await queryClient.cancelQueries(queryKey);
			const previous = queryClient.getQueryData<GetDashboardV2200>(queryKey);
			if (previous?.data) {
				// Ops are rooted at the DTO's `/spec`, so patch `.data`, keep the envelope.
				queryClient.setQueryData<GetDashboardV2200>(queryKey, {
					...previous,
					data: applyJsonPatch(previous.data, ops),
				});
			}
			return { previous };
		},
		onError: (_error, _ops, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKey, context.previous);
			}
		},
		onSettled: () => {
			void queryClient.invalidateQueries(queryKey);
		},
	});

	return {
		patchAsync: mutation.mutateAsync,
		isPatching: mutation.isLoading,
		error: mutation.error ?? null,
	};
}
