import { Row } from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import { useNotifications } from 'hooks/useNotifications';
import { map, sortBy } from 'lodash-es';
import { useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { UpdateDashboardVariables } from 'store/actions/dashboard/updatedDashboardVariables';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';

import VariableItem from './VariableItem';

function DashboardVariableSelection({
	updateDashboardVariables,
}: DispatchProps): JSX.Element {
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const [selectedDashboard] = dashboards;
	const {
		data: { variables = {} },
	} = selectedDashboard;

	const [update, setUpdate] = useState<boolean>(false);
	const [lastUpdatedVar, setLastUpdatedVar] = useState<string>('');
	const { notifications } = useNotifications();

	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const onVarChanged = (name: string): void => {
		setLastUpdatedVar(name);
		setUpdate(!update);
	};

	const onValueUpdate = (
		name: string,
		value: IDashboardVariable['selectedValue'],
	): void => {
		const updatedVariablesData = { ...variables };
		updatedVariablesData[name].selectedValue = value;

		if (role !== 'VIEWER') {
			updateDashboardVariables(updatedVariablesData, notifications);
		}

		onVarChanged(name);
	};
	const onAllSelectedUpdate = (
		name: string,
		value: IDashboardVariable['allSelected'],
	): void => {
		const updatedVariablesData = { ...variables };
		updatedVariablesData[name].allSelected = value;

		if (role !== 'VIEWER') {
			updateDashboardVariables(updatedVariablesData, notifications);
		}
		onVarChanged(name);
	};

	return (
		<Row style={{ gap: '1rem' }}>
			{map(sortBy(Object.keys(variables)), (variableName) => (
				<VariableItem
					key={`${variableName}${variables[variableName].modificationUUID}`}
					existingVariables={variables}
					variableData={{
						name: variableName,
						...variables[variableName],
						change: update,
					}}
					onValueUpdate={onValueUpdate as never}
					onAllSelectedUpdate={onAllSelectedUpdate as never}
					lastUpdatedVar={lastUpdatedVar}
				/>
			))}
		</Row>
	);
}

interface DispatchProps {
	updateDashboardVariables: (
		props: Parameters<typeof UpdateDashboardVariables>[0],
		notify: NotificationInstance,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateDashboardVariables: bindActionCreators(
		UpdateDashboardVariables,
		dispatch,
	),
});

export default connect(null, mapDispatchToProps)(DashboardVariableSelection);
