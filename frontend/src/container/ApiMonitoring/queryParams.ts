import { useCallback } from 'react';
import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import { navigate } from 'lib/router/navigation';
import { useAppLocation } from 'lib/router/useAppLocation';
import { omit } from 'lodash-es';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { getUnstableCurrentSearchParams } from 'utils/getUnstableCurrentSearchParams';

// --- Types for all API Monitoring query params ---
export interface ApiMonitoringParams {
	showIP?: boolean;
	selectedDomain?: string;
	selectedView?: string;
	selectedEndPointName?: string;
	groupBy?: string[];
	modalTimeRange?: { startTime: number; endTime: number };
	selectedInterval?: string;
	// Add more params as needed
}

export const DEFAULT_PARAMS: ApiMonitoringParams = {
	showIP: true,
	selectedDomain: '',
	selectedView: 'all_endpoints',
	selectedEndPointName: '',
	groupBy: [],
	modalTimeRange: undefined,
	selectedInterval: undefined,
};

const PARAM_KEY = 'apiMonitoringParams';

// --- Parse and serialize helpers ---
function encodeParams(params: ApiMonitoringParams): string {
	return encodeURIComponent(JSON.stringify(params));
}

// Older shared links carry the filters as TagFilter items.
type LegacyApiMonitoringParams = ApiMonitoringParams & {
	allEndpointsLocalFilters?: TagFilter;
	endPointDetailsLocalFilters?: TagFilter;
};

function parseParams(value: string | null): LegacyApiMonitoringParams | null {
	if (!value) {
		return null;
	}
	try {
		return JSON.parse(decodeURIComponent(value));
	} catch {
		return null;
	}
}

// Drops the legacy filters, so the next write leaves them out of the URL.
function decodeParams(value: string | null): ApiMonitoringParams {
	const parsed = parseParams(value);
	if (!parsed) {
		return DEFAULT_PARAMS;
	}
	return omit(parsed, [
		'allEndpointsLocalFilters',
		'endPointDetailsLocalFilters',
	]);
}

export interface LegacyFilterExpressions {
	allEndpoints?: string;
	endPointDetails?: string;
}

export function getLegacyFilterExpressions(
	search: string,
): LegacyFilterExpressions {
	const parsed = parseParams(new URLSearchParams(search).get(PARAM_KEY));
	const toExpression = (filters?: TagFilter): string | undefined =>
		filters ? convertFiltersToExpression(filters).expression : undefined;
	return {
		allEndpoints: toExpression(parsed?.allEndpointsLocalFilters),
		endPointDetails: toExpression(parsed?.endPointDetailsLocalFilters),
	};
}

// --- Read query params from URL ---
export function getApiMonitoringParams(search: string): ApiMonitoringParams {
	const params = new URLSearchParams(search);
	return decodeParams(params.get(PARAM_KEY));
}

// --- Set query params in URL (replace or push) ---
export function setApiMonitoringParams(
	newParams: Partial<ApiMonitoringParams>,
	search: string,
	replace = false,
): void {
	const urlParams = new URLSearchParams(search);
	const current = decodeParams(urlParams.get(PARAM_KEY));
	const merged = { ...current, ...newParams };
	urlParams.set(PARAM_KEY, encodeParams(merged));
	const newSearch = `?${urlParams.toString()}`;
	navigate({ search: newSearch }, { replace });
}

// --- React hook to use query params in a component ---
export function useApiMonitoringParams(): [
	ApiMonitoringParams,
	(newParams: Partial<ApiMonitoringParams>, replace?: boolean) => void,
] {
	const location = useAppLocation();
	const params = getApiMonitoringParams(location.search);

	// Read the browser's URL, not the router's: several writes can land before
	// the next render, and the drawer filters are written by nuqs, which the
	// router's location does not see.
	const setParams = useCallback(
		(newParams: Partial<ApiMonitoringParams>, replace = false) => {
			setApiMonitoringParams(
				newParams,
				`?${getUnstableCurrentSearchParams().toString()}`,
				replace,
			);
		},
		[],
	);

	return [params, setParams];
}
