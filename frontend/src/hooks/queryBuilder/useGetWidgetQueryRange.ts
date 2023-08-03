import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { initialQuery } from 'container/NewDashboard/ComponentsSlider/configs';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { UseQueryOptions, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { GetQueryResultsProps } from 'store/actions/dashboard/getQueryResults';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { GlobalReducer } from 'types/reducer/globalTime';

import { useGetQueryRange } from './useGetQueryRange';
import { useQueryBuilder } from './useQueryBuilder';

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

	const { stagedQuery } = useQueryBuilder();

	return useGetQueryRange(
		{
			graphType,
			selectedTime,
			globalSelectedInterval,
			query: stagedQuery || initialQuery,
			variables: getDashboardVariables(),
		},
		{
			enabled: !!stagedQuery,
			retry: false,
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				selectedTime,
				globalSelectedInterval,
				stagedQuery,
			],
			...options,
		},
	);
};
