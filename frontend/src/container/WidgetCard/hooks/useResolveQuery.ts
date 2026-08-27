import { useCallback } from 'react';
import { useMutation } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { isEmpty } from 'lodash-es';
import { getSubstituteVars } from 'api/dashboard/substitute_vars';
import { prepareQueryRangePayloadV5 } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { timePreferenceType } from 'constants/timePreference';
import { useDynamicVariableSuggestions } from 'hooks/dashboard/useDynamicVariableSuggestions';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
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

	const dashboardDynamicVariables = useDynamicVariableSuggestions();

	const getUpdatedQuery = useCallback(
		async ({ widgetConfig }: UseUpdatedQueryOptions): Promise<Query> => {
			// `/substitute_vars` only rewrites `$variable` references, so on surfaces with no
			// dashboard behind them (APM, Celery, API monitoring) the round-trip is a no-op.
			if (isEmpty(dashboardDynamicVariables)) {
				return widgetConfig.query;
			}

			// Prepare query payload with resolved variables
			const { queryPayload } = prepareQueryRangePayloadV5({
				query: widgetConfig.query,
				graphType: getGraphType(widgetConfig.panelTypes),
				selectedTime: widgetConfig.timePreferance,
				globalSelectedInterval,
				originalGraphType: widgetConfig.panelTypes,
				dynamicVariables: dashboardDynamicVariables,
			});

			// Execute query and process results
			const queryResult = await queryRangeMutation.mutateAsync(queryPayload);

			// Map query data from API response
			return mapQueryDataFromApi(queryResult.data.compositeQuery);
		},
		[dashboardDynamicVariables, globalSelectedInterval, queryRangeMutation],
	);

	return {
		getUpdatedQuery,
		isLoading: queryRangeMutation.isLoading,
	};
}

export default useUpdatedQuery;
