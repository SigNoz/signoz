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
import { useLocation } from 'react-router-dom';
import { ContextLinksData } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { ContextMenuItem } from './contextConfig';
import { getDataLinks } from './dataLinksUtils';
import { getAggregateColumnHeader, getViewQuery } from './drilldownUtils';
import { getBaseContextConfig } from './menuOptions';
import { AggregateData } from './useAggregateDrilldown';

interface UseBaseAggregateOptionsProps {
	query: Query;
	onClose: () => void;
	subMenu: string;
	setSubMenu: (subMenu: string) => void;
	aggregateData: AggregateData | null;
	contextLinks?: ContextLinksData;
	panelType?: PANEL_TYPES;
	fieldVariables: Record<string, string | number | boolean>;
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
	onClose,
	setSubMenu,
	aggregateData,
	contextLinks,
	panelType,
	fieldVariables,
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
					panelTypes: panelType || PANEL_TYPES.TIME_SERIES,
					timePreferance: 'GLOBAL_TIME',
				},
				selectedDashboard,
			});
			setResolvedQuery(updatedQuery);
		};
		resolveQuery();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, aggregateData, panelType]);

	const { safeNavigate } = useSafeNavigate();

	// Use the new useContextVariables hook
	const { processedVariables } = useContextVariables({
		maxValues: 2,
		customVariables: fieldVariables,
	});

	const getContextLinksItems = useCallback(() => {
		if (!contextLinks?.linksData) return [];

		try {
			const processedLinks = processContextLinks(
				contextLinks.linksData,
				processedVariables,
				50, // maxLength for labels
			);

			const dataLinks = getDataLinks(query, aggregateData);
			const allLinks = [...dataLinks, ...processedLinks];

			return allLinks.map(({ id, label, url }) => (
				<ContextMenu.Item
					key={id}
					icon={<LinkOutlined />}
					onClick={(): void => {
						window.open(url, '_blank');
						onClose?.();
					}}
				>
					{label}
				</ContextMenu.Item>
			));
		} catch (error) {
			return [];
		}
	}, [contextLinks, processedVariables, onClose, aggregateData, query]);

	const handleBaseDrilldown = useCallback(
		(key: string): void => {
			console.log('Base drilldown:', { key, aggregateData });
			const route = getRoute(key);
			const timeRange = aggregateData?.timeRange;
			const filtersToAdd = aggregateData?.filters || [];
			const viewQuery = getViewQuery(
				resolvedQuery,
				filtersToAdd,
				key,
				aggregateData?.queryName || '',
			);

			let queryParams = {
				[QueryParams.compositeQuery]: encodeURIComponent(JSON.stringify(viewQuery)),
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
		[resolvedQuery, safeNavigate, onClose, aggregateData],
	);

	const { pathname } = useLocation();

	const showDashboardVariablesOption = useMemo(() => {
		const fieldVariablesExist = Object.keys(fieldVariables).length > 0;
		// Check if current route is exactly dashboard route (/dashboard/:dashboardId)
		const dashboardPattern = /^\/dashboard\/[^/]+$/;
		return fieldVariablesExist && dashboardPattern.test(pathname);
	}, [pathname, fieldVariables]);

	const baseAggregateOptionsConfig = useMemo(() => {
		if (!aggregateData) {
			console.warn('aggregateData is null in baseAggregateOptionsConfig');
			return {};
		}

		// Extract the non-breakout logic from getAggregateContextMenuConfig
		const { queryName } = aggregateData;
		const { dataSource, aggregations } = getAggregateColumnHeader(
			resolvedQuery,
			queryName as string,
		);

		const baseContextConfig = getBaseContextConfig({
			handleBaseDrilldown,
			setSubMenu,
			showDashboardVariablesOption,
			showBreakoutOption: true,
		}).filter((item) => !item.hidden);

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
								{baseContextConfig.map(({ key, label, icon, onClick }) => {
									const isLoading =
										isResolveQueryLoading &&
										(key === 'view_logs' || key === 'view_traces');
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
								})}
								{getContextLinksItems()}
							</>
						</OverlayScrollbar>
					</div>
				</>
			),
		};
	}, [
		handleBaseDrilldown,
		aggregateData,
		getContextLinksItems,
		isResolveQueryLoading,
		resolvedQuery,
		showDashboardVariablesOption,
		setSubMenu,
	]);

	return { baseAggregateOptionsConfig };
};

export default useBaseAggregateOptions;
