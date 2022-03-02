import React, { useState, useEffect, useMemo } from 'react';
import { isEqual } from 'lodash-es';
import styles from './style.module.css';
import { useMeasure } from 'react-use';
import { toFixed } from 'utils/toFixed';
interface TimelineProps {
	traceMetaData: object;
	globalTraceMetadata: object;
}
interface Interval {
	label: string;
	percentage: number;
}
const Timeline = ({ traceMetaData, globalTraceMetadata }: TimelineProps) => {
	const [ref, { width, height }] = useMeasure<HTMLDivElement>();
	const Timeline_Height = 22;
	const Timeline_H_Spacing = 0;

	const [intervals, setIntervals] = useState<Interval[] | null>(null);

	const getIntervals = (traceMetaData, globalTraceMetadata) => {
		//TODO time unit normalization
		const {
			globalStart: localStart,
			globalEnd: localEnd,
			spread: localSpread,
		} = traceMetaData;
		const { globalStart, globalEnd, globalSpread } = globalTraceMetadata;

		let baseInterval = 0;

		if (!isEqual(traceMetaData, globalTraceMetadata)) {
			baseInterval = (localStart - globalStart) / 1e6;
		}

		const TOTAL_INTERVAL = 6;
		const intervalUnit = 'ms';
		let baseSpread = localSpread / 1e12;
		let intervalSpread = (baseSpread / TOTAL_INTERVAL) * 1.0;
		const integerPartString = intervalSpread.toString().split('.')[0];
		const integerPartLength = integerPartString.length;
		const intervalSpreadNormalized =
			Math.floor(Number(integerPartString) / Math.pow(10, integerPartLength - 1)) *
			Math.pow(10, integerPartLength - 1);
		const intervals: Interval[] = [];
		for (
			let interval_count = 0;
			interval_count <= TOTAL_INTERVAL;
			interval_count++
		) {
			let interval_time = interval_count * intervalSpreadNormalized;
			if (interval_count === TOTAL_INTERVAL) {
				interval_time = baseSpread;
			}
			const interval: Interval = {
				label: `${toFixed(interval_time + baseInterval, 2)}${intervalUnit}`,
				percentage: (interval_time / baseSpread) * 100,
			};
			intervals.push(interval);
		}
		setIntervals(intervals);
	};

	useMemo(() => {
		getIntervals(traceMetaData, globalTraceMetadata);
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
