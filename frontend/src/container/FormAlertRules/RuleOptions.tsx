import { Select, Typography } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import React from 'react';
import { AlertDef } from 'types/api/alerts/def';

import {
	FormContainer,
	InlineSelect,
	StepHeading,
	ThresholdInput,
} from './styles';

const { Option } = Select;

function RuleOptions({
	initialValue,
	ruleType,
	setAlertDef,
}: RuleOptionsProps): JSX.Element {
	if (ruleType === 'prom_rule') {
		return <></>;
	}

	return (
		<>
			<StepHeading> Step 2 - Define Alert Conditions</StepHeading>
			<FormContainer>
				<FormItem>
					<Typography.Text>
						Send a notification when the metric is{' '}
						<InlineSelect
							defaultValue="0"
							value={initialValue.condition?.op}
							onChange={(value: string | unknown): void => {
								const newOp: string = (value as string) || initialValue.condition?.op;
								setAlertDef({
									...initialValue,
									condition: {
										...initialValue.condition,
										op: newOp,
									},
								});
							}}
						>
							<Option value="0">above</Option>
							<Option value="1">below</Option>
						</InlineSelect>{' '}
						the threshold{' '}
						<InlineSelect
							defaultValue="0"
							value={initialValue.condition?.matchType}
							onChange={(value: string | unknown): void => {
								const m: string =
									(value as string) || initialValue.condition?.matchType;
								setAlertDef({
									...initialValue,
									condition: {
										...initialValue.condition,
										matchType: m,
									},
								});
							}}
						>
							{' '}
							<Option value="0">all the times</Option>
							<Option value="1">at least once</Option>
							<Option value="2" disabled>
								on Average
							</Option>
							<Option value="3" disabled>
								in total
							</Option>
						</InlineSelect>{' '}
						during the last{' '}
						<InlineSelect
							defaultValue="5m0s"
							value={initialValue.evalWindow}
							onChange={(value: string | unknown): void => {
								const ew: string = (value as string) || initialValue.evalWindow;
								setAlertDef({
									...initialValue,
									evalWindow: ew,
								});
							}}
						>
							{' '}
							<Option value="5m0s"> 5 mins</Option>
							<Option value="10m0s"> 10 mins</Option>
							<Option value="15m0s"> 15 mins</Option>
							<Option value="60m0s"> 60 mins</Option>
							<Option value="1440m0s"> 24 hours</Option>
						</InlineSelect>
					</Typography.Text>
				</FormItem>
				<FormItem
					label="Alert Threshold"
					labelAlign="left"
					name={['condition', 'target']}
				>
					<ThresholdInput
						type="number"
						onChange={(e): void => {
							const t: number = parseInt(e.target.value, 10);
							setAlertDef({
								...initialValue,
								condition: {
									...initialValue.condition,
									target: t,
								},
							});
						}}
					/>
				</FormItem>
			</FormContainer>
		</>
	);
}

interface RuleOptionsProps {
	initialValue: AlertDef;
	setAlertDef: (a: AlertDef) => void;
	ruleType: 'threshold_rule' | 'prom_rule';
}
export default RuleOptions;
