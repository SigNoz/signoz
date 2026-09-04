import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from 'react-query';
import { Button } from '@signozhq/ui/button';
import DisabledReasonTooltip from 'lib/authz/components/DisabledReasonTooltip/DisabledReasonTooltip';
import { Trash2 } from '@signozhq/icons';
import { toast } from '@signozhq/ui/sonner';
import { Divider } from '@signozhq/ui/divider';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import {
	deleteDashboardV2,
	invalidateListDashboardsForUserV2,
} from 'api/generated/services/dashboard';
import { useDeleteConfirm } from 'components/DeleteConfirmModal/useDeleteConfirm';
import { DASHBOARD_NO_DELETE_PERMISSION_REASON } from 'hooks/dashboards/dashboardPermissionReasons';
import { useDashboardPermissions } from 'hooks/dashboards/useDashboardPermissions';
import { DashboardListEvents } from 'pages/DashboardsListPage/constants/events';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import styles from './ActionsPopover.module.scss';

interface Props {
	dashboardId: string;
	dashboardName: string;
	isLocked: boolean;
	// Delete sits below the other actions, so it leads with a divider. When it's
	// the only item (a legacy dashboard), the divider is suppressed.
	showDivider?: boolean;
}

function DeleteActionItem({
	dashboardId,
	dashboardName,
	isLocked,
	showDivider = true,
}: Props): JSX.Element {
	const { t } = useTranslation(['dashboard']);
	const { showErrorModal } = useErrorModal();
	const queryClient = useQueryClient();
	const { contextHolder, confirmDelete } = useDeleteConfirm();

	// Delete is independent of read/update per the authz guide, so it stays usable
	// for someone who holds only `delete`.
	const { canDelete, deletePermission } = useDashboardPermissions(dashboardId);
	const isDenied = !canDelete;
	const isDisabled = isLocked || !canDelete;

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

	// Access before state: the lock only matters to someone who could otherwise
	// delete it.
	const tooltip = ((): string => {
		if (!canDelete) {
			return DASHBOARD_NO_DELETE_PERMISSION_REASON;
		}
		return isLocked
			? t('dashboard:locked_dashboard_delete_tooltip_admin_author')
			: '';
	})();

	return (
		<>
			{showDivider && <Divider />}
			<DisabledReasonTooltip
				reason={tooltip}
				side="left"
				kind={canDelete && isLocked ? 'blocked' : 'denied'}
				asChild
			>
				<span
					className={styles.menuItemWrap}
					data-denied-permissions={isDenied ? deletePermission : undefined}
				>
					<Button
						variant="ghost"
						color="destructive"
						className={styles.menuItem}
						prefix={<Trash2 size={14} />}
						disabled={isDisabled}
						onClick={(e): void => {
							e.preventDefault();
							e.stopPropagation();
							if (!isDisabled) {
								openConfirm();
							}
						}}
						testId="dashboard-action-delete"
					>
						Delete Dashboard
					</Button>
				</span>
			</DisabledReasonTooltip>
			{contextHolder}
		</>
	);
}

export default DeleteActionItem;
