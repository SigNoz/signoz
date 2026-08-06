import { useMutation } from 'react-query';
import { generatePath } from 'react-router-dom';
import { toast } from '@signozhq/ui/sonner';
import logEvent from 'api/common/logEvent';
import { cloneDashboardV2 } from 'api/generated/services/dashboard';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { DashboardListEvents } from 'pages/DashboardsListPageV2/constants/events';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

/**
 * Clone keeps the source's name/panels/tags as a new unlocked dashboard owned by
 * the caller; open the copy so it can be tweaked right away.
 */
export function useCloneDashboardAction({
	dashboardId,
	dashboardName,
}: {
	dashboardId: string;
	dashboardName: string;
}): { clone: () => void; isCloning: boolean } {
	const { safeNavigate } = useSafeNavigate();
	const { showErrorModal } = useErrorModal();

	const { mutate, isLoading } = useMutation({
		mutationFn: () => cloneDashboardV2({ id: dashboardId }),
		onSuccess: (response) => {
			toast.success(`Duplicated "${dashboardName}"`);
			void logEvent(DashboardListEvents.RowAction, {
				action: 'duplicate',
				dashboardId,
			});
			safeNavigate(
				generatePath(ROUTES.DASHBOARD, { dashboardId: response.data.id }),
			);
		},
		onError: (error: APIError) => {
			showErrorModal(error);
		},
	});

	return { clone: mutate, isCloning: isLoading };
}
