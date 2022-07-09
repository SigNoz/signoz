import { Input, Select } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertDef, Labels } from 'types/api/alerts/def';
import { EQueryType } from 'types/common/dashboard';

import LabelSelect from './labels';
import {
	FormContainer,
	InputSmall,
	SeveritySelect,
	StepHeading,
} from './styles';

const { TextArea } = Input;
const { Option } = Select;

interface BasicInfoProps {
	alertDef: AlertDef;
	setAlertDef: (a: AlertDef) => void;
	queryCategory: EQueryType;
}

function BasicInfo({
	alertDef,
	setAlertDef,
	queryCategory,
}: BasicInfoProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('rules');

	return (
		<>
			<StepHeading>
				{' '}
				Step {queryCategory === EQueryType.PROM ? 2 : 3} - Alert Configuration{' '}
			</StepHeading>
			<FormContainer>
				<FormItem
					label={t('field_severity')}
					labelAlign="left"
					name={['labels', 'severity']}
				>
					<SeveritySelect
						defaultValue="critical"
						onChange={(value: unknown | string): void => {
							const s = (value as string) || 'critical';
							setAlertDef({
								...alertDef,
								labels: {
									...alertDef.labels,
									severity: s,
								},
							});
						}}
					>
						<Option value="critical">{t('option_critical')}</Option>
						<Option value="error">{t('option_error')}</Option>
						<Option value="warning">{t('option_warning')}</Option>
						<Option value="info">{t('option_info')}</Option>
					</SeveritySelect>
				</FormItem>

				<FormItem label={t('field_alert_name')} labelAlign="left" name="alert">
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
					label={t('field_alert_desc')}
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
				<FormItem label={t('field_labels')}>
					<LabelSelect
						onSetLabels={(l: Labels): void => {
							setAlertDef({
								...alertDef,
								labels: {
									...alertDef.labels,
									...l,
								},
							});
						}}
						initialValues={alertDef.labels}
					/>
				</FormItem>
			</FormContainer>
		</>
	);
}

export default BasicInfo;
