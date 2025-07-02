import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import { QueryParams } from 'constants/query';
import { CustomDataColumnType } from 'container/GridTableComponent/utils';
import {
	ContextMenuItem,
	getContextMenuConfig,
} from 'container/QueryTable/contextConfig';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import cloneDeep from 'lodash-es/cloneDeep';
import { useCallback, useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

interface ClickedData {
	record: RowData;
	column: CustomDataColumnType<RowData>;
}

function addFilterToQuery(
	query: Query,
	filterKey: string,
	filterValue: string | number,
	operator: string,
): Query {
	// 1) clone so we don't mutate the original
	const q = cloneDeep(query);

	// 2) map over builder.queryData to return a new modified version
	q.builder.queryData = q.builder.queryData.map((step) => {
		// skip if this step doesn't group by our key
		const baseMeta = step.groupBy.find((g) => g.key === filterKey);
		if (!baseMeta) return step;

		// 3) build the new filters array
		const newFilters = {
			...step.filters,
			items: [
				...step.filters.items,
				{
					id: uuid(),
					key: baseMeta,
					op: operator,
					value: filterValue,
				},
			],
		};

		const newFilterExpression = convertFiltersToExpression(newFilters);

		console.log('BASE META', { baseMeta, newFilters, ...newFilterExpression });

		// 4) return a new step object with updated filters
		return {
			...step,
			filters: newFilters,
			filter: newFilterExpression,
		};
	});

	return q;
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
}): { filterDrilldownConfig: { header?: string; items?: ContextMenuItem } } => {
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
			const newQuery = addFilterToQuery(query, filterKey, filterValue, operator);
			redirectToViewMode(newQuery);
			onClose();
		},
		[onClose, clickedData, query, redirectToViewMode],
	);

	const filterDrilldownConfig = useMemo(
		() =>
			getContextMenuConfig(query, clickedData, 'table', handleFilterDrilldown),
		[handleFilterDrilldown, clickedData, query],
	);

	return {
		filterDrilldownConfig,
	};
};

export default useFilterDrilldown;
