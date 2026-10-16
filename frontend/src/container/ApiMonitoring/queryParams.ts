import { useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

// --- Types for all API Monitoring query params ---
export interface ApiMonitoringParams {
	showIP?: boolean;
	selectedDomain?: string;
	selectedView?: string;
	selectedEndPointName?: string;
	groupBy?: string[];
	allEndpointsFilterExpression?: string;
	endPointDetailsFilterExpression?: string;
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
	allEndpointsFilterExpression: undefined,
	endPointDetailsFilterExpression: undefined,
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

function migrateLegacyFilters({
	allEndpointsLocalFilters,
	endPointDetailsLocalFilters,
	...params
}: LegacyApiMonitoringParams): ApiMonitoringParams {
	const migrated: ApiMonitoringParams = { ...params };
	if (
		migrated.allEndpointsFilterExpression === undefined &&
		allEndpointsLocalFilters
	) {
		migrated.allEndpointsFilterExpression = convertFiltersToExpression(
			allEndpointsLocalFilters,
		).expression;
	}
	if (
		migrated.endPointDetailsFilterExpression === undefined &&
		endPointDetailsLocalFilters
	) {
		migrated.endPointDetailsFilterExpression = convertFiltersToExpression(
			endPointDetailsLocalFilters,
		).expression;
	}
	return migrated;
}

function decodeParams(value: string | null): ApiMonitoringParams {
	if (!value) {
		return DEFAULT_PARAMS;
	}
	try {
		return migrateLegacyFilters(JSON.parse(decodeURIComponent(value)));
	} catch {
		return DEFAULT_PARAMS;
	}
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
	history: ReturnType<typeof useHistory>,
	replace = false,
): void {
	const urlParams = new URLSearchParams(search);
	const current = decodeParams(urlParams.get(PARAM_KEY));
	const merged = { ...current, ...newParams };
	urlParams.set(PARAM_KEY, encodeParams(merged));
	const newSearch = `?${urlParams.toString()}`;
	if (replace) {
		history.replace({ search: newSearch });
	} else {
		history.push({ search: newSearch });
	}
}

// --- React hook to use query params in a component ---
export function useApiMonitoringParams(): [
	ApiMonitoringParams,
	(newParams: Partial<ApiMonitoringParams>, replace?: boolean) => void,
] {
	const location = useLocation();
	const history = useHistory();
	const params = getApiMonitoringParams(location.search);

	const setParams = useCallback(
		(newParams: Partial<ApiMonitoringParams>, replace = false) => {
			setApiMonitoringParams(newParams, location.search, history, replace);
		},
		[location.search, history],
	);

	return [params, setParams];
}
