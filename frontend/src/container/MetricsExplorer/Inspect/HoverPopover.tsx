import { Card } from 'antd';
import { Typography } from '@signozhq/ui/typography';

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
	let closestTimestamp = options.timestamp;
	let closestValue: string | number | null = options.value;

	if (options.timeSeries) {
		closestTimestamp = options.timeSeries.values.reduce((prev, curr) => {
			const prevDiff = Math.abs(prev.timestamp - options.timestamp);
			const currDiff = Math.abs(curr.timestamp - options.timestamp);
			return prevDiff < currDiff ? prev : curr;
		}).timestamp;
		const index = options.timeSeries.values.findIndex(
			(entry) => entry.timestamp === closestTimestamp,
		);
		closestValue =
			index !== undefined && index >= 0
				? options.timeSeries.values[index].value
				: null;
	}

	let title: JSX.Element | string | undefined;
	if (
		step === InspectionStep.COMPLETED &&
		metricInspectionAppliedOptions.spaceAggregationLabels.length === 0
	) {
		title = undefined;
	} else if (step === InspectionStep.COMPLETED && options.timeSeries?.title) {
		title = options.timeSeries.title;
	} else if (!options.timeSeries) {
		title = undefined;
	} else {
		title = (
			<TimeSeriesLabel
				timeSeries={options.timeSeries}
				textColor={options.timeSeries?.strokeColor}
			/>
		);
	}

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
