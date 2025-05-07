import { Button, Card, Typography } from 'antd';
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

import { GraphPopoverProps } from './types';
import { formatTimestampToFullDateTime } from './utils';

function GraphPopover({
	options,
	popoverRef,
	openInExpandedView,
}: GraphPopoverProps): JSX.Element | null {
	const { x, y, value, timestamp, timeSeries } = options || {
		x: 0,
		y: 0,
		value: 0,
		timestamp: 0,
		timeSeries: null,
	};

	const closestTimestamp = useMemo(() => {
		if (!timeSeries) {
			return timestamp;
		}
		return timeSeries?.values.reduce((prev, curr) => {
			const prevDiff = Math.abs(prev.timestamp - timestamp);
			const currDiff = Math.abs(curr.timestamp - timestamp);
			return prevDiff < currDiff ? prev : curr;
		}).timestamp;
	}, [timeSeries, timestamp]);

	const closestValue = useMemo(() => {
		if (!timeSeries) {
			return value;
		}
		const index = timeSeries.values.findIndex(
			(value) => value.timestamp === closestTimestamp,
		);
		return index !== undefined && index >= 0
			? timeSeries?.values[index].value
			: null;
	}, [timeSeries, closestTimestamp, value]);

	return (
		<div
			style={{
				top: y + 10,
				left: x + 10,
			}}
			ref={popoverRef}
			className="inspect-graph-popover"
		>
			<Card className="inspect-graph-popover-content" size="small">
				<div className="inspect-graph-popover-row">
					<Typography.Text type="secondary">
						{formatTimestampToFullDateTime(closestTimestamp)}
					</Typography.Text>
					<Typography.Text>{Number(closestValue).toFixed(2)}</Typography.Text>
				</div>
				<div className="inspect-graph-popover-button-row">
					<Button size="small" type="primary" onClick={openInExpandedView}>
						<Typography.Text>View details</Typography.Text>
						<ArrowRight size={10} />
					</Button>
				</div>
			</Card>
		</div>
	);
}

export default GraphPopover;
