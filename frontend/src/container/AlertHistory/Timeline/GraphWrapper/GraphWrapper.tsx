import '../Graph/Graph.styles.scss';

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

	// TODO(shaheer): uncomment when the API is ready for
	// const { startTime } = useAlertHistoryQueryParams();

	// const [isVerticalGraph, setIsVerticalGraph] = useState(false);

	// useEffect(() => {
	// 	const checkVerticalGraph = (): void => {
	// 		if (startTime) {
	// 			const startTimeDate = dayjs(Number(startTime));
	// 			const twentyFourHoursAgo = dayjs().subtract(
	// 				HORIZONTAL_GRAPH_HOURS_THRESHOLD,
	// 				DAYJS_MANIPULATE_TYPES.HOUR,
	// 			);

	// 			setIsVerticalGraph(startTimeDate.isBefore(twentyFourHoursAgo));
	// 		}
	// 	};

	// 	checkVerticalGraph();
	// }, [startTime]);

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
