import { useEffect, useState } from 'react';
import { useMeasure } from 'react-use';
import { useIsDarkMode } from 'hooks/useDarkMode';

import {
	getIntervals,
	getMinimumIntervalsBasedOnWidth,
	Interval,
} from './utils';

import './TimelineV3.styles.scss';

interface ITimelineV3Props {
	startTimestamp: number;
	endTimestamp: number;
	timelineHeight: number;
	offsetTimestamp: number;
}

function TimelineV3(props: ITimelineV3Props): JSX.Element {
	const {
		startTimestamp,
		endTimestamp,
		timelineHeight,
		offsetTimestamp,
	} = props;
	const [intervals, setIntervals] = useState<Interval[]>([]);
	const [ref, { width }] = useMeasure<HTMLDivElement>();
	const isDarkMode = useIsDarkMode();

	useEffect(() => {
		const spread = endTimestamp - startTimestamp;
		if (spread < 0) {
			return;
		}

		const minIntervals = getMinimumIntervalsBasedOnWidth(width);
		const intervalisedSpread = (spread / minIntervals) * 1.0;
		const intervals = getIntervals(intervalisedSpread, spread, offsetTimestamp);

		setIntervals(intervals);
	}, [startTimestamp, endTimestamp, width, offsetTimestamp]);

	if (endTimestamp < startTimestamp) {
		console.error(
			'endTimestamp cannot be less than startTimestamp',
			startTimestamp,
			endTimestamp,
		);
		return <div />;
	}

	const strokeColor = isDarkMode ? ' rgb(192,193,195,0.8)' : 'black';

	return (
		<div ref={ref as never} className="timeline-v3-container">
			<svg
				width={width}
				height={timelineHeight * 2.5}
				xmlns="http://www.w3.org/2000/svg"
				overflow="visible"
			>
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
								y={timelineHeight * 2}
								fill={strokeColor}
							>
								{interval.label}
							</text>
							<line y1={0} y2={timelineHeight} stroke={strokeColor} strokeWidth="1" />
						</g>
					))}
			</svg>
		</div>
	);
}

export default TimelineV3;
