import { useCallback } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import {
	getGetDashboardV2QueryKey,
	// eslint-disable-next-line no-restricted-imports -- this hook is the one sanctioned caller of patchDashboardV2; everything else goes through patchAsync.
	patchDashboardV2,
} from 'api/generated/services/dashboard';
import type {
	DashboardtypesJSONPatchOperationDTO,
	GetDashboardV2200,
} from 'api/generated/services/sigNoz.schemas';
import APIError from 'types/api/error';

import { applyJsonPatch } from '../optimistic/applyJsonPatch';
import { DASHBOARD_LOCKED_REASON } from '../store/slices/editContextSlice';
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
 * cached dashboard immediately, rolls back on error, and reconciles from the PATCH
 * response (which returns the updated dashboard) rather than a follow-up GET — an
 * immediate refetch can read stale, pre-mutation data and flicker the UI back.
 * `dashboardId` defaults to the edit-context store; the panel editor passes its own.
 */
export function useOptimisticPatch(
	dashboardIdOverride?: string,
): UseOptimisticPatch {
	const storeDashboardId = useDashboardStore((s) => s.dashboardId);
	const storeIsEditable = useDashboardStore((s) => s.isEditable);
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
		onSuccess: (response) => {
			queryClient.setQueryData<GetDashboardV2200>(queryKey, (prev) =>
				prev ? { ...prev, data: response.data } : (response as GetDashboardV2200),
			);
		},
	});

	// Defense-in-depth: block edits when the store is warm for this dashboard and it
	// isn't editable. Skipped when the store isn't seeded for this id (panel editor
	// via direct URL), where that surface gates its own save.
	const { mutateAsync } = mutation;
	const patchAsync = useCallback(
		(ops: DashboardtypesJSONPatchOperationDTO[]): Promise<unknown> => {
			if (storeDashboardId === dashboardId && !storeIsEditable) {
				return Promise.reject(new Error(DASHBOARD_LOCKED_REASON));
			}
			return mutateAsync(ops);
		},
		[storeDashboardId, dashboardId, storeIsEditable, mutateAsync],
	);

	return {
		patchAsync,
		isPatching: mutation.isLoading,
		error: mutation.error ?? null,
	};
}
