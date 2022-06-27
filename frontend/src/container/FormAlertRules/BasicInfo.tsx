import { Input, Select } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import React from 'react';
import { AlertDef } from 'types/api/alerts/create';

import {
	FormContainer,
	InputSmall,
	SeveritySelect,
	StepHeading,
} from './styles';

const { TextArea } = Input;
const { Option } = Select;

function BasicInfo({
	alertDef,
	setAlertDef,
}: {
	alertDef: AlertDef;
	setAlertDef: (a: AlertDef) => void;
}): JSX.Element {
	return (
		<>
			<StepHeading> Step 3 - Alert Configuration </StepHeading>
			<FormContainer>
				<FormItem label="Severity" labelAlign="left" name="severity">
					<SeveritySelect
						defaultValue="critical"
						onChange={(e): void => {
							setAlertDef({
								...alertDef,
								severity: e.target.value,
							});
						}}
					>
						<Option value="critical">Critical</Option>
						<Option value="error">Error</Option>
						<Option value="warning">Warning</Option>
						<Option value="info">Info</Option>
					</SeveritySelect>
				</FormItem>

				<FormItem label="Alert Name" labelAlign="left" name="alert">
					<InputSmall
						onChange={(e): void => {
							setAlertDef({
								...alertDef,
								alert: e.target.value,
							});
						}}
					/>
				</FormItem>
				<FormItem label="Alert Description" labelAlign="left" name="description">
					<TextArea
						onChange={(e): void => {
							setAlertDef({
								...alertDef,
								message: e.target.value,
							});
						}}
					/>
				</FormItem>
			</FormContainer>
		</>
	);
}

export default BasicInfo;
