import { memo } from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip, Typography } from 'antd';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import CustomVariableInput from './CustomVariableInput';
import DynamicVariableInput from './DynamicVariableInput';
import QueryVariableInput from './QueryVariableInput';
import TextboxVariableInput from './TextboxVariableInput';

import './DashboardVariableSelection.styles.scss';

export interface VariableItemProps {
	variableData: IDashboardVariable;
	existingVariables: Record<string, IDashboardVariable>;
	onValueUpdate: (
		name: string,
		id: string,
		value: IDashboardVariable['selectedValue'],
		allSelected: boolean,
		haveCustomValuesSelected?: boolean,
	) => void;
}

function VariableItem({
	variableData,
	onValueUpdate,
	existingVariables,
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
					/>
				)}
				{variableType === 'DYNAMIC' && (
					<DynamicVariableInput
						variableData={variableData}
						onValueUpdate={onValueUpdate}
						existingVariables={existingVariables}
					/>
				)}
			</div>
		</div>
	);
}

export default memo(VariableItem);
