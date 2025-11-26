import { Select, Tooltip, Typography } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Info } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { ALL_SELECTED_VALUE } from '../constants';
import { useCreateAlertState } from '../context';

function MultipleNotifications(): JSX.Element {
	const {
		notificationSettings,
		setNotificationSettings,
	} = useCreateAlertState();
	const { currentQuery } = useQueryBuilder();

	const isAllOptionSelected = useMemo(
		() =>
			notificationSettings.multipleNotifications?.includes(ALL_SELECTED_VALUE),
		[notificationSettings.multipleNotifications],
	);

	const spaceAggregationOptions = useMemo(() => {
		const allGroupBys = currentQuery.builder.queryData?.reduce<string[]>(
			(acc, query) => {
				const groupByKeys = query.groupBy?.map((groupBy) => groupBy.key) || [];
				return [...acc, ...groupByKeys];
			},
			[],
		);
		const uniqueGroupBys = [...new Set(allGroupBys)];
		const options = uniqueGroupBys.map((key) => ({
			label: key,
			value: key,
			disabled: isAllOptionSelected,
			'data-testid': 'multiple-notifications-select-option',
		}));
		if (options.length > 0) {
			return [
				{
					label: 'All',
					value: ALL_SELECTED_VALUE,
					'data-testid': 'multiple-notifications-select-option',
				},
				...options,
			];
		}
		return options;
	}, [currentQuery.builder.queryData, isAllOptionSelected]);

	const isMultipleNotificationsEnabled = spaceAggregationOptions.length > 0;

	const onSelectChange = useCallback(
		(newSelectedOptions: string[]): void => {
			const currentSelectedOptions = notificationSettings.multipleNotifications;
			const allOptionLastSelected =
				!currentSelectedOptions?.includes(ALL_SELECTED_VALUE) &&
				newSelectedOptions.includes(ALL_SELECTED_VALUE);
			if (allOptionLastSelected) {
				setNotificationSettings({
					type: 'SET_MULTIPLE_NOTIFICATIONS',
					payload: [ALL_SELECTED_VALUE],
				});
			} else {
				setNotificationSettings({
					type: 'SET_MULTIPLE_NOTIFICATIONS',
					payload: newSelectedOptions,
				});
			}
		},
		[setNotificationSettings, notificationSettings.multipleNotifications],
	);

	const groupByDescription = useMemo(() => {
		if (isAllOptionSelected) {
			return 'All = grouping of alerts is disabled';
		}
		if (notificationSettings.multipleNotifications?.length) {
			return `Alerts with same ${notificationSettings.multipleNotifications?.join(
				', ',
			)} will be grouped`;
		}
		return 'Empty = all matching alerts combined into one notification';
	}, [isAllOptionSelected, notificationSettings.multipleNotifications]);

	const multipleNotificationsInput = useMemo(() => {
		const placeholder = isMultipleNotificationsEnabled
			? 'Select fields to group by (optional)'
			: 'No grouping fields available';
		let input = (
			<div>
				<Select
					options={spaceAggregationOptions}
					onChange={onSelectChange}
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
						{groupByDescription}
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
		groupByDescription,
		isMultipleNotificationsEnabled,
		notificationSettings.multipleNotifications,
		onSelectChange,
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
