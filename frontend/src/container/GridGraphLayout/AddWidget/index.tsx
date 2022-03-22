import { PlusOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import React, { useCallback } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	ToggleAddWidget,
	ToggleAddWidgetProps,
} from 'store/actions/dashboard/toggleAddWidget';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import DashboardReducer from 'types/reducer/dashboards';

import { Button, Container } from './styles';

function AddWidget({ toggleAddWidget }: Props): JSX.Element {
	const { isAddWidget } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const onToggleHandler = useCallback(() => {
		toggleAddWidget(true);
	}, [toggleAddWidget]);

	return (
		<Container>
			{!isAddWidget ? (
				<Button onClick={onToggleHandler} icon={<PlusOutlined />}>
					Add Widgets
				</Button>
			) : (
				<Typography>Click a widget icon to add it here</Typography>
			)}
		</Container>
	);
}

interface DispatchProps {
	toggleAddWidget: (
		props: ToggleAddWidgetProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	toggleAddWidget: bindActionCreators(ToggleAddWidget, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(AddWidget);
