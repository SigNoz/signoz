import { PANEL_TYPES } from 'constants/queryBuilder';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { ClickedData } from 'periscope/components/ContextMenu/types';
import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { ContextLinksData } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { getTimeRange } from 'utils/getTimeRange';

import { ConfigType } from './contextConfig';
import { isValidQueryName } from './drilldownUtils';
import { getFiltersToAddToView } from './tableDrilldownUtils';
import useAggregateDrilldown, { AggregateData } from './useAggregateDrilldown';
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
	panelType?: PANEL_TYPES;
	queryRange?: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
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
	panelType,
	queryRange,
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

	const aggregateData = useMemo((): AggregateData | null => {
		if (!clickedData?.column?.isValueColumn) return null;

		return {
			queryName: String(clickedData.column.queryName || ''),
			filters: getFiltersToAddToView(clickedData) || [],
			timeRange: getTimeRange(queryRange) as {
				startTime: number;
				endTime: number;
			},
		};
		// queryRange causes infinite re-render
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clickedData]);

	const { aggregateDrilldownConfig } = useAggregateDrilldown({
		query: drilldownQuery,
		widgetId,
		onClose,
		subMenu,
		setSubMenu,
		aggregateData,
		contextLinks,
		panelType,
	});

	const menuItemsConfig = useMemo(() => {
		if (!coordinates || (!clickedData && !aggregateData)) {
			if (!clickedData) {
				console.warn('clickedData is null in menuItemsConfig');
			}
			return {};
		}

		const columnType = clickedData?.column?.isValueColumn
			? ConfigType.AGGREGATE
			: ConfigType.GROUP;

		// Check if queryName is valid for drilldown
		if (
			columnType === ConfigType.AGGREGATE &&
			!isValidQueryName(aggregateData?.queryName || '')
		) {
			return {};
		}

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
		aggregateData,
	]);

	return { menuItemsConfig };
}

export default useTableContextMenu;
