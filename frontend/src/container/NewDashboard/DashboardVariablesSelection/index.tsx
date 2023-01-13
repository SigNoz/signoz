import { Row } from 'antd';
import { map, sortBy } from 'lodash-es';
import React, { useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { UpdateDashboardVariables } from 'store/actions/dashboard/updatedDashboardVariables';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
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
	let last: Date = new Date();

	const onVarChanged = (): void => {
		const current: Date = new Date();
		if (((current.getTime()-last.getTime())/1000) > 2) {
			setUpdate((update) => !update);
		}
		last = current
	}

	const onValueUpdate = (
		name: string,
		value: IDashboardVariable['selectedValue'],
	): void => {
		const updatedVariablesData = { ...variables };
		updatedVariablesData[name].selectedValue = value;
		updateDashboardVariables(updatedVariablesData);
		onVarChanged();
	};
	const onAllSelectedUpdate = (
		name: string,
		value: IDashboardVariable['allSelected'],
	): void => {
		const updatedVariablesData = { ...variables };
		updatedVariablesData[name].allSelected = value;
		updateDashboardVariables(updatedVariablesData);
		onVarChanged();
	};



	return (
		<Row style={{ gap: '1rem' }}>
			{map(sortBy(Object.keys(variables)), (variableName) => (
				<VariableItem
					key={`${variableName}${variables[variableName].modificationUUID}`}
					existingVariables={variables}
					variableData={{ name: variableName, ...variables[variableName], change:update  }}
					onValueUpdate={onValueUpdate as never}
					onAllSelectedUpdate={onAllSelectedUpdate as never}
				/>
			))}
		</Row>
	);
}

interface DispatchProps {
	updateDashboardVariables: (
		props: Parameters<typeof UpdateDashboardVariables>[0],
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
