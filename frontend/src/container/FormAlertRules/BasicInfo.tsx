import './FormAlertRules.styles.scss';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Select, Switch, Tooltip } from 'antd';
import getChannels from 'api/channels/getAll';
import logEvent from 'api/common/logEvent';
import { ALERTS_DATA_SOURCE_MAP } from 'constants/alerts';
import ROUTES from 'constants/routes';
import useComponentPermission from 'hooks/useComponentPermission';
import useFetch from 'hooks/useFetch';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTypes } from 'types/api/alerts/alertTypes';
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
	const { t } = useTranslation('alerts');

	const channels = useFetch(getChannels);
	const { user } = useAppContext();
	const [addNewChannelPermission] = useComponentPermission(
		['add_new_channel'],
		user.role,
	);

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
		setShouldBroadCastToAllChannels(shouldBroadcast);

		setAlertDef({
			...alertDef,
			broadcastToAll: shouldBroadcast,
		});
	};

	const noChannels = channels.payload?.length === 0;
	const handleCreateNewChannels = useCallback(() => {
		logEvent('Alert: Create notification channel button clicked', {
			dataSource: ALERTS_DATA_SOURCE_MAP[alertDef?.alertType as AlertTypes],
			ruleId: isNewRule ? 0 : alertDef?.id,
		});
		window.open(ROUTES.CHANNELS_NEW, '_blank');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const hasLoggedEvent = useRef(false);

	useEffect(() => {
		if (!channels.loading && isNewRule && !hasLoggedEvent.current) {
			logEvent('Alert: New alert creation page visited', {
				dataSource: ALERTS_DATA_SOURCE_MAP[alertDef?.alertType as AlertTypes],
				numberOfChannels: channels?.payload?.length,
			});
			hasLoggedEvent.current = true;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [channels.loading]);

	const refetchChannels = async (): Promise<void> => {
		await channels.refetch();
	};

	return (
		<>
			<StepHeading> {t('alert_form_step4')} </StepHeading>
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
					<Tooltip
						title={
							noChannels
								? 'No channels. Ask an admin to create a notification channel'
								: undefined
						}
						placement="right"
					>
						<Switch
							checked={shouldBroadCastToAllChannels}
							onChange={handleBroadcastToAllChannels}
							disabled={noChannels || !!channels.loading}
							data-testid="alert-broadcast-to-all-channels"
						/>
					</Tooltip>
				</FormItemMedium>

				{!shouldBroadCastToAllChannels && (
					<Tooltip
						title={
							noChannels && !addNewChannelPermission
								? 'No channels. Ask an admin to create a notification channel'
								: undefined
						}
						placement="right"
					>
						<FormItemMedium
							label="Notification Channels"
							name="notification_channels"
							required
							rules={[
								{ required: true, message: requireErrorMessage(t('field_alert_name')) },
							]}
						>
							<ChannelSelect
								onDropdownOpen={refetchChannels}
								disabled={shouldBroadCastToAllChannels}
								currentValue={alertDef.preferredChannels}
								handleCreateNewChannels={handleCreateNewChannels}
								channels={channels}
								onSelectChannels={(preferredChannels): void => {
									setAlertDef({
										...alertDef,
										preferredChannels,
									});
								}}
							/>
						</FormItemMedium>
					</Tooltip>
				)}

				{noChannels && (
					<Tooltip
						title={
							!addNewChannelPermission
								? 'Ask an admin to create a notification channel'
								: undefined
						}
						placement="right"
					>
						<Button
							onClick={handleCreateNewChannels}
							icon={<PlusOutlined />}
							className="create-notification-btn"
							disabled={!addNewChannelPermission}
						>
							Create a notification channel
						</Button>
					</Tooltip>
				)}
			</FormContainer>
		</>
	);
}

export default BasicInfo;
