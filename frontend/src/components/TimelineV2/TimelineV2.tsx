import './TimelineV2.styles.scss';

import { useIsDarkMode } from 'hooks/useDarkMode';
import { useEffect, useState } from 'react';
import { useMeasure } from 'react-use';

import { getIntervals, Interval } from './utils';

interface ITimelineV2Props {
	startTimestamp: number;
	endTimestamp: number;
	timelineHeight: number;
}

const MIN_INTERVALS = 5;

function TimelineV2(props: ITimelineV2Props): JSX.Element {
	const { startTimestamp, endTimestamp, timelineHeight } = props;
	const isDarkMode = useIsDarkMode();
	const [ref, { width }] = useMeasure<HTMLDivElement>();
	const [intervals, setIntervals] = useState<Interval[]>([]);

	useEffect(() => {
		const spread = endTimestamp - startTimestamp;
		const intervals = getIntervals((spread / MIN_INTERVALS) * 1.0, spread);
		setIntervals(intervals);
	}, [startTimestamp, endTimestamp, width]);

	console.log(intervals);

	return (
		<div ref={ref as never}>
			<svg
				width={width}
				height={timelineHeight}
				xmlns="http://www.w3.org/2000/svg"
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
