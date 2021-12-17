import { Button, Modal } from 'antd';
import React, { useCallback } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { DeleteDashboard, DeleteDashboardProps } from 'store/actions';
import AppActions from 'types/actions';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Data } from '../index';

const { confirm } = Modal;

const DeleteButton = ({
	deleteDashboard,
	id,
}: DeleteButtonProps): JSX.Element => {
	const openConfirmationDailog = () => {
		confirm({
			title: 'Do you really want to delete this dashboard?',
			icon: <ExclamationCircleOutlined style={{ color: '#e42b35' }} />,
			onOk() {
				onDeleteConfirmation();
			},
			okText: 'Delete',
			okButtonProps: { danger: true },
			centered: true,
		});
	};

	const onDeleteConfirmation = useCallback(() => {
		deleteDashboard({
			uuid: id,
		});
	}, [id, deleteDashboard]);

	return (
		<Button onClick={openConfirmationDailog} danger>
			Delete
		</Button>
	);
};

interface DispatchProps {
	deleteDashboard: ({
		uuid,
	}: DeleteDashboardProps) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	deleteDashboard: bindActionCreators(DeleteDashboard, dispatch),
});

type DeleteButtonProps = Data & DispatchProps;

const WrapperDeleteButton = connect(null, mapDispatchToProps)(DeleteButton);

// This is to avoid the type collision
const Wrapper = (props: Data): JSX.Element => {
	return (
		<WrapperDeleteButton
			{...{
				...props,
			}}
		/>
	);
};

export default Wrapper;
