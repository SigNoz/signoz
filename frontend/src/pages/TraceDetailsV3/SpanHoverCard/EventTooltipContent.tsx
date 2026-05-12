import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { Diamond } from '@signozhq/icons';
import { toFixed } from 'utils/toFixed';

import './EventTooltipContent.styles.scss';

export interface EventTooltipContentProps {
	eventName: string;
	timeOffsetMs: number;
	isError: boolean;
	attributeMap: Record<string, string>;
}

export function EventTooltipContent({
	eventName,
	timeOffsetMs,
	isError,
	attributeMap,
}: EventTooltipContentProps): JSX.Element {
	const { time, timeUnitName } = convertTimeToRelevantUnit(timeOffsetMs);

	return (
		<div className="event-tooltip-content">
			<div className="event-tooltip-content__header">
				<Diamond size={10} />
				<span>EVENT DETAILS</span>
			</div>
			<div className={`event-tooltip-content__name ${isError ? 'error' : ''}`}>
				{eventName}
			</div>
			<div className="event-tooltip-content__time">
				{toFixed(time, 2)} {timeUnitName} from start
			</div>
			{Object.keys(attributeMap).length > 0 && (
				<>
					<div className="event-tooltip-content__divider" />
					<div className="event-tooltip-content__attributes">
						{Object.entries(attributeMap).map(([key, value]) => (
							<div key={key} className="event-tooltip-content__kv">
								<span className="event-tooltip-content__key">{key}:</span>{' '}
								<span className="event-tooltip-content__value">{value}</span>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}
