import { useMutation, useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import logEvent from 'api/common/logEvent';
import {
	getGetDashboardV2QueryKey,
	invalidateListDashboardsForUserV2,
	lockDashboardV2,
	unlockDashboardV2,
} from 'api/generated/services/dashboard';
import type { GetDashboardV2200 } from 'api/generated/services/sigNoz.schemas';
import { DashboardListEvents } from 'pages/DashboardsListPageV2/constants/events';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

export function useLockToggleAction({
	dashboardId,
	isLocked,
}: {
	dashboardId: string;
	isLocked: boolean;
}): { toggleLock: () => void; isTogglingLock: boolean } {
	const queryClient = useQueryClient();
	const { showErrorModal } = useErrorModal();

	const { mutate, isLoading } = useMutation({
		mutationFn: () =>
			isLocked
				? unlockDashboardV2({ id: dashboardId })
				: lockDashboardV2({ id: dashboardId }),
		onSuccess: async () => {
			toast.success(isLocked ? 'Dashboard unlocked' : 'Dashboard locked');
			void logEvent(DashboardListEvents.RowAction, {
				action: isLocked ? 'unlock' : 'lock',
				dashboardId,
			});
			// Patch the detail-page cache too: it uses staleTime:Infinity +
			// refetchOnMount:false, so without this, returning to the dashboard would
			// still show the stale (pre-toggle) lock state.
			const key = getGetDashboardV2QueryKey({ id: dashboardId });
			const cached = queryClient.getQueryData<GetDashboardV2200>(key);
			if (cached) {
				queryClient.setQueryData<GetDashboardV2200>(key, {
					...cached,
					data: { ...cached.data, locked: !isLocked },
				});
			}
			await invalidateListDashboardsForUserV2(queryClient);
		},
		onError: (error: APIError) => {
			showErrorModal(error);
		},
	});

	return { toggleLock: mutate, isTogglingLock: isLoading };
}
