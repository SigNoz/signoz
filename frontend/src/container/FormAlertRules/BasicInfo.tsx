import { Input, Select } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import React from 'react';
import { AlertDef } from 'types/api/alerts/def';

import {
	FormContainer,
	InputSmall,
	SeveritySelect,
	StepHeading,
} from './styles';
import { QueryType } from './types';

const { TextArea } = Input;
const { Option } = Select;

function BasicInfo({
	alertDef,
	setAlertDef,
	queryCategory,
}: {
	alertDef: AlertDef;
	setAlertDef: (a: AlertDef) => void;
	queryCategory: QueryType;
}): JSX.Element {
	return (
		<>
			<StepHeading>
				{' '}
				Step {queryCategory === 2 ? 2 : 3} - Alert Configuration{' '}
			</StepHeading>
			<FormContainer>
				<FormItem label="Severity" labelAlign="left" name={['labels', 'severity']}>
					<SeveritySelect
						defaultValue="critical"
						onChange={(value: unknown | string): void => {
							setAlertDef({
								...alertDef,
								labels: {
									...alertDef.labels,
									severity: value,
								},
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
				<FormItem
					label="Alert Description"
					labelAlign="left"
					name={['annotations', 'description']}
				>
					<TextArea
						onChange={(e): void => {
							setAlertDef({
								...alertDef,
								annotations: {
									...alertDef.annotations,
									description: e.target.value,
								},
							});
						}}
					/>
				</FormItem>
			</FormContainer>
		</>
	);
}

export default BasicInfo;
