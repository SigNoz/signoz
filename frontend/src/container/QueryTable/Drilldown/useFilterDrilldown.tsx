import { QueryParams } from 'constants/query';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ClickedData } from 'periscope/components/ContextMenu/types';
import { useCallback, useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { getGroupContextMenuConfig } from './contextConfig';
import { addFilterToQuery } from './drilldownUtils';

const useFilterDrilldown = ({
	query,
	widgetId,
	clickedData,
	onClose,
}: {
	query: Query;
	widgetId: string;
	clickedData: ClickedData | null;
	onClose: () => void;
}): {
	filterDrilldownConfig: {
		header?: string | React.ReactNode;
		items?: React.ReactNode;
	};
} => {
	const { redirectWithQueryBuilderData } = useQueryBuilder();

	const redirectToViewMode = useCallback(
		(query: Query): void => {
			redirectWithQueryBuilderData(
				query,
				{ [QueryParams.expandedWidgetId]: widgetId },
				undefined,
				true,
			);
		},
		[widgetId, redirectWithQueryBuilderData],
	);

	const handleFilterDrilldown = useCallback(
		(operator: string): void => {
			const filterKey = clickedData?.column?.title as string;
			const filterValue = clickedData?.record?.[filterKey] || '';
			const newQuery = addFilterToQuery(query, [
				{
					filterKey,
					filterValue,
					operator,
				},
			]);
			redirectToViewMode(newQuery);
			onClose();
		},
		[onClose, clickedData, query, redirectToViewMode],
	);

	const filterDrilldownConfig = useMemo(() => {
		if (!clickedData) {
			console.warn('clickedData is null in filterDrilldownConfig');
			return {};
		}
		return getGroupContextMenuConfig({
			query,
			clickedData,
			panelType: 'table',
			onColumnClick: handleFilterDrilldown,
		});
	}, [handleFilterDrilldown, clickedData, query]);

	return {
		filterDrilldownConfig,
	};
};

export default useFilterDrilldown;
