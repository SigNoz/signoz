import { getQueryRangeFormat } from 'api/dashboard/queryRangeFormat';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { prepareQueryRangePayload } from 'lib/dashboard/prepareQueryRangePayload';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { useCallback } from 'react';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';

interface UseUpdatedQueryOptions {
	widgetConfig: {
		query: Query;
		panelTypes: PANEL_TYPES;
		timePreferance: timePreferenceType;
	};
	selectedDashboard?: any;
}

interface UseUpdatedQueryResult {
	getUpdatedQuery: (options: UseUpdatedQueryOptions) => Promise<Query>;
	isLoading: boolean;
}

function useUpdatedQuery(): UseUpdatedQueryResult {
	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const queryRangeMutation = useMutation(getQueryRangeFormat);

	const getUpdatedQuery = useCallback(
		async ({
			widgetConfig,
			selectedDashboard,
		}: UseUpdatedQueryOptions): Promise<Query> => {
			// Prepare query payload with resolved variables
			const { queryPayload } = prepareQueryRangePayload({
				query: widgetConfig.query,
				graphType: getGraphType(widgetConfig.panelTypes),
				selectedTime: widgetConfig.timePreferance,
				globalSelectedInterval,
				variables: getDashboardVariables(selectedDashboard?.data?.variables),
			});

			// Execute query and process results
			const queryResult = await queryRangeMutation.mutateAsync(queryPayload);

			// Map query data from API response
			return mapQueryDataFromApi(queryResult.compositeQuery, widgetConfig?.query);
		},
		[globalSelectedInterval, queryRangeMutation],
	);

	return {
		getUpdatedQuery,
		isLoading: queryRangeMutation.isLoading,
	};
}

export default useUpdatedQuery;
