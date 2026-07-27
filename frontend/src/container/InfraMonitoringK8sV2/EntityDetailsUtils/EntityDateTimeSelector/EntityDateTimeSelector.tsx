import { useCallback } from 'react';
import { Undo } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import logEvent from 'api/common/logEvent';
import { InfraMonitoringEvents } from 'constants/events';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';

import { useEntityDetailsTime } from './useEntityDetailsTime';

interface EntityDateTimeSelectorProps {
	eventEntity: string;
	category: InfraMonitoringEntity;
	view: string;
}

function EntityDateTimeSelector({
	eventEntity,
	category,
	view,
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
			void logEvent(InfraMonitoringEvents.TimeUpdated, {
				entity: eventEntity,
				page: InfraMonitoringEvents.DetailedPage,
				category,
				view,
				interval,
			});
			handleTimeChange(interval, dateTimeRange);
		},
		[category, view, eventEntity, handleTimeChange],
	);

	return (
		<div className="entity-date-time-selector">
			{hasTimeChanged && (
				<TooltipSimple title="Reset to list time" side="bottom">
					<Button
						variant="outlined"
						color="secondary"
						onClick={handleResetToParentTime}
						data-testid="reset-to-list-time-button"
						prefix={<Undo size={14} />}
					>
						Reset
					</Button>
				</TooltipSimple>
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
