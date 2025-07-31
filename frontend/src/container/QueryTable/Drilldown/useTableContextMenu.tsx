import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { ClickedData } from 'periscope/components/ContextMenu/types';
import { useMemo } from 'react';
import { ContextLinksData } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { ConfigType } from './contextConfig';
import { getFiltersToAddToView } from './tableDrilldownUtils';
import useAggregateDrilldown from './useAggregateDrilldown';
import useFilterDrilldown from './useFilterDrilldown';

interface UseTableContextMenuProps {
	widgetId?: string;
	query: Query;
	clickedData: ClickedData | null;
	onClose: () => void;
	coordinates: { x: number; y: number } | null;
	subMenu: string;
	setSubMenu: (subMenu: string) => void;
	contextLinks?: ContextLinksData;
}

export function useTableContextMenu({
	widgetId = '',
	query,
	clickedData,
	onClose,
	coordinates,
	subMenu,
	setSubMenu,
	contextLinks,
}: UseTableContextMenuProps): {
	menuItemsConfig: {
		header?: string | React.ReactNode;
		items?: React.ReactNode;
	};
} {
	const drilldownQuery = useGetCompositeQueryParam() || query;
	const { filterDrilldownConfig } = useFilterDrilldown({
		query: drilldownQuery,
		widgetId,
		clickedData,
		onClose,
	});

	const aggregateData = useMemo(() => {
		if (!clickedData?.column?.isValueColumn) return null;

		return {
			queryName: String(clickedData.column.dataIndex || ''),
			filters: getFiltersToAddToView(clickedData) || [],
		};
	}, [clickedData]);

	const { aggregateDrilldownConfig } = useAggregateDrilldown({
		query: drilldownQuery,
		widgetId,
		onClose,
		subMenu,
		setSubMenu,
		aggregateData,
		contextLinks,
	});

	const menuItemsConfig = useMemo(() => {
		if (!coordinates || !clickedData) {
			if (!clickedData) {
				console.warn('clickedData is null in menuItemsConfig');
			}
			return {};
		}
		const columnType = clickedData?.column?.isValueColumn
			? ConfigType.AGGREGATE
			: ConfigType.GROUP;

		switch (columnType) {
			case ConfigType.AGGREGATE:
				return aggregateDrilldownConfig;
			case ConfigType.GROUP:
				return filterDrilldownConfig;
			default:
				return {};
		}
	}, [
		clickedData,
		filterDrilldownConfig,
		coordinates,
		aggregateDrilldownConfig,
	]);

	return { menuItemsConfig };
}

export default useTableContextMenu;
