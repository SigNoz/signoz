import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import { initialQueriesMap } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import getChartData from 'lib/getChartData';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { Container, ErrorText } from './styles';

function TimeSeriesView(): JSX.Element {
	const { stagedQuery } = useQueryBuilder();

	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { data, isLoading, isError } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap.traces,
			graphType: 'graph',
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource: 'traces',
			},
		},
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				globalSelectedTime,
				stagedQuery,
				maxTime,
				minTime,
			],
			enabled: !!stagedQuery,
		},
	);

	const chartData = useMemo(
		() =>
			getChartData({
				queryData: [
					{
						queryData: data?.payload?.data?.result || [],
					},
				],
			}),
		[data],
	);

	return (
		<Container>
			{isLoading && <Spinner height="50vh" size="small" tip="Loading..." />}
			{isError && <ErrorText>{data?.error || 'Something went wrong'}</ErrorText>}
			{!isLoading && !isError && (
				<Graph
					animate={false}
					data={chartData}
					name="tracesExplorerGraph"
					type="line"
				/>
			)}
		</Container>
	);
}

export default TimeSeriesView;
