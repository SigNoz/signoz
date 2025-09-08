import { Input, Select, Switch, Typography } from 'antd';

import { useCreateAlertState } from '../context';
import {
	RE_NOTIFICATION_CONDITION_OPTIONS,
	RE_NOTIFICATION_UNIT_OPTIONS,
} from '../context/constants';

function ReNotification(): JSX.Element {
	const {
		notificationSettings,
		setNotificationSettings,
	} = useCreateAlertState();

	return (
		<div className="re-notification-container">
			<div className="advanced-option-item">
				<div className="advanced-option-item-left-content">
					<Typography.Text className="advanced-option-item-title">
						Re-notification
					</Typography.Text>
					<Typography.Text className="advanced-option-item-description">
						Send notifications for the alert status periodically as long as the
						resources have not recovered.
					</Typography.Text>
				</div>
				<div className="advanced-option-item-right-content">
					<Switch
						checked={notificationSettings.reNotification.enabled}
						onChange={(checked): void => {
							setNotificationSettings({
								type: 'SET_RE_NOTIFICATION',
								payload: {
									enabled: checked,
									value: notificationSettings.reNotification.value,
									unit: notificationSettings.reNotification.unit,
									conditions: notificationSettings.reNotification.conditions,
								},
							});
						}}
					/>
				</div>
			</div>
			<div className="border-bottom" />
			<div className="re-notification-condition">
				<Typography.Text>If this alert rule stays in</Typography.Text>
				<Select
					mode="multiple"
					value={notificationSettings.reNotification.conditions || null}
					placeholder="Select conditions"
					disabled={!notificationSettings.reNotification.enabled}
					options={RE_NOTIFICATION_CONDITION_OPTIONS}
					onChange={(value): void => {
						setNotificationSettings({
							type: 'SET_RE_NOTIFICATION',
							payload: {
								enabled: notificationSettings.reNotification.enabled,
								value: notificationSettings.reNotification.value,
								unit: notificationSettings.reNotification.unit,
								conditions: value,
							},
						});
					}}
				/>
				<Typography.Text>re-notify every</Typography.Text>
				<Input.Group>
					<Input
						value={notificationSettings.reNotification.value}
						placeholder="Enter time interval..."
						disabled={!notificationSettings.reNotification.enabled}
						type="number"
						onChange={(e): void => {
							setNotificationSettings({
								type: 'SET_RE_NOTIFICATION',
								payload: {
									enabled: notificationSettings.reNotification.enabled,
									value: parseInt(e.target.value, 10),
									unit: notificationSettings.reNotification.unit,
									conditions: notificationSettings.reNotification.conditions,
								},
							});
						}}
					/>
					<Select
						value={notificationSettings.reNotification.unit || null}
						placeholder="Select unit"
						disabled={!notificationSettings.reNotification.enabled}
						options={RE_NOTIFICATION_UNIT_OPTIONS}
						onChange={(value): void => {
							setNotificationSettings({
								type: 'SET_RE_NOTIFICATION',
								payload: {
									enabled: notificationSettings.reNotification.enabled,
									value: notificationSettings.reNotification.value,
									unit: value,
									conditions: notificationSettings.reNotification.conditions,
								},
							});
						}}
						style={{ width: 200 }}
					/>
				</Input.Group>
			</div>
		</div>
	);
}

export default ReNotification;
