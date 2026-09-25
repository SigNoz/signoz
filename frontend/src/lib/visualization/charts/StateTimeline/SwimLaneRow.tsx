import { CSSProperties, memo, MouseEvent } from 'react';

import StateSegment from './StateSegment';
import type { SegmentData, SwimLaneRowData, TimeRange } from './types';

export interface SwimLaneRowProps {
	row: SwimLaneRowData;
	timeRange: TimeRange;
	height: number;
	onSegmentHover: (segment: SegmentData, event: MouseEvent) => void;
	onSegmentLeave: () => void;
}

const containerStyle: CSSProperties = {
	position: 'relative',
	width: '100%',
	overflow: 'hidden',
	borderBottom: '2px solid #181b1f',
	backgroundColor: '#181b1f',
};

function SwimLaneRow({
	row,
	timeRange,
	height,
	onSegmentHover,
	onSegmentLeave,
}: SwimLaneRowProps): JSX.Element {
	return (
		<div
			style={{ ...containerStyle, height: `${height}px` }}
			data-testid="state-timeline-row"
		>
			{row.segments.map((segment) => (
				<StateSegment
					key={`${segment.startTime}-${segment.endTime}`}
					segment={segment}
					timeRange={timeRange}
					height={height}
					onMouseEnter={onSegmentHover}
					onMouseLeave={onSegmentLeave}
				/>
			))}
		</div>
	);
}

export default memo(SwimLaneRow);
