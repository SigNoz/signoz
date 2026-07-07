import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from 'react-query';
import { CircleAlert, Trash2 } from '@signozhq/icons';
import { Button, Modal, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import { useDeleteDashboard } from 'hooks/dashboard/useDeleteDashboard';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { USER_ROLES } from 'types/roles';

import styles from '../DashboardActions.module.scss';
import { Data } from '../DashboardsList';

interface DeleteButtonProps {
	createdBy: string;
	name: string;
	id: string;
	isLocked: boolean;
	routeToListPage?: boolean;
}

export function DeleteButton({
	createdBy,
	name,
	id,
	isLocked,
	routeToListPage,
}: DeleteButtonProps): JSX.Element {
	const [modal, contextHolder] = Modal.useModal();
	const { user } = useAppContext();
	const isAuthor = user?.email === createdBy;

	const queryClient = useQueryClient();

	const { notifications } = useNotifications();

	const { t } = useTranslation(['dashboard']);

	const deleteDashboardMutation = useDeleteDashboard(id);

	const openConfirmationDialog = useCallback((): void => {
		const { destroy } = modal.confirm({
			title: (
				<Typography.Title level={5}>
					Are you sure you want to delete the
					<span style={{ color: 'var(--danger-background)', fontWeight: 500 }}>
						{' '}
						{name}{' '}
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
			okButtonProps: {
				danger: true,
				onClick: (e) => {
					e.preventDefault();
					e.stopPropagation();
					deleteDashboardMutation.mutate(undefined, {
						onSuccess: () => {
							notifications.success({
								message: t('dashboard:delete_dashboard_success', {
									name,
								}),
							});
							queryClient.invalidateQueries([REACT_QUERY_KEY.GET_ALL_DASHBOARDS]);
							if (routeToListPage) {
								history.replace(ROUTES.ALL_DASHBOARD);
							}
							destroy();
						},
					});
				},
			},
			centered: true,
			className: styles.deleteModal,
		});
	}, [
		modal,
		name,
		deleteDashboardMutation,
		notifications,
		t,
		queryClient,
		routeToListPage,
	]);

	const getDeleteTooltipContent = (): string => {
		if (isLocked) {
			if (user.role === USER_ROLES.ADMIN || isAuthor) {
				return t('dashboard:locked_dashboard_delete_tooltip_admin_author');
			}

			return t('dashboard:locked_dashboard_delete_tooltip_editor');
		}

		return '';
	};

	const isDisabled = isLocked || (user.role === USER_ROLES.VIEWER && !isAuthor);

	return (
		<>
			<Tooltip placement="left" title={getDeleteTooltipContent()}>
				<Button
					type="text"
					className={styles.deleteBtn}
					icon={<Trash2 size={12} />}
					disabled={isDisabled}
					onClick={(e): void => {
						e.preventDefault();
						e.stopPropagation();
						if (!isLocked) {
							openConfirmationDialog();
						}
					}}
				>
					Delete Dashboard
				</Button>
			</Tooltip>

			{contextHolder}
		</>
	);
}

DeleteButton.defaultProps = {
	routeToListPage: false,
};

// This is to avoid the type collision
function Wrapper(props: Data): JSX.Element {
	const {
		createdAt,
		description,
		id,
		key,
		lastUpdatedTime,
		name,
		tags,
		createdBy,
		lastUpdatedBy,
		isLocked,
	} = props;

	return (
		<DeleteButton
			{...{
				createdAt,
				description,
				id,
				key,
				lastUpdatedTime,
				name,
				tags,
				createdBy,
				lastUpdatedBy,
				isLocked,
			}}
		/>
	);
}

export default Wrapper;
