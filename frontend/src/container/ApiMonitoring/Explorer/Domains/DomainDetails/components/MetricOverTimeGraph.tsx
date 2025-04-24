import { Card } from 'antd';
import GridCard from 'container/GridCardLayout/GridCard';
import { Widgets } from 'types/api/dashboard/getAll';

function MetricOverTimeGraph({
	widget,
	timeRange,
}: {
	widget: Widgets;
	timeRange: { startTime: number; endTime: number };
}): JSX.Element {
	return (
		<div>
			<Card bordered className="endpoint-details-card">
				<div className="graph-container">
					<GridCard
						widget={widget}
						isQueryEnabled
						onDragSelect={(): void => {}}
						customOnDragSelect={(): void => {}}
						start={timeRange.startTime}
						end={timeRange.endTime}
					/>
				</div>
			</Card>
		</div>
	);
}

export default MetricOverTimeGraph;
