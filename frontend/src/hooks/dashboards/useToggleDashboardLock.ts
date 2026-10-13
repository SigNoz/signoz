import { useMutation, useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import {
	getGetDashboardV2QueryKey,
	lockDashboardV2,
	unlockDashboardV2,
} from 'api/generated/services/dashboard';
import type { GetDashboardV2200 } from 'api/generated/services/sigNoz.schemas';
import APIError from 'types/api/error';

interface Args {
	dashboardId: string;
	isLocked: boolean;
	/** Called with the new lock state — for analytics and any extra invalidation. */
	onSuccess?: (locked: boolean) => void;
	/** Called on failure — for rolling back optimistic state. */
	onError?: (error: APIError) => void;
}

export interface ToggleDashboardLock {
	toggleLock: () => void;
	isTogglingLock: boolean;
}

/**
 * Toggles a dashboard's lock and patches the detail-page cache, which runs
 * `staleTime: Infinity` + `refetchOnMount: false` and would otherwise show the
 * stale state. Only the flag is patched: a refetch would reload every panel.
 */
export function useToggleDashboardLock({
	dashboardId,
	isLocked,
	onSuccess,
	onError,
}: Args): ToggleDashboardLock {
	const queryClient = useQueryClient();

	const { mutate, isLoading } = useMutation({
		mutationFn: () =>
			isLocked
				? unlockDashboardV2({ id: dashboardId })
				: lockDashboardV2({ id: dashboardId }),
		onSuccess: () => {
			const next = !isLocked;
			toast.success(next ? 'Dashboard locked' : 'Dashboard unlocked');
			const key = getGetDashboardV2QueryKey({ id: dashboardId });
			const cached = queryClient.getQueryData<GetDashboardV2200>(key);
			if (cached) {
				queryClient.setQueryData<GetDashboardV2200>(key, {
					...cached,
					data: { ...cached.data, locked: next },
				});
			}
			onSuccess?.(next);
		},
		onError: (error: APIError) => {
			onError?.(error);
		},
	});

	return { toggleLock: mutate, isTogglingLock: isLoading };
}
