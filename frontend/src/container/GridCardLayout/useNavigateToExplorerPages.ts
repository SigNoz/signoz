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
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';

import { createFilterFromData, isFormula } from './utils';

type GraphClickMetaData = {
	[key: string]: string | boolean;
	queryName: string;
	inFocusOrNot: boolean;
};
interface NavigateToExplorerPagesProps {
	widget: Widgets;
	requestData?: GraphClickMetaData;
	navigateRequestType?: 'panel' | 'specific';
	startTime?: number;
	endTime?: number;
	filters?: TagFilterItem[];
}

// function to make final filters
const buildFilters = (
	query: Query,
	requestData: GraphClickMetaData,
	navigateRequestType: 'panel' | 'specific',
): {
	[queryName: string]: { filters: TagFilterItem[]; dataSource?: string };
} => {
	// Handle specific query navigation
	if (navigateRequestType === 'specific' && requestData.queryName) {
		const queryData = query.builder.queryData.find(
			(q) => q.queryName === requestData.queryName,
		);

		if (!queryData) return {};

		const groupByFilters = queryData.groupBy
			.map((groupBy) => {
				const value = requestData[groupBy.key];
				return value ? createFilterFromData({ [groupBy.key]: value }) : [];
			})
			.flat();

		return {
			[requestData.queryName]: {
				filters: [...(queryData.filters?.items || []), ...groupByFilters],
				dataSource: queryData.dataSource,
			},
		};
	}

	// Handle panel navigation
	if (navigateRequestType === 'panel') {
		const nonFormulaQueries = query.builder.queryData.filter(
			(q) => !isFormula(q.queryName),
		);

		return Object.fromEntries(
			nonFormulaQueries.map((q) => [
				q.queryName,
				{
					filters: q.filters?.items || [],
					dataSource: q.dataSource,
				},
			]),
		);
	}

	return {};
};

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
			requestData,
			navigateRequestType,
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

				const finalFilters = buildFilters(
					updatedQuery,
					requestData ?? { queryName: '', inFocusOrNot: false },
					navigateRequestType ?? 'panel',
				);

				console.log('finalFilters', finalFilters);

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
