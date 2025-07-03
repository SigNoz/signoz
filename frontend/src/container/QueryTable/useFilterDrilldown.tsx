import { QueryParams } from 'constants/query';
import { CustomDataColumnType } from 'container/GridTableComponent/utils';
import { addFilterToQuery } from 'container/QueryTable/drilldownUtils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { useCallback } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

interface ClickedData {
	record: RowData;
	column: CustomDataColumnType<RowData>;
}

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
}): { handleFilterDrilldown: (operator: string) => void } => {
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

	return {
		handleFilterDrilldown,
	};
};

export default useFilterDrilldown;
