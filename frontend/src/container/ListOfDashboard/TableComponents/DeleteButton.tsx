import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useDeleteDashboard } from 'hooks/dashboard/useDeleteDashboard';
import { useCallback } from 'react';
import { useQueryClient } from 'react-query';

import { Data } from '../index';
import { TableLinkText } from './styles';

function DeleteButton({ id }: Data): JSX.Element {
	const [modal, contextHolder] = Modal.useModal();

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

	return (
		<>
			<TableLinkText type="danger" onClick={openConfirmationDialog}>
				Delete
			</TableLinkText>

			{contextHolder}
		</>
	);
}

// This is to avoid the type collision
function Wrapper(props: Data): JSX.Element {
	const { createdBy, description, id, key, lastUpdatedTime, name, tags } = props;

	return (
		<DeleteButton
			{...{
				createdBy,
				description,
				id,
				key,
				lastUpdatedTime,
				name,
				tags,
			}}
		/>
	);
}

export default Wrapper;
