import { Card } from 'antd';
import GridCard from 'container/GridCardLayout/GridCard';
import { Widgets } from 'types/api/dashboard/getAll';

function MetricOverTimeGraph({
	widget,
	timeRange,
	onDragSelect,
}: {
	widget: Widgets;
	timeRange: { startTime: number; endTime: number };
	onDragSelect: (start: number, end: number) => void;
}): JSX.Element {
	return (
		<div>
			<Card bordered className="endpoint-details-card">
				<div className="graph-container">
					<GridCard
						widget={widget}
						isQueryEnabled
						onDragSelect={onDragSelect}
						customOnDragSelect={(): void => {}}
						customTimeRange={timeRange}
						customTimeRangeWindowForCoRelation="5m"
					/>
				</div>
			</Card>
		</div>
	);
}

export default MetricOverTimeGraph;
