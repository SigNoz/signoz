import { useCallback } from 'react';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import createQueryParams from 'lib/createQueryParams';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { getViewQuery } from './drilldownUtils';
import { AggregateData } from './useAggregateDrilldown';

type DrilldownKey = 'view_logs' | 'view_metrics' | 'view_traces';

const DRILLDOWN_ROUTE_MAP: Record<DrilldownKey, string> = {
	view_logs: ROUTES.LOGS_EXPLORER,
	view_metrics: ROUTES.METRICS_EXPLORER,
	view_traces: ROUTES.TRACES_EXPLORER,
};

const getRoute = (key: string): string =>
	DRILLDOWN_ROUTE_MAP[key as DrilldownKey] ?? '';

interface UseBaseDrilldownNavigateProps {
	resolvedQuery: Query;
	aggregateData: AggregateData | null;
	callback?: () => void;
}

const useBaseDrilldownNavigate = ({
	resolvedQuery,
	aggregateData,
	callback,
}: UseBaseDrilldownNavigateProps): ((key: string) => void) => {
	const { safeNavigate } = useSafeNavigate();

	return useCallback(
		(key: string): void => {
			const route = getRoute(key);
			const viewQuery = getViewQuery(
				resolvedQuery,
				aggregateData?.filters ?? [],
				key,
				aggregateData?.queryName ?? '',
			);

			if (!viewQuery || !route) {
				callback?.();
				return;
			}

			const timeRange = aggregateData?.timeRange;
			let queryParams: Record<string, string> = {
				[QueryParams.compositeQuery]: encodeURIComponent(JSON.stringify(viewQuery)),
				...(timeRange && {
					[QueryParams.startTime]: timeRange.startTime.toString(),
					[QueryParams.endTime]: timeRange.endTime.toString(),
				}),
			};

			if (route === ROUTES.METRICS_EXPLORER) {
				queryParams = {
					...queryParams,
					[QueryParams.summaryFilters]: JSON.stringify(
						viewQuery.builder.queryData[0].filters,
					),
				};
			}

			safeNavigate(`${route}?${createQueryParams(queryParams)}`, {
				newTab: true,
			});

			callback?.();
		},
		[resolvedQuery, safeNavigate, callback, aggregateData],
	);
};

export function buildDrilldownUrl(
	resolvedQuery: Query,
	aggregateData: AggregateData | null,
	key: string,
): string | null {
	const route = getRoute(key);
	const viewQuery = getViewQuery(
		resolvedQuery,
		aggregateData?.filters ?? [],
		key,
		aggregateData?.queryName ?? '',
	);

	if (!viewQuery || !route) {
		return null;
	}

	const timeRange = aggregateData?.timeRange;
	let queryParams: Record<string, string> = {
		[QueryParams.compositeQuery]: encodeURIComponent(JSON.stringify(viewQuery)),
		...(timeRange && {
			[QueryParams.startTime]: timeRange.startTime.toString(),
			[QueryParams.endTime]: timeRange.endTime.toString(),
		}),
	};

	if (route === ROUTES.METRICS_EXPLORER) {
		queryParams = {
			...queryParams,
			[QueryParams.summaryFilters]: JSON.stringify(
				viewQuery.builder.queryData[0].filters,
			),
		};
	}

	return `${route}?${createQueryParams(queryParams)}`;
}

export { getRoute };
export default useBaseDrilldownNavigate;
