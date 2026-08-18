import { CSSProperties, memo, MouseEvent } from 'react';

import StateSegment from './StateSegment';
import { SegmentData, SwimLaneRowData, TimeRange } from './utils/transformData';

export interface SwimLaneRowProps {
	row: SwimLaneRowData;
	timeRange: TimeRange;
	width: number;
	height: number;
	onSegmentHover: (segment: SegmentData, event: MouseEvent) => void;
	onSegmentLeave: () => void;
}

function SwimLaneRow({
	row,
	timeRange,
	width,
	height,
	onSegmentHover,
	onSegmentLeave,
}: SwimLaneRowProps): JSX.Element {
	const containerStyle: CSSProperties = {
		position: 'relative',
		width: '100%',
		height: `${height}px`,
		overflow: 'hidden',
		borderBottom: '2px solid #181b1f',
		backgroundColor: '#181b1f',
	};

	return (
		<div style={containerStyle}>
			{row.segments.map((segment, index) => (
				<StateSegment
					// eslint-disable-next-line react/no-array-index-key
					key={index}
					segment={segment}
					timeRange={timeRange}
					totalWidth={width}
					height={height}
					onMouseEnter={onSegmentHover}
					onMouseLeave={onSegmentLeave}
				/>
			))}
		</div>
	);
}

export default memo(SwimLaneRow);
