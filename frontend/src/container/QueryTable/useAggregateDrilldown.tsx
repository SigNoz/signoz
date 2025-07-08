import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import {
	getFiltersToAddToView,
	getViewQuery,
} from 'container/QueryTable/tableDrilldownUtils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import createQueryParams from 'lib/createQueryParams';
import { ClickedData } from 'periscope/components/ContextMenu/types';
import { useCallback, useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	ConfigType,
	ContextMenuItem,
	getContextMenuConfig,
} from './contextConfig';

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
	clickedData,
	onClose,
	subMenu,
	setSubMenu,
}: {
	query: Query;
	widgetId: string;
	clickedData: ClickedData | null;
	onClose: () => void;
	subMenu: string;
	setSubMenu: (subMenu: string) => void;
}): {
	aggregateDrilldownConfig: { header?: string; items?: ContextMenuItem };
} => {
	const { redirectWithQueryBuilderData } = useQueryBuilder();

	const redirectToViewMode = useCallback(
		(query: Query): void => {
			redirectWithQueryBuilderData(
				query,
				{ [QueryParams.expandedWidgetId]: widgetId },
				undefined,
				true,
			);
		},
		[widgetId, redirectWithQueryBuilderData],
	);
	const { safeNavigate } = useSafeNavigate();

	const handleAggregateDrilldown = useCallback(
		(key: string, drilldownQuery?: Query): void => {
			console.log('Aggregate drilldown:', { clickedData, widgetId, query, key });

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
			const filtersToAdd = getFiltersToAddToView(clickedData);
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
			clickedData,
			query,
			widgetId,
			safeNavigate,
			onClose,
			redirectToViewMode,
			setSubMenu,
		],
	);

	const aggregateDrilldownConfig = useMemo(
		() =>
			getContextMenuConfig({
				subMenu,
				configType: ConfigType.AGGREGATE,
				query,
				clickedData,
				panelType: 'table',
				onColumnClick: handleAggregateDrilldown,
			}),
		[handleAggregateDrilldown, clickedData, query, subMenu],
	);
	return { aggregateDrilldownConfig };
};

export default useAggregateDrilldown;
