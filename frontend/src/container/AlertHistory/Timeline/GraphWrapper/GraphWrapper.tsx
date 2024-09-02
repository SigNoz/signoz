import '../Graph/Graph.styles.scss';

import { BarChartOutlined } from '@ant-design/icons';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';
import { useGetAlertRuleDetailsTimelineGraphData } from 'pages/AlertDetails/hooks';
import DataStateRenderer from 'periscope/components/DataStateRenderer/DataStateRenderer';
import { useEffect, useState } from 'react';

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

	const startTime = urlQuery.get(QueryParams.startTime);

	const [isPlaceholder, setIsPlaceholder] = useState(false);

	useEffect(() => {
		if (startTime) {
			const startTimeDate = new Date(startTime);
			const now = new Date();
			const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

			if (startTimeDate < twentyFourHoursAgo) {
				setIsPlaceholder(true);
			} else {
				setIsPlaceholder(false);
			}
		}
	}, [startTime]);

	return (
		<div className="timeline-graph">
			<div className="timeline-graph__title">
				{totalCurrentTriggers} triggers in {relativeTime}
			</div>
			<div className="timeline-graph__chart">
				{isPlaceholder ? (
					<div className="chart-placeholder">
						<BarChartOutlined className="chart-icon" />
					</div>
				) : (
					<DataStateRenderer
						isLoading={isLoading}
						isError={isError || !isValidRuleId || !ruleId}
						isRefetching={isRefetching}
						data={data?.payload?.data || null}
					>
						{(data): JSX.Element => <Graph type="horizontal" data={data} />}
					</DataStateRenderer>
				)}
			</div>
		</div>
	);
}

export default GraphWrapper;
