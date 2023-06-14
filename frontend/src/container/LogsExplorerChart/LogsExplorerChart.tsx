import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { getLogsExplorerChartData } from 'lib/logsExplorer/getLogsExplorerChartData';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { CardStyled } from './LogsExplorerChart.styled';

export function LogsExplorerChart(): JSX.Element {
	const { stagedQuery } = useQueryBuilder();

	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { data, isFetching } = useGetQueryRange(
		{
			query: stagedQuery,
			graphType: PANEL_TYPES.TIME_SERIES,
			globalSelectedInterval: selectedTime,
			selectedTime: 'GLOBAL_TIME',
		},
		{ queryKey: [REACT_QUERY_KEY.GET_QUERY_RANGE, selectedTime, stagedQuery] },
	);

	const graphData = useMemo(() => {
		if (data?.payload.data) {
			return getLogsExplorerChartData(data.payload.data.result);
		}

		return {
			labels: [],
			datasets: [
				{
					data: [],
				},
			],
		};
	}, [data]);

	return (
		<CardStyled>
			{isFetching ? (
				<Spinner size="default" height="100%" />
			) : (
				<Graph
					name="logsExplorerChart"
					data={graphData}
					type="bar"
					containerHeight="100%"
					animate
				/>
			)}
		</CardStyled>
	);
}
