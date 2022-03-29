import { StyledDiv } from 'components/Styled';
import { ITraceMetaData } from 'container/GantChart';
import { IIntervalUnit, INTERVAL_UNITS } from 'container/TraceDetail/utils';
import useThemeMode from 'hooks/useThemeMode';
import React, { useEffect, useRef, useState } from 'react';
import { useMeasure } from 'react-use';

import { styles, Svg, TimelineInterval } from './styles';
import { Interval } from './types';
import { getIntervals, getIntervalSpread } from './utils';

const TimelineHeight = 22;
const TimelineHSpacing = 0;

function Timeline({
	traceMetaData,
	globalTraceMetadata,
	setIntervalUnit,
}: TimelineProps): JSX.Element {
	const [ref, { width }] = useMeasure<HTMLDivElement>();
	const { isDarkMode } = useThemeMode();

	const asd = useRef('');

	asd.current = '1';

	const [intervals, setIntervals] = useState<Interval[] | null>(null);

	useEffect(() => {
		const {
			baseInterval,
			baseSpread,
			intervalSpreadNormalized,
		} = getIntervalSpread({
			globalTraceMetadata,
			localTraceMetaData: traceMetaData,
		});

		let intervalUnit = INTERVAL_UNITS[0];
		for (let idx = 0; idx < INTERVAL_UNITS.length; idx += 1) {
			const standardInterval = INTERVAL_UNITS[idx];
			if (baseSpread * standardInterval.multiplier < 1) {
				const index = idx;
				if (index > 1) intervalUnit = INTERVAL_UNITS[index - 1];
				break;
			}
		}

		intervalUnit = intervalUnit || INTERVAL_UNITS[0];
		setIntervals(
			getIntervals({
				baseInterval,
				baseSpread,
				intervalSpreadNormalized,
				intervalUnit,
			}),
		);
		setIntervalUnit(intervalUnit);
	}, [traceMetaData, globalTraceMetadata, setIntervalUnit]);

	return (
		<StyledDiv ref={ref as never} styledclass={[styles.timelineContainer]}>
			<Svg
				viewBox={`0 0 ${width} ${TimelineHeight}`}
				xmlns="http://www.w3.org/2000/svg"
			>
				<line
					x1={TimelineHSpacing}
					y1={TimelineHeight}
					x2={width - TimelineHSpacing}
					y2={TimelineHeight}
					stroke={isDarkMode ? 'white' : 'black'}
					strokeWidth="1"
				/>
				{intervals &&
					intervals.map((interval, index) => (
						<TimelineInterval
							transform={`translate(${
								TimelineHSpacing +
								(interval.percentage * (width - 2 * TimelineHSpacing)) / 100
							},0)`}
							key={`${interval.label + interval.percentage + index}`}
						>
							<text y={13} fill={isDarkMode ? 'white' : 'black'}>
								{interval.label}
							</text>
							<line
								y1={TimelineHeight - 5}
								y2={TimelineHeight + 0.5}
								stroke={isDarkMode ? 'white' : 'black'}
								strokeWidth="1"
							/>
						</TimelineInterval>
					))}
			</Svg>
		</StyledDiv>
	);
}

interface TimelineProps {
	traceMetaData: {
		globalStart: number;
		globalEnd: number;
		spread: number;
		totalSpans: number;
		levels: number;
	};
	globalTraceMetadata: ITraceMetaData;
	setIntervalUnit: React.Dispatch<React.SetStateAction<IIntervalUnit>>;
}

export default Timeline;
