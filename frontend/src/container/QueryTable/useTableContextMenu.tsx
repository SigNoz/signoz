import { CustomDataColumnType } from 'container/GridTableComponent/utils';
import {
	ConfigType,
	getContextMenuConfig,
} from 'container/QueryTable/contextConfig';
// import useAggregateDrilldown from 'container/QueryTable/useAggregateDrilldown';
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
	const { handleFilterDrilldown } = useFilterDrilldown({
		query: drilldownQuery,
		widgetId,
		clickedData,
		onClose,
	});

	const filterDrilldownConfig = useMemo(
		() =>
			getContextMenuConfig({
				configType: ConfigType.GROUP,
				query,
				clickedData,
				panelType: 'table',
				onColumnClick: handleFilterDrilldown,
			}),
		[handleFilterDrilldown, clickedData, query],
	);

	// const { aggregateDrilldownConfig } = useAggregateDrilldown({
	// 	query: drilldownQuery,
	// 	widgetId,
	// 	clickedData,
	// 	onClose,
	// });

	const menuItemsConfig = useMemo(() => {
		if (!coordinates) return {};
		const columnType = clickedData?.column?.isValueColumn
			? ConfigType.AGGREGATE
			: ConfigType.GROUP;

		switch (columnType) {
			case ConfigType.AGGREGATE:
				// return getContextMenuConfig({
				// 	configType: ConfigType.AGGREGATE,
				// 	query,
				// 	clickedData,
				// 	panelType: 'table',
				// 	onColumnClick: onColumnClick,
				// });
				return {};
			case ConfigType.GROUP:
				return filterDrilldownConfig;
			default:
				return {};
		}
	}, [clickedData, filterDrilldownConfig, coordinates]);

	return { menuItemsConfig };
}

export default useTableContextMenu;
