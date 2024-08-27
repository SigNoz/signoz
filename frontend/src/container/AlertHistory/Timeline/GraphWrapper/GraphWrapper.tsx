import '../Graph/graph.styles.scss';

import useUrlQuery from 'hooks/useUrlQuery';
import { useGetAlertRuleDetailsTimelineGraphData } from 'pages/AlertDetails/hooks';
import DataStateRenderer from 'periscope/components/DataStateRenderer/DataStateRenderer';

import Graph from '../Graph/Graph';

function GraphWrapper({
	totalCurrentTriggers,
}: {
	totalCurrentTriggers: number;
}): JSX.Element {
	const urlQuery = useUrlQuery();

	const relativeTime = urlQuery.get('relativeTime');

	const {
		isLoading,
		isRefetching,
		isError,
		data,
		isValidRuleId,
		ruleId,
	} = useGetAlertRuleDetailsTimelineGraphData();

	return (
		<div className="timeline-graph">
			<div className="timeline-graph__title">
				{totalCurrentTriggers} triggers in {relativeTime}
			</div>
			<div className="timeline-graph__chart">
				<DataStateRenderer
					isLoading={isLoading}
					isError={isError || !isValidRuleId || !ruleId}
					isRefetching={isRefetching}
					data={data?.payload?.data || null}
				>
					{(data): JSX.Element => <Graph type="horizontal" data={data} />}
				</DataStateRenderer>
			</div>
		</div>
	);
}

export default GraphWrapper;
