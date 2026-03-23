import { useMemo } from 'react';
import { Card, Typography } from 'antd';

import {
	GraphPopoverOptions,
	InspectionStep,
	MetricInspectionOptions,
} from './types';
import { TimeSeriesLabelProps } from './types';
import { formatTimestampToFullDateTime } from './utils';

function TimeSeriesLabel({
	timeSeries,
	textColor,
}: TimeSeriesLabelProps): JSX.Element {
	return (
		<>
			{Object.entries(timeSeries?.labels ?? {}).map(([key, value]) => (
				<span key={key}>
					<Typography.Text style={{ color: textColor, fontWeight: 600 }}>
						{key}
					</Typography.Text>
					: {value}{' '}
				</span>
			))}
		</>
	);
}

function HoverPopover({
	options,
	step,
	metricInspectionAppliedOptions,
}: {
	options: GraphPopoverOptions;
	step: InspectionStep;
	metricInspectionAppliedOptions: MetricInspectionOptions;
}): JSX.Element {
	const closestTimestamp = useMemo(() => {
		if (!options.timeSeries) {
			return options.timestamp;
		}
		return options.timeSeries?.values.reduce((prev, curr) => {
			const prevDiff = Math.abs(prev.timestamp - options.timestamp);
			const currDiff = Math.abs(curr.timestamp - options.timestamp);
			return prevDiff < currDiff ? prev : curr;
		}).timestamp;
	}, [options.timeSeries, options.timestamp]);

	const closestValue = useMemo(() => {
		if (!options.timeSeries) {
			return options.value;
		}
		const index = options.timeSeries.values.findIndex(
			(value) => value.timestamp === closestTimestamp,
		);
		return index !== undefined && index >= 0
			? options.timeSeries?.values[index].value
			: null;
	}, [options.timeSeries, closestTimestamp, options.value]);

	const title = useMemo(() => {
		if (
			step === InspectionStep.COMPLETED &&
			metricInspectionAppliedOptions.spaceAggregationLabels.length === 0
		) {
			return undefined;
		}
		if (step === InspectionStep.COMPLETED && options.timeSeries?.title) {
			return options.timeSeries.title;
		}
		if (!options.timeSeries) {
			return undefined;
		}
		return (
			<TimeSeriesLabel
				timeSeries={options.timeSeries}
				textColor={options.timeSeries?.strokeColor}
			/>
		);
	}, [step, options.timeSeries, metricInspectionAppliedOptions]);

	return (
		<Card
			className="hover-popover-card"
			style={{
				top: options.y + 10,
				left: options.x + 10,
			}}
		>
			<div className="hover-popover-row">
				<Typography.Text>
					{formatTimestampToFullDateTime(closestTimestamp ?? 0)}
				</Typography.Text>
				<Typography.Text>{Number(closestValue).toFixed(2)}</Typography.Text>
			</div>
			{options.timeSeries && (
				<Typography.Text
					style={{
						color: options.timeSeries?.strokeColor,
						fontWeight: 200,
					}}
				>
					{title}
				</Typography.Text>
			)}
		</Card>
	);
}

export default HoverPopover;
