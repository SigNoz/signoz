import { PANEL_TYPES } from 'constants/queryBuilder';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { ContextLinksData } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { isValidQueryName } from './drilldownUtils';
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
	panelType?: PANEL_TYPES;
	queryRange?: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
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

	const isQueryTypeBuilder = drilldownQuery?.queryType === 'builder';

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
