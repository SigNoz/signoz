import GraphWrapper from './GraphWrapper/GraphWrapper';
import TimelineTable from './Table/Table';
import TabsAndFilters from './TabsAndFilters/TabsAndFilters';

import styles from './Timeline.module.scss';

function TimelineTableRenderer(): JSX.Element {
	return <TimelineTable />;
}

function Timeline({
	totalCurrentTriggers,
}: {
	totalCurrentTriggers: number;
}): JSX.Element {
	return (
		<div className={styles.timeline}>
			<div className={styles.timelineTitle}>Timeline</div>
			<div>
				<TabsAndFilters />
			</div>
			<div>
				<GraphWrapper totalCurrentTriggers={totalCurrentTriggers} />
			</div>
			<div>
				<TimelineTableRenderer />
			</div>
		</div>
	);
}

export default Timeline;
