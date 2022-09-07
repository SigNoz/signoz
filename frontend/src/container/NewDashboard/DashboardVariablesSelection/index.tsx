import { Row, Select, Tag, Typography } from 'antd';
import { map, sortBy } from 'lodash-es';
import React, { Dispatch } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ToggleEditMode } from 'store/actions';
import { UpdateDashboardVariables } from 'store/actions/dashboard/updatedDashboardVariables';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import DashboardReducer from 'types/reducer/dashboards';

import { VariableContainer } from './styles';
import VariableItem from './VariableItem';

const { Option } = Select;
function DashboardVariableSelection({
	updateDashboardVariables,
}: DispatchProps) {
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const [selectedDashboard] = dashboards;
	const {
		data: { variables = {} },
	} = selectedDashboard;

	const onValueUpdate = (name, value) => {
		const updatedVariablesData = { ...variables };
		updatedVariablesData[name].selectedValue = value;
		updateDashboardVariables(updatedVariablesData);
	};
	return (
		<Row style={{ gap: '1rem' }}>
			{map(sortBy(Object.keys(variables)), (variableName) => (
				<VariableItem
					key={`${variableName}${variables[variableName].modificationUUID}`}
					variableData={{ name: variableName, ...variables[variableName] }}
					onValueUpdate={onValueUpdate}
				/>
			))}
		</Row>
	);
}

interface DispatchProps {
	updateDashboardVariables: (
		props: Record<string, IDashboardVariable>,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateDashboardVariables: bindActionCreators(
		UpdateDashboardVariables,
		dispatch,
	),
	toggleEditMode: bindActionCreators(ToggleEditMode, dispatch),
});

export default connect(null, mapDispatchToProps)(DashboardVariableSelection);
