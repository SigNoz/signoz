import { useNavigateToExplorer } from 'components/CeleryTask/useNavigateToExplorer';
import { useNotifications } from 'hooks/useNotifications';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';
import {
	IBuilderQuery,
	Query,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';

import useUpdatedQuery from './useResolveQuery';
import { createFilterFromData, extractQueryNamesFromExpression } from './utils';

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

// Helper to create group by filters from request data
const createGroupByFilters = (
	groupBy: { key: string }[],
	requestData: GraphClickMetaData,
): TagFilterItem[] =>
	groupBy
		.map((gb) => {
			const value = requestData[gb.key];
			return value ? createFilterFromData({ [gb.key]: value }) : [];
		})
		.flat();

// Helper to build filters for a single query
const buildQueryFilters = (
	queryData: IBuilderQuery,
	groupByFilters: TagFilterItem[],
): { filters: TagFilterItem[]; dataSource?: string } => ({
	filters: [...(queryData.filters?.items || []), ...groupByFilters],
	dataSource: queryData.dataSource,
});

// Main function to build filters
export const buildFilters = (
	query: Query,
	requestData?: GraphClickMetaData,
	navigateRequestType: 'panel' | 'specific' = 'panel',
): {
	[queryName: string]: { filters: TagFilterItem[]; dataSource?: string };
} => {
	// Handle panel navigation
	if (navigateRequestType === 'panel') {
		return Object.fromEntries(
			query.builder.queryData.map((q) => [q.queryName, buildQueryFilters(q, [])]),
		);
	}

	// Handle specific query navigation
	if (navigateRequestType === 'specific' && requestData?.queryName) {
		const queryData = query.builder.queryData.find(
			(q) => q.queryName === requestData.queryName,
		);

		// Direct query match
		if (queryData) {
			const groupByFilters = createGroupByFilters(queryData.groupBy, requestData);
			return {
				[requestData.queryName]: buildQueryFilters(queryData, groupByFilters),
			};
		}

		// Formula query handling
		const formulaQuery = query.builder.queryFormulas.find(
			(q) => q.queryName === requestData.queryName,
		);

		if (!formulaQuery) return {};

		const queryNames = extractQueryNamesFromExpression(formulaQuery.expression);
		const filteredQueryData = query.builder.queryData.filter((q) =>
			queryNames.includes(q.queryName),
		);

		const returnObject: {
			[queryName: string]: { filters: TagFilterItem[]; dataSource?: string };
		} = {};

		filteredQueryData.forEach((q) => {
			const groupByFilters = createGroupByFilters(q.groupBy, requestData);
			returnObject[q.queryName] = buildQueryFilters(q, groupByFilters);
		});

		return returnObject;
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
	const { getUpdatedQuery } = useUpdatedQuery();

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
				// Get updated query using the extracted hook
				const updatedQuery = await getUpdatedQuery({
					widget,
					selectedDashboard,
				});

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
				navigateToExplorer({
					filters: [...widgetFilters, ...filters],
					dataSource: currentDataSource,
					startTime,
					endTime,
				});
			} catch (error) {
				notifications.error({
					message: 'Error navigating to explorer',
					description:
						error instanceof Error ? error.message : 'Unknown error occurred',
				});
			}
		},
		[getUpdatedQuery, selectedDashboard, navigateToExplorer, notifications],
	);
}

export default useNavigateToExplorerPages;
