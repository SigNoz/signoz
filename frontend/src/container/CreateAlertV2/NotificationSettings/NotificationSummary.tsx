import { Tooltip, Typography } from 'antd';
import TextArea from 'antd/lib/input/TextArea';
import { Info } from 'lucide-react';

import { useCreateAlertState } from '../context';

function NotificationSummary(): JSX.Element {
	const {
		notificationSettings,
		setNotificationSettings,
	} = useCreateAlertState();

	return (
		<div className="notification-summary-container">
			<div className="notification-summary-header">
				<div className="notification-summary-header-content">
					<Typography.Text className="notification-summary-header-title">
						Notification Summary
						<Tooltip title="Customize the summary content sent in alert notifications. Template variables like {{alertname}}, {{value}}, and {{threshold}} will be replaced with actual values when the alert fires.">
							<Info size={16} />
						</Tooltip>
					</Typography.Text>
					<Typography.Text className="notification-summary-header-description">
						Custom summary content for alert notifications. Use template variables to
						include dynamic information.
					</Typography.Text>
				</div>
			</div>
			<TextArea
				value={notificationSettings.summary}
				onChange={(e): void =>
					setNotificationSettings({
						type: 'SET_SUMMARY',
						payload: e.target.value,
					})
				}
				placeholder="Enter notification summary..."
			/>
		</div>
	);
}

export default NotificationSummary;
