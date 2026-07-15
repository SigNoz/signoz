import { useMemo } from 'react';
import useUrlQuery from 'hooks/useUrlQuery';
import { useGetAlertRuleDetailsTimelineGraphData } from 'pages/AlertDetails/hooks';
import DataStateRenderer from 'periscope/components/DataStateRenderer/DataStateRenderer';
import { AlertRuleTimelineGraphResponse } from 'types/api/alerts/def';

import Graph from '../Graph/Graph';

import '../Graph/Graph.styles.scss';

function GraphWrapper({
	totalCurrentTriggers,
}: {
	totalCurrentTriggers: number;
}): JSX.Element {
	const urlQuery = useUrlQuery();

	const relativeTime = urlQuery.get('relativeTime');

	const { isLoading, isRefetching, isError, data, isValidRuleId, ruleId } =
		useGetAlertRuleDetailsTimelineGraphData();

	const adaptedData = useMemo((): AlertRuleTimelineGraphResponse[] | null => {
		if (!data?.data) {
			return null;
		}
		return data.data.map((item) => ({
			start: item.start,
			end: item.end,
			state: item.state as AlertRuleTimelineGraphResponse['state'],
		}));
	}, [data?.data]);

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
					data={adaptedData}
				>
					{(data): JSX.Element => <Graph type="horizontal" data={data} />}
				</DataStateRenderer>
			</div>
		</div>
	);
}

export default GraphWrapper;
