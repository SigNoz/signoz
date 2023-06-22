import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { getExplorerChartData } from 'lib/explorer/getExplorerChartData';
import { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { CardStyled } from './LogsExplorerChart.styled';

function LogsExplorerChart(): JSX.Element {
	const { stagedQuery, panelType, isEnabledQuery } = useQueryBuilder();

	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { data, isFetching } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap.metrics,
			graphType: panelType || PANEL_TYPES.LIST,
			globalSelectedInterval: selectedTime,
			selectedTime: 'GLOBAL_TIME',
		},
		{
			queryKey: [REACT_QUERY_KEY.GET_QUERY_RANGE, selectedTime, stagedQuery],
			enabled: isEnabledQuery,
		},
	);

	const graphData = useMemo(() => {
		if (data?.payload.data && data.payload.data.result.length > 0) {
			return getExplorerChartData([data.payload.data.result[0]]);
		}

		return getExplorerChartData([]);
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

export default memo(LogsExplorerChart);
