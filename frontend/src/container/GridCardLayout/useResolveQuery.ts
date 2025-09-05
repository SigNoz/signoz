import { getSubstituteVars } from 'api/dashboard/substitute_vars';
import { prepareQueryRangePayloadV5 } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useMemo } from 'react';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
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

	const queryRangeMutation = useMutation(getSubstituteVars);

	const { selectedDashboard } = useDashboard();

	const dynamicVariables = useMemo(
		() =>
			Object.values(selectedDashboard?.data?.variables || {})?.filter(
				(variable: IDashboardVariable) => variable.type === 'DYNAMIC',
			),
		[selectedDashboard],
	);

	const getUpdatedQuery = useCallback(
		async ({
			widgetConfig,
			selectedDashboard,
		}: UseUpdatedQueryOptions): Promise<Query> => {
			// Prepare query payload with resolved variables
			const { queryPayload } = prepareQueryRangePayloadV5({
				query: widgetConfig.query,
				graphType: getGraphType(widgetConfig.panelTypes),
				selectedTime: widgetConfig.timePreferance,
				globalSelectedInterval,
				variables: getDashboardVariables(selectedDashboard?.data?.variables),
				originalGraphType: widgetConfig.panelTypes,
				dynamicVariables,
			});

			// Execute query and process results
			const queryResult = await queryRangeMutation.mutateAsync(queryPayload);

			// Map query data from API response
			return mapQueryDataFromApi(queryResult.data.compositeQuery);
		},
		[dynamicVariables, globalSelectedInterval, queryRangeMutation],
	);

	return {
		getUpdatedQuery,
		isLoading: queryRangeMutation.isLoading,
	};
}

export default useUpdatedQuery;
