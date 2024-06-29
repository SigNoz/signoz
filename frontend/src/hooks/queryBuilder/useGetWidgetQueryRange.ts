import { initialQueriesMap } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { UseQueryOptions, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
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
	version: string,
	options?: UseQueryOptions<SuccessResponse<MetricRangePayloadProps>, Error>,
): UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error> => {
	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { stagedQuery } = useQueryBuilder();

	const { selectedDashboard } = useDashboard();

	return useGetQueryRange(
		{
			graphType,
			selectedTime,
			globalSelectedInterval,
			query: stagedQuery || initialQueriesMap.metrics,
			variables: getDashboardVariables(selectedDashboard?.data.variables),
		},
		version,
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
