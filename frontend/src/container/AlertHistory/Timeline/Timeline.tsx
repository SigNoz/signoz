import './timeline.styles.scss';

import TabsAndFilters from './TabsAndFilters/TabsAndFilters';

function Timeline(): JSX.Element {
	return (
		<div className="timeline">
			<div className="timeline__title">Timeline</div>
			<div className="timeline__tabs-and-filters">
				<TabsAndFilters />
			</div>
		</div>
	);
}

export default Timeline;
