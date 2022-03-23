import { Button } from 'antd';
import React, { useCallback } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { DeleteDashboard, DeleteDashboardProps } from 'store/actions';
import AppActions from 'types/actions';

import { Data } from '../index';

function DeleteButton({ deleteDashboard, id }: DeleteButtonProps): JSX.Element {
	const onClickHandler = useCallback(() => {
		deleteDashboard({
			uuid: id,
		});
	}, [id, deleteDashboard]);

	return (
		<Button onClick={onClickHandler} type="link">
			Delete
		</Button>
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
	return (
		<WrapperDeleteButton
			{...{
				...props,
			}}
		/>
	);
}

export default Wrapper;
