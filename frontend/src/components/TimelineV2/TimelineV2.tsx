import './TimelineV2.styles.scss';

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
		setIntervals(getIntervals(intervalisedSpread, spread));
	}, [startTimestamp, endTimestamp, width]);

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
		<div ref={ref as never} className="timeline-v2-container">
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
					stroke={strokeColor}
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
								y={2 * Math.floor(timelineHeight / 4)}
								fill={strokeColor}
							>
								{interval.label}
							</text>
							<line
								y1={3 * Math.floor(timelineHeight / 4)}
								y2={timelineHeight + 0.5}
								stroke={strokeColor}
								strokeWidth="1"
							/>
						</g>
					))}
			</svg>
		</div>
	);
}

export default TimelineV2;
