import { Radio, Select } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useMemo } from 'react';

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

	return (
		<div className="multiple-notifications-container">
			<Radio.Group
				value={
					notificationSettings.multipleNotifications.enabled ? 'multiple' : 'single'
				}
				onChange={(e): void => {
					const isMultiple = e.target.value === 'multiple';
					setNotificationSettings({
						type: 'SET_MULTIPLE_NOTIFICATIONS',
						payload: {
							enabled: isMultiple,
							value: isMultiple ? spaceAggregationOptions[0]?.value || '' : '',
						},
					});
				}}
			>
				<Radio value="single" disabled={spaceAggregationOptions.length === 0}>
					<div className="multiple-notifications-container-item">
						<div className="multiple-notifications-container-item-title">
							Single Alert Notification
						</div>
						<div className="multiple-notifications-container-item-description">
							Send a single alert notification when the query meets the conditions
							defined.
						</div>
					</div>
				</Radio>
				<div className="border-bottom" />
				<Radio value="multiple" disabled={spaceAggregationOptions.length === 0}>
					<div className="multiple-notifications-container-item">
						<div className="multiple-notifications-container-item-title">
							Multiple Alert Notifications
						</div>
						<div className="multiple-notifications-container-item-description">
							Send a notification for each
							<Select
								options={spaceAggregationOptions}
								onChange={(value): void => {
									setNotificationSettings({
										type: 'SET_MULTIPLE_NOTIFICATIONS',
										payload: {
											enabled: true,
											value,
										},
									});
								}}
								value={notificationSettings.multipleNotifications.value || null}
								placeholder="SELECT VALUE"
								disabled={!notificationSettings.multipleNotifications.enabled}
							/>
							meeting the conditions defined.
						</div>
					</div>
				</Radio>
			</Radio.Group>
		</div>
	);
}

export default MultipleNotifications;
