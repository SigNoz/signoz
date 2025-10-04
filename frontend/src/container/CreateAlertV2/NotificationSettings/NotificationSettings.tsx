import './styles.scss';

import { Input, Select, Typography } from 'antd';

import { useCreateAlertState } from '../context';
import {
	RE_NOTIFICATION_CONDITION_OPTIONS,
	RE_NOTIFICATION_TIME_UNIT_OPTIONS,
} from '../context/constants';
import AdvancedOptionItem from '../EvaluationSettings/AdvancedOptionItem';
import Stepper from '../Stepper';
import { showCondensedLayout } from '../utils';
import MultipleNotifications from './MultipleNotifications';
import NotificationMessage from './NotificationMessage';

function NotificationSettings(): JSX.Element {
	const showCondensedLayoutFlag = showCondensedLayout();

	const {
		notificationSettings,
		setNotificationSettings,
	} = useCreateAlertState();

	const repeatNotificationsInput = (
		<div className="repeat-notifications-input">
			<Typography.Text>Every</Typography.Text>
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
				options={RE_NOTIFICATION_TIME_UNIT_OPTIONS}
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
			/>
			<Typography.Text>while</Typography.Text>
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
		</div>
	);

	return (
		<div className="notification-settings-container">
			<Stepper
				stepNumber={showCondensedLayoutFlag ? 3 : 4}
				label="Notification settings"
			/>
			<NotificationMessage />
			<div className="notification-settings-content">
				<MultipleNotifications />
				<AdvancedOptionItem
					title="Repeat notifications"
					description="Send periodic notifications while the alert condition remains active."
					tooltipText="Continue sending periodic notifications while the alert condition persists. Useful for ensuring critical alerts aren't missed during long-running incidents. Configure how often to repeat and under what conditions."
					input={repeatNotificationsInput}
					onToggle={(): void => {
						setNotificationSettings({
							type: 'SET_RE_NOTIFICATION',
							payload: {
								...notificationSettings.reNotification,
								enabled: !notificationSettings.reNotification.enabled,
							},
						});
					}}
					defaultShowInput={notificationSettings.reNotification.enabled}
				/>
			</div>
		</div>
	);
}

export default NotificationSettings;
