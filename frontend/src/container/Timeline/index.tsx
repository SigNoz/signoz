import React, { useState, useEffect } from 'react';
import styles from './style.module.css';
import { useMeasure } from 'react-use';

interface TimelineProps {
	traceMetaData: object;
}
interface Interval {
	label: string;
	percentage: number;
}
const Timeline = ({ traceMetaData }: TimelineProps) => {
	const [ref, { width, height }] = useMeasure<HTMLDivElement>();
	const Timeline_Height = 22;
	const Timeline_H_Spacing = 0;

	const [intervals, setIntervals] = useState<Interval[] | null>(null);

	const getInterval = ({ globalStart, globalEnd, spread } = traceMetaData) => {
		// TODO incorporate localization when span is selected
		const TOTAL_INTERVAL = 6;
		const baseInterval = 0;
		const intervalUnit = 'ms';
		let baseSpread = spread / 1e12;
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
			let interval_time = baseInterval + interval_count * intervalSpreadNormalized;
			if (interval_count === TOTAL_INTERVAL) {
				interval_time = baseInterval + baseSpread;
			}
			const interval: Interval = {
				label: `${interval_time}${intervalUnit}`,
				percentage: (interval_time / baseSpread) * 100,
			};
			intervals.push(interval);
		}
		setIntervals(intervals);
	};

	useEffect(() => {
		getInterval(traceMetaData);
	}, [traceMetaData]);

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
					stroke-width="1"
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
								stroke-width="1"
							/>
						</g>
					))}
			</svg>
		</div>
	);
};

export default Timeline;
