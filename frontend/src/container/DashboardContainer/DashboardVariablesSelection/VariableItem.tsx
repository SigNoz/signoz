import { memo } from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip, Typography } from 'antd';
import { IDependencyData } from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStoreTypes';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import CustomVariableInput from './CustomVariableInput';
import QueryVariableInput from './QueryVariableInput';
import TextboxVariableInput from './TextboxVariableInput';

import './DashboardVariableSelection.styles.scss';

export interface VariableItemProps {
	variableData: IDashboardVariable;
	existingVariables: Record<string, IDashboardVariable>;
	onValueUpdate: (
		name: string,
		id: string,
		arg1: IDashboardVariable['selectedValue'],
		allSelected: boolean,
	) => void;
	variablesToGetUpdated: string[];
	setVariablesToGetUpdated: React.Dispatch<React.SetStateAction<string[]>>;
	dependencyData: IDependencyData | null;
}

function VariableItem({
	variableData,
	onValueUpdate,
	existingVariables,
	variablesToGetUpdated,
	setVariablesToGetUpdated,
	dependencyData,
}: VariableItemProps): JSX.Element {
	const { name, description, type: variableType } = variableData;

	return (
		<div className="variable-item">
			<Typography.Text className="variable-name" ellipsis>
				${name}
				{description && (
					<Tooltip title={description}>
						<InfoCircleOutlined className="info-icon" />
					</Tooltip>
				)}
			</Typography.Text>

			<div className="variable-value">
				{variableType === 'TEXTBOX' && (
					<TextboxVariableInput
						variableData={variableData}
						onValueUpdate={onValueUpdate}
					/>
				)}
				{variableType === 'CUSTOM' && (
					<CustomVariableInput
						variableData={variableData}
						onValueUpdate={onValueUpdate}
					/>
				)}
				{variableType === 'QUERY' && (
					<QueryVariableInput
						variableData={variableData}
						onValueUpdate={onValueUpdate}
						existingVariables={existingVariables}
						variablesToGetUpdated={variablesToGetUpdated}
						setVariablesToGetUpdated={setVariablesToGetUpdated}
						dependencyData={dependencyData}
					/>
				)}
			</div>
		</div>
	);
}

export default memo(VariableItem);
