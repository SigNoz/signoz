import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { DeleteDashboard, DeleteDashboardProps } from 'store/actions';
import AppActions from 'types/actions';

import { Data } from '../index';
import { TableLinkText } from './styles';

const { confirm } = Modal;

function DeleteButton({ deleteDashboard, id }: DeleteButtonProps): JSX.Element {
	const openConfirmationDialog = (): void => {
		confirm({
			title: 'Do you really want to delete this dashboard?',
			icon: <ExclamationCircleOutlined style={{ color: '#e42b35' }} />,
			onOk() {
				deleteDashboard({
					uuid: id,
				});
			},
			okText: 'Delete',
			okButtonProps: { danger: true },
			centered: true,
		});
	};

	return (
		<TableLinkText type="danger" onClick={openConfirmationDialog}>
			Delete
		</TableLinkText>
	);
}

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
function Wrapper(props: Data): JSX.Element {
	const { createdBy, description, id, key, lastUpdatedTime, name, tags } = props;

	return (
		<WrapperDeleteButton
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
