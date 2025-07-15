import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import createQueryParams from 'lib/createQueryParams';
import { useCallback, useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	ContextMenuItem,
	getAggregateContextMenuConfig,
} from './contextConfig';
import { FilterData } from './drilldownUtils';
import { getViewQuery } from './tableDrilldownUtils';

// Type for aggregate data
export interface AggregateData {
	queryName: string;
	filters: FilterData[];
}

const getRoute = (key: string): string => {
	switch (key) {
		case 'view_logs':
			return ROUTES.LOGS_EXPLORER;
		case 'view_metrics':
			return ROUTES.METRICS_EXPLORER;
		case 'view_traces':
			return ROUTES.TRACES_EXPLORER;
		default:
			return '';
	}
};

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
	const { redirectWithQueryBuilderData } = useQueryBuilder();

	const redirectToViewMode = useCallback(
		(query: Query): void => {
			redirectWithQueryBuilderData(
				query,
				{ [QueryParams.expandedWidgetId]: widgetId }, // add only if view mode
				undefined,
				true,
			);
		},
		[widgetId, redirectWithQueryBuilderData],
	);
	const { safeNavigate } = useSafeNavigate();

	const handleAggregateDrilldown = useCallback(
		(key: string, drilldownQuery?: Query): void => {
			console.log('Aggregate drilldown:', { widgetId, query, key, aggregateData });

			if (key === 'breakout') {
				if (!drilldownQuery) {
					setSubMenu(key);
				} else {
					redirectToViewMode(drilldownQuery);
					onClose();
				}
				return;
			}

			const route = getRoute(key);
			const filtersToAdd = aggregateData?.filters || [];
			const viewQuery = getViewQuery(query, filtersToAdd, key);

			let queryParams = {
				[QueryParams.compositeQuery]: JSON.stringify(viewQuery),
			} as Record<string, string>;

			if (route === ROUTES.METRICS_EXPLORER) {
				queryParams = {
					...queryParams,
					[QueryParams.summaryFilters]: JSON.stringify(
						viewQuery?.builder.queryData[0].filters,
					),
				};
			}

			if (route) {
				safeNavigate(`${route}?${createQueryParams(queryParams)}`, {
					newTab: true,
				});
			}

			onClose();
		},
		[
			query,
			widgetId,
			safeNavigate,
			onClose,
			redirectToViewMode,
			setSubMenu,
			aggregateData,
		],
	);

	const aggregateDrilldownConfig = useMemo(() => {
		if (!aggregateData) {
			console.warn('aggregateData is null in aggregateDrilldownConfig');
			return {};
		}
		return getAggregateContextMenuConfig({
			subMenu,
			query,
			onColumnClick: handleAggregateDrilldown,
			aggregateData,
		});
	}, [handleAggregateDrilldown, query, subMenu, aggregateData]);
	return { aggregateDrilldownConfig };
};

export default useAggregateDrilldown;
