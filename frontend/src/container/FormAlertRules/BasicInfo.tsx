import { Form, Select, Switch } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertDef, Labels } from 'types/api/alerts/def';
import { requireErrorMessage } from 'utils/form/requireErrorMessage';
import { popupContainer } from 'utils/selectPopupContainer';

import ChannelSelect from './ChannelSelect';
import LabelSelect from './labels';
import {
	FormContainer,
	FormItemMedium,
	InputSmall,
	SeveritySelect,
	StepHeading,
	TextareaMedium,
} from './styles';

const { Option } = Select;

interface BasicInfoProps {
	isNewRule: boolean;
	alertDef: AlertDef;
	setAlertDef: (a: AlertDef) => void;
}

function BasicInfo({
	isNewRule,
	alertDef,
	setAlertDef,
}: BasicInfoProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('alerts');

	const [
		shouldBroadCastToAllChannels,
		setShouldBroadCastToAllChannels,
	] = useState(false);

	useEffect(() => {
		const hasPreferredChannels =
			(alertDef.preferredChannels && alertDef.preferredChannels.length > 0) ||
			isNewRule;

		setShouldBroadCastToAllChannels(!hasPreferredChannels);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleBroadcastToAllChannels = (shouldBroadcast: boolean): void => {
		console.log('evshouldBroadcastent', shouldBroadcast);
		setShouldBroadCastToAllChannels(shouldBroadcast);

		setAlertDef({
			...alertDef,
			broadcastToAll: shouldBroadcast,
		});
	};

	console.log('shouldBroadCastToAllChannels', shouldBroadCastToAllChannels);

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
						getPopupContainer={popupContainer}
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

				<Form.Item
					required
					name="alert"
					labelAlign="left"
					label={t('field_alert_name')}
					rules={[
						{ required: true, message: requireErrorMessage(t('field_alert_name')) },
					]}
				>
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

				<FormItemMedium
					name="alert_all_configured_channels"
					label="Alert all the configured channels"
				>
					<Switch
						checked={shouldBroadCastToAllChannels}
						onChange={handleBroadcastToAllChannels}
					/>
				</FormItemMedium>

				{!shouldBroadCastToAllChannels && (
					<FormItemMedium
						label="Notification Channels"
						name="notification_channels"
						required
						rules={[
							{ required: true, message: requireErrorMessage(t('field_alert_name')) },
						]}
					>
						<ChannelSelect
							disabled={shouldBroadCastToAllChannels}
							currentValue={alertDef.preferredChannels}
							onSelectChannels={(preferredChannels): void => {
								setAlertDef({
									...alertDef,
									preferredChannels,
								});
							}}
						/>
					</FormItemMedium>
				)}
			</FormContainer>
		</>
	);
}

export default BasicInfo;
