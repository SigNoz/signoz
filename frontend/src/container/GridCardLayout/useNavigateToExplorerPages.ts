import { getQueryRangeFormat } from 'api/dashboard/queryRangeFormat';
import { useNavigateToExplorer } from 'components/CeleryTask/useNavigateToExplorer';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { useNotifications } from 'hooks/useNotifications';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { prepareQueryRangePayload } from 'lib/dashboard/prepareQueryRangePayload';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback } from 'react';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';

interface NavigateToExplorerPagesProps {
	widget: Widgets;
	startTime?: number;
	endTime?: number;
	filters?: TagFilterItem[];
}

/**
 * Custom hook for handling navigation to explorer pages with query data
 * @returns A function to handle navigation with query processing
 */
function useNavigateToExplorerPages(): (
	props: NavigateToExplorerPagesProps,
) => Promise<void> {
	const navigateToExplorer = useNavigateToExplorer();
	const { selectedDashboard } = useDashboard();
	const { notifications } = useNotifications();

	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const queryRangeMutation = useMutation(getQueryRangeFormat);

	return useCallback(
		async ({
			widget,
			startTime,
			endTime,
			filters = [],
		}: NavigateToExplorerPagesProps): Promise<void> => {
			try {
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
				const updatedQuery = mapQueryDataFromApi(
					queryResult.compositeQuery,
					widget?.query,
				);

				// Extract and combine filters
				const widgetFilters =
					updatedQuery?.builder?.queryData?.[0]?.filters?.items ?? [];
				const currentDataSource = updatedQuery?.builder?.queryData?.[0]?.dataSource;

				if (!currentDataSource) {
					throw new Error('No data source found in query result');
				}

				// Navigate with combined filters
				await navigateToExplorer(
					[...widgetFilters, ...filters],
					currentDataSource,
					startTime,
					endTime,
				);
			} catch (error) {
				notifications.error({
					message: SOMETHING_WENT_WRONG,
					description:
						error instanceof Error ? error.message : 'Unknown error occurred',
				});
			}
		},
		[
			globalSelectedInterval,
			navigateToExplorer,
			notifications,
			queryRangeMutation,
			selectedDashboard?.data?.variables,
		],
	);
}

export default useNavigateToExplorerPages;
