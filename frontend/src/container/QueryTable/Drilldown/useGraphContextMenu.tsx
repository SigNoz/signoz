import { useMemo } from 'react';
import type { UseQueryResult } from 'react-query';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { isBuilderQueryType } from 'lib/query/builderSlot';
import type { ContextLinksData } from 'types/api/widgets/widget';
import type { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { isValidQueryName } from './drilldownUtils';
import type { AggregateData } from './useAggregateDrilldown';
import useAggregateDrilldown from './useAggregateDrilldown';

interface UseGraphContextMenuProps {
	widgetId?: string;
	query: Query;
	graphData: AggregateData | null;
	onClose: () => void;
	coordinates: { x: number; y: number } | null;
	subMenu: string;
	setSubMenu: (subMenu: string) => void;
	contextLinks?: ContextLinksData;
	panelType?: PANEL_TYPES;
	queryRange?: UseQueryResult<MetricQueryRangeSuccessResponse, Error>;
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
	panelType,
	queryRange,
}: UseGraphContextMenuProps): {
	menuItemsConfig: {
		header?: string | React.ReactNode;
		items?: React.ReactNode;
	};
} {
	const drilldownQuery = useGetCompositeQueryParam() || query;

	const isQueryTypeBuilder = isBuilderQueryType(drilldownQuery.queryType);

	const { aggregateDrilldownConfig } = useAggregateDrilldown({
		query: drilldownQuery,
		widgetId,
		onClose,
		subMenu,
		setSubMenu,
		aggregateData: graphData,
		contextLinks,
		panelType,
		queryRange,
	});

	const menuItemsConfig = useMemo(() => {
		if (!coordinates || !graphData || !isQueryTypeBuilder) {
			return {};
		}
		// Check if queryName is valid for drilldown
		if (!isValidQueryName(graphData.queryName)) {
			return {};
		}

		return aggregateDrilldownConfig;
	}, [coordinates, aggregateDrilldownConfig, graphData, isQueryTypeBuilder]);

	return { menuItemsConfig };
}

export default useGraphContextMenu;
