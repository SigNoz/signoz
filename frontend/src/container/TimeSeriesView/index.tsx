import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { PANEL_TYPES_QUERY } from 'constants/queryBuilderQueryNames';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import TimeSeriesView from './TimeSeriesView';

function TimeSeriesViewContainer({
	dataSource = DataSource.TRACES,
}: TimeSeriesViewProps): JSX.Element {
	const { stagedQuery } = useQueryBuilder();

	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { queryData: panelTypeParam } = useUrlQueryData<GRAPH_TYPES>(
		PANEL_TYPES_QUERY,
		PANEL_TYPES.TIME_SERIES,
	);

	const { data, isLoading, isError } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap[dataSource],
			graphType: panelTypeParam,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource,
			},
		},
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				globalSelectedTime,
				maxTime,
				minTime,
				stagedQuery,
			],
			enabled: !!stagedQuery && panelTypeParam === PANEL_TYPES.TIME_SERIES,
		},
	);

	return <TimeSeriesView isError={isError} isLoading={isLoading} data={data} />;
}

interface TimeSeriesViewProps {
	dataSource?: DataSource;
}

TimeSeriesViewContainer.defaultProps = {
	dataSource: DataSource.TRACES,
};

export default TimeSeriesViewContainer;
