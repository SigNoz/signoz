import { COMPOSITE_QUERY } from 'constants/queryBuilderQueryNames';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import useUrlQuery from 'hooks/useUrlQuery';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { UseQueryOptions, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { GetQueryResultsProps } from 'store/actions/dashboard/getQueryResults';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { GlobalReducer } from 'types/reducer/globalTime';

import { useGetQueryRange } from './useGetQueryRange';

export const useGetWidgetQueryRange = (
	{
		graphType,
		selectedTime,
	}: Pick<GetQueryResultsProps, 'graphType' | 'selectedTime'>,
	options?: UseQueryOptions<SuccessResponse<MetricRangePayloadProps>, Error>,
): UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error> => {
	const urlQuery = useUrlQuery();

	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const compositeQuery = urlQuery.get(COMPOSITE_QUERY);

	return useGetQueryRange(
		{
			graphType,
			selectedTime,
			globalSelectedInterval,
			query: JSON.parse(compositeQuery || ''),
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
