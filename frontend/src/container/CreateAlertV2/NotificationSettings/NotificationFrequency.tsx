import { Input, Select, Switch, Typography, Tooltip } from 'antd';
import { HelpCircle, AlertTriangle } from 'lucide-react';

import { useCreateAlertState } from '../context';
import {
	RE_NOTIFICATION_CONDITION_OPTIONS,
	RE_NOTIFICATION_UNIT_OPTIONS,
} from '../context/constants';

function NotificationFrequency(): JSX.Element {
	const {
		notificationSettings,
		setNotificationSettings,
	} = useCreateAlertState();

	const isReNotificationEnabled = notificationSettings.reNotification.enabled;

	const handleReNotificationToggle = (enabled: boolean): void => {
		setNotificationSettings({
			type: 'SET_RE_NOTIFICATION',
			payload: {
				enabled,
				value: enabled && !notificationSettings.reNotification.value ? 5 : notificationSettings.reNotification.value,
				unit: enabled && !notificationSettings.reNotification.unit ? 'min' : notificationSettings.reNotification.unit,
				conditions: enabled && notificationSettings.reNotification.conditions.length === 0 ? ['firing'] : notificationSettings.reNotification.conditions,
			},
		});
	};

	const handleReNotificationChange = (updates: Partial<typeof notificationSettings.reNotification>): void => {
		// Validation for minimum interval
		if (updates.value !== undefined) {
			const minValue = updates.unit === 'sec' ? 30 : 1;
			if (updates.value < minValue) {
				updates.value = minValue;
			}
		}

		setNotificationSettings({
			type: 'SET_RE_NOTIFICATION',
			payload: {
				...notificationSettings.reNotification,
				...updates,
			},
		});
	};

	const getValidationWarning = (): string | null => {
		if (!isReNotificationEnabled) return null;
		
		const { value, unit } = notificationSettings.reNotification;
		const totalSeconds = unit === 'sec' ? value : value * 60;
		
		if (totalSeconds < 30) {
			return 'Minimum interval is 30 seconds to avoid notification spam';
		}
		if (totalSeconds < 300) { // Less than 5 minutes
			return 'Short intervals may cause notification spam. Consider using 5+ minutes.';
		}
		return null;
	};

	return (
		<div className="re-notification-container">
			<div className="advanced-option-item">
				<div className="advanced-option-item-left-content">
					<div className="advanced-option-item-header">
						<Typography.Text className="advanced-option-item-title">
							Repeat notifications
						</Typography.Text>
						<Tooltip title="Continue sending periodic notifications while the alert condition persists. Useful for ensuring critical alerts aren't missed during long-running incidents. Configure how often to repeat and under what conditions." placement="top">
							<HelpCircle size={14} style={{ color: 'var(--bg-vanilla-400)', cursor: 'help' }} />
						</Tooltip>
					</div>
					<Typography.Text className="advanced-option-item-description">
						Send periodic notifications while the alert condition remains active.
					</Typography.Text>
				</div>
				<div className="advanced-option-item-right-content">
					{isReNotificationEnabled && (
						<div className="advanced-option-item-input-inline">
							<Typography.Text style={{ fontSize: '12px', color: 'var(--bg-vanilla-400)' }}>
								Every
							</Typography.Text>
							<Input
								value={notificationSettings.reNotification.value}
								placeholder="5"
								type="number"
								style={{ width: 60 }}
								onChange={(e): void => {
									const value = parseInt(e.target.value, 10) || 0;
									handleReNotificationChange({ value });
								}}
							/>
							<Select
								value={notificationSettings.reNotification.unit}
								placeholder="min"
								options={RE_NOTIFICATION_UNIT_OPTIONS}
								onChange={(unit): void => handleReNotificationChange({ unit })}
								style={{ width: 80 }}
							/>
							<Typography.Text style={{ fontSize: '12px', color: 'var(--bg-vanilla-400)' }}>
								while
							</Typography.Text>
							<Select
								mode="multiple"
								value={notificationSettings.reNotification.conditions}
								placeholder="firing"
								options={RE_NOTIFICATION_CONDITION_OPTIONS}
								onChange={(conditions): void => handleReNotificationChange({ conditions })}
								style={{ width: 120 }}
							/>
						</div>
					)}
					<Switch checked={isReNotificationEnabled} onChange={handleReNotificationToggle} />
				</div>
			</div>
			
			{getValidationWarning() && (
				<div style={{ 
					display: 'flex', 
					alignItems: 'center', 
					gap: '6px', 
					padding: '8px 12px', 
					backgroundColor: 'rgba(255, 193, 7, 0.1)', 
					border: '1px solid var(--bg-amber-500)', 
					borderRadius: '4px',
					marginTop: '8px'
				}}>
					<AlertTriangle size={14} style={{ color: 'var(--bg-amber-500)' }} />
					<Typography.Text style={{ fontSize: '12px', color: 'var(--bg-amber-500)' }}>
						{getValidationWarning()}
					</Typography.Text>
				</div>
			)}
		</div>
	);
}

export default NotificationFrequency;