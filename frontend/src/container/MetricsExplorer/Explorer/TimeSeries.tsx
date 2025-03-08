import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import TimeSeriesView from 'container/TimeSeriesView/TimeSeriesView';
import { convertDataValueToMs } from 'container/TimeSeriesView/utils';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { TimeSeriesProps } from './types';

function TimeSeries({ showOneChartPerQuery }: TimeSeriesProps): JSX.Element {
	const { stagedQuery, currentQuery } = useQueryBuilder();

	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	console.log(showOneChartPerQuery);

	const isValidToConvertToMs = useMemo(() => {
		const isValid: boolean[] = [];

		currentQuery.builder.queryData.forEach(
			({ aggregateAttribute, aggregateOperator }) => {
				const isExistDurationNanoAttribute =
					aggregateAttribute.key === 'durationNano' ||
					aggregateAttribute.key === 'duration_nano';

				const isCountOperator =
					aggregateOperator === 'count' || aggregateOperator === 'count_distinct';

				isValid.push(!isCountOperator && isExistDurationNanoAttribute);
			},
		);

		return isValid.every(Boolean);
	}, [currentQuery]);

	const { data, isLoading, isError } = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap[DataSource.METRICS],
			graphType: PANEL_TYPES.TIME_SERIES,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource: DataSource.METRICS,
			},
		},
		'v4',
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				globalSelectedTime,
				maxTime,
				minTime,
				stagedQuery,
			],
			enabled: !!stagedQuery,
		},
	);

	const responseData = useMemo(
		() => (isValidToConvertToMs ? convertDataValueToMs(data) : data),
		[data, isValidToConvertToMs],
	);

	return (
		<TimeSeriesView
			isFilterApplied={false}
			isError={isError}
			isLoading={isLoading}
			data={responseData}
			yAxisUnit={isValidToConvertToMs ? 'ms' : 'short'}
			dataSource={DataSource.METRICS}
		/>
	);
}

export default TimeSeries;
