import { ReactNode } from 'react';
import { Popover, Typography } from 'antd';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import dayjs from 'dayjs';
import { useTimezone } from 'providers/Timezone';
import { Span } from 'types/api/trace/getTraceV2';
import { toFixed } from 'utils/toFixed';

import './SpanHoverCard.styles.scss';

interface ITraceMetadata {
	startTime: number;
	endTime: number;
}

interface SpanHoverCardProps {
	span: Span;
	traceMetadata: ITraceMetadata;
	children: ReactNode;
}

function SpanHoverCard({
	span,
	traceMetadata,
	children,
}: SpanHoverCardProps): JSX.Element {
	const duration = span.durationNano / 1e6; // Convert nanoseconds to milliseconds
	const { time: formattedDuration, timeUnitName } = convertTimeToRelevantUnit(
		duration,
	);

	const { timezone } = useTimezone();

	// Calculate relative start time from trace start
	const relativeStartTime = span.timestamp - traceMetadata.startTime;
	const {
		time: relativeTime,
		timeUnitName: relativeTimeUnit,
	} = convertTimeToRelevantUnit(relativeStartTime);

	// Format absolute start time
	const startTimeFormatted = dayjs(span.timestamp)
		.tz(timezone.value)
		.format(DATE_TIME_FORMATS.DD_MMM_YYYY_HH_MM_SS);

	const getContent = (): JSX.Element => (
		<div className="span-hover-card">
			<div className="span-hover-card__row">
				<Typography.Text className="span-hover-card__label">
					Duration:
				</Typography.Text>
				<Typography.Text className="span-hover-card__value">
					{toFixed(formattedDuration, 2)}
					{timeUnitName}
				</Typography.Text>
			</div>
			<div className="span-hover-card__row">
				<Typography.Text className="span-hover-card__label">
					Events:
				</Typography.Text>
				<Typography.Text className="span-hover-card__value">
					{span.event?.length || 0}
				</Typography.Text>
			</div>
			<div className="span-hover-card__row">
				<Typography.Text className="span-hover-card__label">
					Start time:
				</Typography.Text>
				<Typography.Text className="span-hover-card__value">
					{startTimeFormatted}
				</Typography.Text>
			</div>
			<div className="span-hover-card__relative-time">
				<div className="span-hover-card__relative-time-icon" />
				<Typography.Text className="span-hover-card__relative-text">
					{toFixed(relativeTime, 2)}
					{relativeTimeUnit} after trace start
				</Typography.Text>
			</div>
		</div>
	);

	return (
		<Popover
			title={
				<div className="span-hover-card__title">
					<Typography.Text className="span-hover-card__operation">
						{span.name}
					</Typography.Text>
				</div>
			}
			mouseEnterDelay={0.2}
			content={getContent()}
			trigger="hover"
			rootClassName="span-hover-card"
			autoAdjustOverflow
			arrow={false}
		>
			{children}
		</Popover>
	);
}

export default SpanHoverCard;
