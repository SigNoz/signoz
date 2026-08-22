import { CSSProperties, memo, MouseEvent } from 'react';

import { SegmentData, TimeRange } from './utils/transformData';

export interface StateSegmentProps {
	segment: SegmentData;
	timeRange: TimeRange;
	totalWidth: number;
	height: number;
	onMouseEnter: (segment: SegmentData, event: MouseEvent) => void;
	onMouseLeave: () => void;
}

/**
 * Computes the percentage width of a segment based on its duration relative to the total time range.
 */
function getSegmentWidthPercent(
	segment: SegmentData,
	timeRange: TimeRange,
): number {
	const totalDuration = timeRange.end - timeRange.start;
	if (totalDuration <= 0) return 0;
	const segmentDuration = segment.endTime - segment.startTime;
	return (segmentDuration / totalDuration) * 100;
}

/**
 * Computes the percentage left offset of a segment based on its start time relative to the time range start.
 */
function getSegmentLeftPercent(
	segment: SegmentData,
	timeRange: TimeRange,
): number {
	const totalDuration = timeRange.end - timeRange.start;
	if (totalDuration <= 0) return 0;
	return ((segment.startTime - timeRange.start) / totalDuration) * 100;
}

function StateSegment({
	segment,
	timeRange,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	totalWidth,
	height,
	onMouseEnter,
	onMouseLeave,
}: StateSegmentProps): JSX.Element {
	const leftPercent = getSegmentLeftPercent(segment, timeRange);
	const widthPercent = getSegmentWidthPercent(segment, timeRange);
	// Minimum 0.3% width so short segments show as thin lines
	const finalWidth = Math.max(widthPercent, 0.3);

	const ROW_PADDING = 3; // vertical padding matching Grafana's spacing

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
			onMouseEnter={(event): void => onMouseEnter(segment, event)}
			onMouseLeave={onMouseLeave}
		/>
	);
}

export default memo(StateSegment);
