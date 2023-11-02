import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Modal, Tooltip } from 'antd';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useDeleteDashboard } from 'hooks/dashboard/useDeleteDashboard';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';

import { Data } from '../index';
import { TableLinkText } from './styles';

function DeleteButton({ id, createdBy }: Data): JSX.Element {
	const [modal, contextHolder] = Modal.useModal();
	const { role, user } = useSelector<AppState, AppReducer>((state) => state.app);
	const { isDashboardLocked } = useDashboard();
	const isAuthor = user?.email === createdBy;

	const queryClient = useQueryClient();

	const deleteDashboardMutation = useDeleteDashboard(id);

	const openConfirmationDialog = useCallback((): void => {
		modal.confirm({
			title: 'Do you really want to delete this dashboard?',
			icon: <ExclamationCircleOutlined style={{ color: '#e42b35' }} />,
			onOk() {
				deleteDashboardMutation.mutateAsync(undefined, {
					onSuccess: () => {
						queryClient.invalidateQueries([REACT_QUERY_KEY.GET_ALL_DASHBOARDS]);
					},
				});
			},
			okText: 'Delete',
			okButtonProps: { danger: true },
			centered: true,
		});
	}, [modal, deleteDashboardMutation, queryClient]);

	const getDeleteTooltipContent = (): string => {
		if (!isDashboardLocked) {
			if (role === USER_ROLES.ADMIN || isAuthor) {
				return 'Dashboard is locked. Please unlock the dashboard to enable delete.';
			}

			return 'Dashboard is locked. Please contact admin to delete the dashboard';
		}

		return '';
	};

	return (
		<>
			<Tooltip placement="left" title={getDeleteTooltipContent()}>
				<TableLinkText
					type="danger"
					onClick={(): void => {
						if (isDashboardLocked) {
							openConfirmationDialog();
						}
					}}
					disabled={!isDashboardLocked}
				>
					Delete
				</TableLinkText>
			</Tooltip>

			{contextHolder}
		</>
	);
}

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
			}}
		/>
	);
}

export default Wrapper;
