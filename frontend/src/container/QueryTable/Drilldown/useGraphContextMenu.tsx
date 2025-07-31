import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useMemo } from 'react';
import { ContextLinksData } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import useAggregateDrilldown, { AggregateData } from './useAggregateDrilldown';

interface UseGraphContextMenuProps {
	widgetId?: string;
	query: Query;
	graphData: AggregateData | null;
	onClose: () => void;
	coordinates: { x: number; y: number } | null;
	subMenu: string;
	setSubMenu: (subMenu: string) => void;
	contextLinks?: ContextLinksData;
}

export function useGraphContextMenu({
	widgetId = '',
	query,
	graphData,
	onClose,
	coordinates,
	subMenu,
	setSubMenu,
	contextLinks,
}: UseGraphContextMenuProps): {
	menuItemsConfig: {
		header?: string | React.ReactNode;
		items?: React.ReactNode;
	};
} {
	const drilldownQuery = useGetCompositeQueryParam() || query;

	const { aggregateDrilldownConfig } = useAggregateDrilldown({
		query: drilldownQuery,
		widgetId,
		onClose,
		subMenu,
		setSubMenu,
		aggregateData: graphData,
		contextLinks,
	});

	const menuItemsConfig = useMemo(() => {
		if (!coordinates) {
			return {};
		}
		return aggregateDrilldownConfig;
	}, [coordinates, aggregateDrilldownConfig]);

	return { menuItemsConfig };
}

export default useGraphContextMenu;
