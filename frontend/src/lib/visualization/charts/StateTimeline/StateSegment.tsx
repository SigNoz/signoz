import { CSSProperties, memo, MouseEvent } from 'react';

import type { SegmentData, TimeRange } from './types';

export interface StateSegmentProps {
	segment: SegmentData;
	timeRange: TimeRange;
	height: number;
	onMouseEnter: (segment: SegmentData, event: MouseEvent) => void;
	onMouseLeave: () => void;
}

/** Percentage width of a segment relative to the total time range. */
function getSegmentWidthPercent(
	segment: SegmentData,
	timeRange: TimeRange,
): number {
	const totalDuration = timeRange.end - timeRange.start;
	if (totalDuration <= 0) {
		return 0;
	}
	return ((segment.endTime - segment.startTime) / totalDuration) * 100;
}

/** Percentage left offset of a segment relative to the time range start. */
function getSegmentLeftPercent(
	segment: SegmentData,
	timeRange: TimeRange,
): number {
	const totalDuration = timeRange.end - timeRange.start;
	if (totalDuration <= 0) {
		return 0;
	}
	return ((segment.startTime - timeRange.start) / totalDuration) * 100;
}

const ROW_PADDING = 3;

function StateSegment({
	segment,
	timeRange,
	height,
	onMouseEnter,
	onMouseLeave,
}: StateSegmentProps): JSX.Element {
	const leftPercent = getSegmentLeftPercent(segment, timeRange);
	const widthPercent = getSegmentWidthPercent(segment, timeRange);
	// Minimum 0.3% width so short segments still render as thin lines.
	const finalWidth = Math.max(widthPercent, 0.3);

	const style: CSSProperties = {
		position: 'absolute',
		left: `${leftPercent}%`,
		width: `${finalWidth}%`,
		height: `${height - ROW_PADDING * 2}px`,
		top: `${ROW_PADDING}px`,
		backgroundColor: segment.color,
		borderRadius: '1px',
		border: 'none',
		padding: 0,
		margin: 0,
	};

	return (
		<div
			style={style}
			data-testid="state-timeline-segment"
			onMouseEnter={(event): void => onMouseEnter(segment, event)}
			onMouseLeave={onMouseLeave}
		/>
	);
}

export default memo(StateSegment);
