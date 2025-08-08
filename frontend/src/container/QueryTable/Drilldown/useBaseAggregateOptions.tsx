import { LinkOutlined, LoadingOutlined } from '@ant-design/icons';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import useUpdatedQuery from 'container/GridCardLayout/useResolveQuery';
import { processContextLinks } from 'container/NewWidget/RightContainer/ContextLinks/utils';
import useContextVariables from 'hooks/dashboard/useContextVariables';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import createQueryParams from 'lib/createQueryParams';
import ContextMenu from 'periscope/components/ContextMenu';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ContextLinksData } from 'types/api/dashboard/getAll';
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
	contextLinks?: ContextLinksData;
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
	contextLinks,
}: UseBaseAggregateOptionsProps): {
	baseAggregateOptionsConfig: BaseAggregateOptionsConfig;
} => {
	const [resolvedQuery, setResolvedQuery] = useState<Query>(query);
	const {
		getUpdatedQuery,
		isLoading: isResolveQueryLoading,
	} = useUpdatedQuery();
	const { selectedDashboard } = useDashboard();

	useEffect(() => {
		if (!aggregateData) return;
		const resolveQuery = async (): Promise<void> => {
			const updatedQuery = await getUpdatedQuery({
				widgetConfig: {
					query,
					panelTypes: PANEL_TYPES.TIME_SERIES, // change by passing panel type from widget config
					timePreferance: 'GLOBAL_TIME',
				},
				selectedDashboard,
			});
			setResolvedQuery(updatedQuery);
		};
		resolveQuery();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, aggregateData]);

	const { safeNavigate } = useSafeNavigate();

	const fieldVariables = useMemo(() => {
		if (!aggregateData?.filters) return {};

		// Extract field variables from aggregation data filters
		const fieldVars: Record<string, string | number | boolean> = {};

		aggregateData.filters.forEach((filter) => {
			if (filter.filterKey && filter.filterValue !== undefined) {
				fieldVars[filter.filterKey] = filter.filterValue;
			}
		});

		console.log(
			'Field variables extracted from filters (will be prefixed with "_"):',
			fieldVars,
		);
		return fieldVars;
	}, [aggregateData?.filters]);

	// Use the new useContextVariables hook
	const {
		variables,
		processedVariables,
		getVariableByName,
	} = useContextVariables({
		maxValues: 2,
		customVariables: fieldVariables,
	});

	// // Local function to resolve variables in query without API call
	// const resolveQueryVariables = useCallback(
	// 	(query: Query): Query => {
	// 		const resolvedQuery = cloneDeep(query);

	// 		// Resolve variables in filter expressions
	// 		if (resolvedQuery.builder?.queryData) {
	// 			resolvedQuery.builder.queryData = resolvedQuery.builder.queryData.map(
	// 				(queryData) => {
	// 					// eslint-disable-next-line no-param-reassign
	// 					if (queryData.filter?.expression) {
	// 						const resolvedExpression = resolveTexts({
	// 							texts: [queryData.filter.expression],
	// 							processedVariables,
	// 						}).fullTexts[0];

	// 						// eslint-disable-next-line no-param-reassign
	// 						queryData.filter.expression = resolvedExpression;
	// 					}

	// 					// eslint-disable-next-line no-param-reassign
	// 					queryData.filters = undefined;

	// 					return queryData;
	// 				},
	// 			);
	// 		}

	// 		return resolvedQuery;
	// 	},
	// 	[processedVariables],
	// );

	// Console.log the results
	console.log('useContextVariables results:', {
		variables,
		processedVariables,
		getVariableByName: getVariableByName('timestamp_start'),
	});

	console.log('aggregateData', aggregateData);

	const getContextLinksItems = useCallback(() => {
		if (!contextLinks?.linksData) return [];
		console.log('contextLinks', contextLinks);

		try {
			const processedLinks = processContextLinks(
				contextLinks.linksData,
				processedVariables,
				50, // maxLength for labels
			);

			console.log('Processed context links:', {
				originalLinks: contextLinks.linksData,
				processedLinks,
			});

			return processedLinks.map(({ id, label, url }) => (
				<ContextMenu.Item
					key={id}
					icon={<LinkOutlined />}
					onClick={(): void => {
						window.open(url, '_blank');
					}}
				>
					{label}
				</ContextMenu.Item>
			));
		} catch (error) {
			return [];
		}
	}, [contextLinks, processedVariables]);

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
				resolvedQuery,
				filtersToAdd,
				key,
				aggregateData?.queryName || '',
			);

			// if (viewQuery) {
			// 	viewQuery = resolveQueryVariables(viewQuery);
			// }

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
		[
			query,
			resolvedQuery,
			widgetId,
			safeNavigate,
			onClose,
			setSubMenu,
			aggregateData,
		],
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
			resolvedQuery,
			queryName as string,
		);

		return {
			items: (
				<>
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
					<div>
						<OverlayScrollbar
							style={{ maxHeight: '200px' }}
							options={{
								overflow: {
									x: 'hidden',
								},
							}}
						>
							<>
								{getBaseContextConfig({ handleBaseDrilldown }).map(
									({ key, label, icon, onClick }) => {
										const isLoading = isResolveQueryLoading && key !== 'breakout';
										return (
											<ContextMenu.Item
												key={key}
												icon={isLoading ? <LoadingOutlined spin /> : icon}
												onClick={(): void => onClick()}
												disabled={isLoading}
											>
												{label}
											</ContextMenu.Item>
										);
									},
								)}
								{getContextLinksItems()}
							</>
						</OverlayScrollbar>
					</div>
				</>
			),
		};
	}, [
		subMenu,
		handleBaseDrilldown,
		aggregateData,
		getContextLinksItems,
		isResolveQueryLoading,
		resolvedQuery,
	]);

	return { baseAggregateOptionsConfig };
};

export default useBaseAggregateOptions;
