import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import createQueryParams from 'lib/createQueryParams';
import ContextMenu from 'periscope/components/ContextMenu';
import { useCallback, useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { ContextMenuItem } from './contextConfig';
import { getAggregateColumnHeader, getViewQuery } from './drilldownUtils';
import { getBaseContextConfig } from './menuOptions';
import { AggregateData } from './useAggregateDrilldown';

interface UseBaseAggregateOptionsProps {
	query: Query;
	widgetId: string;
	onClose: () => void;
	subMenu: string;
	setSubMenu: (subMenu: string) => void;
	aggregateData: AggregateData | null;
}

interface BaseAggregateOptionsConfig {
	header?: string | React.ReactNode;
	items?: ContextMenuItem;
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

const useBaseAggregateOptions = ({
	query,
	widgetId,
	onClose,
	subMenu,
	setSubMenu,
	aggregateData,
}: UseBaseAggregateOptionsProps): {
	baseAggregateOptionsConfig: BaseAggregateOptionsConfig;
	handleBaseDrilldown: (key: string, drilldownQuery?: Query) => void;
} => {
	// const { redirectWithQueryBuilderData } = useQueryBuilder();

	// const redirectToViewMode = useCallback(
	// 	(query: Query): void => {
	// 		redirectWithQueryBuilderData(
	// 			query,
	// 			{ [QueryParams.expandedWidgetId]: widgetId },
	// 			undefined,
	// 			true,
	// 		);
	// 	},
	// 	[widgetId, redirectWithQueryBuilderData],
	// );

	const { safeNavigate } = useSafeNavigate();

	const handleBaseDrilldown = useCallback(
		(key: string): void => {
			console.log('Base drilldown:', { widgetId, query, key, aggregateData });

			if (key === 'breakout') {
				// if (!drilldownQuery) {
				setSubMenu(key);
				return;
				// }
			}

			const route = getRoute(key);
			const timeRange = aggregateData?.timeRange;
			const filtersToAdd = aggregateData?.filters || [];
			const viewQuery = getViewQuery(
				query,
				filtersToAdd,
				key,
				aggregateData?.queryName || '',
			);

			let queryParams = {
				[QueryParams.compositeQuery]: JSON.stringify(viewQuery),
				...(timeRange && {
					[QueryParams.startTime]: timeRange?.startTime.toString(),
					[QueryParams.endTime]: timeRange?.endTime.toString(),
				}),
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
		[query, widgetId, safeNavigate, onClose, setSubMenu, aggregateData],
	);

	const baseAggregateOptionsConfig = useMemo(() => {
		if (!aggregateData) {
			console.warn('aggregateData is null in baseAggregateOptionsConfig');
			return {};
		}

		// Skip breakout logic as it's handled by useBreakout
		if (subMenu === 'breakout') {
			return {};
		}

		// Extract the non-breakout logic from getAggregateContextMenuConfig
		const { queryName } = aggregateData;
		const { dataSource, aggregations } = getAggregateColumnHeader(
			query,
			queryName as string,
		);

		console.log('Header', { aggregateData });

		return {
			header: (
				<ContextMenu.Header>
					<div style={{ textTransform: 'capitalize' }}>{dataSource}</div>
					<div
						style={{
							fontWeight: 'normal',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						}}
					>
						{aggregateData?.label || aggregations}
					</div>
				</ContextMenu.Header>
			),
			items: getBaseContextConfig({ handleBaseDrilldown }).map(
				({ key, label, icon, onClick }) => (
					<ContextMenu.Item key={key} icon={icon} onClick={(): void => onClick()}>
						{label}
					</ContextMenu.Item>
				),
			),
		};
	}, [subMenu, query, handleBaseDrilldown, aggregateData]);

	return { baseAggregateOptionsConfig, handleBaseDrilldown };
};

export default useBaseAggregateOptions;
