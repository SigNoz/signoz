import { initialQueriesMap } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
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

	const { data, isLoading, isError } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap[dataSource],
			graphType: 'graph',
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
				stagedQuery,
				maxTime,
				minTime,
			],
			enabled: !!stagedQuery,
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
