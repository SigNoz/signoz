import './Timeline.styles.scss';

import GraphWrapper from './GraphWrapper/GraphWrapper';
import TimelineTable from './Table/Table';
import TabsAndFilters from './TabsAndFilters/TabsAndFilters';

function TimelineTableRenderer(): JSX.Element {
	return <TimelineTable />;
}

function Timeline({
	totalCurrentTriggers,
}: {
	totalCurrentTriggers: number;
}): JSX.Element {
	return (
		<div className="timeline">
			<div className="timeline__title">Timeline</div>
			<div className="timeline__tabs-and-filters">
				<TabsAndFilters />
			</div>
			<div className="timeline__graph">
				<GraphWrapper totalCurrentTriggers={totalCurrentTriggers} />
			</div>
			<div className="timeline__table">
				<TimelineTableRenderer />
			</div>
		</div>
	);
}

export default Timeline;
