import './timeline.styles.scss';

import Graph from './Graph/Graph';
import TabsAndFilters from './TabsAndFilters/TabsAndFilters';

function Timeline(): JSX.Element {
	return (
		<div className="timeline">
			<div className="timeline__title">Timeline</div>
			<div className="timeline__tabs-and-filters">
				<TabsAndFilters />
			</div>
			<div className="timeline__graph">
				<Graph />
			</div>
		</div>
	);
}

export default Timeline;
