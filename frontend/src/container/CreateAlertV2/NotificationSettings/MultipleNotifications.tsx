import { Select, Tooltip, Typography } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Info } from 'lucide-react';
import { useMemo } from 'react';

import { useCreateAlertState } from '../context';

function MultipleNotifications(): JSX.Element {
	const {
		notificationSettings,
		setNotificationSettings,
	} = useCreateAlertState();
	const { currentQuery } = useQueryBuilder();

	const spaceAggregationOptions = useMemo(() => {
		const allGroupBys = currentQuery.builder.queryData?.reduce<string[]>(
			(acc, query) => {
				const groupByKeys = query.groupBy?.map((groupBy) => groupBy.key) || [];
				return [...acc, ...groupByKeys];
			},
			[],
		);
		const uniqueGroupBys = [...new Set(allGroupBys)];
		return uniqueGroupBys.map((key) => ({
			label: key,
			value: key,
			'data-testid': 'multiple-notifications-select-option',
		}));
	}, [currentQuery.builder.queryData]);

	const isMultipleNotificationsEnabled = spaceAggregationOptions.length > 0;

	const multipleNotificationsInput = useMemo(() => {
		const placeholder = isMultipleNotificationsEnabled
			? 'Select fields to group by (optional)'
			: 'No grouping fields available';
		let input = (
			<div>
				<Select
					options={spaceAggregationOptions}
					onChange={(value): void => {
						setNotificationSettings({
							type: 'SET_MULTIPLE_NOTIFICATIONS',
							payload: value,
						});
					}}
					value={notificationSettings.multipleNotifications}
					mode="multiple"
					placeholder={placeholder}
					disabled={!isMultipleNotificationsEnabled}
					aria-disabled={!isMultipleNotificationsEnabled}
					maxTagCount={3}
					data-testid="multiple-notifications-select"
				/>
				{isMultipleNotificationsEnabled && (
					<Typography.Paragraph className="multiple-notifications-select-description">
						{notificationSettings.multipleNotifications?.length
							? `Alerts with same ${notificationSettings.multipleNotifications?.join(
									', ',
							  )} will be grouped`
							: 'Empty = all matching alerts combined into one notification'}
					</Typography.Paragraph>
				)}
			</div>
		);
		if (!isMultipleNotificationsEnabled) {
			input = (
				<Tooltip title="Add 'Group by' fields to your query to enable alert grouping">
					{input}
				</Tooltip>
			);
		}
		return input;
	}, [
		isMultipleNotificationsEnabled,
		notificationSettings.multipleNotifications,
		setNotificationSettings,
		spaceAggregationOptions,
	]);

	return (
		<div className="multiple-notifications-container">
			<div className="multiple-notifications-header">
				<Typography.Text className="multiple-notifications-header-title">
					Group alerts by{' '}
					<Tooltip title="Group similar alerts together to reduce notification volume. Leave empty to combine all matching alerts into one notification without grouping.">
						<Info size={16} />
					</Tooltip>
				</Typography.Text>
				<Typography.Text className="multiple-notifications-header-description">
					Combine alerts with the same field values into a single notification.
				</Typography.Text>
			</div>
			{multipleNotificationsInput}
		</div>
	);
}

export default MultipleNotifications;
