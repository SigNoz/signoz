import { Radio, Select, Typography, Tooltip } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useMemo } from 'react';
import { HelpCircle } from 'lucide-react';

import { useCreateAlertState } from '../context';

function MultipleNotifications(): JSX.Element {
	const {
		notificationSettings,
		setNotificationSettings,
		thresholdState,
	} = useCreateAlertState();
	const { currentQuery } = useQueryBuilder();

	const selectedQuery = useMemo(
		() =>
			currentQuery.builder.queryData.find(
				(query) => query.queryName === thresholdState.selectedQuery,
			),
		[currentQuery, thresholdState.selectedQuery],
	);

	const spaceAggregationOptions = useMemo(
		() =>
			selectedQuery?.groupBy?.map((groupBy) => ({
				label: groupBy.key,
				value: groupBy.key,
			})) || [],
		[selectedQuery],
	);

	const isMultipleEnabled = notificationSettings.multipleNotifications.enabled;
	const canUseGroupBy = spaceAggregationOptions.length > 0;

	return (
		<div className="re-notification-container">
			<div className="advanced-option-item">
				<div className="advanced-option-item-left-content">
					<div className="advanced-option-item-header">
						<Typography.Text className="advanced-option-item-title">
							Group alerts by
						</Typography.Text>
						<Tooltip title="Group similar alerts together to reduce notification volume. Leave empty to combine all matching alerts into one notification without grouping." placement="top">
							<HelpCircle size={14} style={{ color: 'var(--bg-vanilla-400)', cursor: 'help' }} />
						</Tooltip>
					</div>
					<Typography.Text className="advanced-option-item-description">
						Combine alerts with the same field values into a single notification.
					</Typography.Text>
				</div>
				<div className="advanced-option-item-right-content">
					<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
						<Tooltip 
							title={!canUseGroupBy ? 'Add "Group by" fields to your query to enable alert grouping' : undefined}
							placement="top"
						>
							<Select
								mode="multiple"
								options={spaceAggregationOptions}
								onChange={(value): void => {
									setNotificationSettings({
										type: 'SET_MULTIPLE_NOTIFICATIONS',
										payload: { 
											enabled: value && value.length > 0, 
											value: value || [] 
										},
									});
								}}
								value={notificationSettings.multipleNotifications.value || []}
								placeholder={canUseGroupBy ? "Select fields to group by (optional)" : "No grouping fields available"}
								disabled={!canUseGroupBy}
								style={{ width: 250 }}
								maxTagCount={2}
								maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} more`}
								allowClear
							/>
						</Tooltip>
						{canUseGroupBy && (
							!notificationSettings.multipleNotifications.value?.length ? (
								<Typography.Text style={{ fontSize: '11px', color: 'var(--bg-vanilla-400)', display: 'block' }}>
									💡 Empty = all matching alerts combined into one notification
								</Typography.Text>
							) : (
								<Typography.Text style={{ fontSize: '11px', color: 'var(--bg-vanilla-400)', display: 'block' }}>
									💡 Alerts with same {notificationSettings.multipleNotifications.value.join(', ')} will be grouped
								</Typography.Text>
							)
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default MultipleNotifications;
