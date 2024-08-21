import './graph.styles.scss';

import { BarChartOutlined } from '@ant-design/icons';
import useUrlQuery from 'hooks/useUrlQuery';

function Graph({
	totalCurrentTriggers,
}: {
	totalCurrentTriggers: number;
}): JSX.Element {
	const urlQuery = useUrlQuery();

	const relativeTime = urlQuery.get('relativeTime');

	return (
		<div className="timeline-graph">
			<div className="timeline-graph__title">
				{totalCurrentTriggers} triggers in {relativeTime}
			</div>
			<div className="timeline-graph__chart">
				<div className="chart-placeholder">
					<BarChartOutlined className="chart-icon" />
				</div>
			</div>
		</div>
	);
}

export default Graph;
