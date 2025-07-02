import { CustomDataColumnType } from 'container/GridTableComponent/utils';
import useFilterDrilldown from 'container/QueryTable/useFilterDrilldown';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

interface ClickedData {
	record: RowData;
	column: CustomDataColumnType<RowData>;
}

interface UseTableContextMenuProps {
	widgetId?: string;
	query: Query;
	clickedData: ClickedData | null;
	onClose: () => void;
	coordinates: { x: number; y: number } | null;
}

export function useTableContextMenu({
	widgetId = '',
	query,
	clickedData,
	onClose,
	coordinates,
}: UseTableContextMenuProps): {
	menuItemsConfig: { header?: string; items?: React.ReactNode };
} {
	const drilldownQuery = useGetCompositeQueryParam() || query;
	const { filterDrilldownConfig } = useFilterDrilldown({
		query: drilldownQuery,
		widgetId,
		clickedData,
		onClose,
	});

	const menuItemsConfig = useMemo(() => {
		if (!coordinates) return {};
		const columnType = clickedData?.column?.isValueColumn ? 'aggregate' : 'group';

		switch (columnType) {
			case 'aggregate':
				// return getContextMenuConfig(clickedData, 'table', onColumnClick);
				return {};
			case 'group':
				return filterDrilldownConfig;
			default:
				return {};
		}
	}, [clickedData, filterDrilldownConfig, coordinates]);

	return { menuItemsConfig };
}

export default useTableContextMenu;
