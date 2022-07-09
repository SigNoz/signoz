import { Select, Typography } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import React from 'react';
import { useTranslation } from 'react-i18next';
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
	setAlertDef,
}: RuleOptionsProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('rules');

	return (
		<>
			<StepHeading>{t('text_step2')}</StepHeading>
			<FormContainer>
				<FormItem>
					<Typography.Text>
						{t('text_condition1')}{' '}
						<InlineSelect
							defaultValue="0"
							value={initialValue.condition?.op}
							onChange={(value: string | unknown): void => {
								const newOp = (value as string) || '';

								setAlertDef({
									...initialValue,
									condition: {
										...initialValue.condition,
										op: newOp,
									},
								});
							}}
						>
							<Option value="0">{t('option_above')}</Option>
							<Option value="1">{t('option_below')}</Option>
						</InlineSelect>{' '}
						{t('text_condition2')}{' '}
						<InlineSelect
							defaultValue="0"
							style={{ minWidth: '130px' }}
							value={initialValue.condition?.matchType}
							onChange={(value: string | unknown): void => {
								const m = (value as string) || initialValue.condition?.matchType;
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
							<Option value="0">{t('option_allthetimes')}</Option>
							<Option value="1">{t('option_atleastonce')}</Option>
							<Option value="2">{t('option_onaverage')}</Option>
							<Option value="3">{t('option_intotal')}</Option>
						</InlineSelect>{' '}
						{t('text_condition3')}{' '}
						<InlineSelect
							defaultValue="5m0s"
							style={{ minWidth: '90px' }}
							value={initialValue.evalWindow}
							onChange={(value: string | unknown): void => {
								const ew = (value as string) || initialValue.evalWindow;
								setAlertDef({
									...initialValue,
									evalWindow: ew,
								});
							}}
						>
							{' '}
							<Option value="5m0s">{t('option_5min')}</Option>
							<Option value="10m0s">{t('option_10min')}</Option>
							<Option value="15m0s">{t('option_15min')}</Option>
							<Option value="60m0s">{t('option_60min')}</Option>
							<Option value="1440m0s">{t('option_24hours')}</Option>
						</InlineSelect>
					</Typography.Text>
				</FormItem>
				<FormItem
					label={t('field_threshold')}
					labelAlign="left"
					name={['condition', 'target']}
				>
					<ThresholdInput
						type="number"
						onChange={(e): void => {
							const t = e.target.valueAsNumber;
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
}
export default RuleOptions;
