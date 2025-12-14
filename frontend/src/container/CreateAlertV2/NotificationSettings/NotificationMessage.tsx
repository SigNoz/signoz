import { Tooltip, Typography } from 'antd';
import TextArea from 'antd/lib/input/TextArea';
import { Info } from 'lucide-react';

import { useCreateAlertState } from '../context';

function NotificationMessage(): JSX.Element {
	const {
		notificationSettings,
		setNotificationSettings,
	} = useCreateAlertState();

	// const templateVariables = [
	// 	{ variable: '{{alertname}}', description: 'Name of the alert rule' },
	// 	{
	// 		variable: '{{value}}',
	// 		description: 'Current value that triggered the alert',
	// 	},
	// 	{
	// 		variable: '{{threshold}}',
	// 		description: 'Threshold value from alert condition',
	// 	},
	// 	{ variable: '{{unit}}', description: 'Unit of measurement for the metric' },
	// 	{
	// 		variable: '{{severity}}',
	// 		description: 'Alert severity level (Critical, Warning, Info)',
	// 	},
	// 	{
	// 		variable: '{{queryname}}',
	// 		description: 'Name of the query that triggered the alert',
	// 	},
	// 	{
	// 		variable: '{{labels}}',
	// 		description: 'All labels associated with the alert',
	// 	},
	// 	{
	// 		variable: '{{timestamp}}',
	// 		description: 'Timestamp when alert was triggered',
	// 	},
	// ];

	// const templateVariableContent = (
	// 	<div className="template-variable-content">
	// 		<Typography.Text strong>Available Template Variables:</Typography.Text>
	// 		{templateVariables.map((item) => (
	// 			<div className="template-variable-content-item" key={item.variable}>
	// 				<code>{item.variable}</code>
	// 				<Typography.Text>{item.description}</Typography.Text>
	// 			</div>
	// 		))}
	// 	</div>
	// );

	return (
		<div className="notification-message-container">
			<div className="notification-message-header">
				<div className="notification-message-header-content">
					<Typography.Text className="notification-message-header-title">
						Notification Message
						<Tooltip title="Customize the message content sent in alert notifications. Template variables like {{alertname}}, {{value}}, and {{threshold}} will be replaced with actual values when the alert fires.">
							<Info size={16} />
						</Tooltip>
					</Typography.Text>
					<Typography.Text className="notification-message-header-description">
						Custom message content for alert notifications. Use template variables to
						include dynamic information.
					</Typography.Text>
				</div>
				<div className="notification-message-header-actions">
					{/* TODO: Add back when the functionality is implemented */}
					{/* <Popover content={templateVariableContent}>
						<Button type="text">
							<Info size={12} />
							Variables
						</Button>
					</Popover> */}
				</div>
			</div>
			<TextArea
				value={notificationSettings.description}
				onChange={(e): void =>
					setNotificationSettings({
						type: 'SET_DESCRIPTION',
						payload: e.target.value,
					})
				}
				placeholder="Enter notification message..."
			/>
		</div>
	);
}

export default NotificationMessage;
