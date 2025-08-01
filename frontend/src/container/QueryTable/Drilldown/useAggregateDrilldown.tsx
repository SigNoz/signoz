import { useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { ContextMenuItem } from './contextConfig';
import { FilterData } from './drilldownUtils';
import useBaseAggregateOptions from './useBaseAggregateOptions';
import useBreakout from './useBreakout';

// Type for aggregate data
export interface AggregateData {
	queryName: string;
	filters: FilterData[];
	timeRange?: {
		startTime: number;
		endTime: number;
	};
}

const useAggregateDrilldown = ({
	query,
	widgetId,
	onClose,
	subMenu,
	setSubMenu,
	aggregateData,
}: {
	query: Query;
	widgetId: string;
	onClose: () => void;
	subMenu: string;
	setSubMenu: (subMenu: string) => void;
	aggregateData: AggregateData | null;
}): {
	aggregateDrilldownConfig: {
		header?: string | React.ReactNode;
		items?: ContextMenuItem;
	};
} => {
	// const { redirectWithQueryBuilderData } = useQueryBuilder();

	// const redirectToViewMode = useCallback(
	// 	(query: Query): void => {
	// 		redirectWithQueryBuilderData(
	// 			query,
	// 			{ [QueryParams.expandedWidgetId]: widgetId }, // add only if view mode
	// 			undefined,
	// 			true,
	// 		);
	// 	},
	// 	[widgetId, redirectWithQueryBuilderData],
	// );
	// const { safeNavigate } = useSafeNavigate();

	// const handleAggregateDrilldown = useCallback(
	// 	(key: string, drilldownQuery?: Query): void => {
	// 		console.log('Aggregate drilldown:', { widgetId, query, key, aggregateData });

	// 		if (key === 'breakout') {
	// 			if (!drilldownQuery) {
	// 				setSubMenu(key);
	// 			} else {
	// 				redirectToViewMode(drilldownQuery);
	// 				onClose();
	// 			}
	// 			return;
	// 		}

	// 		const route = getRoute(key);
	// 		const timeRange = aggregateData?.timeRange;
	// 		const filtersToAdd = aggregateData?.filters || [];
	// 		const viewQuery = getViewQuery(
	// 			query,
	// 			filtersToAdd,
	// 			key,
	// 			aggregateData?.queryName || '',
	// 		);

	// 		let queryParams = {
	// 			[QueryParams.compositeQuery]: JSON.stringify(viewQuery),
	// 			...(timeRange && {
	// 				[QueryParams.startTime]: timeRange?.startTime.toString(),
	// 				[QueryParams.endTime]: timeRange?.endTime.toString(),
	// 			}),
	// 		} as Record<string, string>;

	// 		if (route === ROUTES.METRICS_EXPLORER) {
	// 			queryParams = {
	// 				...queryParams,
	// 				[QueryParams.summaryFilters]: JSON.stringify(
	// 					viewQuery?.builder.queryData[0].filters,
	// 				),
	// 			};
	// 		}

	// 		if (route) {
	// 			safeNavigate(`${route}?${createQueryParams(queryParams)}`, {
	// 				newTab: true,
	// 			});
	// 		}

	// 		onClose();
	// 	},
	// 	[
	// 		query,
	// 		widgetId,
	// 		safeNavigate,
	// 		onClose,
	// 		redirectToViewMode,
	// 		setSubMenu,
	// 		aggregateData,
	// 	],
	// );

	// const aggregateDrilldownConfig = useMemo(() => {
	// 	if (!aggregateData) {
	// 		console.warn('aggregateData is null in aggregateDrilldownConfig');
	// 		return {};
	// 	}
	// 	return getAggregateContextMenuConfig({
	// 		subMenu,
	// 		query,
	// 		onColumnClick: handleAggregateDrilldown,
	// 		aggregateData,
	// 	});
	// }, [handleAggregateDrilldown, query, subMenu, aggregateData]);

	// New function to test useBreakout hook
	const { breakoutConfig } = useBreakout({
		query,
		widgetId,
		onClose,
		aggregateData,
	});

	const { baseAggregateOptionsConfig } = useBaseAggregateOptions({
		query,
		widgetId,
		onClose,
		aggregateData,
		subMenu,
		setSubMenu,
	});

	const aggregateDrilldownConfig = useMemo(() => {
		if (!aggregateData) {
			console.warn('aggregateData is null in testBreakoutConfig');
			return {};
		}

		// If subMenu is breakout, use the new breakout hook
		if (subMenu === 'breakout') {
			return breakoutConfig;
		}

		// Otherwise, use the existing getAggregateContextMenuConfig
		return baseAggregateOptionsConfig;
	}, [subMenu, aggregateData, breakoutConfig, baseAggregateOptionsConfig]);

	return { aggregateDrilldownConfig };
};

export default useAggregateDrilldown;
