import { useNavigateToExplorer } from 'components/CeleryTask/useNavigateToExplorer';
import { useCallback } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

interface NavigateToExplorerPagesProps {
	widget: Widgets;
	startTime?: number;
	endTime?: number;
	filters?: TagFilterItem[];
}

function useNavigateToExplorerPages(): (
	props: NavigateToExplorerPagesProps,
) => void {
	const navigateToExplorer = useNavigateToExplorer();

	return useCallback(
		(props: NavigateToExplorerPagesProps) => {
			// Extract filters from widget query data
			const widgetFilters =
				props.widget.query?.builder?.queryData?.[0]?.filters?.items || []; // todo-sagar: check if this is correct - multiple queries

			const currentDataSource =
				props.widget.query?.builder?.queryData?.[0]?.dataSource;

			// Combine widget filters with additional filters if provided
			const combinedFilters = [...widgetFilters, ...(props.filters || [])];

			// Navigate to traces explorer
			navigateToExplorer(
				combinedFilters,
				currentDataSource,
				props.startTime,
				props.endTime,
			);
		},
		[navigateToExplorer],
	);
}

export default useNavigateToExplorerPages;
