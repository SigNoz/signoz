import { useMemo } from 'react';
import { Card } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import {
	GraphPopoverOptions,
	InspectionStep,
	MetricInspectionOptions,
	TimeSeriesLabelProps,
} from './types';
import { formatTimestampToFullDateTime } from './utils';

function TimeSeriesLabel({
	timeSeries,
	textColor,
}: TimeSeriesLabelProps): JSX.Element {
	return (
		<>
			{Object.entries(timeSeries?.labels ?? {}).map(([key, value]) => (
				<span key={key}>
					<span style={{ display: 'contents', color: textColor }}>
						<Typography
							variant="paragraph"
							size="base"
							weight="bold"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							{key}
						</Typography>
					</span>
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
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					{formatTimestampToFullDateTime(closestTimestamp ?? 0)}
				</Typography>
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					{Number(closestValue).toFixed(2)}
				</Typography>
			</div>
			{options.timeSeries && (
				<span
					style={{ display: 'contents', color: options.timeSeries?.strokeColor }}
				>
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						{title}
					</Typography>
				</span>
			)}
		</Card>
	);
}

export default HoverPopover;
