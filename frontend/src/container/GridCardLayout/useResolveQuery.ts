import { getQueryRangeFormat } from 'api/dashboard/queryRangeFormat';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { prepareQueryRangePayload } from 'lib/dashboard/prepareQueryRangePayload';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { useCallback } from 'react';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';

interface UseUpdatedQueryOptions {
	widget: Widgets;
	selectedDashboard?: any;
}

interface UseUpdatedQueryResult {
	getUpdatedQuery: (options: UseUpdatedQueryOptions) => Promise<Query>;
	isLoading: boolean;
	isError: boolean;
	error: unknown;
}

function useUpdatedQuery(): UseUpdatedQueryResult {
	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const queryRangeMutation = useMutation(getQueryRangeFormat);

	const getUpdatedQuery = useCallback(
		async ({
			widget,
			selectedDashboard,
		}: UseUpdatedQueryOptions): Promise<Query> => {
			// Prepare query payload with resolved variables
			const { queryPayload } = prepareQueryRangePayload({
				query: widget.query,
				graphType: getGraphType(widget.panelTypes),
				selectedTime: widget.timePreferance,
				globalSelectedInterval,
				variables: getDashboardVariables(selectedDashboard?.data?.variables),
			});

			// Execute query and process results
			const queryResult = await queryRangeMutation.mutateAsync(queryPayload);

			// Map query data from API response
			return mapQueryDataFromApi(queryResult.compositeQuery, widget?.query);
		},
		[globalSelectedInterval, queryRangeMutation],
	);

	return {
		getUpdatedQuery,
		isLoading: queryRangeMutation.isLoading,
		isError: queryRangeMutation.isError,
		error: queryRangeMutation.error,
	};
}

export default useUpdatedQuery;
