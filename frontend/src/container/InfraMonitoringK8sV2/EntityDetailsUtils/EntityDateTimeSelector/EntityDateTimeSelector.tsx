import { useCallback } from 'react';
import { Undo } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';

import { useEntityDetailsTime } from './useEntityDetailsTime';

import styles from './EntityDateTimeSelector.module.scss';
import { logInfraDrawerTimeRangeCustomizedEvent } from 'container/InfraMonitoringK8sV2/EntityDetailsUtils/events';

interface EntityDateTimeSelectorProps {
	category: InfraMonitoringEntity;
}

function EntityDateTimeSelector({
	category,
}: EntityDateTimeSelectorProps): JSX.Element {
	const {
		timeRange,
		selectedInterval,
		handleTimeChange,
		handleResetToParentTime,
		hasTimeChanged,
	} = useEntityDetailsTime();

	const onTimeChange = useCallback(
		(interval: Time | CustomTimeType, dateTimeRange?: [number, number]): void => {
			logInfraDrawerTimeRangeCustomizedEvent(category, interval);
			handleTimeChange(interval, dateTimeRange);
		},
		[category, handleTimeChange],
	);

	return (
		<div className={styles.container} data-testid="drawer-time-selection">
			{hasTimeChanged && (
				<Tooltip title="Reset to list time" side="bottom">
					<Button
						size="md"
						variant="outlined"
						color="secondary"
						onClick={handleResetToParentTime}
						testId="reset-to-list-time-button"
						prefix={<Undo size={14} />}
					>
						Reset
					</Button>
				</Tooltip>
			)}
			<DateTimeSelectionV2
				showAutoRefresh
				showRefreshText={false}
				hideShareModal
				isModalTimeSelection
				onTimeChange={onTimeChange}
				modalSelectedInterval={selectedInterval}
				modalInitialStartTime={timeRange.startTime * 1000}
				modalInitialEndTime={timeRange.endTime * 1000}
			/>
		</div>
	);
}

export default EntityDateTimeSelector;
