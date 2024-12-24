import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import TimeSeriesView from './TimeSeriesView';
import { convertDataValueToMs } from './utils';

function TimeSeriesViewContainer({
	dataSource = DataSource.TRACES,
	isFilterApplied,
}: TimeSeriesViewProps): JSX.Element {
	const { stagedQuery, currentQuery, panelType } = useQueryBuilder();

	const { selectedTime: globalSelectedTime, maxTime, minTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

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
			query: stagedQuery || initialQueriesMap[dataSource],
			graphType: panelType || PANEL_TYPES.TIME_SERIES,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			params: {
				dataSource,
			},
		},
		DEFAULT_ENTITY_VERSION,
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				globalSelectedTime,
				maxTime,
				minTime,
				stagedQuery,
			],
			enabled: !!stagedQuery && panelType === PANEL_TYPES.TIME_SERIES,
		},
	);

	const responseData = useMemo(
		() => (isValidToConvertToMs ? convertDataValueToMs(data) : data),
		[data, isValidToConvertToMs],
	);

	return (
		<TimeSeriesView
			isFilterApplied={isFilterApplied}
			isError={isError}
			isLoading={isLoading}
			data={responseData}
			yAxisUnit={isValidToConvertToMs ? 'ms' : 'short'}
			dataSource={dataSource}
		/>
	);
}

interface TimeSeriesViewProps {
	dataSource?: DataSource;
	isFilterApplied: boolean;
}

TimeSeriesViewContainer.defaultProps = {
	dataSource: DataSource.TRACES,
};

export default TimeSeriesViewContainer;
