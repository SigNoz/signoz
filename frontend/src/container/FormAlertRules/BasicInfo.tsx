import { Form, Select } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertDef, Labels } from 'types/api/alerts/def';

import ChannelSelect from './ChannelSelect';
import LabelSelect from './labels';
import {
	ChannelSelectTip,
	FormContainer,
	FormItemMedium,
	InputSmall,
	SeveritySelect,
	StepHeading,
	TextareaMedium,
} from './styles';

const { Option } = Select;

interface BasicInfoProps {
	alertDef: AlertDef;
	setAlertDef: (a: AlertDef) => void;
}

function BasicInfo({ alertDef, setAlertDef }: BasicInfoProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	return (
		<>
			<StepHeading> {t('alert_form_step3')} </StepHeading>
			<FormContainer>
				<Form.Item
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
				</Form.Item>

				<Form.Item label={t('field_alert_name')} labelAlign="left" name="alert">
					<InputSmall
						onChange={(e): void => {
							setAlertDef({
								...alertDef,
								alert: e.target.value,
							});
						}}
					/>
				</Form.Item>
				<Form.Item
					label={t('field_alert_desc')}
					labelAlign="left"
					name={['annotations', 'description']}
				>
					<TextareaMedium
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
				</Form.Item>
				<FormItemMedium label={t('field_labels')}>
					<LabelSelect
						onSetLabels={(l: Labels): void => {
							setAlertDef({
								...alertDef,
								labels: {
									...l,
								},
							});
						}}
						initialValues={alertDef.labels}
					/>
				</FormItemMedium>
				<FormItemMedium label="Notification Channels">
					<ChannelSelect
						currentValue={alertDef.preferredChannels}
						onSelectChannels={(s: string[]): void => {
							setAlertDef({
								...alertDef,
								preferredChannels: s,
							});
						}}
					/>
					<ChannelSelectTip> {t('channel_select_tooltip')}</ChannelSelectTip>
				</FormItemMedium>
			</FormContainer>
		</>
	);
}

export default BasicInfo;
