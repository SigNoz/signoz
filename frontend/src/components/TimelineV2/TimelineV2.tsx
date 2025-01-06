import { useIsDarkMode } from 'hooks/useDarkMode';
import { useEffect, useState } from 'react';
import { useMeasure } from 'react-use';

import {
	getIntervals,
	getMinimumIntervalsBasedOnWidth,
	Interval,
} from './utils';

interface ITimelineV2Props {
	startTimestamp: number;
	endTimestamp: number;
	timelineHeight: number;
}

function TimelineV2(props: ITimelineV2Props): JSX.Element {
	const { startTimestamp, endTimestamp, timelineHeight } = props;
	const isDarkMode = useIsDarkMode();
	const [ref, { width }] = useMeasure<HTMLDivElement>();
	const [intervals, setIntervals] = useState<Interval[]>([]);

	useEffect(() => {
		const spread = endTimestamp - startTimestamp;
		const minIntervals = getMinimumIntervalsBasedOnWidth(width);
		const intervals = getIntervals((spread / minIntervals) * 1.0, spread);
		setIntervals(intervals);
	}, [startTimestamp, endTimestamp, width]);

	return (
		<div ref={ref as never} style={{ flex: 1, overflow: 'visible' }}>
			<svg
				width={width}
				height={timelineHeight}
				xmlns="http://www.w3.org/2000/svg"
				overflow="visible"
			>
				<line
					x1="0"
					y1={timelineHeight}
					x2={width}
					y2={timelineHeight}
					stroke={isDarkMode ? 'white' : 'black'}
					strokeWidth="1"
				/>
				{intervals &&
					intervals.length > 0 &&
					intervals.map((interval, index) => (
						<g
							transform={`translate(${(interval.percentage * width) / 100},0)`}
							key={`${interval.percentage + interval.label + index}`}
							textAnchor="middle"
							fontSize="0.6rem"
						>
							<text
								x={index === intervals.length - 1 ? -10 : 0}
								y={13}
								fill={isDarkMode ? 'white' : 'black'}
							>
								{interval.label}
							</text>
							<line
								y1={timelineHeight - 5}
								y2={timelineHeight + 0.5}
								stroke={isDarkMode ? 'white' : 'black'}
								strokeWidth="1"
							/>
						</g>
					))}
			</svg>
		</div>
	);
}

export default TimelineV2;
