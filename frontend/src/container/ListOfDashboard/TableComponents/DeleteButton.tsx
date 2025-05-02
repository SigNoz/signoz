import './DeleteButton.styles.scss';

import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Modal, Tooltip, Typography } from 'antd';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import { useDeleteDashboard } from 'hooks/dashboard/useDeleteDashboard';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from 'react-query';
import { USER_ROLES } from 'types/roles';

import { Data } from '../DashboardsList';
import { TableLinkText } from './styles';

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
					<span style={{ color: '#e42b35', fontWeight: 500 }}> {name} </span>
					dashboard?
				</Typography.Title>
			),
			icon: <ExclamationCircleOutlined style={{ color: '#e42b35' }} />,
			okText: 'Delete',
			okButtonProps: {
				danger: true,
				onClick: (e) => {
					e.preventDefault();
					e.stopPropagation();
					deleteDashboardMutation.mutateAsync(undefined, {
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
			className: 'delete-modal',
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

	return (
		<>
			<Tooltip placement="left" title={getDeleteTooltipContent()}>
				<TableLinkText
					type="danger"
					onClick={(e): void => {
						e.preventDefault();
						e.stopPropagation();
						if (!isLocked) {
							openConfirmationDialog();
						}
					}}
					className="delete-btn"
					disabled={isLocked || (user.role === USER_ROLES.VIEWER && !isAuthor)}
				>
					<DeleteOutlined /> Delete dashboard
				</TableLinkText>
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
