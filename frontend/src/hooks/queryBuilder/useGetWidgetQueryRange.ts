import { initialQueriesMap } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { UseQueryOptions, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { GetQueryResultsProps } from 'store/actions/dashboard/getQueryResults';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { GlobalReducer } from 'types/reducer/globalTime';

import { useGetCompositeQueryParam } from './useGetCompositeQueryParam';
import { useGetQueryRange } from './useGetQueryRange';

export const useGetWidgetQueryRange = (
	{
		graphType,
		selectedTime,
	}: Pick<GetQueryResultsProps, 'graphType' | 'selectedTime'>,
	options?: UseQueryOptions<SuccessResponse<MetricRangePayloadProps>, Error>,
): UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error> => {
	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const compositeQuery = useGetCompositeQueryParam();

	return useGetQueryRange(
		{
			graphType,
			selectedTime,
			globalSelectedInterval,
			query: compositeQuery || initialQueriesMap.metrics,
			variables: getDashboardVariables(),
		},
		{
			enabled: !!compositeQuery,
			retry: false,
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				selectedTime,
				globalSelectedInterval,
				compositeQuery,
			],
			...options,
		},
	);
};
