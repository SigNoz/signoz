import './timeline.styles.scss';

import { useGetAlertRuleDetailsTimelineTable } from 'pages/AlertDetails/hooks';
import DataStateRenderer from 'periscope/components/DataStateRenderer/DataStateRenderer';

import Graph from './Graph/Graph';
import TimelineTable from './Table/Table';
import TabsAndFilters from './TabsAndFilters/TabsAndFilters';

function TimelineTableRenderer(): JSX.Element {
	const {
		isLoading,
		isRefetching,
		isError,
		data,
		isValidRuleId,
		ruleId,
	} = useGetAlertRuleDetailsTimelineTable();

	return (
		<DataStateRenderer
			isLoading={isLoading}
			isRefetching={isRefetching}
			isError={isError || !isValidRuleId || !ruleId}
			data={data?.payload?.data || null}
		>
			{(timelineData): JSX.Element => (
				<TimelineTable timelineData={timelineData} />
			)}
		</DataStateRenderer>
	);
}

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
			<div className="timeline__table">
				<TimelineTableRenderer />
			</div>
		</div>
	);
}

export default Timeline;
