import { useQueryClient } from 'react-query';
import logEvent from 'api/common/logEvent';
import { invalidateListDashboardsForUserV2 } from 'api/generated/services/dashboard';
import {
	type ToggleDashboardLock,
	useToggleDashboardLock,
} from 'hooks/dashboards/useToggleDashboardLock';
import { DashboardListEvents } from 'pages/DashboardsListPage/constants/events';
import { useErrorModal } from 'providers/ErrorModalProvider';

/**
 * The row menu's lock toggle. The call, toast and detail-cache patch are shared
 * with the dashboard toolbar; what belongs to the list is refreshing the rows
 * and logging a row action.
 */
export function useLockToggleAction({
	dashboardId,
	isLocked,
}: {
	dashboardId: string;
	isLocked: boolean;
}): ToggleDashboardLock {
	const queryClient = useQueryClient();
	const { showErrorModal } = useErrorModal();

	return useToggleDashboardLock({
		dashboardId,
		isLocked,
		onSuccess: (locked) => {
			void logEvent(DashboardListEvents.RowAction, {
				action: locked ? 'lock' : 'unlock',
				dashboardId,
			});
			void invalidateListDashboardsForUserV2(queryClient);
		},
		onError: showErrorModal,
	});
}
