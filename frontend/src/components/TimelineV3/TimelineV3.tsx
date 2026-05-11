import { useEffect, useMemo, useState } from 'react';
import { useMeasure } from 'react-use';
import { resolveTimeFromInterval } from 'components/TimelineV2/utils';
import { toFixed } from 'utils/toFixed';

import {
	getIntervals,
	getIntervalUnit,
	getMinimumIntervalsBasedOnWidth,
	Interval,
} from './utils';

import './TimelineV3.styles.scss';

interface ITimelineV3Props {
	startTimestamp: number;
	endTimestamp: number;
	timelineHeight: number;
	offsetTimestamp: number;
	/** Cursor X as a fraction of the timeline width (0–1). null = no cursor. */
	cursorXPercent?: number | null;
}

function TimelineV3(props: ITimelineV3Props): JSX.Element {
	const {
		startTimestamp,
		endTimestamp,
		timelineHeight,
		offsetTimestamp,
		cursorXPercent,
	} = props;
	const [intervals, setIntervals] = useState<Interval[]>([]);
	const [ref, { width }] = useMeasure<HTMLDivElement>();

	const spread = endTimestamp - startTimestamp;

	useEffect(() => {
		if (spread < 0) {
			return;
		}

		const minIntervals = getMinimumIntervalsBasedOnWidth(width);
		const intervalisedSpread = (spread / minIntervals) * 1.0;
		const newIntervals = getIntervals(
			intervalisedSpread,
			spread,
			offsetTimestamp,
		);

		setIntervals(newIntervals);
	}, [startTimestamp, endTimestamp, width, offsetTimestamp, spread]);

	// Compute cursor time label using the same unit as timeline ticks
	const cursorLabel = useMemo(() => {
		if (cursorXPercent == null || spread <= 0) {
			return null;
		}

		const timeAtCursor = offsetTimestamp + cursorXPercent * spread;
		const unit = getIntervalUnit(spread, offsetTimestamp);
		const formatted = toFixed(resolveTimeFromInterval(timeAtCursor, unit), 2);
		return `${formatted}${unit.name}`;
	}, [cursorXPercent, spread, offsetTimestamp]);

	if (endTimestamp < startTimestamp) {
		console.error(
			'endTimestamp cannot be less than startTimestamp',
			startTimestamp,
			endTimestamp,
		);
		return <></>;
	}

	const strokeColor = 'var(--l3-foreground)';
	const svgHeight = timelineHeight * 2.5;
	const cursorX = cursorXPercent != null ? cursorXPercent * width : null;

	return (
		<div ref={ref as never} className="timeline-v3-container">
			<svg
				width={width}
				height={svgHeight}
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

			{/* Cursor time badge — DOM element for easy CSS styling */}
			{cursorX !== null && cursorLabel && (
				<div className="timeline-v3-cursor-badge" style={{ left: cursorX }}>
					{cursorLabel}
				</div>
			)}
		</div>
	);
}

export default TimelineV3;
