import { ReactNode, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import {
	deleteDashboardV2,
	invalidateListDashboardsForUserV2,
} from 'api/generated/services/dashboard';
import { useDeleteConfirm } from 'components/DeleteConfirmModal/useDeleteConfirm';
import { useDashboardPermissions } from 'hooks/dashboards/useDashboardPermissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { DashboardListEvents } from 'pages/DashboardsListPage/constants/events';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import styles from './ActionsPopover.module.scss';

interface DeleteDashboardAction {
	openConfirm: () => void;
	deleteChecks: BrandedPermission[];
	/** The lock only; a missing `delete` is reported by the checks. */
	lockTooltip: string;
	contextHolder: ReactNode;
}

export function useDeleteDashboardAction({
	dashboardId,
	dashboardName,
	isLocked,
	enabled,
}: {
	dashboardId: string;
	dashboardName: string;
	isLocked: boolean;
	enabled: boolean;
}): DeleteDashboardAction {
	const { t } = useTranslation(['dashboard']);
	const { showErrorModal } = useErrorModal();
	const queryClient = useQueryClient();
	const { contextHolder, confirmDelete } = useDeleteConfirm();

	// Guide rule 3: independent of read/update, so `delete` alone is enough.
	const { canDelete, deletePermission } = useDashboardPermissions(dashboardId, {
		enabled,
	});
	const deleteChecks = useMemo(() => [deletePermission], [deletePermission]);

	const { mutate: runDelete } = useMutation({
		mutationFn: () => deleteDashboardV2({ id: dashboardId }),
		onSuccess: async () => {
			void logEvent(DashboardListEvents.RowAction, {
				action: 'delete',
				dashboardId,
			});
			await invalidateListDashboardsForUserV2(queryClient);
			toast.success('Dashboard deleted successfully');
		},
		onError: (error: APIError) => {
			showErrorModal(error);
		},
	});

	const openConfirm = useCallback((): void => {
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
			// Keeps the Delete button loading until the mutation settles, then closes.
			onConfirm: () =>
				new Promise<void>((resolve) => {
					runDelete(undefined, { onSettled: () => resolve() });
				}),
		});
	}, [confirmDelete, dashboardName, runDelete]);

	// Access before state: the lock only matters to someone who could delete.
	const lockTooltip =
		canDelete && isLocked
			? t('dashboard:locked_dashboard_delete_tooltip_admin_author')
			: '';

	return { openConfirm, deleteChecks, lockTooltip, contextHolder };
}
