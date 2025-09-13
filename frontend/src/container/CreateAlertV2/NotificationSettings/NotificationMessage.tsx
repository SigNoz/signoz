import { Typography, Tooltip, Button, Popover } from 'antd';
import TextArea from 'antd/lib/input/TextArea';
import { HelpCircle, Info } from 'lucide-react';

import { useCreateAlertState } from '../context';

function NotificationMessage(): JSX.Element {
	const {
		notificationSettings,
		setNotificationSettings,
	} = useCreateAlertState();

	const templateVariables = [
		{ variable: '{{alertname}}', description: 'Name of the alert rule' },
		{ variable: '{{value}}', description: 'Current value that triggered the alert' },
		{ variable: '{{threshold}}', description: 'Threshold value from alert condition' },
		{ variable: '{{unit}}', description: 'Unit of measurement for the metric' },
		{ variable: '{{severity}}', description: 'Alert severity level (Critical, Warning, Info)' },
		{ variable: '{{queryname}}', description: 'Name of the query that triggered the alert' },
		{ variable: '{{labels}}', description: 'All labels associated with the alert' },
		{ variable: '{{timestamp}}', description: 'Timestamp when alert was triggered' },
	];

	const templateVariableContent = (
		<div style={{ maxWidth: '300px' }}>
			<Typography.Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>
				Available Template Variables:
			</Typography.Text>
			{templateVariables.map((item, index) => (
				<div key={index} style={{ marginBottom: '8px', fontSize: '12px' }}>
					<code style={{ 
						backgroundColor: 'var(--bg-ink-300)', 
						padding: '2px 4px', 
						borderRadius: '2px',
						fontSize: '11px'
					}}>
						{item.variable}
					</code>
					<Typography.Text style={{ fontSize: '11px', color: 'var(--bg-vanilla-400)', marginLeft: '6px' }}>
						{item.description}
					</Typography.Text>
				</div>
			))}
		</div>
	);

	return (
		<div className="re-notification-container">
			<div className="advanced-option-item">
				<div className="advanced-option-item-left-content">
					<div className="advanced-option-item-header">
						<Typography.Text className="advanced-option-item-title">
							Notification Message
						</Typography.Text>
						<Tooltip title="Customize the message content sent in alert notifications. Template variables like {{alertname}}, {{value}}, and {{threshold}} will be replaced with actual values when the alert fires." placement="top">
							<HelpCircle size={14} style={{ color: 'var(--bg-vanilla-400)', cursor: 'help' }} />
						</Tooltip>
					</div>
					<Typography.Text className="advanced-option-item-description">
						Custom message content for alert notifications. Use template variables to include dynamic information.
					</Typography.Text>
				</div>
				<div className="advanced-option-item-right-content">
					<Popover content={templateVariableContent} title="Template Variables" placement="leftTop" trigger="click">
						<Button 
							type="text" 
							size="small" 
							icon={<Info size={14} />}
							style={{ color: 'var(--bg-robin-500)' }}
						>
							Variables
						</Button>
					</Popover>
				</div>
			</div>
			<div className="notification-message-textarea">
				<TextArea
					value={notificationSettings.description}
					onChange={(e): void =>
						setNotificationSettings({
							type: 'SET_DESCRIPTION',
							payload: e.target.value,
						})
					}
					placeholder="Enter notification message... (e.g., Alert {{alertname}} triggered with value {{value}}{{unit}})"
					autoSize={{ minRows: 3, maxRows: 8 }}
					showCount
					maxLength={500}
				/>
				{!notificationSettings.description && (
					<Typography.Text style={{ fontSize: '11px', color: 'var(--bg-vanilla-500)', marginTop: '4px', display: 'block' }}>
						💡 Tip: Use template variables to make your messages dynamic. Click "Variables" above for a full list.
					</Typography.Text>
				)}
			</div>
		</div>
	);
}

export default NotificationMessage;
