import { Button, Card, Col, Row, Typography } from 'antd';
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

import { GraphPopoverProps, InspectionStep } from './types';
import {
	formatTimestampToFullDateTime,
	getRawDataFromTimeSeries,
	getSpaceAggregatedDataFromTimeSeries,
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
			options?.timeSeries.values.find(
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
				<Row className="graph-popover-row" align="middle" justify="space-between">
					<Row align="middle">
						<div
							style={{
								width: 10,
								height: 10,
								backgroundColor: timeSeries?.strokeColor,
								borderRadius: '50%',
								marginRight: 8,
							}}
						/>
						<Typography.Text>{timeSeries?.title}</Typography.Text>
					</Row>
					<Typography.Text strong>
						{Number(absoluteValue).toLocaleString()}
					</Typography.Text>
				</Row>

				{/* Table */}
				<Row className="graph-popover-row" gutter={[12, 12]} align="middle">
					<Col>
						<Typography.Text className="graph-popover-row-label">
							{step === InspectionStep.TIME_AGGREGATION ? 'RAW VALUES' : 'VALUES'}
						</Typography.Text>
					</Col>
					<Col>
						<Row className="graph-popover-inner-row" gutter={[8, 8]}>
							{data?.map(({ value }) => (
								<Col key={value}>
									<div className="graph-popover-cell">{value}</div>
								</Col>
							))}
						</Row>
					</Col>
				</Row>
				{step !== InspectionStep.COMPLETED && (
					<Row className="graph-popover-row" gutter={[12, 12]} align="middle">
						<Col>
							<Typography.Text className="graph-popover-row-label">
								TIMESTAMPS
							</Typography.Text>
						</Col>
						<Col>
							<Row className="graph-popover-inner-row" gutter={[8, 8]}>
								{data?.map(({ timestamp }) => (
									<Col key={timestamp}>
										<div className="graph-popover-cell">
											{formatTimestampToFullDateTime(timestamp ?? '', true)}
										</div>
									</Col>
								))}
							</Row>
						</Col>
					</Row>
				)}
				{step === InspectionStep.COMPLETED && (
					<Row className="graph-popover-row" gutter={[12, 12]} align="middle">
						<Col>
							<Typography.Text className="graph-popover-row-label">
								TIME SERIES
							</Typography.Text>
						</Col>
						<Col>
							<Row className="graph-popover-inner-row" gutter={[8, 8]}>
								{data?.map(({ title }) => (
									<Col key={title}>
										<div className="graph-popover-cell">{title}</div>
									</Col>
								))}
							</Row>
						</Col>
					</Row>
				)}

				{/* Footer */}
				<Row align="middle" className="footer-row">
					<Typography.Text className="footer-text">
						Click to see more
					</Typography.Text>

					{/* Dotted horizontal line that stretches */}
					<div className="footer-divider" />

					<Button type="text" onClick={openInExpandedView}>
						<ArrowRight size={14} />
					</Button>
				</Row>
			</Card>
		</div>
	);
}

export default GraphPopover;
