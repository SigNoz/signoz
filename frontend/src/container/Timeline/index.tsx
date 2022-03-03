import React, { useState, useMemo } from 'react';
import { isEqual } from 'lodash-es';
import styles from './style.module.css';
import { useMeasure } from 'react-use';
import { toFixed } from 'utils/toFixed';
import {
	INTERVAL_UNITS,
	resolveTimeFromInterval,
} from 'container/TraceDetail/utils';

interface TimelineProps {
	traceMetaData: object;
	globalTraceMetadata: object;
	intervalUnit: object;
	setIntervalUnit: Function;
}
interface Interval {
	label: string;
	percentage: number;
}
const Timeline = ({
	traceMetaData,
	globalTraceMetadata,
	intervalUnit,
	setIntervalUnit,
}: TimelineProps) => {
	const [ref, { width, height }] = useMeasure<HTMLDivElement>();
	const Timeline_Height = 22;
	const Timeline_H_Spacing = 0;

	const [intervals, setIntervals] = useState<Interval[] | null>(null);

	const {
		globalStart: localStart,
		globalEnd: localEnd,
		spread: localSpread,
	} = traceMetaData;
	const { globalStart, globalEnd, globalSpread } = globalTraceMetadata;

	const getIntervalSpread = () => {
		let baseInterval = 0;

		if (!isEqual(traceMetaData, globalTraceMetadata)) {
			baseInterval = localStart - globalStart;
		}

		const MIN_INTERVALS = 5;
		const baseSpread = localSpread;
		let intervalSpread = (baseSpread / MIN_INTERVALS) * 1.0;
		const integerPartString = intervalSpread.toString().split('.')[0];
		const integerPartLength = integerPartString.length;
		const intervalSpreadNormalized =
			Math.floor(Number(integerPartString) / Math.pow(10, integerPartLength - 1)) *
			Math.pow(10, integerPartLength - 1);
		return {
			baseInterval,
			baseSpread,
			intervalSpreadNormalized,
		};
	};

	const getIntervals = ({
		baseInterval,
		baseSpread,
		intervalSpreadNormalized,
	}) => {
		const intervals: Interval[] = [
			{
				label: `${toFixed(resolveTimeFromInterval(baseInterval, intervalUnit), 2)}${
					intervalUnit.name
				}`,
				percentage: 0,
			},
		];

		let tempBaseSpread = baseSpread;
		let elapsedIntervals = 0;

		// while (tempBaseSpread) {
		// 	let interval_time;
		// 	if (tempBaseSpread <= 1.5 * intervalSpreadNormalized) {
		// 		interval_time = elapsedIntervals + tempBaseSpread
		// 		tempBaseSpread = 0
		// 	}
		// 	else {
		// 		interval_time = elapsedIntervals + intervalSpreadNormalized;
		// 		tempBaseSpread -= intervalSpreadNormalized
		// 	}
		// 	elapsedIntervals = interval_time;

		// 	const interval: Interval = {
		// 		label: `${toFixed(resolveTimeFromInterval((interval_time + baseInterval), intervalUnit), 2)}${intervalUnit.name}`,
		// 		percentage: (interval_time / baseSpread) * 100,
		// 	};
		// 	intervals.push(interval);
		// }

		return intervals;
	};

	useMemo(() => {
		const {
			baseInterval,
			baseSpread,
			intervalSpreadNormalized,
		} = getIntervalSpread();

		let intervalUnit = INTERVAL_UNITS[0];
		for (const idx in INTERVAL_UNITS) {
			const standard_interval = INTERVAL_UNITS[idx];
			if (baseSpread * standard_interval.multiplier < 1) {
				intervalUnit = INTERVAL_UNITS[idx - 1];
				break;
			}
		}

		setIntervalUnit(intervalUnit);
		setIntervals(
			getIntervals({ baseInterval, baseSpread, intervalSpreadNormalized }),
		);
	}, [traceMetaData, globalTraceMetadata]);

	return (
		<div ref={ref} style={{ flex: 1, overflow: 'inherit' }}>
			<svg
				style={{ overflow: 'inherit' }}
				viewBox={`0 0 ${width} ${Timeline_Height}`}
				xmlns="http://www.w3.org/2000/svg"
				className={styles['svg-container']}
			>
				<line
					x1={Timeline_H_Spacing}
					y1={Timeline_Height}
					x2={width - Timeline_H_Spacing}
					y2={Timeline_Height}
					stroke="grey"
					strokeWidth="1"
				/>
				{intervals &&
					intervals.map((interval, index) => (
						<g
							transform={`translate(${
								Timeline_H_Spacing +
								(interval.percentage * (width - 2 * Timeline_H_Spacing)) / 100
							},0)`}
							className={styles['timeline-tick']}
							key={interval.label + interval.percentage + index}
						>
							<text y={13} fill="white">
								{interval.label}
							</text>
							<line
								y1={Timeline_Height - 5}
								y2={Timeline_Height + 0.5}
								stroke="grey"
								strokeWidth="1"
							/>
						</g>
					))}
			</svg>
		</div>
	);
};

export default Timeline;
