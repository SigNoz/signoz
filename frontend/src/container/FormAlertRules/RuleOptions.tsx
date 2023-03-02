import { Form, Select, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
	AlertDef,
	defaultCompareOp,
	defaultEvalWindow,
	defaultMatchType,
} from 'types/api/alerts/def';
import { EQueryType } from 'types/common/dashboard';

import {
	FormContainer,
	InlineSelect,
	StepHeading,
	ThresholdInput,
} from './styles';

const { Option } = Select;
const FormItem = Form.Item;

function RuleOptions({
	alertDef,
	setAlertDef,
	queryCategory,
}: RuleOptionsProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	const handleMatchOptChange = (value: string | unknown): void => {
		const m = (value as string) || alertDef.condition?.matchType;
		setAlertDef({
			...alertDef,
			condition: {
				...alertDef.condition,
				matchType: m,
			},
		});
	};

	const renderCompareOps = (): JSX.Element => (
		<InlineSelect
			defaultValue={defaultCompareOp}
			value={alertDef.condition?.op}
			style={{ minWidth: '120px' }}
			onChange={(value: string | unknown): void => {
				const newOp = (value as string) || '';

				setAlertDef({
					...alertDef,
					condition: {
						...alertDef.condition,
						op: newOp,
					},
				});
			}}
		>
			<Option value="1">{t('option_above')}</Option>
			<Option value="2">{t('option_below')}</Option>
			<Option value="3">{t('option_equal')}</Option>
			<Option value="4">{t('option_notequal')}</Option>
		</InlineSelect>
	);

	const renderThresholdMatchOpts = (): JSX.Element => (
		<InlineSelect
			defaultValue={defaultMatchType}
			style={{ minWidth: '130px' }}
			value={alertDef.condition?.matchType}
			onChange={(value: string | unknown): void => handleMatchOptChange(value)}
		>
			<Option value="1">{t('option_atleastonce')}</Option>
			<Option value="2">{t('option_allthetimes')}</Option>
			<Option value="3">{t('option_onaverage')}</Option>
			<Option value="4">{t('option_intotal')}</Option>
		</InlineSelect>
	);

	const renderPromMatchOpts = (): JSX.Element => (
		<InlineSelect
			defaultValue={defaultMatchType}
			style={{ minWidth: '130px' }}
			value={alertDef.condition?.matchType}
			onChange={(value: string | unknown): void => handleMatchOptChange(value)}
		>
			<Option value="1">{t('option_atleastonce')}</Option>
		</InlineSelect>
	);

	const renderEvalWindows = (): JSX.Element => (
		<InlineSelect
			defaultValue={defaultEvalWindow}
			style={{ minWidth: '120px' }}
			value={alertDef.evalWindow}
			onChange={(value: string | unknown): void => {
				const ew = (value as string) || alertDef.evalWindow;
				setAlertDef({
					...alertDef,
					evalWindow: ew,
				});
			}}
		>
			{' '}
			<Option value="5m0s">{t('option_5min')}</Option>
			<Option value="10m0s">{t('option_10min')}</Option>
			<Option value="15m0s">{t('option_15min')}</Option>
			<Option value="1h0m0s">{t('option_60min')}</Option>
			<Option value="4h0m0s">{t('option_4hours')}</Option>
			<Option value="24h0m0s">{t('option_24hours')}</Option>
		</InlineSelect>
	);

	const renderThresholdRuleOpts = (): JSX.Element => (
		<FormItem>
			<Typography.Text>
				{t('text_condition1')} {renderCompareOps()} {t('text_condition2')}{' '}
				{renderThresholdMatchOpts()} {t('text_condition3')} {renderEvalWindows()}
			</Typography.Text>
		</FormItem>
	);
	const renderPromRuleOptions = (): JSX.Element => (
		<FormItem>
			<Typography.Text>
				{t('text_condition1')} {renderCompareOps()} {t('text_condition2')}{' '}
				{renderPromMatchOpts()}
			</Typography.Text>
		</FormItem>
	);

	return (
		<>
			<StepHeading>{t('alert_form_step2')}</StepHeading>
			<FormContainer>
				{queryCategory === EQueryType.PROM
					? renderPromRuleOptions()
					: renderThresholdRuleOpts()}
				<div style={{ display: 'flex', alignItems: 'center' }}>
					<ThresholdInput
						controls={false}
						addonBefore={t('field_threshold')}
						value={alertDef?.condition?.target}
						onChange={(value: number | unknown): void => {
							setAlertDef({
								...alertDef,
								condition: {
									...alertDef.condition,
									op: alertDef.condition?.op || defaultCompareOp,
									matchType: alertDef.condition?.matchType || defaultMatchType,
									target: value as number,
								},
							});
						}}
					/>
				</div>
			</FormContainer>
		</>
	);
}

interface RuleOptionsProps {
	alertDef: AlertDef;
	setAlertDef: (a: AlertDef) => void;
	queryCategory: EQueryType;
}
export default RuleOptions;
