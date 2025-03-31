import { Card } from 'antd';
import GridCard from 'container/GridCardLayout/GridCard';
import { Widgets } from 'types/api/dashboard/getAll';

function MetricOverTimeGraph({ widget }: { widget: Widgets }): JSX.Element {
	return (
		<div>
			<Card bordered className="endpoint-details-card">
				<div className="graph-container">
					<GridCard
						widget={widget}
						isQueryEnabled
						onDragSelect={(): void => {}}
						customOnDragSelect={(): void => {}}
					/>
				</div>
			</Card>
		</div>
	);
}

export default MetricOverTimeGraph;
