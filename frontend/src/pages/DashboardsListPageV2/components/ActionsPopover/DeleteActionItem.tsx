import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from 'react-query';
import { Modal, Tooltip } from 'antd';
import { Button } from '@signozhq/ui/button';
import { CircleAlert, Trash2 } from '@signozhq/icons';
import { toast } from '@signozhq/ui/sonner';
import { Divider } from '@signozhq/ui/divider';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import {
	deleteDashboardV2,
	invalidateListDashboardsForUserV2,
} from 'api/generated/services/dashboard';
import { DashboardListEvents } from 'pages/DashboardsListPageV2/constants/events';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { USER_ROLES } from 'types/roles';

import styles from './ActionsPopover.module.scss';

interface Props {
	dashboardId: string;
	dashboardName: string;
	createdBy: string;
	isLocked: boolean;
	// Delete sits below the other actions, so it leads with a divider. When it's
	// the only item (a legacy dashboard), the divider is suppressed.
	showDivider?: boolean;
}

function DeleteActionItem({
	dashboardId,
	dashboardName,
	createdBy,
	isLocked,
	showDivider = true,
}: Props): JSX.Element {
	const { t } = useTranslation(['dashboard']);
	const { user } = useAppContext();
	const { showErrorModal } = useErrorModal();
	const queryClient = useQueryClient();
	const [modal, contextHolder] = Modal.useModal();

	const isAuthor = user?.email === createdBy;
	const isDisabled = isLocked || (user.role === USER_ROLES.VIEWER && !isAuthor);

	const { mutate: runDelete } = useMutation({
		mutationFn: () => deleteDashboardV2({ id: dashboardId }),
		onSuccess: async () => {
			toast.success(
				t('dashboard:delete_dashboard_success', { name: dashboardName }),
			);
			void logEvent(DashboardListEvents.RowAction, {
				action: 'delete',
				dashboardId,
			});
			await invalidateListDashboardsForUserV2(queryClient);
		},
		onError: (error: APIError) => {
			showErrorModal(error);
		},
	});

	const openConfirm = useCallback((): void => {
		modal.confirm({
			title: (
				<Typography.Title level={5}>
					Are you sure you want to delete the
					<span style={{ color: 'var(--danger-background)', fontWeight: 500 }}>
						{' '}
						{dashboardName}{' '}
					</span>
					dashboard?
				</Typography.Title>
			),
			icon: (
				<CircleAlert
					style={{ color: 'var(--danger-background)', marginInlineEnd: '12px' }}
					size="3xl"
				/>
			),
			okText: 'Delete',
			okButtonProps: { danger: true },
			// Returning a promise keeps the Delete button in a loading state and blocks
			// re-clicks until the mutation settles, then closes the confirm.
			onOk: () =>
				new Promise<void>((resolve) => {
					runDelete(undefined, { onSettled: () => resolve() });
				}),
			cancelButtonProps: {
				onClick: (e): void => {
					e.stopPropagation();
				},
			},
			centered: true,
		});
	}, [modal, dashboardName, runDelete]);

	const tooltip = ((): string => {
		if (!isLocked) {
			return '';
		}
		if (user.role === USER_ROLES.ADMIN || isAuthor) {
			return t('dashboard:locked_dashboard_delete_tooltip_admin_author');
		}
		return t('dashboard:locked_dashboard_delete_tooltip_editor');
	})();

	return (
		<>
			{showDivider && <Divider />}
			<Tooltip placement="left" title={tooltip}>
				<span className={styles.menuItemWrap}>
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
			</Tooltip>
			{contextHolder}
		</>
	);
}

export default DeleteActionItem;
