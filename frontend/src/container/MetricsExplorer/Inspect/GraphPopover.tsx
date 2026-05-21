import { useMemo } from 'react';
import { ArrowRight } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { Card } from 'antd';

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
					<Typography.Text color="muted">
						{formatTimestampToFullDateTime(closestTimestamp)}
					</Typography.Text>
					<Typography.Text>{Number(closestValue).toFixed(2)}</Typography.Text>
				</div>
				<div className="inspect-graph-popover-button-row">
					<Button onClick={openInExpandedView} size="sm">
						<Typography.Text>View details</Typography.Text>
						<ArrowRight size={10} />
					</Button>
				</div>
			</Card>
		</div>
	);
}

export default GraphPopover;
