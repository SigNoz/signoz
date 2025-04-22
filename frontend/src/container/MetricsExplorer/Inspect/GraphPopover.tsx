import { Button, Card, Typography } from 'antd';
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

import { GraphPopoverProps, InspectionStep } from './types';
import {
	formatTimestampToFullDateTime,
	getRawDataFromTimeSeries,
	getSpaceAggregatedDataFromTimeSeries,
	getTimeSeriesLabel,
} from './utils';

function GraphPopover({
	options,
	spaceAggregationSeriesMap,
	popoverRef,
	step,
	openInExpandedView,
}: GraphPopoverProps): JSX.Element | null {
	const { x, y, timestamp, timeSeries } = options || {
		x: 0,
		y: 0,
		value: '',
		timestamp: 0,
		timeSeries: null,
	};

	const absoluteValue = useMemo(
		() =>
			options?.timeSeries?.values.find(
				(value) => value.timestamp >= options?.timestamp,
			)?.value ?? options?.value,
		[options],
	);

	const data = useMemo(() => {
		if (
			step === InspectionStep.TIME_AGGREGATION ||
			step === InspectionStep.SPACE_AGGREGATION
		) {
			if (!timeSeries || !timestamp) return [];
			return getRawDataFromTimeSeries(timeSeries, timestamp);
		}
		if (step === InspectionStep.COMPLETED) {
			if (!timeSeries || !spaceAggregationSeriesMap) return [];
			return getSpaceAggregatedDataFromTimeSeries(
				timeSeries,
				spaceAggregationSeriesMap,
				timestamp,
			);
		}
		return null;
	}, [spaceAggregationSeriesMap, step, timeSeries, timestamp]);

	return (
		<div
			style={{
				top: y + 10,
				left: x + 10,
			}}
			ref={popoverRef}
			className="graph-popover"
		>
			<Card className="graph-popover-card" size="small">
				{/* Header */}
				<Typography.Text className="graph-popover-header-text">
					{formatTimestampToFullDateTime(timestamp)}
				</Typography.Text>
				<div className="graph-popover-row">
					<div className="graph-popover-inner-row">
						<div
							style={{
								width: 10,
								height: 10,
								backgroundColor: timeSeries?.strokeColor,
								borderRadius: '50%',
								marginRight: 8,
							}}
						/>
						{timeSeries && (
							<Typography.Text>{getTimeSeriesLabel(timeSeries)}</Typography.Text>
						)}
					</div>
					<Typography.Text strong>
						{Number(absoluteValue).toFixed(0)}
					</Typography.Text>
				</div>

				{/* Table */}
				<div className="graph-popover-row">
					<Typography.Text className="graph-popover-row-label">
						{step === InspectionStep.TIME_AGGREGATION ? 'RAW VALUES' : 'VALUES'}
					</Typography.Text>
					<div className="graph-popover-inner-row">
						{data?.map(({ value }) => (
							<div key={value} className="graph-popover-cell">
								{value}
							</div>
						))}
					</div>
				</div>
				{step !== InspectionStep.COMPLETED && (
					<div className="graph-popover-row">
						<Typography.Text className="graph-popover-row-label">
							TIMESTAMPS
						</Typography.Text>
						<div className="graph-popover-inner-row">
							{data?.map(({ timestamp }) => (
								<div key={timestamp} className="graph-popover-cell">
									{formatTimestampToFullDateTime(timestamp ?? '', true)}
								</div>
							))}
						</div>
					</div>
				)}
				{step === InspectionStep.COMPLETED && (
					<div className="graph-popover-row">
						<Typography.Text className="graph-popover-row-label">
							TIME SERIES
						</Typography.Text>
						<div className="graph-popover-inner-row">
							{data?.map(({ title }) => (
								<div key={title} className="graph-popover-cell">
									{title}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Footer */}
				<div className="footer-row">
					<Typography.Text className="footer-text">
						Click to see more
					</Typography.Text>

					{/* Dotted horizontal line that stretches */}
					<div className="footer-divider" />

					<Button type="text" onClick={openInExpandedView}>
						<ArrowRight size={14} />
					</Button>
				</div>
			</Card>
		</div>
	);
}

export default GraphPopover;
