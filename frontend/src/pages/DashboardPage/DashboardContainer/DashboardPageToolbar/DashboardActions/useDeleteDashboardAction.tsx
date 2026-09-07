import { type ReactNode, useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import {
	invalidateListDashboardsForUserV2,
	useDeleteDashboardV2,
} from 'api/generated/services/dashboard';
import { useDeleteConfirm } from 'components/DeleteConfirmModal/useDeleteConfirm';
import ROUTES from 'constants/routes';
import { useDashboardPreferencesStore } from 'hooks/dashboard/useDashboardPreference';
import history from 'lib/history';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import styles from './DashboardActions.module.scss';

interface UseDeleteDashboardActionArgs {
	dashboardId: string;
	dashboardName: string;
	panelCount: number;
}

interface UseDeleteDashboardAction {
	/** Must be rendered in the calling component for the modal to appear. */
	contextHolder: ReactNode;
	confirmDeleteDashboard: () => void;
}

/**
 * Deletes the open dashboard through the v2 endpoint behind the shared
 * destructive confirmation, then drops its local preferences, refreshes the
 * dashboard list cache and sends the user back to the list.
 */
export function useDeleteDashboardAction({
	dashboardId,
	dashboardName,
	panelCount,
}: UseDeleteDashboardActionArgs): UseDeleteDashboardAction {
	const queryClient = useQueryClient();
	const { showErrorModal } = useErrorModal();
	const { contextHolder, confirmDelete } = useDeleteConfirm();
	const removePreferences = useDashboardPreferencesStore(
		(state) => state.removePreferences,
	);

	const { mutate: deleteDashboard } = useDeleteDashboardV2({
		mutation: {
			onSuccess: async (): Promise<void> => {
				void logEvent(DashboardDetailEvents.Deleted, { dashboardId, panelCount });
				removePreferences(dashboardId);
				await invalidateListDashboardsForUserV2(queryClient);
				toast.success('Dashboard deleted successfully');
				history.replace(ROUTES.ALL_DASHBOARD);
			},
			onError: (error: unknown): void => {
				showErrorModal(error as APIError);
			},
		},
	});

	const confirmDeleteDashboard = useCallback((): void => {
		confirmDelete({
			title: (
				<Typography.Title level={5}>
					Are you sure you want to delete the
					<Typography.Text className={styles.deleteName}>
						{' '}
						{dashboardName}{' '}
					</Typography.Text>
					dashboard?
				</Typography.Title>
			),
			content: 'This action cannot be undone.',
			// Keeps the Delete button loading until the mutation settles, then closes.
			onConfirm: () =>
				new Promise<void>((resolve) => {
					deleteDashboard(
						{ pathParams: { id: dashboardId } },
						{ onSettled: () => resolve() },
					);
				}),
		});
	}, [confirmDelete, dashboardName, deleteDashboard, dashboardId]);

	return { contextHolder, confirmDeleteDashboard };
}
