import {
	ConfigType,
	getContextMenuConfig,
} from 'container/QueryTable/contextConfig';
import useAggregateDrilldown from 'container/QueryTable/useAggregateDrilldown';
import useFilterDrilldown from 'container/QueryTable/useFilterDrilldown';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { ClickedData } from 'periscope/components/ContextMenu/types';
import { useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

interface UseTableContextMenuProps {
	widgetId?: string;
	query: Query;
	clickedData: ClickedData | null;
	onClose: () => void;
	coordinates: { x: number; y: number } | null;
	subMenu: string;
	setSubMenu: (subMenu: string) => void;
}

export function useTableContextMenu({
	widgetId = '',
	query,
	clickedData,
	onClose,
	coordinates,
	subMenu,
	setSubMenu,
}: UseTableContextMenuProps): {
	menuItemsConfig: {
		header?: string | React.ReactNode;
		items?: React.ReactNode;
	};
} {
	const drilldownQuery = useGetCompositeQueryParam() || query;
	const { handleFilterDrilldown } = useFilterDrilldown({
		query: drilldownQuery,
		widgetId,
		clickedData,
		onClose,
	});

	const filterDrilldownConfig = useMemo(() => {
		if (!clickedData) {
			console.warn('clickedData is null in filterDrilldownConfig');
			return {};
		}
		return getContextMenuConfig({
			configType: ConfigType.GROUP,
			query,
			clickedData,
			panelType: 'table',
			onColumnClick: handleFilterDrilldown,
		});
	}, [handleFilterDrilldown, clickedData, query]);

	const { aggregateDrilldownConfig } = useAggregateDrilldown({
		query: drilldownQuery,
		widgetId,
		clickedData,
		onClose,
		subMenu,
		setSubMenu,
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
